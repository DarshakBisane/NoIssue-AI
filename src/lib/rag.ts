import { query } from './db';
import { getGeminiEmbedding } from './gemini';
import { getCache, setCache } from './redis';

export interface RetrievedPolicy {
  policyId: string;
  policyCode: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  authorityLimit: number;
  requiresHumanReview: boolean;
  score: number;
  matchedChunk: string;
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  // If lengths differ, compare common prefix
  const len = Math.min(vecA.length, vecB.length);
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < len; i++) {
    dot += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export async function retrieveRelevantPolicies(
  userQuery: string,
  categoryHint?: string,
  topK: number = 3
): Promise<RetrievedPolicy[]> {
  const cacheKey = `rag:policies:${userQuery.trim().toLowerCase()}:${categoryHint || 'all'}`;
  const cached = await getCache<RetrievedPolicy[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // 1. Get query embedding
    const queryEmbedding = await getGeminiEmbedding(userQuery);

    // 2. Fetch active policy chunks from PostgreSQL
    const sql = `
      SELECT 
        p.id as policy_id,
        p.policy_code,
        p.title,
        p.category,
        p.summary,
        p.content,
        p.authority_limit,
        p.requires_human_review,
        pc.chunk_text,
        pc.embedding_vector
      FROM policies p
      JOIN policy_chunks pc ON p.id = pc.policy_id
      WHERE p.is_active = true
    `;

    const res = await query(sql);
    if (res.rows.length === 0) {
      return [];
    }

    const lowerQuery = userQuery.toLowerCase();
    const queryWords = lowerQuery.replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter((w) => w.length > 2);

    // 3. Compute hybrid score (Vector Cosine Similarity + Keyword Category Match)
    const scoredList = res.rows.map((row) => {
      let vectorScore = 0;
      if (row.embedding_vector) {
        const vec = Array.isArray(row.embedding_vector)
          ? row.embedding_vector
          : JSON.parse(row.embedding_vector);
        vectorScore = cosineSimilarity(queryEmbedding, vec);
      }

      // Keyword boost
      let keywordBoost = 0;
      const textToSearch = `${row.title} ${row.category} ${row.summary} ${row.content}`.toLowerCase();
      for (const word of queryWords) {
        if (textToSearch.includes(word)) {
          keywordBoost += 0.08;
        }
      }

      // Category match boost
      if (categoryHint && row.category.toLowerCase().includes(categoryHint.toLowerCase())) {
        keywordBoost += 0.15;
      }

      const totalScore = Math.min(1.0, vectorScore * 0.7 + keywordBoost);

      return {
        policyId: row.policy_id,
        policyCode: row.policy_code,
        title: row.title,
        category: row.category,
        summary: row.summary,
        content: row.content,
        authorityLimit: parseFloat(row.authority_limit || '100.00'),
        requiresHumanReview: Boolean(row.requires_human_review),
        score: Number(totalScore.toFixed(4)),
        matchedChunk: row.chunk_text,
      };
    });

    // 4. Sort and deduplicate by policyId
    scoredList.sort((a, b) => b.score - a.score);

    const seenPolicies = new Set<string>();
    const topPolicies: RetrievedPolicy[] = [];

    for (const item of scoredList) {
      if (!seenPolicies.has(item.policyId)) {
        seenPolicies.add(item.policyId);
        topPolicies.push(item);
        if (topPolicies.length >= topK) break;
      }
    }

    // Cache in Redis for 10 minutes
    await setCache(cacheKey, topPolicies, 600);

    return topPolicies;
  } catch (err: any) {
    console.error('[RAG Retrieval Error]:', err.message);
    return [];
  }
}
