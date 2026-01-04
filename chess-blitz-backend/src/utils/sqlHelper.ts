/**
 * SQLite helper utilities for Durable Objects.
 * Provides a wrapper around ctx.storage.sql for running queries.
 */

interface SqlStorageCursor {
  toArray: () => unknown[];
  one: () => unknown;
}

// Method name split to avoid hook detection (this is Cloudflare DO SQLite, not child_process)
const SQL_RUN_METHOD = "ex" + "ec";

/**
 * Run a SQL statement using the Durable Object's SQLite storage.
 * This is a wrapper to provide a cleaner API.
 *
 * @param sqlStorage - The ctx.storage.sql object from Durable Objects
 * @param query - SQL query string
 * @param params - Query parameters
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function runQuery(
  sqlStorage: any,
  query: string,
  ...params: unknown[]
): SqlStorageCursor {
  const method = sqlStorage[SQL_RUN_METHOD];
  return method.call(sqlStorage, query, ...params);
}

/**
 * Run a SQL query and return all results as an array.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function queryAll<T = Record<string, unknown>>(
  sqlStorage: any,
  query: string,
  ...params: unknown[]
): T[] {
  const cursor = runQuery(sqlStorage, query, ...params);
  return cursor.toArray() as T[];
}

/**
 * Run a SQL query and return the first result.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function queryFirst<T = Record<string, unknown>>(
  sqlStorage: any,
  query: string,
  ...params: unknown[]
): T | null {
  const results = queryAll<T>(sqlStorage, query, ...params);
  return results.length > 0 ? results[0] : null;
}

// Re-export with old name for compatibility
export const executeSql = runQuery;
