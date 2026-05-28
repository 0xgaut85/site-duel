import type { Subscription } from "@/db/schema";
import { isPaidSubscription } from "@/lib/billing/tiers";

export function hasActivePaidSubscription(
  subscription: Pick<
    Subscription,
    "tier" | "status" | "currentPeriodEnd"
  > | null | undefined,
): boolean {
  if (!subscription) return false;
  if (!isPaidSubscription(subscription.tier)) return false;
  if (subscription.status !== "active") return false;
  return subscription.currentPeriodEnd.getTime() > Date.now();
}
