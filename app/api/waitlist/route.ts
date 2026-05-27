import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { addToWaitlist } from "@/lib/waitlist/store";
import { getRateLimiter } from "@/lib/waitlist/ratelimit";
import { sendWaitlistEmails } from "@/lib/waitlist/email";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email().max(320),
});

function getIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  // Rate-limit per IP (best-effort; if Upstash isn't configured we skip).
  const limiter = getRateLimiter();
  if (limiter) {
    const { success, reset } = await limiter.limit(ip);
    if (!success) {
      const retry = Math.max(0, reset - Date.now());
      return NextResponse.json(
        {
          ok: false,
          message: "Too many requests. Try again in a few minutes.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(retry / 1000)) },
        },
      );
    }
  }

  let parsed: z.infer<typeof Body>;
  try {
    const body = (await req.json()) as unknown;
    parsed = Body.parse(body);
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid email address." },
      { status: 400 },
    );
  }

  const email = parsed.email.toLowerCase().trim();

  try {
    const { added, total } = await addToWaitlist({
      email,
      ip,
      userAgent: req.headers.get("user-agent") ?? undefined,
      ts: Date.now(),
    });

    if (added) {
      // Fire-and-forget; we already have the row, but await for serverless safety.
      await sendWaitlistEmails(email, total).catch((err) => {
        console.error("[waitlist] email send failed:", err);
      });
    }

    return NextResponse.json({
      ok: true,
      message: added
        ? "You're on the list. Watch your inbox."
        : "You're already on the list.",
      total,
    });
  } catch (err) {
    console.error("[waitlist] route failed:", err);
    return NextResponse.json(
      { ok: false, message: "Server error. Try again shortly." },
      { status: 500 },
    );
  }
}

export function GET() {
  return NextResponse.json(
    { ok: false, message: "POST only." },
    { status: 405, headers: { Allow: "POST" } },
  );
}
