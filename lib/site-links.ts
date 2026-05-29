/** Shared outbound links for marketing chrome. */

export const X_TWITTER_URL = "https://x.com/duelagentscom";

export const GITHUB_URL_DEFAULT = "https://github.com/2aronS/Duel-Agents";

export const GITHUB_URL =
  process.env.NEXT_PUBLIC_GITHUB_URL?.trim() || GITHUB_URL_DEFAULT;
