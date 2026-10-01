import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { getGeminiEmbedding } from '@/lib/gemini';
import { delCache } from '@/lib/redis';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    let sql = `
      SELECT id, policy_code, title, category, summary, content, authority_limit, requires_human_review, is_active, version, effective_date, updated_at
      FROM policies
      WHERE is_active = true
    `;
    const params: any[] = [];

    if (category && category !== 'ALL') {
      params.push(category);
      sql += ` AND category = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(title) LIKE $${params.length} OR LOWER(summary) LIKE $${params.length} OR LOWER(content) LIKE $${params.length} OR LOWER(policy_code) LIKE $${params.length})`;
    }

    sql += ` ORDER BY category ASC, policy_code ASC`;

    const res = await query(sql, params);

    return NextResponse.json({ policies: res.rows });
  } catch (err: any) {
    console.error('[Policies API Error]:', err);
    return NextResponse.json({ error: 'Failed to fetch policies.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { user, errorResponse } = requireAuth(req, ['support_agent', 'admin']);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { policyCode, title, category, summary, content, authorityLimit, requiresHumanReview } = body;

    if (!policyCode || !title || !category || !content) {
      return NextResponse.json({ error: 'Policy Code, Title, Category, and Content are required.' }, { status: 400 });
    }

    // Insert policy into PostgreSQL
    const polRes = await query(`
      INSERT INTO policies (policy_code, title, category, summary, content, authority_limit, requires_human_review, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      ON CONFLICT (policy_code) DO UPDATE SET
        title = $2, category = $3, summary = $4, content = $5, authority_limit = $6, requires_human_review = $7, updated_at = NOW()
      RETURNING id, policy_code, title;
    `, [
      policyCode.trim().toUpperCase(),
      title.trim(),
      category.trim(),
      summary?.trim() || title.trim(),
      content.trim(),
      parseFloat(authorityLimit || '100.00'),
      Boolean(requiresHumanReview),
    ]);

    const savedPolicy = polRes.rows[0];

    // Generate RAG chunk and embedding vector
    const chunkText = `${title}. Category: ${category}. ${summary} Content: ${content}`;
    const embedding = await getGeminiEmbedding(chunkText);

    await query(`DELETE FROM policy_chunks WHERE policy_id = $1`, [savedPolicy.id]);
    await query(`
      INSERT INTO policy_chunks (policy_id, chunk_index, chunk_text, embedding_vector, metadata_json)
      VALUES ($1, 0, $2, $3, $4)
    `, [savedPolicy.id, chunkText, JSON.stringify(embedding), JSON.stringify({ code: policyCode, category, authorityLimit })]);

    // Clear RAG Redis cache
    await delCache(`rag:policies:*`);

    return NextResponse.json({
      success: true,
      message: 'Policy created and indexed in RAG knowledge base successfully.',
      policy: savedPolicy,
    }, { status: 201 });
  } catch (err: any) {
    console.error('[Create Policy API Error]:', err);
    return NextResponse.json({ error: 'Failed to create policy.' }, { status: 500 });
  }
}
