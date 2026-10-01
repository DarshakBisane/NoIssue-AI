import { query } from '../db';
import { Order, Payment } from '@/types';

export interface OrderAgentOutput {
  matchedOrder: Order | null;
  matchedPayment: Payment | null;
  customerRecentOrders: Order[];
  customerRecentPayments: Payment[];
  hasDuplicateCharges: boolean;
  duplicateTransactionDetails?: string;
  orderSummary: string;
  paymentSummary: string;
}

export async function runOrderAgent(
  userId: string,
  hintOrderNumber?: string,
  hintTransactionId?: string
): Promise<OrderAgentOutput> {
  try {
    // 1. Fetch recent orders for this user
    const ordersRes = await query(`
      SELECT id, order_number, user_id, status, total_amount, currency, courier, tracking_number, estimated_delivery, actual_delivery, items_json, shipping_address, created_at, updated_at
      FROM orders
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [userId]);

    const recentOrders: Order[] = ordersRes.rows.map(r => ({
      ...r,
      total_amount: parseFloat(r.total_amount),
      items_json: typeof r.items_json === 'string' ? JSON.parse(r.items_json) : r.items_json,
      shipping_address: typeof r.shipping_address === 'string' ? JSON.parse(r.shipping_address) : r.shipping_address,
    }));

    // 2. Fetch recent payments for this user
    const paymentsRes = await query(`
      SELECT id, transaction_id, user_id, order_id, amount, currency, status, payment_method, refunded_amount, gateway_response, created_at, updated_at
      FROM payments
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [userId]);

    const recentPayments: Payment[] = paymentsRes.rows.map(r => ({
      ...r,
      amount: parseFloat(r.amount),
      refunded_amount: parseFloat(r.refunded_amount || '0'),
      gateway_response: typeof r.gateway_response === 'string' ? JSON.parse(r.gateway_response) : r.gateway_response,
    }));

    // 3. Find matched order
    let matchedOrder: Order | null = null;
    if (hintOrderNumber) {
      matchedOrder = recentOrders.find(o => o.order_number.toLowerCase() === hintOrderNumber.toLowerCase()) || null;
      if (!matchedOrder) {
        // Query directly in case it wasn't in top 5
        const directOrder = await query(`SELECT * FROM orders WHERE user_id = $1 AND LOWER(order_number) = LOWER($2)`, [userId, hintOrderNumber]);
        if (directOrder.rows.length > 0) {
          const r = directOrder.rows[0];
          matchedOrder = {
            ...r,
            total_amount: parseFloat(r.total_amount),
            items_json: typeof r.items_json === 'string' ? JSON.parse(r.items_json) : r.items_json,
          };
        }
      }
    } else if (recentOrders.length > 0) {
      matchedOrder = recentOrders[0];
    }

    // 4. Find matched payment
    let matchedPayment: Payment | null = null;
    if (hintTransactionId) {
      matchedPayment = recentPayments.find(p => p.transaction_id.toLowerCase() === hintTransactionId.toLowerCase()) || null;
    } else if (matchedOrder) {
      matchedPayment = recentPayments.find(p => p.order_id === matchedOrder?.id) || null;
    }

    // 5. Detect duplicate charges (two identical successful charges with same amount or order)
    let hasDuplicateCharges = false;
    let duplicateDetails = '';
    const successfulPayments = recentPayments.filter(p => p.status === 'SUCCESS');
    
    for (let i = 0; i < successfulPayments.length; i++) {
      for (let j = i + 1; j < successfulPayments.length; j++) {
        const p1 = successfulPayments[i];
        const p2 = successfulPayments[j];
        if (p1.amount === p2.amount && (p1.order_id === p2.order_id || Math.abs(new Date(p1.created_at).getTime() - new Date(p2.created_at).getTime()) < 86400000)) {
          hasDuplicateCharges = true;
          duplicateDetails = `Detected duplicate charge: ${p1.transaction_id} ($${p1.amount}) and ${p2.transaction_id} ($${p2.amount}).`;
          if (!matchedPayment) matchedPayment = p2;
          break;
        }
      }
      if (hasDuplicateCharges) break;
    }

    const orderSummary = matchedOrder
      ? `Order ${matchedOrder.order_number} (${matchedOrder.status}, $${matchedOrder.total_amount}, Carrier: ${matchedOrder.courier || 'N/A'}, Tracking: ${matchedOrder.tracking_number || 'N/A'}). Items: ${(matchedOrder.items_json || []).map(i => i.name).join(', ')}.`
      : 'No specific order linked.';

    const paymentSummary = matchedPayment
      ? `Payment ${matchedPayment.transaction_id} (${matchedPayment.status}, $${matchedPayment.amount} via ${matchedPayment.payment_method}, Refunded: $${matchedPayment.refunded_amount}).`
      : 'No specific payment record linked.';

    return {
      matchedOrder,
      matchedPayment,
      customerRecentOrders: recentOrders,
      customerRecentPayments: recentPayments,
      hasDuplicateCharges,
      duplicateTransactionDetails: duplicateDetails || undefined,
      orderSummary,
      paymentSummary,
    };
  } catch (err: any) {
    console.error('[Order Agent Error]:', err.message);
    return {
      matchedOrder: null,
      matchedPayment: null,
      customerRecentOrders: [],
      customerRecentPayments: [],
      hasDuplicateCharges: false,
      orderSummary: 'Order details lookup unavailable.',
      paymentSummary: 'Payment details lookup unavailable.',
    };
  }
}
