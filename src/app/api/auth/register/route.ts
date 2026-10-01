import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword, signJwt } from '@/lib/auth';
import { checkRateLimit } from '@/lib/redis';

export async function POST(req: NextRequest) {
  try {
    const ip = req.ip || req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = await checkRateLimit(`register:${ip}`, 10, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Too many registration attempts. Please try again later.' }, { status: 429 });
    }

    const body = await req.json();
    const { email, password, fullName, phone } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: 'Full name, email, and password are required.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    // Check if user exists
    const existing = await query(`SELECT id FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    // Create user in PostgreSQL
    const res = await query(`
      INSERT INTO users (email, password_hash, full_name, role, phone)
      VALUES ($1, $2, $3, 'customer', $4)
      RETURNING id, email, full_name, role, is_vip, created_at;
    `, [email.toLowerCase().trim(), passwordHash, fullName.trim(), phone || null]);

    const user = res.rows[0];

    // Create default customer profile
    await query(`
      INSERT INTO customer_profiles (user_id, tier, risk_score, total_orders, total_spent)
      VALUES ($1, 'STANDARD', 0.0, 0, 0.0)
      ON CONFLICT DO NOTHING;
    `, [user.id]);

    // Sign JWT
    const token = signJwt({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.full_name,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Account created successfully.',
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: user.role,
        isVip: user.is_vip,
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
    console.error('[Register API Error]:', err);
    return NextResponse.json({ error: 'Internal server error occurred.' }, { status: 500 });
  }
}
