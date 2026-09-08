import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// Supavisor transaction mode does not support prepared statements and can lose replies
// from pipelined transactions. Keep one serverless-friendly connection and serialize its
// protocol messages so concurrent React rendering cannot leave queries hanging.
const queryClientOptions = {
  prepare: false,
  max: 1,
  // Supported by postgres.js at runtime but missing from its published 3.4.9 types.
  max_pipeline: 0,
} satisfies postgres.Options<Record<string, postgres.PostgresType>> & { max_pipeline: number };

const queryClient = postgres(connectionString, queryClientOptions);

export const db = drizzle(queryClient, { schema });
