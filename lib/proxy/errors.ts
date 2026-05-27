import { NextResponse } from "next/server";

export function openaiError(message: string, status: number, type = "invalid_request_error") {
  return NextResponse.json(
    {
      error: {
        message,
        type,
        ...(status === 401 ? { code: "invalid_api_key" } : {}),
      },
    },
    { status },
  );
}

export function anthropicError(message: string, status: number, type = "authentication_error") {
  return NextResponse.json(
    {
      type: "error",
      error: { type, message },
    },
    { status },
  );
}
