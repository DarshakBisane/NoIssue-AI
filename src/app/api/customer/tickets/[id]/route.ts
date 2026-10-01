import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, errorResponse } = requireAuth(req, ['customer', 'admin']);
  if (errorResponse) return errorResponse;

  const ticketId = params.id;

  try {
    // 1. Fetch Ticket with ownership verification
    const ticketRes = await query(`
      SELECT 
        t.id, t.ticket_number, t.user_id, t.assigned_agent_id, t.subject, t.description,
        t.category, t.detected_category, t.priority, t.status, t.order_id, t.payment_id,
        t.resolution_summary, t.root_cause, t.closed_at, t.retention_until, t.reopened_at, t.reopen_count,
        t.created_at, t.updated_at,
        u.full_name as customer_name, u.email as customer_email,
        agent.full_name as assigned_agent_name,
        o.order_number, o.status as order_status, o.total_amount as order_total, o.courier, o.tracking_number, o.items_json as order_items,
        p.transaction_id, p.status as payment_status, p.amount as payment_amount, p.payment_method
      FROM tickets t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN users agent ON t.assigned_agent_id = agent.id
      LEFT JOIN orders o ON t.order_id = o.id
      LEFT JOIN payments p ON t.payment_id = p.id
      WHERE t.id = $1
    `, [ticketId]);

    if (ticketRes.rows.length === 0) {
      return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
    }

    const ticket = ticketRes.rows[0];

    // SECURITY CHECK: Customer can only view their own ticket
    if (user?.role === 'customer' && ticket.user_id !== user.userId) {
      return NextResponse.json({ error: 'Forbidden: You are not authorized to view this ticket.' }, { status: 403 });
    }

    // 2. Fetch Messages (EXCLUDE is_internal = true for customers)
    const messagesRes = await query(`
      SELECT id, ticket_id, sender_id, sender_role, sender_name, message_text, attachments_json, created_at
      FROM messages
      WHERE ticket_id = $1 AND is_internal = false
      ORDER BY created_at ASC
    `, [ticketId]);

    // 3. Fetch Investigation (Safe Structured Evidence Only)
    const invRes = await query(`
      SELECT 
        id, ticket_id, intent_detected, intent_category, urgency,
        policy_matched_title, policy_excerpt, root_cause,
        verification_status, verification_reason, decision_outcome,
        recommended_action, resolution_explanation, action_taken_summary,
        evidence_json, steps_json, created_at, updated_at
      FROM investigations
      WHERE ticket_id = $1
    `, [ticketId]);

    const investigation = invRes.rows[0] ? {
      id: invRes.rows[0].id,
      intentDetected: invRes.rows[0].intent_detected,
      intentCategory: invRes.rows[0].intent_category,
      urgency: invRes.rows[0].urgency,
      policyTitle: invRes.rows[0].policy_matched_title,
      policyExcerpt: invRes.rows[0].policy_excerpt,
      rootCause: invRes.rows[0].root_cause,
      verificationStatus: invRes.rows[0].verification_status,
      verificationReason: invRes.rows[0].verification_reason,
      decisionOutcome: invRes.rows[0].decision_outcome,
      resolutionExplanation: invRes.rows[0].resolution_explanation,
      actionTakenSummary: invRes.rows[0].action_taken_summary,
      evidence: typeof invRes.rows[0].evidence_json === 'string' ? JSON.parse(invRes.rows[0].evidence_json) : invRes.rows[0].evidence_json,
      steps: typeof invRes.rows[0].steps_json === 'string' ? JSON.parse(invRes.rows[0].steps_json) : invRes.rows[0].steps_json,
      updatedAt: invRes.rows[0].updated_at,
    } : null;

    return NextResponse.json({
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticket_number,
        subject: ticket.subject,
        description: ticket.description,
        category: ticket.category,
        detectedCategory: ticket.detected_category,
        priority: ticket.priority,
        status: ticket.status,
        resolutionSummary: ticket.resolution_summary,
        rootCause: ticket.root_cause,
        closedAt: ticket.closed_at,
        retentionUntil: ticket.retention_until,
        reopenedAt: ticket.reopened_at,
        reopenCount: ticket.reopen_count,
        createdAt: ticket.created_at,
        updatedAt: ticket.updated_at,
        assignedAgentName: ticket.assigned_agent_name,
        order: ticket.order_number ? {
          orderNumber: ticket.order_number,
          status: ticket.order_status,
          total: parseFloat(ticket.order_total || '0'),
          courier: ticket.courier,
          trackingNumber: ticket.tracking_number,
          items: typeof ticket.order_items === 'string' ? JSON.parse(ticket.order_items) : ticket.order_items,
        } : null,
        payment: ticket.transaction_id ? {
          transactionId: ticket.transaction_id,
          status: ticket.payment_status,
          amount: parseFloat(ticket.payment_amount || '0'),
          method: ticket.payment_method,
        } : null,
      },
      messages: messagesRes.rows.map(m => ({
        id: m.id,
        senderRole: m.sender_role,
        senderName: m.sender_name,
        messageText: m.message_text,
        attachments: typeof m.attachments_json === 'string' ? JSON.parse(m.attachments_json) : m.attachments_json,
        createdAt: m.created_at,
      })),
      investigation,
    });
  } catch (err: any) {
    console.error('[Get Customer Ticket Detail Error]:', err);
    return NextResponse.json({ error: 'Failed to load ticket details.' }, { status: 500 });
  }
}
