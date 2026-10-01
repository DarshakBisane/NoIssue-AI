import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = requireAuth(req, ['customer', 'admin']);
  if (errorResponse) return errorResponse;

  try {
    const userId = user?.userId;

    // Fetch tickets grouped by status
    const ticketsRes = await query(`
      SELECT 
        id, ticket_number, subject, category, detected_category, priority, status,
        resolution_summary, created_at, updated_at
      FROM tickets
      WHERE user_id = $1
      ORDER BY updated_at DESC
    `, [userId]);

    const allTickets = ticketsRes.rows;

    const activeTickets = allTickets.filter((t) =>
      ['OPEN', 'INVESTIGATING', 'IN_PROGRESS'].includes(t.status)
    );

    const pendingReviewTickets = allTickets.filter((t) =>
      ['HUMAN_REVIEW', 'WAITING_FOR_CUSTOMER', 'ESCALATED'].includes(t.status)
    );

    const resolvedTickets = allTickets.filter((t) =>
      ['AI_RESOLVED', 'RESOLVED'].includes(t.status)
    );

    const closedTickets = allTickets.filter((t) => t.status === 'CLOSED');

    // Fetch customer profile stats
    const profileRes = await query(`
      SELECT tier, risk_score, total_orders, total_spent
      FROM customer_profiles
      WHERE user_id = $1
    `, [userId]);

    const profile = profileRes.rows[0] || {
      tier: 'STANDARD',
      total_orders: 0,
      total_spent: 0,
    };

    return NextResponse.json({
      stats: {
        activeCount: activeTickets.length,
        pendingReviewCount: pendingReviewTickets.length,
        resolvedCount: resolvedTickets.length,
        closedCount: closedTickets.length,
        totalTickets: allTickets.length,
        tier: profile.tier,
        totalOrders: profile.total_orders,
        totalSpent: parseFloat(profile.total_spent || '0'),
      },
      activeTickets,
      pendingReviewTickets,
      resolvedTickets,
      recentTickets: allTickets.slice(0, 5),
    });
  } catch (err: any) {
    console.error('[Customer Dashboard API Error]:', err);
    return NextResponse.json({ error: 'Failed to load dashboard data.' }, { status: 500 });
  }
}
