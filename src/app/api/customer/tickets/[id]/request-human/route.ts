import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, errorResponse } = requireAuth(req, ['customer', 'admin']);
  if (errorResponse) return errorResponse;

  const ticketId = params.id;

  try {
    const body = await req.json().catch(() => ({}));
    const reason = body.reason?.trim() || 'Customer requested human support specialist assistance.';

    // 1. Fetch ticket and check ownership
    const tRes = await query(`
      SELECT t.id, t.ticket_number, t.user_id, t.status, t.subject, t.description, t.category,
             u.full_name as customer_name, u.email as customer_email,
             cp.tier, cp.risk_score
      FROM tickets t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN customer_profiles cp ON u.id = cp.user_id
      WHERE t.id = $1
    `, [ticketId]);

    if (tRes.rows.length === 0) {
      return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
    }

    const ticket = tRes.rows[0];

    if (user?.role === 'customer' && ticket.user_id !== user.userId) {
      return NextResponse.json({ error: 'Forbidden: You are not authorized for this ticket.' }, { status: 403 });
    }

    // 2. Fetch existing investigation
    const invRes = await query(`SELECT * FROM investigations WHERE ticket_id = $1`, [ticketId]);
    const inv = invRes.rows[0];

    // 3. Update ticket status to HUMAN_REVIEW
    await query(`
      UPDATE tickets
      SET status = 'HUMAN_REVIEW', priority = 'HIGH', updated_at = NOW()
      WHERE id = $1
    `, [ticketId]);

    // 4. Create Escalation Packet for Support Agent Queue
    const packet = {
      customer: {
        name: ticket.customer_name,
        email: ticket.customer_email,
        tier: ticket.tier || 'STANDARD',
        riskScore: parseFloat(ticket.risk_score || '0'),
      },
      ticket: {
        id: ticket.id,
        number: ticket.ticket_number,
        subject: ticket.subject,
        description: ticket.description,
        category: ticket.category,
        priority: 'HIGH',
        createdAt: new Date().toISOString(),
      },
      intent: {
        category: inv?.intent_category || ticket.category,
        summary: inv?.intent_detected || ticket.subject,
        confidence: 0.95,
      },
      verification: {
        status: inv?.verification_status || 'PARTIALLY_SUPPORTED',
        reason: inv?.verification_reason || 'Escalated per customer explicit request',
      },
      rootCause: inv?.root_cause || 'Customer requested human specialist intervention',
      aiRecommendation: 'Review customer statement and previous automated investigation evidence.',
      escalationReason: reason,
    };

    await query(`
      INSERT INTO escalations (ticket_id, triggered_by, reason, priority_override, packet_json)
      VALUES ($1, 'CUSTOMER_REQUEST', $2, 'HIGH', $3)
      ON CONFLICT DO NOTHING
    `, [ticketId, reason, JSON.stringify(packet)]);

    // 5. Add system / AI acknowledgment message
    await query(`
      INSERT INTO messages (ticket_id, sender_role, sender_name, message_text)
      VALUES ($1, 'SYSTEM', 'NoIssue System', $2)
    `, [ticketId, `Human Support Specialist requested by customer. Reason: "${reason}". The ticket has been transferred to the Support Agent Queue.`]);

    // 6. Record Ticket Event
    await query(`
      INSERT INTO ticket_events (ticket_id, actor_id, actor_role, event_type, old_state, new_state, details_json)
      VALUES ($1, $2, 'CUSTOMER', 'HUMAN_REQUESTED', $3, 'HUMAN_REVIEW', $4)
    `, [ticketId, user?.userId, ticket.status, JSON.stringify({ reason })]);

    return NextResponse.json({
      success: true,
      message: 'Your ticket has been escalated to a Human Support Specialist.',
      status: 'HUMAN_REVIEW',
    });
  } catch (err: any) {
    console.error('[Request Human Support Error]:', err);
    return NextResponse.json({ error: 'Failed to request human support.' }, { status: 500 });
  }
}
