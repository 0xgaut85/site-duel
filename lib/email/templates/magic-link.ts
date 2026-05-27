export function magicLinkEmailHtml(url: string): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:40px 20px;background:#0e0e0c;color:#d6d5d0;font-family:'Inter',-apple-system,Segoe UI,Helvetica,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;padding:32px;background:#171715;border:1px solid rgba(255,255,255,0.06);">
      <p style="font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.28em;color:#8a8a86;margin:0 0 24px;">/ DUEL AGENTS · SIGN IN</p>
      <h1 style="font-size:24px;line-height:1.2;font-weight:500;letter-spacing:-0.025em;margin:0 0 16px;color:#f3f2ed;">Your sign-in link.</h1>
      <p style="margin:0 0 24px;line-height:1.55;color:#c2c1bc;">Click the button below to sign in. The link is valid for 15 minutes and can only be used once.</p>
      <a href="${url}" style="display:inline-block;padding:14px 22px;background:#c84a1a;color:#ffffff;text-decoration:none;font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;">Sign in to Duel Agents →</a>
      <p style="margin:28px 0 0;font-size:12px;color:#8a8a86;line-height:1.55;">If you didn't request this email, you can ignore it.</p>
    </div>
  </body>
</html>`;
}

export function magicLinkEmailText(url: string): string {
  return `Your sign-in link for Duel Agents.

Open this link in your browser to sign in. Valid for 15 minutes, single use.

${url}

If you didn't request this email, you can ignore it.`;
}
