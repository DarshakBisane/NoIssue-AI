import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { runInvestigationWorkflow } from '@/lib/agents/orchestrator';
import { checkRateLimit } from '@/lib/redis';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = requireAuth(req, ['customer', 'admin']);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');

    let sql = `
      SELECT 
        t.id, t.ticket_number, t.subject, t.description, t.category, t.detected_category,
        t.priority, t.status, t.order_id, t.payment_id, t.resolution_summary,
        t.root_cause, t.created_at, t.updated_at, t.closed_at, t.retention_until,
        o.order_number,
        (SELECT COUNT(*) FROM messages m WHERE m.ticket_id = t.id) as message_count
      FROM tickets t
      LEFT JOIN orders o ON t.order_id = o.id
      WHERE t.user_id = $1
    `;
    const params: any[] = [user?.userId];

    if (statusFilter && statusFilter !== 'ALL') {
      if (statusFilter === 'ACTIVE') {
        sql += ` AND t.status IN ('OPEN', 'INVESTIGATING', 'IN_PROGRESS')`;
      } else if (statusFilter === 'PENDING') {
        sql += ` AND t.status IN ('HUMAN_REVIEW', 'WAITING_FOR_CUSTOMER', 'ESCALATED')`;
      } else if (statusFilter === 'RESOLVED') {
        sql += ` AND t.status IN ('AI_RESOLVED', 'RESOLVED')`;
      } else if (statusFilter === 'HISTORY' || statusFilter === 'CLOSED') {
        sql += ` AND t.status = 'CLOSED'`;
      } else {
        params.push(statusFilter);
        sql += ` AND t.status = $${params.length}`;
      }
    }

    sql += ` ORDER BY t.updated_at DESC`;

    const res = await query(sql, params);

    return NextResponse.json({ tickets: res.rows });
  } catch (err: any) {
    console.error('[Get Customer Tickets Error]:', err);
    return NextResponse.json({ error: 'Failed to retrieve tickets.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { user, errorResponse } = requireAuth(req, ['customer', 'admin']);
  if (errorResponse) return errorResponse;

  try {
    const rateCheck = await checkRateLimit(`ticket_create:${user?.userId}`, 10, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Too many tickets submitted. Please wait.' }, { status: 429 });
    }

    const body = await req.json();
    const { subject, description, category, orderId, orderNumber, transactionId } = body;

    if (!subject || !subject.trim()) {
      return NextResponse.json({ error: 'Subject is required.' }, { status: 400 });
    }
    if (!description || !description.trim()) {
      return NextResponse.json({ error: 'Description is required.' }, { status: 400 });
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const ticketNumber = `TKT-${new Date().getFullYear()}-${randomSuffix}`;

    // Verify orderId belongs to customer if provided
    let verifiedOrderId: string | null = null;
    if (orderId) {
      const orderCheck = await query(`SELECT id FROM orders WHERE id = $1 AND user_id = $2`, [orderId, user?.userId]);
      if (orderCheck.rows.length > 0) {
        verifiedOrderId = orderCheck.rows[0].id;
      }
    }

    // 1. Create Ticket in PostgreSQL
    const ticketRes = await query(`
      INSERT INTO tickets (
        ticket_number, user_id, subject, description, category, priority, status, order_id
      ) VALUES ($1, $2, $3, $4, $5, 'MEDIUM', 'OPEN', $6)
      RETURNING id, ticket_number, subject, description, status, created_at;
    `, [
      ticketNumber,
      user?.userId,
      subject.trim(),
      description.trim(),
      category || 'General',
      verifiedOrderId,
    ]);

    const createdTicket = ticketRes.rows[0];

    // 2. Insert initial Customer message
    await query(`
      INSERT INTO messages (ticket_id, sender_id, sender_role, sender_name, message_text)
      VALUES ($1, $2, 'CUSTOMER', $3, $4)
    `, [createdTicket.id, user?.userId, user?.name || 'Customer', description.trim()]);

    // 3. Record CREATED event
    await query(`
      INSERT INTO ticket_events (ticket_id, actor_id, actor_role, event_type, old_state, new_state, details_json)
      VALUES ($1, $2, 'CUSTOMER', 'CREATED', NULL, 'OPEN', $3)
    `, [createdTicket.id, user?.userId, JSON.stringify({ category, orderNumber, transactionId })]);

    // 4. Trigger Agentic Investigation Workflow
    console.log(`[AI Orchestrator] Triggering investigation for new ticket ${createdTicket.id}...`);
    const investigationResult = await runInvestigationWorkflow({
      ticketId: createdTicket.id,
      userId: user!.userId,
      subject: subject.trim(),
      description: description.trim(),
      category,
      orderNumber,
      transactionId,
    });

    return NextResponse.json({
      success: true,
      ticket: {
        id: createdTicket.id,
        ticketNumber: createdTicket.ticket_number,
        status: investigationResult.status,
        summary: investigationResult.summary,
      },
    }, { status: 201 });
  } catch (err: any) {
    console.error('[Create Customer Ticket Error]:', err);
    return NextResponse.json({ error: 'Failed to create and investigate ticket.' }, { status: 500 });
  }
}
