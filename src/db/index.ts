import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

// Reuse one client across hot reloads in dev and across invocations on a warm
// serverless instance. `prepare: false` keeps it compatible with Neon's pooler.
const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };
const sql = globalForDb.sql ?? postgres(url, { prepare: false, max: 5 });
if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;

export const db = drizzle(sql, { schema });
export { schema };
