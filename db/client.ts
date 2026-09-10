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
  // `0` leaves postgres.js without a queue slot during transactions. One slot
  // serializes requests for Supavisor while keeping the driver's queue valid.
  max_pipeline: 1,
} satisfies postgres.Options<Record<string, postgres.PostgresType>> & { max_pipeline: number };

const queryClient = postgres(connectionString, queryClientOptions);

export const db = drizzle(queryClient, { schema });
