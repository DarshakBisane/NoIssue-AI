import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = requireAuth(req, ['customer', 'admin']);
  if (errorResponse) return errorResponse;

  try {
    const ordersRes = await query(`
      SELECT 
        o.id, o.order_number, o.status, o.total_amount, o.currency,
        o.courier, o.tracking_number, o.items_json, o.created_at,
        p.id as payment_id, p.transaction_id, p.status as payment_status, p.payment_method
      FROM orders o
      LEFT JOIN payments p ON o.id = p.order_id
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC
    `, [user?.userId]);

    const orders = ordersRes.rows.map((row) => ({
      id: row.id,
      orderNumber: row.order_number,
      status: row.status,
      totalAmount: parseFloat(row.total_amount),
      currency: row.currency,
      courier: row.courier,
      trackingNumber: row.tracking_number,
      items: typeof row.items_json === 'string' ? JSON.parse(row.items_json) : row.items_json,
      payment: row.payment_id
        ? {
            id: row.payment_id,
            transactionId: row.transaction_id,
            status: row.payment_status,
            method: row.payment_method,
          }
        : null,
      createdAt: row.created_at,
    }));

    return NextResponse.json({ orders });
  } catch (err: any) {
    console.error('[Customer Orders API Error]:', err);
    return NextResponse.json({ error: 'Failed to fetch customer orders.' }, { status: 500 });
  }
}
