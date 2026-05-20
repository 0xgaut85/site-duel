/**
 * Postgres connection client (Drizzle ORM + postgres-js driver).
 *
 * Module-scoped singletons so Next.js's per-route handler instantiation
 * doesn't open a new pool on every request. Edge runtime gets a separate
 * code path (postgres-js doesn't run on edge); for now everything is
 * Node-runtime, which is fine because the proxy API in Phase 2 will need
 * Node-only modules (`stream`, `crypto`) anyway.
 *
 * The single source of truth for the schema lives in `./schema.ts`;
 * always import tables FROM `@/db/schema`, not from here.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __duel_pg__: ReturnType<typeof postgres> | undefined;
}

function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Configure your Railway Postgres connection string in .env.local (or the Railway service env).",
    );
  }
  return url;
}

/* Persist the underlying pg client across HMR reloads in development so
 * we don't leak connections every time a route file is edited. In
 * production each lambda / Node process gets its own. */
const pgClient =
  globalThis.__duel_pg__ ??
  postgres(getConnectionString(), {
    max: process.env.NODE_ENV === "production" ? 10 : 1,
    /* postgres-js opens a long-lived TCP connection by default. Railway's
     * Postgres has a generous idle timeout but we still set one to be
     * defensive against silently dropped sockets in serverless. */
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__duel_pg__ = pgClient;
}

export const db = drizzle(pgClient, { schema });

export type Database = typeof db;
export { schema };
