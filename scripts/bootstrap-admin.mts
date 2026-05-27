/**
 * Bootstrap the first admin user via invite flow (magic link email).
 *
 * Usage:
 *   npx tsx scripts/bootstrap-admin.mts you@company.com
 */

import { inviteEmail } from "../lib/invites";

const email = process.argv[2]?.trim();
if (!email) {
  console.error("Usage: npx tsx scripts/bootstrap-admin.mts <email>");
  process.exit(1);
}

const adminId = process.env.BOOTSTRAP_ADMIN_USER_ID ?? "bootstrap-system";

inviteEmail({
  email,
  adminUserId: adminId,
  grantedQuota: 5000,
})
  .then((result) => {
    console.log("Invited:", email);
    console.log("Created new user:", result.created);
    console.log("User id:", result.userId);
    console.log("Magic link email sent via Resend (if configured).");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
