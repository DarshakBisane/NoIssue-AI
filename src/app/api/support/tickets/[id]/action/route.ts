import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, errorResponse } = requireAuth(req, ['support_agent', 'admin']);
  if (errorResponse) return errorResponse;

  const ticketId = params.id;

  try {
    const body = await req.json();
    const { actionType, messageText, resolutionSummary, newPriority, agentNote } = body;

    // Fetch ticket
    const tRes = await query(`
      SELECT t.id, t.ticket_number, t.status, t.priority, t.user_id, t.order_id, t.payment_id
      FROM tickets t
      WHERE t.id = $1
    `, [ticketId]);

    if (tRes.rows.length === 0) {
      return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
    }

    const ticket = tRes.rows[0];
    const oldStatus = ticket.status;

    // Assign current agent if unassigned
    await query(`
      UPDATE tickets 
      SET assigned_agent_id = COALESCE(assigned_agent_id, $1)
      WHERE id = $2
    `, [user?.userId, ticketId]);

    switch (actionType) {
      case 'REPLY': {
        if (!messageText || !messageText.trim()) {
          return NextResponse.json({ error: 'Reply message text is required.' }, { status: 400 });
        }

        // Insert support agent message
        await query(`
          INSERT INTO messages (ticket_id, sender_id, sender_role, sender_name, message_text, is_internal)
          VALUES ($1, $2, 'SUPPORT_AGENT', $3, $4, false)
        `, [ticketId, user?.userId, user?.name || 'Support Specialist', messageText.trim()]);

        // Update ticket status to IN_PROGRESS or WAITING_FOR_CUSTOMER
        const newStatus = oldStatus === 'HUMAN_REVIEW' || oldStatus === 'ESCALATED' ? 'IN_PROGRESS' : oldStatus;
        await query(`
          UPDATE tickets 
          SET status = $1, updated_at = NOW() 
          WHERE id = $2
        `, [newStatus, ticketId]);

        // Record event
        await query(`
          INSERT INTO ticket_events (ticket_id, actor_id, actor_role, event_type, old_state, new_state, details_json)
          VALUES ($1, $2, 'SUPPORT_AGENT', 'AGENT_REPLIED', $3, $4, $5)
        `, [ticketId, user?.userId, oldStatus, newStatus, JSON.stringify({ agent: user?.name, snippet: messageText.substring(0, 100) })]);

        break;
      }

      case 'INTERNAL_NOTE': {
        if (!messageText || !messageText.trim()) {
          return NextResponse.json({ error: 'Internal note text is required.' }, { status: 400 });
        }

        // Insert internal note
        await query(`
          INSERT INTO messages (ticket_id, sender_id, sender_role, sender_name, message_text, is_internal)
          VALUES ($1, $2, 'SUPPORT_AGENT', $3, $4, true)
        `, [ticketId, user?.userId, `${user?.name || 'Support Specialist'} (Internal Note)`, messageText.trim()]);

        // Record event
        await query(`
          INSERT INTO ticket_events (ticket_id, actor_id, actor_role, event_type, old_state, new_state, details_json)
          VALUES ($1, $2, 'SUPPORT_AGENT', 'INTERNAL_NOTE_ADDED', $3, $3, $4)
        `, [ticketId, user?.userId, oldStatus, JSON.stringify({ agent: user?.name })]);

        break;
      }

      case 'APPROVE_AI': {
        // Fetch investigation recommended action
        const invRes = await query(`SELECT recommended_action, resolution_explanation, action_taken_summary FROM investigations WHERE ticket_id = $1`, [ticketId]);
        const inv = invRes.rows[0];

        const summaryText = inv?.action_taken_summary || inv?.resolution_explanation || 'AI recommendation approved by Support Specialist.';

        // If payment refund action, execute database payment refund
        if (ticket.payment_id && inv?.recommended_action?.includes('REFUND')) {
          await query(`
            UPDATE payments 
            SET status = 'REFUNDED', refunded_amount = amount, updated_at = NOW() 
            WHERE id = $1
          `, [ticket.payment_id]);
        }

        await query(`
          UPDATE tickets 
          SET status = 'RESOLVED', resolution_summary = $1, updated_at = NOW() 
          WHERE id = $2
        `, [summaryText, ticketId]);

        // Post Agent message explaining resolution
        await query(`
          INSERT INTO messages (ticket_id, sender_id, sender_role, sender_name, message_text, is_internal)
          VALUES ($1, $2, 'SUPPORT_AGENT', $3, $4, false)
        `, [ticketId, user?.userId, user?.name || 'Support Specialist', `Hello! I have reviewed your case along with the AI investigation details and approved the recommended resolution: ${summaryText}. Please let us know if you need any further assistance.`]);

        await query(`
          INSERT INTO ticket_events (ticket_id, actor_id, actor_role, event_type, old_state, new_state, details_json)
          VALUES ($1, $2, 'SUPPORT_AGENT', 'RESOLVED', $3, 'RESOLVED', $4)
        `, [ticketId, user?.userId, oldStatus, JSON.stringify({ approvedAi: true, agent: user?.name, summary: summaryText })]);

        break;
      }

      case 'MODIFY_RESOLVE': {
        const summary = resolutionSummary || messageText || 'Case resolved by Support Specialist.';

        await query(`
          UPDATE tickets 
          SET status = 'RESOLVED', resolution_summary = $1, updated_at = NOW() 
          WHERE id = $2
        `, [summary, ticketId]);

        if (messageText && messageText.trim()) {
          await query(`
            INSERT INTO messages (ticket_id, sender_id, sender_role, sender_name, message_text, is_internal)
            VALUES ($1, $2, 'SUPPORT_AGENT', $3, $4, false)
          `, [ticketId, user?.userId, user?.name || 'Support Specialist', messageText.trim()]);
        }

        await query(`
          INSERT INTO ticket_events (ticket_id, actor_id, actor_role, event_type, old_state, new_state, details_json)
          VALUES ($1, $2, 'SUPPORT_AGENT', 'RESOLVED', $3, 'RESOLVED', $4)
        `, [ticketId, user?.userId, oldStatus, JSON.stringify({ manualResolution: true, agent: user?.name, summary })]);

        break;
      }

      case 'ESCALATE': {
        const reason = messageText || 'Escalated by Support Specialist to Tier-2 Management.';
        await query(`
          UPDATE tickets 
          SET status = 'ESCALATED', priority = 'URGENT', updated_at = NOW() 
          WHERE id = $1
        `, [ticketId]);

        await query(`
          INSERT INTO ticket_events (ticket_id, actor_id, actor_role, event_type, old_state, new_state, details_json)
          VALUES ($1, $2, 'SUPPORT_AGENT', 'ESCALATED', $3, 'ESCALATED', $4)
        `, [ticketId, user?.userId, oldStatus, JSON.stringify({ agent: user?.name, reason })]);

        break;
      }

      case 'CLOSE': {
        // Retention 5 days from now
        await query(`
          UPDATE tickets 
          SET 
            status = 'CLOSED',
            closed_at = NOW(),
            retention_until = NOW() + INTERVAL '5 days',
            updated_at = NOW() 
          WHERE id = $1
        `, [ticketId]);

        await query(`
          INSERT INTO messages (ticket_id, sender_role, sender_name, message_text, is_internal)
          VALUES ($1, 'SYSTEM', 'NoIssue System', 'This ticket has been officially closed. In accordance with data retention policies, case records are maintained in history for 5 days.', false)
        `, [ticketId]);

        await query(`
          INSERT INTO ticket_events (ticket_id, actor_id, actor_role, event_type, old_state, new_state, details_json)
          VALUES ($1, $2, 'SUPPORT_AGENT', 'CLOSED', $3, 'CLOSED', $4)
        `, [ticketId, user?.userId, oldStatus, JSON.stringify({ agent: user?.name, retentionDays: 5 })]);

        break;
      }

      case 'REOPEN': {
        await query(`
          UPDATE tickets 
          SET status = 'IN_PROGRESS', closed_at = NULL, retention_until = NULL, updated_at = NOW() 
          WHERE id = $1
        `, [ticketId]);

        await query(`
          INSERT INTO ticket_events (ticket_id, actor_id, actor_role, event_type, old_state, new_state, details_json)
          VALUES ($1, $2, 'SUPPORT_AGENT', 'REOPENED', $3, 'IN_PROGRESS', $4)
        `, [ticketId, user?.userId, oldStatus, JSON.stringify({ agent: user?.name })]);

        break;
      }

      default:
        return NextResponse.json({ error: `Unknown action type: ${actionType}` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Action ${actionType} executed successfully.`,
    });
  } catch (err: any) {
    console.error('[Support Action Error]:', err);
    return NextResponse.json({ error: 'Failed to execute support action.' }, { status: 500 });
  }
}
