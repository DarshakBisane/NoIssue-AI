import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { delCache } from '@/lib/redis';

export async function POST(req: NextRequest) {
  try {
    console.log('[Retention Cleanup] Starting 5-day ticket retention cleanup job...');

    // 1. Find all closed tickets past their retention date
    const expiredRes = await query(`
      SELECT id, ticket_number, user_id, closed_at, retention_until
      FROM tickets
      WHERE status = 'CLOSED' 
        AND retention_until IS NOT NULL 
        AND retention_until <= NOW()
    `);

    const expiredTickets = expiredRes.rows;
    const count = expiredTickets.length;

    if (count === 0) {
      return NextResponse.json({
        success: true,
        message: 'No expired tickets to clean up at this time.',
        cleanedCount: 0,
      });
    }

    console.log(`[Retention Cleanup] Found ${count} tickets eligible for cleanup.`);

    // 2. Perform deletion within database transaction
    await withTransaction(async (client) => {
      for (const t of expiredTickets) {
        // Log to platform audit logs before deletion
        await client.query(`
          INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details_json)
          VALUES ($1, 'RETENTION_CLEANUP_DELETED', 'ticket', $2, $3)
        `, [
          t.user_id,
          t.id,
          JSON.stringify({
            ticketNumber: t.ticket_number,
            closedAt: t.closed_at,
            retentionUntil: t.retention_until,
            reason: '5-Day Data Retention Policy Expired',
          }),
        ]);

        // Delete ticket (Cascades to messages, investigations, escalations, ticket_events)
        await client.query(`DELETE FROM tickets WHERE id = $1`, [t.id]);

        // Clean up Redis caches for this ticket
        await delCache(`ticket:${t.id}:investigation`);
        await delCache(`lock:investigate:${t.id}`);
      }
    });

    console.log(`[Retention Cleanup] Successfully pruned ${count} expired closed tickets.`);

    return NextResponse.json({
      success: true,
      message: `Pruned ${count} closed tickets older than 5 days according to retention policy.`,
      cleanedCount: count,
      cleanedTickets: expiredTickets.map((t) => t.ticket_number),
    });
  } catch (err: any) {
    console.error('[Retention Cleanup Error]:', err);
    return NextResponse.json({ error: 'Retention cleanup failed.' }, { status: 500 });
  }
}
