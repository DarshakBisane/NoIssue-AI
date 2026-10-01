import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { runInvestigationWorkflow } from '@/lib/agents/orchestrator';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, errorResponse } = requireAuth(req, ['customer', 'admin']);
  if (errorResponse) return errorResponse;

  const ticketId = params.id;

  try {
    const body = await req.json();
    const { messageText, isReopen } = body;

    if (!messageText || !messageText.trim()) {
      return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 });
    }

    // Verify ticket ownership
    const tRes = await query(`
      SELECT id, ticket_number, user_id, status, subject, reopen_count
      FROM tickets
      WHERE id = $1
    `, [ticketId]);

    if (tRes.rows.length === 0) {
      return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
    }

    const ticket = tRes.rows[0];

    if (user?.role === 'customer' && ticket.user_id !== user.userId) {
      return NextResponse.json({ error: 'Forbidden: You are not authorized to update this ticket.' }, { status: 403 });
    }

    const wasResolved = ['AI_RESOLVED', 'RESOLVED', 'CLOSED'].includes(ticket.status);
    const shouldReopen = isReopen || wasResolved;

    // 1. Insert customer message
    await query(`
      INSERT INTO messages (ticket_id, sender_id, sender_role, sender_name, message_text)
      VALUES ($1, $2, 'CUSTOMER', $3, $4)
    `, [ticketId, user?.userId, user?.name || 'Customer', messageText.trim()]);

    // 2. Handle Reopening or status update
    if (shouldReopen) {
      const newReopenCount = (ticket.reopen_count || 0) + 1;
      await query(`
        UPDATE tickets 
        SET 
          status = 'OPEN',
          reopened_at = NOW(),
          reopen_count = $1,
          closed_at = NULL,
          retention_until = NULL,
          updated_at = NOW()
        WHERE id = $2
      `, [newReopenCount, ticketId]);

      await query(`
        INSERT INTO ticket_events (ticket_id, actor_id, actor_role, event_type, old_state, new_state, details_json)
        VALUES ($1, $2, 'CUSTOMER', 'REOPENED', $3, 'OPEN', $4)
      `, [ticketId, user?.userId, ticket.status, JSON.stringify({ reason: messageText.trim(), reopenCount: newReopenCount })]);

      // Re-run AI investigation with new customer context
      runInvestigationWorkflow({
        ticketId,
        userId: user!.userId,
        subject: ticket.subject,
        description: `Reopened Ticket Context: ${messageText.trim()}`,
      }).catch((err) => console.error('[Follow-up AI Error]:', err));
    } else {
      // Just a normal reply on an active ticket
      await query(`
        UPDATE tickets 
        SET updated_at = NOW()
        WHERE id = $1
      `, [ticketId]);

      await query(`
        INSERT INTO ticket_events (ticket_id, actor_id, actor_role, event_type, old_state, new_state, details_json)
        VALUES ($1, $2, 'CUSTOMER', 'CUSTOMER_REPLIED', $3, $3, $4)
      `, [ticketId, user?.userId, ticket.status, JSON.stringify({ messageSnippet: messageText.substring(0, 100) })]);
    }

    return NextResponse.json({
      success: true,
      message: shouldReopen ? 'Ticket reopened and under investigation.' : 'Reply sent successfully.',
      status: shouldReopen ? 'OPEN' : ticket.status,
    });
  } catch (err: any) {
    console.error('[Customer Reply API Error]:', err);
    return NextResponse.json({ error: 'Failed to submit reply.' }, { status: 500 });
  }
}
