/**
 * Neon Postgres client (serverless, HTTP-based — works on Vercel functions
 * and edge runtimes without connection pooling issues).
 *
 * Requires DATABASE_URL to be set (see .env.local).
 */
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn(
    "[db] DATABASE_URL is not set. Auth (users, invites) will fail.",
  );
}

// `sql` is a tagged-template query function: sql`select * from foo where id = ${id}`
export const sql = neon(connectionString || "");
