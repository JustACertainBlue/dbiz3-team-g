import { NextResponse } from "next/server";

// TODO: POST /api/register/verify-otp implementation (T023)
export async function POST(_request: Request) {
  return NextResponse.json({ message: "Not implemented" }, { status: 501 });
}
