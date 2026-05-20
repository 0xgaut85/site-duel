/**
 * Postgres connection client (Drizzle ORM + postgres-js driver).
 *
 * Connections are created lazily on first use — not at import time —
 * so `next build` succeeds without DATABASE_URL (e.g. marketing-only
 * Railway deploys). At runtime, any query throws a clear error if
 * DATABASE_URL is still missing.
 *
 * Module-scoped singletons so Next.js's per-route handler instantiation
 * doesn't open a new pool on every request.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __duel_pg__: ReturnType<typeof postgres> | undefined;
  // eslint-disable-next-line no-var
  var __duel_db__: PostgresJsDatabase<typeof schema> | undefined;
}

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add your Railway Postgres connection string to the service variables (or .env.local for local dev).",
    );
  }
  return url;
}

function getPgClient() {
  if (!globalThis.__duel_pg__) {
    globalThis.__duel_pg__ = postgres(requireDatabaseUrl(), {
      max: process.env.NODE_ENV === "production" ? 10 : 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return globalThis.__duel_pg__;
}

/** Lazily opens the pool + Drizzle client. Safe to import during `next build`. */
export function getDb(): PostgresJsDatabase<typeof schema> {
  if (!globalThis.__duel_db__) {
    globalThis.__duel_db__ = drizzle(getPgClient(), { schema });
  }
  return globalThis.__duel_db__;
}

/**
 * Drop-in for `getDb()` — defers connection until the first property
 * access (`db.select`, etc.) so importing this module never touches
 * Postgres during the build phase.
 */
export const db: PostgresJsDatabase<typeof schema> = new Proxy(
  {} as PostgresJsDatabase<typeof schema>,
  {
    get(_target, prop) {
      const real = getDb();
      const value = Reflect.get(real, prop, real);
      if (typeof value === "function") {
        return (value as (...args: unknown[]) => unknown).bind(real);
      }
      return value;
    },
  },
);

export type Database = PostgresJsDatabase<typeof schema>;
export { schema };
