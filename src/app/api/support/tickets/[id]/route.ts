import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, errorResponse } = requireAuth(req, ['support_agent', 'admin']);
  if (errorResponse) return errorResponse;

  const ticketId = params.id;

  try {
    // 1. Fetch Ticket with Customer and Agent info
    const ticketRes = await query(`
      SELECT 
        t.id, t.ticket_number, t.user_id, t.assigned_agent_id, t.subject, t.description,
        t.category, t.detected_category, t.priority, t.status, t.order_id, t.payment_id,
        t.resolution_summary, t.root_cause, t.closed_at, t.retention_until, t.reopened_at, t.reopen_count,
        t.created_at, t.updated_at,
        u.id as customer_id, u.full_name as customer_name, u.email as customer_email, u.phone as customer_phone, u.is_vip,
        cp.tier as customer_tier, cp.risk_score as customer_risk_score, cp.total_orders as customer_total_orders, cp.total_spent as customer_total_spent, cp.notes as customer_notes,
        agent.full_name as assigned_agent_name,
        o.order_number, o.status as order_status, o.total_amount as order_total, o.courier, o.tracking_number, o.items_json as order_items, o.shipping_address,
        p.transaction_id, p.status as payment_status, p.amount as payment_amount, p.payment_method, p.refunded_amount, p.gateway_response
      FROM tickets t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN customer_profiles cp ON u.id = cp.user_id
      LEFT JOIN users agent ON t.assigned_agent_id = agent.id
      LEFT JOIN orders o ON t.order_id = o.id
      LEFT JOIN payments p ON t.payment_id = p.id
      WHERE t.id = $1
    `, [ticketId]);

    if (ticketRes.rows.length === 0) {
      return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
    }

    const ticket = ticketRes.rows[0];
    const customerId = ticket.customer_id;

    // 2. Fetch Messages (INCLUDING internal agent notes for support specialists)
    const messagesRes = await query(`
      SELECT id, ticket_id, sender_id, sender_role, sender_name, message_text, attachments_json, is_internal, created_at
      FROM messages
      WHERE ticket_id = $1
      ORDER BY created_at ASC
    `, [ticketId]);

    // 3. Fetch Full AI Investigation Record
    const invRes = await query(`
      SELECT 
        i.*,
        p.policy_code, p.title as policy_title, p.category as policy_category, p.summary as policy_summary,
        p.content as policy_content, p.authority_limit as policy_authority_limit, p.requires_human_review as policy_requires_human_review
      FROM investigations i
      LEFT JOIN policies p ON i.policy_matched_id = p.id
      WHERE i.ticket_id = $1
    `, [ticketId]);

    const investigation = invRes.rows[0] ? {
      id: invRes.rows[0].id,
      intentDetected: invRes.rows[0].intent_detected,
      intentConfidence: parseFloat(invRes.rows[0].intent_confidence || '0.95'),
      intentCategory: invRes.rows[0].intent_category,
      urgency: invRes.rows[0].urgency,
      customerHistorySummary: invRes.rows[0].customer_history_summary,
      orderSummary: invRes.rows[0].order_summary,
      paymentSummary: invRes.rows[0].payment_summary,
      policyMatchedTitle: invRes.rows[0].policy_matched_title,
      policyExcerpt: invRes.rows[0].policy_excerpt,
      rootCause: invRes.rows[0].root_cause,
      verificationStatus: invRes.rows[0].verification_status,
      verificationReason: invRes.rows[0].verification_reason,
      decisionOutcome: invRes.rows[0].decision_outcome,
      recommendedAction: invRes.rows[0].recommended_action,
      resolutionExplanation: invRes.rows[0].resolution_explanation,
      actionTakenSummary: invRes.rows[0].action_taken_summary,
      evidence: typeof invRes.rows[0].evidence_json === 'string' ? JSON.parse(invRes.rows[0].evidence_json) : invRes.rows[0].evidence_json,
      steps: typeof invRes.rows[0].steps_json === 'string' ? JSON.parse(invRes.rows[0].steps_json) : invRes.rows[0].steps_json,
      policyDetails: invRes.rows[0].policy_code ? {
        code: invRes.rows[0].policy_code,
        title: invRes.rows[0].policy_title,
        category: invRes.rows[0].policy_category,
        summary: invRes.rows[0].policy_summary,
        authorityLimit: parseFloat(invRes.rows[0].policy_authority_limit || '100'),
        requiresHumanReview: Boolean(invRes.rows[0].policy_requires_human_review),
      } : null,
      updatedAt: invRes.rows[0].updated_at,
    } : null;

    // 4. Fetch Escalation Packet if available
    const escRes = await query(`
      SELECT id, triggered_by, reason, priority_override, packet_json, is_resolved, created_at
      FROM escalations
      WHERE ticket_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [ticketId]);

    const escalation = escRes.rows[0] ? {
      id: escRes.rows[0].id,
      triggeredBy: escRes.rows[0].triggered_by,
      reason: escRes.rows[0].reason,
      priorityOverride: escRes.rows[0].priority_override,
      packet: typeof escRes.rows[0].packet_json === 'string' ? JSON.parse(escRes.rows[0].packet_json) : escRes.rows[0].packet_json,
      isResolved: escRes.rows[0].is_resolved,
      createdAt: escRes.rows[0].created_at,
    } : null;

    // 5. Fetch Customer's Orders for Authorized Context
    const customerOrdersRes = await query(`
      SELECT id, order_number, status, total_amount, courier, tracking_number, items_json, created_at
      FROM orders
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [customerId]);

    const customerOrders = customerOrdersRes.rows.map(o => ({
      id: o.id,
      orderNumber: o.order_number,
      status: o.status,
      totalAmount: parseFloat(o.total_amount),
      courier: o.courier,
      trackingNumber: o.tracking_number,
      items: typeof o.items_json === 'string' ? JSON.parse(o.items_json) : o.items_json,
      createdAt: o.created_at,
    }));

    // 6. Fetch Customer's Payments for Authorized Context
    const customerPaymentsRes = await query(`
      SELECT id, transaction_id, order_id, amount, status, payment_method, refunded_amount, gateway_response, created_at
      FROM payments
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 6
    `, [customerId]);

    const customerPayments = customerPaymentsRes.rows.map(p => ({
      id: p.id,
      transactionId: p.transaction_id,
      orderId: p.order_id,
      amount: parseFloat(p.amount),
      status: p.status,
      method: p.payment_method,
      refundedAmount: parseFloat(p.refunded_amount || '0'),
      gatewayResponse: typeof p.gateway_response === 'string' ? JSON.parse(p.gateway_response) : p.gateway_response,
      createdAt: p.created_at,
    }));

    // 7. Fetch Customer's Past Tickets
    const pastTicketsRes = await query(`
      SELECT id, ticket_number, subject, category, priority, status, resolution_summary, created_at
      FROM tickets
      WHERE user_id = $1 AND id != $2
      ORDER BY created_at DESC
      LIMIT 5
    `, [customerId, ticketId]);

    // 8. Fetch Ticket Audit Events
    const eventsRes = await query(`
      SELECT id, actor_role, event_type, old_state, new_state, details_json, created_at
      FROM ticket_events
      WHERE ticket_id = $1
      ORDER BY created_at ASC
    `, [ticketId]);

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
        assignedAgentId: ticket.assigned_agent_id,
        matchedOrder: ticket.order_number ? {
          orderNumber: ticket.order_number,
          status: ticket.order_status,
          total: parseFloat(ticket.order_total || '0'),
          courier: ticket.courier,
          trackingNumber: ticket.tracking_number,
          items: typeof ticket.order_items === 'string' ? JSON.parse(ticket.order_items) : ticket.order_items,
          shippingAddress: typeof ticket.shipping_address === 'string' ? JSON.parse(ticket.shipping_address) : ticket.shipping_address,
        } : null,
        matchedPayment: ticket.transaction_id ? {
          transactionId: ticket.transaction_id,
          status: ticket.payment_status,
          amount: parseFloat(ticket.payment_amount || '0'),
          method: ticket.payment_method,
          refundedAmount: parseFloat(ticket.refunded_amount || '0'),
          gatewayResponse: typeof ticket.gateway_response === 'string' ? JSON.parse(ticket.gateway_response) : ticket.gateway_response,
        } : null,
      },
      customer: {
        id: customerId,
        fullName: ticket.customer_name,
        email: ticket.customer_email,
        phone: ticket.customer_phone,
        isVip: Boolean(ticket.is_vip),
        tier: ticket.customer_tier || 'STANDARD',
        riskScore: parseFloat(ticket.customer_risk_score || '0'),
        totalOrders: parseInt(ticket.customer_total_orders || '0', 10),
        totalSpent: parseFloat(ticket.customer_total_spent || '0'),
        notes: ticket.customer_notes,
      },
      messages: messagesRes.rows.map(m => ({
        id: m.id,
        senderId: m.sender_id,
        senderRole: m.sender_role,
        senderName: m.sender_name,
        messageText: m.message_text,
        isInternal: Boolean(m.is_internal),
        createdAt: m.created_at,
      })),
      investigation,
      escalation,
      customerOrders,
      customerPayments,
      pastTickets: pastTicketsRes.rows,
      auditEvents: eventsRes.rows.map(e => ({
        id: e.id,
        actorRole: e.actor_role,
        eventType: e.event_type,
        oldState: e.old_state,
        newState: e.new_state,
        details: typeof e.details_json === 'string' ? JSON.parse(e.details_json) : e.details_json,
        createdAt: e.created_at,
      })),
    });
  } catch (err: any) {
    console.error('[Support Ticket Detail API Error]:', err);
    return NextResponse.json({ error: 'Failed to load support ticket workbench.' }, { status: 500 });
  }
}
