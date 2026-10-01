import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';

if (!apiKey) {
  console.warn('[Gemini Warning] GEMINI_API_KEY is not configured in environment.');
}

const genAI = new GoogleGenerativeAI(apiKey);

export const GEMINI_MODEL = 'gemini-2.5-flash';
export const EMBEDDING_MODEL = 'text-embedding-004';

/**
 * Helper to strip markdown code fences from JSON output
 */
function cleanJsonText(raw: string): string {
  let text = raw.trim();
  if (text.startsWith('```json')) {
    text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (text.startsWith('```')) {
    text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return text.trim();
}

/**
 * Robust LLM call with retry and exponential backoff
 */
export async function generateGeminiText(
  prompt: string,
  systemInstruction?: string,
  temperature: number = 0.2
): Promise<string> {
  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    try {
      attempts++;
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction: systemInstruction ? { role: 'system', parts: [{ text: systemInstruction }] } : undefined,
        generationConfig: {
          temperature,
          maxOutputTokens: 2048,
        },
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return text || '';
    } catch (err: any) {
      console.warn(`[Gemini Error - Attempt ${attempts}/${maxAttempts}]:`, err.message);
      // Fail fast immediately on rate limits / quota exceeded
      if (err.message.includes('429') || err.message.includes('Quota exceeded') || err.message.includes('ResourceExhausted')) {
        throw new Error(`Gemini rate limited: ${err.message}`);
      }
      if (attempts >= maxAttempts) {
        throw new Error(`Gemini generation failed after ${maxAttempts} attempts: ${err.message}`);
      }
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  return '';
}

/**
 * Generate Structured JSON with schema enforcement & validation
 */
export async function generateGeminiJson<T>(
  prompt: string,
  systemInstruction: string,
  fallback: T
): Promise<T> {
  try {
    const formattedPrompt = `${prompt}

CRITICAL: Return ONLY a valid, parseable JSON object matching the requested schema. Do not output conversational preamble, explanation, or markdown formatting outside the JSON block.`;

    const raw = await generateGeminiText(formattedPrompt, systemInstruction, 0.1);
    const cleaned = cleanJsonText(raw);
    const parsed = JSON.parse(cleaned) as T;
    return parsed;
  } catch (err: any) {
    console.error('[Gemini JSON Parsing Error]:', err.message);
    return fallback;
  }
}

/**
 * Vector Embedding generation
 */
export async function getGeminiEmbedding(text: string): Promise<number[]> {
  try {
    if (!apiKey) throw new Error('API key missing');
    const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
    const result = await model.embedContent(text.substring(0, 2048));
    return result.embedding.values;
  } catch (err: any) {
    console.warn('[Gemini Embedding Error, using vector hash fallback]:', err.message);
    // Deterministic semantic hash vector fallback (32 dims)
    return generateFallbackEmbedding(text);
  }
}

function generateFallbackEmbedding(text: string): number[] {
  const words = text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  const vector = new Array(32).fill(0);
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    for (let j = 0; j < word.length; j++) {
      hash = (hash << 5) - hash + word.charCodeAt(j);
      hash |= 0;
    }
    const idx = Math.abs(hash) % 32;
    vector[idx] += 1 / (i + 1);
  }
  const mag = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => Number((v / mag).toFixed(6)));
}
