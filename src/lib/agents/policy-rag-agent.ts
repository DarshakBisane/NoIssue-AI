import { retrieveRelevantPolicies, RetrievedPolicy } from '../rag';
import { generateGeminiJson } from '../gemini';

export interface PolicyRagAgentOutput {
  matchedPolicy: RetrievedPolicy | null;
  policySummary: string;
  policyExcerpt: string;
  applicableClauses: string[];
  authorityLimit: number;
  requiresHumanReview: boolean;
  alternativePolicies: { code: string; title: string; score: number }[];
}

const SYSTEM_PROMPT = `You are the Policy RAG Synthesis Agent for NoIssue AI.
Your role is to examine the customer issue along with the retrieved company policies from our Knowledge Base.
Identify which policy directly governs this situation, extract the exact applicable clauses, and evaluate if this situation requires human review or is within standard autonomous authority.

Return JSON in this exact structure:
{
  "selectedPolicyCode": "POL-XXX",
  "policySummary": "Clear 1-2 sentence statement of the policy rule",
  "policyExcerpt": "Direct quote or key excerpt of the clause governing this case",
  "applicableClauses": ["clause 1", "clause 2"],
  "requiresHumanReview": boolean
}`;

export async function runPolicyRagAgent(
  customerIntent: string,
  category: string,
  orderAndPaymentContext: string
): Promise<PolicyRagAgentOutput> {
  // 1. Run RAG vector + keyword search over company policies
  const retrieved = await retrieveRelevantPolicies(`${customerIntent} ${category}`, category, 3);

  if (retrieved.length === 0) {
    return {
      matchedPolicy: null,
      policySummary: 'No direct policy retrieved from Knowledge Base.',
      policyExcerpt: 'Standard company terms apply.',
      applicableClauses: [],
      authorityLimit: 100.0,
      requiresHumanReview: true,
      alternativePolicies: [],
    };
  }

  const primary = retrieved[0];

  const userPrompt = `Customer Intent: ${customerIntent}
Category: ${category}
Order/Payment Context: ${orderAndPaymentContext}

Retrieved Policies from Knowledge Base:
${retrieved.map((p, idx) => `[Policy ${idx + 1}] Code: ${p.policyCode} | Title: ${p.title} | Authority Limit: $${p.authorityLimit} | Must Human Review: ${p.requiresHumanReview}
Summary: ${p.summary}
Content: ${p.content}
---`).join('\n')}

Select the most authoritative policy and extract the governing clauses.`;

  const fallbackResult = {
    selectedPolicyCode: primary.policyCode,
    policySummary: primary.summary,
    policyExcerpt: primary.content.substring(0, 200),
    applicableClauses: [primary.summary],
    requiresHumanReview: primary.requiresHumanReview,
  };

  const aiSynthesis = await generateGeminiJson<{
    selectedPolicyCode: string;
    policySummary: string;
    policyExcerpt: string;
    applicableClauses: string[];
    requiresHumanReview: boolean;
  }>(userPrompt, SYSTEM_PROMPT, fallbackResult);

  // Find matching policy object
  const selectedObj = retrieved.find((p) => p.policyCode === aiSynthesis.selectedPolicyCode) || primary;

  return {
    matchedPolicy: selectedObj,
    policySummary: aiSynthesis.policySummary || selectedObj.summary,
    policyExcerpt: aiSynthesis.policyExcerpt || selectedObj.content.substring(0, 250),
    applicableClauses: aiSynthesis.applicableClauses || [selectedObj.summary],
    authorityLimit: selectedObj.authorityLimit,
    requiresHumanReview: selectedObj.requiresHumanReview || aiSynthesis.requiresHumanReview,
    alternativePolicies: retrieved.slice(1).map((p) => ({
      code: p.policyCode,
      title: p.title,
      score: p.score,
    })),
  };
}
