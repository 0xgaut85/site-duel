CREATE TYPE "public"."crypto_chain" AS ENUM('base', 'polygon');--> statement-breakpoint
CREATE TYPE "public"."crypto_payment_status" AS ENUM('pending', 'confirmed', 'expired');--> statement-breakpoint
CREATE TABLE "crypto_payment_intents" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"subscription_id" text NOT NULL,
	"tier" "subscription_tier" NOT NULL,
	"chain" "crypto_chain" NOT NULL,
	"amount_micro_usdc" bigint NOT NULL,
	"status" "crypto_payment_status" DEFAULT 'pending' NOT NULL,
	"matched_tx_hash" text,
	"matched_at" timestamp with time zone,
	"scan_from_block" bigint NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crypto_payment_intents" ADD CONSTRAINT "crypto_payment_intents_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crypto_payment_intents" ADD CONSTRAINT "crypto_payment_intents_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crypto_intents_status_chain_amount_idx" ON "crypto_payment_intents" USING btree ("status","chain","amount_micro_usdc");--> statement-breakpoint
CREATE INDEX "crypto_intents_account_idx" ON "crypto_payment_intents" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "crypto_intents_chain_tx_unique" ON "crypto_payment_intents" USING btree ("chain","matched_tx_hash");