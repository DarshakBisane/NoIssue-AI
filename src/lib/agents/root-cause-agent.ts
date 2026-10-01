import { generateGeminiJson } from '../gemini';

export interface RootCauseOutput {
  rootCause: string;
  responsibleParty: 'CARRIER' | 'PAYMENT_GATEWAY' | 'SYSTEM' | 'CUSTOMER_MISUNDERSTANDING' | 'WAREHOUSE' | 'PRODUCT_DEFECT' | 'SECURITY';
  confidence: number;
  explanation: string;
  evidenceFactors: string[];
}

const SYSTEM_PROMPT = `You are the Root Cause Analysis AI Agent for NoIssue AI.
Your role is to analyze all gathered facts (Customer statement, orders, payments, tracking, carrier updates, history) and pinpoint the root cause of the customer issue.
Be objective and precise.

Return JSON in this format:
{
  "rootCause": "Concise 1-sentence technical root cause",
  "responsibleParty": "CARRIER" | "PAYMENT_GATEWAY" | "SYSTEM" | "CUSTOMER_MISUNDERSTANDING" | "WAREHOUSE" | "PRODUCT_DEFECT" | "SECURITY",
  "confidence": 0.95,
  "explanation": "Clear explanation of how the issue occurred",
  "evidenceFactors": ["Fact 1", "Fact 2"]
}`;

export async function runRootCauseAgent(
  customerQuery: string,
  orderFacts: string,
  paymentFacts: string,
  historyFacts: string
): Promise<RootCauseOutput> {
  const userPrompt = `Customer Query: ${customerQuery}
Order Facts: ${orderFacts}
Payment Facts: ${paymentFacts}
Customer Profile/History Facts: ${historyFacts}

Identify the root cause, responsible party, and evidence factors.`;

  const fallback: RootCauseOutput = {
    rootCause: 'Inquiry regarding order/payment fulfillment details.',
    responsibleParty: 'SYSTEM',
    confidence: 0.85,
    explanation: 'Standard inquiry requiring customer support review.',
    evidenceFactors: [orderFacts, paymentFacts],
  };

  return generateGeminiJson<RootCauseOutput>(userPrompt, SYSTEM_PROMPT, fallback);
}
