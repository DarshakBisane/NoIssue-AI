export type UserRole = 'customer' | 'support_agent' | 'admin';

export type TicketStatus =
  | 'OPEN'
  | 'INVESTIGATING'
  | 'AI_RESOLVED'
  | 'WAITING_FOR_CUSTOMER'
  | 'HUMAN_REVIEW'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED'
  | 'ESCALATED';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type VerificationStatus =
  | 'SUPPORTED'
  | 'PARTIALLY_SUPPORTED'
  | 'CONFLICTING'
  | 'INSUFFICIENT_EVIDENCE';

export type DecisionOutcome = 'AUTO_RESOLVE' | 'HUMAN_REVIEW' | 'ESCALATE';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  is_vip: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerProfile {
  id: string;
  user_id: string;
  tier: 'STANDARD' | 'SILVER' | 'GOLD' | 'PLATINUM';
  risk_score: number;
  total_orders: number;
  total_spent: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sku: string;
}

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  status: 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED' | 'FAILED';
  total_amount: number;
  currency: string;
  courier?: string;
  tracking_number?: string;
  estimated_delivery?: string;
  actual_delivery?: string;
  items_json: OrderItem[];
  shipping_address?: ShippingAddress;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  transaction_id: string;
  user_id: string;
  order_id?: string;
  amount: number;
  currency: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'DISPUTED';
  payment_method: string;
  refunded_amount: number;
  gateway_response?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Policy {
  id: string;
  policy_code: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  authority_limit: number;
  requires_human_review: boolean;
  is_active: boolean;
  version: string;
  effective_date: string;
  created_at: string;
  updated_at: string;
}

export interface PolicyChunk {
  id: string;
  policy_id: string;
  chunk_index: number;
  chunk_text: string;
  embedding_vector?: number[];
  metadata_json?: Record<string, any>;
  created_at: string;
}

export interface Message {
  id: string;
  ticket_id: string;
  sender_id?: string | null;
  sender_role: 'CUSTOMER' | 'AI' | 'SUPPORT_AGENT' | 'SYSTEM';
  sender_name: string;
  message_text: string;
  attachments_json?: any[];
  is_internal: boolean;
  created_at: string;
}

export interface InvestigationEvidence {
  label: string;
  value: string;
  status?: 'verified' | 'warning' | 'alert' | 'info';
}

export interface InvestigationStep {
  step: string;
  status: 'completed' | 'in_progress' | 'skipped' | 'failed';
  summary: string;
}

export interface Investigation {
  id: string;
  ticket_id: string;
  intent_detected?: string;
  intent_confidence?: number;
  intent_category?: string;
  urgency?: Priority;
  customer_history_summary?: string;
  order_summary?: string;
  payment_summary?: string;
  policy_matched_id?: string;
  policy_matched_title?: string;
  policy_excerpt?: string;
  root_cause?: string;
  verification_status: VerificationStatus;
  verification_reason?: string;
  decision_outcome: DecisionOutcome;
  recommended_action?: string;
  resolution_explanation?: string;
  action_taken_summary?: string;
  evidence_json: InvestigationEvidence[];
  steps_json: InvestigationStep[];
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  user_id: string;
  assigned_agent_id?: string | null;
  subject: string;
  description: string;
  category: string;
  detected_category?: string;
  priority: Priority;
  status: TicketStatus;
  order_id?: string | null;
  payment_id?: string | null;
  resolution_summary?: string | null;
  root_cause?: string | null;
  action_executed?: Record<string, any>;
  closed_at?: string | null;
  retention_until?: string | null;
  reopened_at?: string | null;
  reopen_count?: number;
  created_at: string;
  updated_at: string;
  
  // Relations when joined
  customer_name?: string;
  customer_email?: string;
  customer_tier?: string;
  assigned_agent_name?: string;
  investigation?: Investigation;
  messages?: Message[];
  order?: Order;
  payment?: Payment;
}

export interface EscalationPacket {
  customer: {
    name: string;
    email: string;
    tier: string;
    riskScore: number;
    phone?: string;
  };
  ticket: {
    id: string;
    number: string;
    subject: string;
    description: string;
    category: string;
    priority: Priority;
    createdAt: string;
  };
  intent: {
    category: string;
    summary: string;
    confidence: number;
  };
  orderInfo?: {
    orderNumber?: string;
    status?: string;
    total?: number;
    courier?: string;
    tracking?: string;
    items?: OrderItem[];
  };
  paymentInfo?: {
    transactionId?: string;
    status?: string;
    amount?: number;
    method?: string;
  };
  policyMatched?: {
    code: string;
    title: string;
    summary: string;
    authorityLimit: number;
  };
  verification: {
    status: VerificationStatus;
    reason: string;
  };
  rootCause: string;
  aiRecommendation: string;
  escalationReason: string;
}

export interface TicketEvent {
  id: string;
  ticket_id: string;
  actor_id?: string;
  actor_role: 'CUSTOMER' | 'AI' | 'SUPPORT_AGENT' | 'SYSTEM';
  event_type: string;
  old_state?: string;
  new_state?: string;
  details_json?: Record<string, any>;
  created_at: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
}
