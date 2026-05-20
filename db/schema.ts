/**
 * Duel Agents — Postgres schema (Drizzle).
 *
 * Every table the v1 product needs lives here. Designed forward-compatible
 * with subscription billing: `subscriptions` has a generic `tier` field
 * (`beta` for invite-only access today, `indie | pro | team` when MoonPay
 * ships) and a sibling `payment_provider` table holds whatever billing-
 * vendor identifiers we end up with (`moonpay_subscription_id`,
 * `stripe_customer_id`, etc.). No migrations needed when payment lands.
 *
 * Authoritative for the dashboard, the proxy API, the admin tools, the
 * router's per-period quota enforcement, and the savings analytics.
 */

import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  bigint,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/* ─────────────────────────────────────────────────────────── enums */

export const accountRoleEnum = pgEnum("account_role", [
  "owner",
  "admin",
  "member",
]);

export const subscriptionTierEnum = pgEnum("subscription_tier", [
  /** Invite-only access during beta. Quota set manually by admin. */
  "beta",
  /** $19/mo — 10,000 calls. */
  "indie",
  /** $49/mo — 50,000 calls. */
  "pro",
  /** $199/mo — unlimited (1M/mo fair-use cap). */
  "team",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  /** Active and within paid period. */
  "active",
  /** Renewal payment failed; 7-day grace period before hard stop. */
  "grace",
  /** User cancelled; current period still valid until `current_period_end`. */
  "cancelled",
  /** Past `current_period_end` and no successful renewal. Hard stop. */
  "expired",
]);

export const inviteStatusEnum = pgEnum("invite_status", [
  "pending",
  "consumed",
  "expired",
  "revoked",
]);

export const callProviderEnum = pgEnum("call_provider", ["anthropic", "openai"]);

/* ─────────────────────────────────────────────────────────── auth tables
 *
 * Owned by Better-Auth. The shapes follow Better-Auth's Drizzle adapter
 * conventions exactly; do NOT add columns here without checking the
 * adapter's expectations. Custom user metadata lives on `accounts`.
 */

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    name: text("name"),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    emailUnique: uniqueIndex("users_email_unique").on(t.email),
  }),
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tokenUnique: uniqueIndex("sessions_token_unique").on(t.token),
    userIdx: index("sessions_user_idx").on(t.userId),
  }),
);

/** Better-Auth uses this table for OAuth providers AND for email/password
 *  credentials. We don't use OAuth in v1 but the schema is required by the
 *  adapter; keep the table even though it stays mostly empty. */
export const accountsAuth = pgTable(
  "accounts_auth",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    providerIdx: index("accounts_auth_provider_idx").on(t.providerId, t.userId),
  }),
);

/** Verification tokens — magic-link tokens, email verification, etc.
 *  Owned by Better-Auth. */
export const verifications = pgTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    identifierIdx: index("verifications_identifier_idx").on(t.identifier),
  }),
);

/* ─────────────────────────────────────────────────────────── product: accounts */

/** Billing-bearing org. Every user has at least one (auto-created at signup).
 *  Multiple users can share an account via `account_members` (Team tier). */
export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    /** Owner is the user who created the account and controls subscription /
     *  billing. Transferable later via /admin. */
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    ownerIdx: index("accounts_owner_idx").on(t.ownerId),
  }),
);

export const accountMembers = pgTable(
  "account_members",
  {
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: accountRoleEnum("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.accountId, t.userId] }),
    userIdx: index("account_members_user_idx").on(t.userId),
  }),
);

/* ─────────────────────────────────────────────────────────── product: api keys */

/** Duel API keys issued to accounts. Stored sha256-hashed; the plaintext
 *  is shown to the user exactly once at generation time. `prefix` is the
 *  first eight characters of the plaintext, kept in clear so the UI can
 *  show "duel_a1b2c3d4 · created Apr 12" rows without revealing secrets. */
export const duelApiKeys = pgTable(
  "duel_api_keys",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    /** sha256 hex of the full plaintext key. */
    hash: text("hash").notNull(),
    /** First 8 chars of the plaintext (e.g. "a1b2c3d4"); UI displays
     *  `duel_a1b2c3d4_…` so users can identify which key is which. */
    prefix: varchar("prefix", { length: 16 }).notNull(),
    /** User-supplied nickname ("laptop", "ci", "cursor"). */
    name: text("name"),
    /** Set when the key has been used at least once. Lets the dashboard
     *  surface "never used" / "last seen X ago" labels. */
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    /** Soft-revoke. Once set, all `/v1` requests with this key return 401. */
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    hashUnique: uniqueIndex("duel_api_keys_hash_unique").on(t.hash),
    accountIdx: index("duel_api_keys_account_idx").on(t.accountId),
  }),
);

