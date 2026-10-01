import { DecisionOutcome, Priority, VerificationStatus } from '@/types';
import { generateGeminiJson } from '../gemini';

export interface ResolutionGateInput {
  intent: {
    category: string;
    urgency: Priority;
    severity: string;
    isUnderstandable: boolean;
  };
  customerHistory: {
    isVip: boolean;
    tier: string;
    riskScore: number;
    hasRepeatedComplaints: boolean;
  };
  orderData: any | null;
  paymentData: any | null;
  policy: {
    policyCode: string;
    title: string;
    authorityLimit: number;
    requiresHumanReview: boolean;
  } | null;
  rootCause: {
    rootCause: string;
    responsibleParty: string;
  };
  verification: {
    status: VerificationStatus;
    reason: string;
    conflictsDetected: string[];
  };
  customerExplicitlyRequestedHuman?: boolean;
}

export interface ResolutionGateOutput {
  outcome: DecisionOutcome;
  recommendedAction: string;
  actionPayload?: Record<string, any>;
  escalationReason?: string;
  assignedAgentPriority: Priority;
  customerFacingExplanation: {
    whatWasFound: string;
    whyThisResolutionApplies: string;
    actionTaken: string;
  };
  internalRationale: string;
}

export function evaluateResolutionGate(input: ResolutionGateInput): ResolutionGateOutput {
  const {
    intent,
    customerHistory,
    orderData,
    paymentData,
    policy,
    rootCause,
    verification,
    customerExplicitlyRequestedHuman,
  } = input;

  // 1. Hard rule checks for human escalation
  let outcome: DecisionOutcome = 'AUTO_RESOLVE';
  const escalationReasons: string[] = [];

  if (customerExplicitlyRequestedHuman) {
    outcome = 'HUMAN_REVIEW';
    escalationReasons.push('Customer explicitly requested human support intervention.');
  }

  if (intent.category === 'Security concern' || intent.category === 'Account') {
    outcome = 'HUMAN_REVIEW';
    escalationReasons.push('Security and account access inquiries require human agent identity verification.');
  }

  if (!intent.isUnderstandable) {
    outcome = 'HUMAN_REVIEW';
    escalationReasons.push('Customer query is ambiguous or missing vital operational details.');
  }

  if (verification.status === 'CONFLICTING') {
    outcome = 'ESCALATE';
    escalationReasons.push(`Conflicting evidence detected: ${verification.conflictsDetected.join(', ') || verification.reason}`);
  } else if (verification.status === 'INSUFFICIENT_EVIDENCE') {
    outcome = 'HUMAN_REVIEW';
    escalationReasons.push(`Insufficient evidence to auto-resolve: ${verification.reason}`);
  } else if (verification.status === 'PARTIALLY_SUPPORTED') {
    outcome = 'HUMAN_REVIEW';
    escalationReasons.push(`Case is partially supported but requires specialist confirmation: ${verification.reason}`);
  }

  if (policy?.requiresHumanReview) {
    outcome = 'HUMAN_REVIEW';
    escalationReasons.push(`Policy ${policy.policyCode} mandates human agent sign-off.`);
  }

  const claimAmount = paymentData?.amount || orderData?.total_amount || 0;
  const authorityCeiling = customerHistory.isVip ? 350.0 : (policy?.authorityLimit || 150.0);

  if (claimAmount > authorityCeiling && intent.category.includes('Refund')) {
    outcome = 'HUMAN_REVIEW';
    escalationReasons.push(`Transaction amount ($${claimAmount}) exceeds autonomous authority ceiling ($${authorityCeiling}).`);
  }

  if (customerHistory.riskScore >= 35) {
    outcome = 'HUMAN_REVIEW';
    escalationReasons.push(`Customer account risk score (${customerHistory.riskScore}) is above automated safety threshold.`);
  }

  // Determine recommended action
  let recommendedAction = 'ASSIST_CUSTOMER';
  let actionPayload: Record<string, any> = {};

  if (intent.category === 'Payment' || intent.category === 'Refund') {
    if (paymentData && paymentData.status === 'SUCCESS' && outcome === 'AUTO_RESOLVE') {
      recommendedAction = 'AUTO_REFUND_APPROVED';
      actionPayload = { transactionId: paymentData.transaction_id, amount: paymentData.amount };
    } else {
      recommendedAction = 'REVIEW_REFUND_REQUEST';
    }
  } else if (intent.category === 'Delivery') {
    if (orderData && orderData.status === 'DELIVERED') {
      recommendedAction = 'INVESTIGATE_DELIVERY_CLAIM';
    } else {
      recommendedAction = 'PROVIDE_TRANSIT_STATUS';
    }
  }

  // Determine Agent priority
  let assignedPriority: Priority = intent.urgency;
  if (customerHistory.isVip) assignedPriority = 'URGENT';
  if (outcome === 'ESCALATE') assignedPriority = 'URGENT';

  // Customer facing explanation
  let whatWasFound = '';
  let whyThisResolutionApplies = '';
  let actionTaken = '';

  if (outcome === 'AUTO_RESOLVE') {
    whatWasFound = `We verified your records for ${orderData ? `Order ${orderData.order_number}` : 'your account'} and confirmed the transaction details.`;
    whyThisResolutionApplies = `Under our ${policy?.title || 'standard company policy'}, this case meets all criteria for immediate automated resolution.`;
    actionTaken = `We have executed the requested resolution. Any financial credits typically reflect in 1-3 business days.`;
  } else {
    whatWasFound = `We reviewed your inquiry regarding ${intent.intent || 'your support case'} alongside your account records.`;
    whyThisResolutionApplies = `To ensure you receive the most accurate and personalized assistance, this case has been prepared for our specialized Support Team under Policy ${policy?.policyCode || 'Guidelines'}.`;
    actionTaken = `Your case packet and all verified evidence have been routed to our Support Agents with ${assignedPriority} priority. An agent will follow up directly.`;
  }

  return {
    outcome,
    recommendedAction,
    actionPayload,
    escalationReason: escalationReasons.length > 0 ? escalationReasons.join(' ') : undefined,
    assignedAgentPriority: assignedPriority,
    customerFacingExplanation: {
      whatWasFound,
      whyThisResolutionApplies,
      actionTaken,
    },
    internalRationale: `Gate Decision: ${outcome}. Verification: ${verification.status}. Authority Limit: $${authorityCeiling}. ${escalationReasons.join(' | ')}`,
  };
}
