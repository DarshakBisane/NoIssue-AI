import { DecisionOutcome, Priority, VerificationStatus } from '@/types';

export interface ResolutionGateInput {
  intent: {
    intent?: string;
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

  const isLowOrNormalPriority = intent.urgency === 'LOW' || intent.urgency === 'MEDIUM';
  const escalationReasons: string[] = [];
  let outcome: DecisionOutcome = 'AUTO_RESOLVE';

  // 1. Mandatory Human Review Conditions (Only for High/Urgent/Fraud/Security)
  if (customerExplicitlyRequestedHuman) {
    outcome = 'HUMAN_REVIEW';
    escalationReasons.push('Customer explicitly requested direct human specialist assistance.');
  } else if (intent.category === 'Security concern' || intent.category === 'Account' && intent.urgency === 'URGENT') {
    outcome = 'HUMAN_REVIEW';
    escalationReasons.push('Account security and authentication credentials require specialist identity verification.');
  } else if (verification.status === 'CONFLICTING') {
    outcome = 'ESCALATE';
    escalationReasons.push(`Conflicting transaction records or fraud risk detected: ${verification.conflictsDetected.join(', ') || verification.reason}`);
  } else if (!intent.isUnderstandable && !isLowOrNormalPriority) {
    outcome = 'HUMAN_REVIEW';
    escalationReasons.push('Query contains unresolvable ambiguity requiring manual specialist triage.');
  }

  // 2. High Value Authority Ceiling Checks
  const claimAmount = paymentData?.amount || orderData?.total_amount || 0;
  const authorityCeiling = customerHistory.isVip ? 350.0 : (policy?.authorityLimit || 150.0);

  if (claimAmount > authorityCeiling && (intent.category.includes('Refund') || intent.category.includes('Product')) && !isLowOrNormalPriority) {
    outcome = 'HUMAN_REVIEW';
    escalationReasons.push(`High-value claim amount ($${claimAmount.toFixed(2)}) exceeds automated authority threshold ($${authorityCeiling.toFixed(2)}).`);
  }

  if (policy?.requiresHumanReview && !isLowOrNormalPriority && claimAmount > 100) {
    outcome = 'HUMAN_REVIEW';
    escalationReasons.push(`Policy ${policy.policyCode} specifies manual sign-off for high-value cases.`);
  }

  if (customerHistory.riskScore >= 60) {
    outcome = 'HUMAN_REVIEW';
    escalationReasons.push(`Elevated risk score (${customerHistory.riskScore}) flags case for specialist oversight.`);
  }

  // For Low and Normal priority problems, always ensure AI auto-resolves directly unless an explicit human was requested or conflict was detected
  if (isLowOrNormalPriority && !customerExplicitlyRequestedHuman && verification.status !== 'CONFLICTING') {
    outcome = 'AUTO_RESOLVE';
  }

  // Determine Agent priority
  let assignedPriority: Priority = intent.urgency;
  if (customerHistory.isVip && outcome !== 'AUTO_RESOLVE') assignedPriority = 'URGENT';
  if (outcome === 'ESCALATE') assignedPriority = 'URGENT';

  // Determine specific recommended action
  let recommendedAction = 'ASSIST_CUSTOMER';
  let actionPayload: Record<string, any> = {};

  if (intent.category === 'Payment' || intent.category === 'Refund') {
    if (paymentData && paymentData.status === 'SUCCESS' && outcome === 'AUTO_RESOLVE') {
      recommendedAction = 'AUTO_REFUND_APPROVED';
      actionPayload = { transactionId: paymentData.transaction_id, amount: paymentData.amount };
    } else {
      recommendedAction = 'RESOLVE_BILLING_INQUIRY';
    }
  } else if (intent.category === 'Delivery' || intent.category === 'Order') {
    if (orderData && orderData.status === 'IN_TRANSIT') {
      recommendedAction = 'VERIFY_CARRIER_DISPATCH_AND_EXPEDITE';
      actionPayload = { orderNumber: orderData.order_number, tracking: orderData.tracking_number, courier: orderData.courier };
    } else if (orderData && orderData.status === 'DELIVERED') {
      recommendedAction = 'PROVIDE_DELIVERY_CONFIRMATION_AND_RESOLUTION';
    } else {
      recommendedAction = 'PROVIDE_ORDER_LIFECYCLE_ASSISTANCE';
    }
  } else {
    recommendedAction = 'PROVIDE_DIRECT_POLICY_RESOLUTION';
  }

  // Construct Problem-Specific Customer Explanation
  let whatWasFound = '';
  let whyThisResolutionApplies = '';
  let actionTaken = '';

  const orderNum = orderData?.order_number || 'your recent order';
  const courierName = orderData?.courier || 'our carrier';
  const trackingCode = orderData?.tracking_number || 'assigned tracking';
  const orderStatus = orderData?.status || 'IN_TRANSIT';
  const itemNames = Array.isArray(orderData?.items) 
    ? orderData.items.map((it: any) => it.name).join(', ') 
    : 'ordered items';
  const amountStr = paymentData?.amount ? `$${Number(paymentData.amount).toFixed(2)}` : (orderData?.total_amount ? `$${Number(orderData.total_amount).toFixed(2)}` : '');

  if (outcome === 'AUTO_RESOLVE') {
    if (intent.category === 'Delivery' || intent.category === 'Order' || intent.intent?.toLowerCase().includes('delay') || intent.intent?.toLowerCase().includes('track')) {
      whatWasFound = `We conducted an automated audit of Order ${orderNum} (${itemNames}). Carrier tracking with ${courierName} (Tracking #${trackingCode}) confirms the package is in transit with status: ${orderStatus}. ${rootCause.rootCause ? `Diagnosis: ${rootCause.rootCause}.` : ''}`;
      whyThisResolutionApplies = `Under Policy ${policy?.policyCode || 'POL-004'} (${policy?.title || 'Delivery Delays & Transit Protocol'}), packages experiencing transit delays qualify for priority carrier dispatch updates and delivery guarantees.`;
      actionTaken = `We have pinged ${courierName} logistics for expedited routing to ensure delivery within the next available window. We have also applied a courtesy priority monitoring flag to your order.`;
    } else if (intent.category === 'Payment' || intent.category === 'Refund' || intent.intent?.toLowerCase().includes('charge') || intent.intent?.toLowerCase().includes('duplicate')) {
      whatWasFound = `We audited payment records for transaction ${paymentData?.transaction_id || 'recent billing'} associated with Order ${orderNum}${amountStr ? ` in the amount of ${amountStr}` : ''}. ${rootCause.rootCause ? `Root cause identified: ${rootCause.rootCause}.` : 'Billing records verified successfully.'}`;
      whyThisResolutionApplies = `Under Policy ${policy?.policyCode || 'POL-002'} (${policy?.title || 'Duplicate Charge & Billing Resolution'}), validated duplicate transactions qualify for immediate automated refund processing.`;
      actionTaken = `An automated refund of ${amountStr || 'the charge'} has been authorized and dispatched to your original payment method. Funds typically reflect in your account within 3 to 5 business days depending on your financial institution.`;
    } else if (intent.category === 'Product' || intent.intent?.toLowerCase().includes('damage') || intent.intent?.toLowerCase().includes('defect')) {
      whatWasFound = `We verified your purchase of ${itemNames} in Order ${orderNum}. Your customer profile is in good standing with verified delivery records.`;
      whyThisResolutionApplies = `Under Policy ${policy?.policyCode || 'POL-003'} (${policy?.title || 'Damaged Item & Replacement Policy'}), your item qualifies for expedited replacement or prepaid return processing.`;
      actionTaken = `A return authorization and replacement ticket have been generated for ${itemNames}. Detailed return instructions and a prepaid shipping label have been prepared.`;
    } else {
      whatWasFound = `We reviewed your inquiry regarding "${intent.intent || 'your support request'}" alongside your verified account profile and purchase history.`;
      whyThisResolutionApplies = `Under Policy ${policy?.policyCode || 'POL-001'} (${policy?.title || 'General Customer Service & Support Guidelines'}), your inquiry has been validated and resolved according to standard terms.`;
      actionTaken = `Your inquiry has been processed and full operational guidance has been provided below.`;
    }
  } else {
    whatWasFound = `We reviewed your inquiry regarding "${intent.intent || 'your support case'}" for Order ${orderNum}${amountStr ? ` (${amountStr})` : ''} and gathered all carrier and billing telemetry.`;
    whyThisResolutionApplies = `Because this case involves ${escalationReasons[0] || 'specialized account considerations'}, Policy ${policy?.policyCode || 'POL-008'} routes this directly to a dedicated Senior Specialist for manual review.`;
    actionTaken = `A comprehensive 360° Case Packet containing all telemetry and audit logs has been dispatched to our Support Team with ${assignedPriority} priority. A specialist will follow up with you directly.`;
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
    internalRationale: `Gate Decision: ${outcome}. Urgency: ${intent.urgency}. Priority: ${assignedPriority}. Verification: ${verification.status}. Authority Limit: $${authorityCeiling}. ${escalationReasons.join(' | ')}`,
  };
}