/* ─────────────────────────────────────────────────────────── product: subscriptions */

/** Current subscription state per account. Exactly one row per account.
 *  Created with `tier='beta'` at signup; mutated when the account
 *  subscribes / renews / cancels / expires.
 *
 *  `calls_used_this_period` is the hot-path quota counter. The proxy API
 *  also maintains a Redis cache of the same number for sub-ms checks;
 *  this column is the durable source of truth and is reconciled from the
 *  Redis counter on period rollover. */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    tier: subscriptionTierEnum("tier").notNull().default("beta"),
    status: subscriptionStatusEnum("status").notNull().default("active"),
    monthlyCallQuota: integer("monthly_call_quota").notNull().default(5000),
    callsUsedThisPeriod: integer("calls_used_this_period")
      .notNull()
      .default(0),
    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true })
      .notNull()
      .default(sql`now() + interval '30 days'`),
    cancelAtPeriodEnd: boolean("cancel_at_period_end")
      .notNull()
      .default(false),
    /** Set when status transitions to `grace`. Hard-stops the account at
     *  `grace_started_at + 7 days` unless renewal succeeds. */
    graceStartedAt: timestamp("grace_started_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    accountUnique: uniqueIndex("subscriptions_account_unique").on(t.accountId),
    statusIdx: index("subscriptions_status_idx").on(t.status),
  }),
);

/** Per-provider billing identifiers. 1:1 with `subscriptions` once payment
 *  ships; empty in v1's invite-only beta. Designed to hold whichever
 *  vendor we end up with — MoonPay is locked in for v1 launch but keeping
 *  this generic protects us against a future swap. */
export const paymentProvider = pgTable("payment_provider", {
  subscriptionId: text("subscription_id")
    .primaryKey()
    .references(() => subscriptions.id, { onDelete: "cascade" }),
  /** `moonpay` for v1; other vendors layered on by adding enum values. */
  provider: text("provider").notNull(),
  /** Provider-side subscription id (e.g. MoonPay's subscription identifier). */
  providerSubscriptionId: text("provider_subscription_id"),
  /** Provider-side customer / wallet identifier, when applicable. */
  providerCustomerId: text("provider_customer_id"),
  /** Most recent raw webhook payload, JSON. Useful for debugging
   *  reconciliation issues without diving into provider dashboards. */
  lastWebhookPayload: jsonb("last_webhook_payload"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
});

/* ─────────────────────────────────────────────────────────── product: calls */

/** One row per routed prompt. Source of truth for savings analytics and
 *  for reconciling Redis quota counters on rollover.
 *
 *  `display_model` is what we show the user; `real_model` is what we
 *  actually called. Cost columns are in cents (integer math, no floats).
 *  `flagship_cost_cents` is the reference "Opus 4 / o1" cost used as the
 *  baseline for the savings number. */
export const calls = pgTable(
  "calls",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    apiKeyId: text("api_key_id").references(() => duelApiKeys.id, {
      onDelete: "set null",
    }),
    /** Display model from the marketing catalog — what the dashboard shows. */
    displayModel: text("display_model").notNull(),
    /** Real model we actually called (claude-haiku-3.5, gpt-4o, ...). */
    realModel: text("real_model").notNull(),
    provider: callProviderEnum("provider").notNull(),
    /** Wire protocol the user spoke to us (anthropic = /v1/messages, openai
     *  = /v1/chat/completions). Tracked separately from `provider` because
     *  a user can speak Anthropic protocol while we route to OpenAI. */
    wireProtocol: callProviderEnum("wire_protocol").notNull(),
    tokensIn: integer("tokens_in").notNull().default(0),
    tokensOut: integer("tokens_out").notNull().default(0),
    /** Real provider cost in cents · 10^4 (i.e. micro-cents). Stored at
     *  high precision because individual prompts can be sub-cent. */
    realCostMicrocents: bigint("real_cost_microcents", { mode: "number" })
      .notNull()
      .default(0),
    /** Reference cost for the flagship tier (Opus 4 / o1) at the same
     *  token counts. `saved = flagship - real`. */
    flagshipCostMicrocents: bigint("flagship_cost_microcents", {
      mode: "number",
    })
      .notNull()
      .default(0),
    savedMicrocents: bigint("saved_microcents", { mode: "number" })
      .notNull()
      .default(0),
    latencyMs: integer("latency_ms"),
    taskClass: text("task_class"),
    /** Streaming vs single-shot response. */
    streamed: boolean("streamed").notNull().default(false),
    /** Request metadata for abuse detection / debugging. */
    ip: text("ip"),
    userAgent: text("user_agent"),
    /** Set when the call errored out (provider error, quota refusal,
     *  internal exception). `null` = success. */
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    accountIdx: index("calls_account_idx").on(t.accountId, t.createdAt),
    apiKeyIdx: index("calls_api_key_idx").on(t.apiKeyId, t.createdAt),
    createdAtIdx: index("calls_created_at_idx").on(t.createdAt),
  }),
);

