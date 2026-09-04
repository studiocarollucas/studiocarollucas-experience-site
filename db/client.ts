import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// `prepare: false` is required by Supabase's transaction-mode pooler (pgbouncer does not
// support prepared statements); `max: 1` keeps the connection count serverless-friendly.
const queryClient = postgres(connectionString, { prepare: false, max: 1 });

export const db = drizzle(queryClient, { schema });
