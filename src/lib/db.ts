import { Pool, QueryResult, QueryResultRow } from 'pg';

declare global {
  // Prevent multiple pool instances during Next.js hot-reloading
  var _pgPool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("WARNING: DATABASE_URL is not set in environment variables!");
}

export const pool: Pool =
  global._pgPool ||
  new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

if (process.env.NODE_ENV !== 'production') {
  global._pgPool = pool;
}

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    const start = Date.now();
    try {
      const res = await pool.query<T>(text, params);
      const duration = Date.now() - start;
      if (process.env.NODE_ENV === 'development' && duration > 500) {
        console.log(`[DB Slow Query] ${duration}ms: ${text.substring(0, 100)}...`);
      }
      return res;
    } catch (err: any) {
      const isConnectionError =
        err.message?.includes('Connection terminated') ||
        err.message?.includes('timeout') ||
        err.code === 'ECONNRESET';

      if (isConnectionError && attempts < maxAttempts) {
        console.warn(`[DB Retry ${attempts}/${maxAttempts}] Re-attempting query after error: ${err.message}`);
        await new Promise((r) => setTimeout(r, 500 * attempts));
        continue;
      }

      console.error(`[DB Error] query "${text.substring(0, 100)}..." failed:`, err.message);
      throw err;
    }
  }

  throw new Error(`Query failed after ${maxAttempts} attempts`);
}

export async function withTransaction<T>(
  callback: (client: import('pg').PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
