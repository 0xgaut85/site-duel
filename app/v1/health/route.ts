import { NextResponse, type NextRequest } from "next/server";
import { authenticateProxyRequest } from "@/lib/proxy/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await authenticateProxyRequest(req, "openai");
  if (!auth.ok) return auth.response;

  return NextResponse.json({
    status: "ok",
    service: "duel-agents",
    version: "v1",
  });
}
