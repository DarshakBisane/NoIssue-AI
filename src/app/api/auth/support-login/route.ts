import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { comparePassword, signJwt } from '@/lib/auth';
import { checkRateLimit } from '@/lib/redis';

export async function POST(req: NextRequest) {
  try {
    const ip = req.ip || req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = await checkRateLimit(`support-login:${ip}`, 15, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Too many login attempts. Please wait.' }, { status: 429 });
    }

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Support credentials are required.' }, { status: 400 });
    }

    const res = await query(`
      SELECT id, email, password_hash, full_name, role, phone
      FROM users
      WHERE LOWER(email) = LOWER($1)
    `, [email.trim()]);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid support credentials.' }, { status: 401 });
    }

    const user = res.rows[0];

    // Must be support_agent or admin
    if (user.role !== 'support_agent' && user.role !== 'admin') {
      return NextResponse.json({
        error: 'Access Denied: This portal is strictly for authorized Customer Support Specialists.',
      }, { status: 403 });
    }

    const match = await comparePassword(password, user.password_hash);
    if (!match) {
      return NextResponse.json({ error: 'Invalid support credentials.' }, { status: 401 });
    }

    const token = signJwt({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.full_name,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: user.role,
      },
      token,
    });

    response.cookies.set('noissue_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (err: any) {
    console.error('[Support Login Error]:', err);
    return NextResponse.json({ error: 'Internal server error occurred.' }, { status: 500 });
  }
}
