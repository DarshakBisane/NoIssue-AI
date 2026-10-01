import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = requireAuth(req);
  if (errorResponse) return errorResponse;

  try {
    const res = await query(`
      SELECT u.id, u.email, u.full_name, u.role, u.phone, u.avatar_url, u.is_vip, u.created_at,
             cp.tier, cp.risk_score, cp.total_orders, cp.total_spent
      FROM users u
      LEFT JOIN customer_profiles cp ON u.id = cp.user_id
      WHERE u.id = $1
    `, [user?.userId]);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const row = res.rows[0];

    return NextResponse.json({
      user: {
        id: row.id,
        email: row.email,
        name: row.full_name,
        fullName: row.full_name,
        role: row.role,
        phone: row.phone,
        avatarUrl: row.avatar_url,
        isVip: Boolean(row.is_vip),
        tier: row.tier || 'STANDARD',
        riskScore: parseFloat(row.risk_score || '0'),
        totalOrders: parseInt(row.total_orders || '0', 10),
        totalSpent: parseFloat(row.total_spent || '0'),
        createdAt: row.created_at,
      },
    });
  } catch (err: any) {
    console.error('[Auth ME Error]:', err);
    return NextResponse.json({ error: 'Failed to fetch user session.' }, { status: 500 });
  }
}