/* ─────────────────────────────────────────────────────────── product: invites + waitlist */

/** Waitlist signups from the marketing site. Already populated by the
 *  existing `/api/waitlist` route handler; admins invite from here. */
export const waitlist = pgTable(
  "waitlist",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    /** Optional referrer / source label, captured from the marketing form. */
    source: text("source"),
    /** Once invited, this points at the matching `invites` row. */
    invitedInviteId: text("invited_invite_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    emailUnique: uniqueIndex("waitlist_email_unique").on(t.email),
  }),
);

/** Admin-generated invitations. Each has a one-time token; clicking the
 *  link in the invite email consumes it, creates the user, creates the
 *  account, and signs the user in. */
export const invites = pgTable(
  "invites",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    /** Cryptographically random one-time token. URL-safe. */
    token: text("token").notNull(),
    status: inviteStatusEnum("status").notNull().default("pending"),
    /** Quota granted to the new account on signup. Lets admins hand-tune
     *  per-invitee limits when sending the email. */
    grantedQuota: integer("granted_quota").notNull().default(5000),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    /** Which admin user sent the invite. */
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    /** Account that was created when the invite was consumed. */
    createdAccountId: text("created_account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tokenUnique: uniqueIndex("invites_token_unique").on(t.token),
    emailIdx: index("invites_email_idx").on(t.email),
    statusIdx: index("invites_status_idx").on(t.status),
  }),
);

/* ─────────────────────────────────────────────────────────── relations */

export const usersRelations = relations(users, ({ many }) => ({
  ownedAccounts: many(accounts),
  memberships: many(accountMembers),
  sessions: many(sessions),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  owner: one(users, {
    fields: [accounts.ownerId],
    references: [users.id],
  }),
  members: many(accountMembers),
  apiKeys: many(duelApiKeys),
  subscription: one(subscriptions, {
    fields: [accounts.id],
    references: [subscriptions.accountId],
  }),
  calls: many(calls),
}));

export const accountMembersRelations = relations(accountMembers, ({ one }) => ({
  account: one(accounts, {
    fields: [accountMembers.accountId],
    references: [accounts.id],
  }),
  user: one(users, {
    fields: [accountMembers.userId],
    references: [users.id],
  }),
}));

export const duelApiKeysRelations = relations(duelApiKeys, ({ one, many }) => ({
  account: one(accounts, {
    fields: [duelApiKeys.accountId],
    references: [accounts.id],
  }),
  calls: many(calls),
}));

export const subscriptionsRelations = relations(
  subscriptions,
  ({ one }) => ({
    account: one(accounts, {
      fields: [subscriptions.accountId],
      references: [accounts.id],
    }),
    payment: one(paymentProvider, {
      fields: [subscriptions.id],
      references: [paymentProvider.subscriptionId],
    }),
  }),
);

export const callsRelations = relations(calls, ({ one }) => ({
  account: one(accounts, {
    fields: [calls.accountId],
    references: [accounts.id],
  }),
  apiKey: one(duelApiKeys, {
    fields: [calls.apiKeyId],
    references: [duelApiKeys.id],
  }),
}));

export const invitesRelations = relations(invites, ({ one }) => ({
  createdBy: one(users, {
    fields: [invites.createdByUserId],
    references: [users.id],
  }),
  createdAccount: one(accounts, {
    fields: [invites.createdAccountId],
    references: [accounts.id],
  }),
}));

/* ─────────────────────────────────────────────────────────── exported types */

export type User = typeof users.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type AccountMember = typeof accountMembers.$inferSelect;
export type DuelApiKey = typeof duelApiKeys.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Call = typeof calls.$inferSelect;
export type Invite = typeof invites.$inferSelect;
export type Waitlist = typeof waitlist.$inferSelect;
