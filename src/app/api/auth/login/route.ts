import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { comparePassword, signJwt } from '@/lib/auth';
import { checkRateLimit } from '@/lib/redis';

export async function POST(req: NextRequest) {
  try {
    const ip = req.ip || req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = await checkRateLimit(`login:${ip}`, 20, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Too many login attempts. Please wait a minute.' }, { status: 429 });
    }

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const res = await query(`
      SELECT u.id, u.email, u.password_hash, u.full_name, u.role, u.is_vip,
             cp.tier, cp.total_orders, cp.total_spent
      FROM users u
      LEFT JOIN customer_profiles cp ON u.id = cp.user_id
      WHERE LOWER(u.email) = LOWER($1)
    `, [email.trim()]);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const user = res.rows[0];

    const match = await comparePassword(password, user.password_hash);
    if (!match) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // Role check: If support agent logs in via customer portal, allow or advise
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
        isVip: Boolean(user.is_vip),
        tier: user.tier || 'STANDARD',
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
    console.error('[Login API Error]:', err);
    return NextResponse.json({ error: `Login failed: ${err.message || 'Internal server error'}` }, { status: 500 });
  }
}
