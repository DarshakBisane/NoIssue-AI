import { query, withTransaction } from '../db';
import { acquireLock, releaseLock, setCache } from '../redis';
import { runIntentAgent } from './intent-agent';
import { runCustomerHistoryAgent } from './history-agent';
import { runOrderAgent } from './order-agent';
import { runPolicyRagAgent } from './policy-rag-agent';
import { runRootCauseAgent } from './root-cause-agent';
import { runVerificationAgent } from './verification-agent';
import { evaluateResolutionGate } from './resolution-gate';
import { generateGeminiText } from '../gemini';
import { Priority, TicketStatus } from '@/types';

export interface WorkflowOptions {
  ticketId: string;
  userId: string;
  subject: string;
  description: string;
  category?: string;
  orderNumber?: string;
  transactionId?: string;
  explicitHumanRequest?: boolean;
}

export async function runInvestigationWorkflow(options: WorkflowOptions): Promise<{
  status: TicketStatus;
  investigationId: string;
  summary: string;
}> {
  const {
    ticketId,
    userId,
    subject,
    description,
    category: userSelectedCategory,
    orderNumber,
    transactionId,
    explicitHumanRequest,
  } = options;

  // Lock to avoid duplicate processing
  const lockAcquired = await acquireLock(`investigate:${ticketId}`, 45);
  if (!lockAcquired) {
    console.warn(`[Orchestrator] Investigation already in progress for ticket ${ticketId}`);
    return { status: 'INVESTIGATING', investigationId: '', summary: 'Investigation in progress.' };
  }

  try {
    // Record Event: INVESTIGATION_STARTED
    await query(`
      INSERT INTO ticket_events (ticket_id, actor_role, event_type, old_state, new_state, details_json)
      VALUES ($1, 'AI', 'INVESTIGATION_STARTED', 'OPEN', 'INVESTIGATING', '{"trigger": "orchestrator"}'::jsonb);
    `, [ticketId]);

    // Update ticket to INVESTIGATING
    await query(`UPDATE tickets SET status = 'INVESTIGATING', updated_at = NOW() WHERE id = $1`, [ticketId]);

    // STAGE 1: Intent Agent
    console.log(`[Stage 1/7] Running Intent Agent for ticket ${ticketId}...`);
    const intentOutput = await runIntentAgent(subject, description, userSelectedCategory);

    // STAGE 2: Customer History Agent
    console.log(`[Stage 2/7] Running Customer History Agent for user ${userId}...`);
    const historyOutput = await runCustomerHistoryAgent(userId);

    // STAGE 3: Order / Transaction Agent
    console.log(`[Stage 3/7] Running Order/Transaction Agent...`);
    const targetOrderNumber = orderNumber || intentOutput.extractedEntities.orderNumber;
    const targetTxnId = transactionId || intentOutput.extractedEntities.transactionId;
    const orderOutput = await runOrderAgent(userId, targetOrderNumber, targetTxnId);

    // STAGE 4: Policy / RAG Agent
    console.log(`[Stage 4/7] Running Policy RAG Agent...`);
    const orderAndPaymentFacts = `${orderOutput.orderSummary} ${orderOutput.paymentSummary}`;
    const policyOutput = await runPolicyRagAgent(intentOutput.intent, intentOutput.category, orderAndPaymentFacts);

    // STAGE 5: Root Cause Agent
    console.log(`[Stage 5/7] Running Root Cause Agent...`);
    const rootCauseOutput = await runRootCauseAgent(
      `${subject}: ${description}`,
      orderOutput.orderSummary,
      orderOutput.paymentSummary,
      historyOutput.summary
    );

    // STAGE 6: Verification Agent
    console.log(`[Stage 6/7] Running Verification Agent...`);
    const proposedActionHint = `${intentOutput.category} - ${policyOutput.policySummary}`;
    const verificationOutput = await runVerificationAgent(
      proposedActionHint,
      description,
      orderOutput.matchedOrder,
      orderOutput.matchedPayment,
      policyOutput.matchedPolicy,
      historyOutput
    );

    // STAGE 7: Resolution Gate
    console.log(`[Stage 7/7] Evaluating Resolution Gate...`);
    const gateDecision = evaluateResolutionGate({
      intent: intentOutput,
      customerHistory: historyOutput.user,
      orderData: orderOutput.matchedOrder,
      paymentData: orderOutput.matchedPayment,
      policy: policyOutput.matchedPolicy,
      rootCause: rootCauseOutput,
      verification: verificationOutput,
      customerExplicitlyRequestedHuman: explicitHumanRequest,
    });

    // Prepare steps array for visual audit
    const steps = [
      { step: 'Intent Detection', status: 'completed', summary: intentOutput.summary },
      { step: 'Customer History Check', status: 'completed', summary: historyOutput.summary },
      { step: 'Order & Payment Verification', status: 'completed', summary: `${orderOutput.orderSummary} ${orderOutput.paymentSummary}` },
      { step: 'Policy Knowledge Retrieval (RAG)', status: 'completed', summary: `Matched ${policyOutput.matchedPolicy?.policyCode || 'Policy'}: ${policyOutput.policySummary}` },
      { step: 'Root Cause Diagnosis', status: 'completed', summary: rootCauseOutput.rootCause },
      { step: 'Evidence Verification', status: 'completed', summary: `Status: ${verificationOutput.status} (Score: ${verificationOutput.confidenceScore})` },
      { step: 'Resolution Decision Gate', status: 'completed', summary: `Outcome: ${gateDecision.outcome}. ${gateDecision.internalRationale}` },
    ];

    // Determine new ticket status
    let finalStatus: TicketStatus = 'AI_RESOLVED';
    if (gateDecision.outcome === 'HUMAN_REVIEW') {
      finalStatus = 'HUMAN_REVIEW';
    } else if (gateDecision.outcome === 'ESCALATE') {
      finalStatus = 'ESCALATED';
    }

    // Persist investigation to PostgreSQL
    const invRes = await query(`
      INSERT INTO investigations (
        ticket_id, intent_detected, intent_confidence, intent_category, urgency,
        customer_history_summary, order_summary, payment_summary,
        policy_matched_id, policy_matched_title, policy_excerpt,
        root_cause, verification_status, verification_reason, decision_outcome,
        recommended_action, resolution_explanation, action_taken_summary,
        evidence_json, steps_json
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8,
        $9, $10, $11,
        $12, $13, $14, $15,
        $16, $17, $18,
        $19, $20
      )
      ON CONFLICT (ticket_id) DO UPDATE SET
        intent_detected = $2, intent_confidence = $3, intent_category = $4, urgency = $5,
        customer_history_summary = $6, order_summary = $7, payment_summary = $8,
        policy_matched_id = $9, policy_matched_title = $10, policy_excerpt = $11,
        root_cause = $12, verification_status = $13, verification_reason = $14, decision_outcome = $15,
        recommended_action = $16, resolution_explanation = $17, action_taken_summary = $18,
        evidence_json = $19, steps_json = $20, updated_at = NOW()
      RETURNING id;
    `, [
      ticketId,
      intentOutput.intent,
      0.95,
      intentOutput.category,
      gateDecision.assignedAgentPriority,
      historyOutput.summary,
      orderOutput.orderSummary,
      orderOutput.paymentSummary,
      policyOutput.matchedPolicy?.policyId || null,
      policyOutput.matchedPolicy?.title || 'Company Service Policy',
      policyOutput.policyExcerpt,
      rootCauseOutput.rootCause,
      verificationOutput.status,
      verificationOutput.reason,
      gateDecision.outcome,
      gateDecision.recommendedAction,
      `${gateDecision.customerFacingExplanation.whatWasFound} ${gateDecision.customerFacingExplanation.whyThisResolutionApplies}`,
      gateDecision.customerFacingExplanation.actionTaken,
      JSON.stringify(verificationOutput.safeEvidenceSummary),
      JSON.stringify(steps),
    ]);

    const investigationId = invRes.rows[0].id;

    // Execute safe automated action if auto-resolved (e.g. mark payment refunded)
    if (gateDecision.outcome === 'AUTO_RESOLVE' && orderOutput.matchedPayment && gateDecision.recommendedAction.includes('REFUND')) {
      await query(`
        UPDATE payments 
        SET status = 'REFUNDED', refunded_amount = amount, updated_at = NOW()
        WHERE id = $1
      `, [orderOutput.matchedPayment.id]);
    }

    // Update Ticket record
    await query(`
      UPDATE tickets
      SET 
        status = $1,
        priority = $2,
        detected_category = $3,
        order_id = COALESCE(order_id, $4),
        payment_id = COALESCE(payment_id, $5),
        resolution_summary = $6,
        root_cause = $7,
        updated_at = NOW()
      WHERE id = $8
    `, [
      finalStatus,
      gateDecision.assignedAgentPriority,
      intentOutput.category,
      orderOutput.matchedOrder?.id || null,
      orderOutput.matchedPayment?.id || null,
      gateDecision.customerFacingExplanation.actionTaken,
      rootCauseOutput.rootCause,
      ticketId,
    ]);

    // Generate safe, polite AI conversational message for the customer
    let aiMessageText = '';
    if (finalStatus === 'AI_RESOLVED') {
      aiMessageText = `Hello ${historyOutput.user.fullName || 'there'},

I have investigated your inquiry regarding ${intentOutput.intent}.

${gateDecision.customerFacingExplanation.whatWasFound}
${gateDecision.customerFacingExplanation.whyThisResolutionApplies}

Resolution Action:
${gateDecision.customerFacingExplanation.actionTaken}

You can review the transparent verified evidence in the Investigation Summary above. If you have any further questions or feel this does not fully resolve your issue, you can reply here or request human support at any time.`;
    } else {
      aiMessageText = `Hello ${historyOutput.user.fullName || 'there'},

Thank you for raising this issue. I have gathered your relevant account, order, and policy details for our Support Team.

${gateDecision.customerFacingExplanation.whatWasFound}
${gateDecision.customerFacingExplanation.whyThisResolutionApplies}

Next Steps:
${gateDecision.customerFacingExplanation.actionTaken}

A dedicated Resolution Specialist will review this case and reply to you directly in this conversation.`;
    }

    await query(`
      INSERT INTO messages (ticket_id, sender_role, sender_name, message_text)
      VALUES ($1, 'AI', 'NoIssue AI Agent', $2)
    `, [ticketId, aiMessageText]);

    // If Escalated or Human Review, generate Escalation Packet
    if (finalStatus === 'HUMAN_REVIEW' || finalStatus === 'ESCALATED') {
      const packet = {
        customer: {
          name: historyOutput.user.fullName,
          email: historyOutput.user.email,
          tier: historyOutput.user.tier,
          riskScore: historyOutput.user.riskScore,
        },
        ticket: {
          id: ticketId,
          subject,
          description,
          category: intentOutput.category,
          priority: gateDecision.assignedAgentPriority,
          createdAt: new Date().toISOString(),
        },
        intent: {
          category: intentOutput.category,
          summary: intentOutput.summary,
          confidence: 0.95,
        },
        orderInfo: orderOutput.matchedOrder ? {
          orderNumber: orderOutput.matchedOrder.order_number,
          status: orderOutput.matchedOrder.status,
          total: orderOutput.matchedOrder.total_amount,
          courier: orderOutput.matchedOrder.courier,
          tracking: orderOutput.matchedOrder.tracking_number,
          items: orderOutput.matchedOrder.items_json,
        } : undefined,
        paymentInfo: orderOutput.matchedPayment ? {
          transactionId: orderOutput.matchedPayment.transaction_id,
          status: orderOutput.matchedPayment.status,
          amount: orderOutput.matchedPayment.amount,
          method: orderOutput.matchedPayment.payment_method,
        } : undefined,
        policyMatched: policyOutput.matchedPolicy ? {
          code: policyOutput.matchedPolicy.policyCode,
          title: policyOutput.matchedPolicy.title,
          summary: policyOutput.matchedPolicy.summary,
          authorityLimit: policyOutput.matchedPolicy.authorityLimit,
        } : undefined,
        verification: {
          status: verificationOutput.status,
          reason: verificationOutput.reason,
        },
        rootCause: rootCauseOutput.rootCause,
        aiRecommendation: gateDecision.recommendedAction,
        escalationReason: gateDecision.escalationReason || 'Sent for human agent specialist review.',
      };

      await query(`
        INSERT INTO escalations (ticket_id, triggered_by, reason, priority_override, packet_json)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
      `, [
        ticketId,
        explicitHumanRequest ? 'CUSTOMER_REQUEST' : 'AI_DECISION_GATE',
        gateDecision.escalationReason || 'Human Specialist Review Required',
        gateDecision.assignedAgentPriority,
        JSON.stringify(packet),
      ]);
    }

    // Record Event: INVESTIGATION_COMPLETED
    await query(`
      INSERT INTO ticket_events (ticket_id, actor_role, event_type, old_state, new_state, details_json)
      VALUES ($1, 'AI', 'INVESTIGATION_COMPLETED', 'INVESTIGATING', $2, $3);
    `, [
      ticketId,
      finalStatus,
      JSON.stringify({ decision: gateDecision.outcome, action: gateDecision.recommendedAction }),
    ]);

    // Cache recent ticket state
    await setCache(`ticket:${ticketId}:investigation`, { status: finalStatus, steps }, 3600);

    return {
      status: finalStatus,
      investigationId,
      summary: gateDecision.customerFacingExplanation.actionTaken,
    };
  } finally {
    await releaseLock(`investigate:${ticketId}`);
  }
}
