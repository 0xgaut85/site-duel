/** Maps server errors to user-safe checkout messages. */
export function cryptoIntentErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) {
    return "Could not create payment intent.";
  }

  const m = err.message;

  if (m.includes("not configured")) return m;
  if (m.includes("RPC") || m.includes("RPC URL")) {
    return "Blockchain RPC is temporarily unavailable. Try again or switch network.";
  }
  if (m.includes("subscription")) {
    return "Your billing account is not ready. Refresh the page and try again.";
  }
  if (
    m.includes("relation") &&
    m.includes("does not exist") &&
    m.includes("crypto_payment")
  ) {
    return "Crypto billing is not set up on this server (missing database table).";
  }

  return "Could not create payment intent.";
}
