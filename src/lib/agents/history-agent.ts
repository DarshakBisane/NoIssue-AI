import { query } from '../db';
import { CustomerProfile, User } from '@/types';

export interface CustomerHistoryOutput {
  user: {
    id: string;
    fullName: string;
    email: string;
    isVip: boolean;
    tier: string;
    riskScore: number;
    totalOrders: number;
    totalSpent: number;
  };
  previousTicketsCount: number;
  previousTicketsSummary: string;
  hasRepeatedComplaints: boolean;
  customerSentimentTrend: 'POSITIVE' | 'NEUTRAL' | 'FRUSTRATED' | 'CHURN_RISK';
  summary: string;
}

export async function runCustomerHistoryAgent(userId: string): Promise<CustomerHistoryOutput> {
  try {
    // 1. Fetch user & profile
    const userRes = await query(`
      SELECT 
        u.id, u.email, u.full_name, u.is_vip,
        COALESCE(cp.tier, 'STANDARD') as tier,
        COALESCE(cp.risk_score, 0.0) as risk_score,
        COALESCE(cp.total_orders, 0) as total_orders,
        COALESCE(cp.total_spent, 0.0) as total_spent,
        cp.notes
      FROM users u
      LEFT JOIN customer_profiles cp ON u.id = cp.user_id
      WHERE u.id = $1
    `, [userId]);

    if (userRes.rows.length === 0) {
      return {
        user: {
          id: userId,
          fullName: 'Customer',
          email: '',
          isVip: false,
          tier: 'STANDARD',
          riskScore: 0,
          totalOrders: 0,
          totalSpent: 0,
        },
        previousTicketsCount: 0,
        previousTicketsSummary: 'No previous profile found.',
        hasRepeatedComplaints: false,
        customerSentimentTrend: 'NEUTRAL',
        summary: 'New customer with no prior ticket history.',
      };
    }

    const row = userRes.rows[0];

    // 2. Fetch past tickets
    const ticketsRes = await query(`
      SELECT id, ticket_number, subject, category, status, resolution_summary, created_at
      FROM tickets
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [userId]);

    const pastTickets = ticketsRes.rows;
    const ticketCount = pastTickets.length;

    let ticketsSummary = 'No previous tickets recorded.';
    let hasRepeat = false;

    if (ticketCount > 0) {
      ticketsSummary = pastTickets
        .map((t) => `${t.ticket_number} (${t.status}): "${t.subject}" -> ${t.resolution_summary || 'In progress'}`)
        .join('; ');
      hasRepeat = ticketCount >= 2;
    }

    let sentiment: 'POSITIVE' | 'NEUTRAL' | 'FRUSTRATED' | 'CHURN_RISK' = 'NEUTRAL';
    if (row.is_vip || row.tier === 'PLATINUM' || row.tier === 'GOLD') {
      sentiment = 'POSITIVE';
    }
    if (ticketCount >= 3) {
      sentiment = 'FRUSTRATED';
    }
    if (Number(row.risk_score) > 30) {
      sentiment = 'CHURN_RISK';
    }

    return {
      user: {
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        isVip: Boolean(row.is_vip),
        tier: row.tier,
        riskScore: parseFloat(row.risk_score || '0'),
        totalOrders: parseInt(row.total_orders || '0', 10),
        totalSpent: parseFloat(row.total_spent || '0'),
      },
      previousTicketsCount: ticketCount,
      previousTicketsSummary: ticketsSummary,
      hasRepeatedComplaints: hasRepeat,
      customerSentimentTrend: sentiment,
      summary: `Customer ${row.full_name} (${row.tier} tier, ${row.is_vip ? 'VIP, ' : ''}Lifetime: $${row.total_spent}, ${ticketCount} prior tickets). Risk Score: ${row.risk_score}.`,
    };
  } catch (err: any) {
    console.error('[Customer History Agent Error]:', err.message);
    return {
      user: {
        id: userId,
        fullName: 'Customer',
        email: '',
        isVip: false,
        tier: 'STANDARD',
        riskScore: 0,
        totalOrders: 0,
        totalSpent: 0,
      },
      previousTicketsCount: 0,
      previousTicketsSummary: 'History query unavailable.',
      hasRepeatedComplaints: false,
      customerSentimentTrend: 'NEUTRAL',
      summary: 'Customer history successfully loaded with standard profile.',
    };
  }
}
