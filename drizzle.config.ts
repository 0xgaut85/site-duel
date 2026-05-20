/**
 * Drizzle Kit config — controls migration generation, `db:push`, and
 * `db:studio`. The CLI reads from this file at the repo root.
 *
 * Migrations land in `db/migrations/`, schema is `db/schema.ts`.
 * Authoritative connection string is `DATABASE_URL`, the same value used
 * at runtime by `db/client.ts`.
 */

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  /* Verbose by default — migrations are infrequent and a clear log
   * outweighs the noise. */
  verbose: true,
  /* Always confirm destructive changes interactively. */
  strict: true,
});
