import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = requireAuth(req, ['support_agent', 'admin']);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const filterStatus = searchParams.get('status') || 'ALL';
    const filterPriority = searchParams.get('priority');
    const filterCategory = searchParams.get('category');
    const search = searchParams.get('search');

    // 1. Fetch counts
    const countsRes = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'ESCALATED' THEN 1 END) as escalated_count,
        COUNT(CASE WHEN status IN ('HUMAN_REVIEW', 'WAITING_FOR_CUSTOMER') THEN 1 END) as review_count,
        COUNT(CASE WHEN status IN ('OPEN', 'INVESTIGATING', 'IN_PROGRESS') THEN 1 END) as active_count,
        COUNT(CASE WHEN status IN ('AI_RESOLVED', 'RESOLVED') THEN 1 END) as resolved_count,
        COUNT(CASE WHEN status = 'CLOSED' THEN 1 END) as closed_count
      FROM tickets
    `);

    const counts = countsRes.rows[0];

    // 2. Build filtered query
    let sql = `
      SELECT 
        t.id, t.ticket_number, t.subject, t.category, t.detected_category,
        t.priority, t.status, t.order_id, t.payment_id, t.resolution_summary,
        t.root_cause, t.created_at, t.updated_at, t.closed_at,
        u.id as customer_id, u.full_name as customer_name, u.email as customer_email, u.is_vip,
        cp.tier as customer_tier, cp.risk_score as customer_risk_score,
        agent.full_name as assigned_agent_name,
        esc.reason as escalation_reason,
        inv.verification_status, inv.decision_outcome
      FROM tickets t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN customer_profiles cp ON u.id = cp.user_id
      LEFT JOIN users agent ON t.assigned_agent_id = agent.id
      LEFT JOIN escalations esc ON t.id = esc.ticket_id
      LEFT JOIN investigations inv ON t.id = inv.ticket_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filterStatus && filterStatus !== 'ALL') {
      if (filterStatus === 'ESCALATED') {
        sql += ` AND t.status = 'ESCALATED'`;
      } else if (filterStatus === 'REVIEW') {
        sql += ` AND t.status IN ('HUMAN_REVIEW', 'WAITING_FOR_CUSTOMER')`;
      } else if (filterStatus === 'ACTIVE') {
        sql += ` AND t.status IN ('OPEN', 'INVESTIGATING', 'IN_PROGRESS')`;
      } else if (filterStatus === 'RESOLVED') {
        sql += ` AND t.status IN ('AI_RESOLVED', 'RESOLVED')`;
      } else if (filterStatus === 'CLOSED') {
        sql += ` AND t.status = 'CLOSED'`;
      } else {
        params.push(filterStatus);
        sql += ` AND t.status = $${params.length}`;
      }
    }

    if (filterPriority && filterPriority !== 'ALL') {
      params.push(filterPriority);
      sql += ` AND t.priority = $${params.length}`;
    }

    if (filterCategory && filterCategory !== 'ALL') {
      params.push(filterCategory);
      sql += ` AND (t.category = $${params.length} OR t.detected_category = $${params.length})`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (
        LOWER(t.ticket_number) LIKE $${params.length} OR
        LOWER(t.subject) LIKE $${params.length} OR
        LOWER(u.full_name) LIKE $${params.length} OR
        LOWER(u.email) LIKE $${params.length}
      )`;
    }

    sql += ` ORDER BY 
      CASE 
        WHEN t.status = 'ESCALATED' THEN 1
        WHEN t.status = 'HUMAN_REVIEW' THEN 2
        WHEN t.status = 'IN_PROGRESS' THEN 3
        WHEN t.status = 'OPEN' THEN 4
        ELSE 5
      END,
      CASE 
        WHEN t.priority = 'URGENT' THEN 1
        WHEN t.priority = 'HIGH' THEN 2
        WHEN t.priority = 'MEDIUM' THEN 3
        ELSE 4
      END,
      t.updated_at DESC
    `;

    const ticketsRes = await query(sql, params);

    return NextResponse.json({
      counts: {
        total: parseInt(counts.total || '0', 10),
        escalated: parseInt(counts.escalated_count || '0', 10),
        pendingReview: parseInt(counts.review_count || '0', 10),
        active: parseInt(counts.active_count || '0', 10),
        resolved: parseInt(counts.resolved_count || '0', 10),
        closed: parseInt(counts.closed_count || '0', 10),
      },
      tickets: ticketsRes.rows,
    });
  } catch (err: any) {
    console.error('[Support Dashboard API Error]:', err);
    return NextResponse.json({ error: 'Failed to retrieve support dashboard data.' }, { status: 500 });
  }
}
