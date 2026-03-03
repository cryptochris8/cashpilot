import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAuthorizationUrl } from "@/lib/qbo/client";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function GET() {
  const { orgId } = await auth();

  if (!orgId) {
    return NextResponse.json(
      { error: "Organization not found. Please select an organization." },
      { status: 401 }
    );
  }

  // Check that QBO env vars are set
  if (!process.env.QBO_CLIENT_ID || !process.env.QBO_REDIRECT_URI) {
    return NextResponse.json(
      {
        error:
          "QuickBooks integration is not configured. Please set QBO_CLIENT_ID and QBO_REDIRECT_URI environment variables.",
      },
      { status: 500 }
    );
  }

  // Generate CSRF state token
  const nonce = crypto.randomBytes(16).toString("hex");
  const statePayload = JSON.stringify({ orgId, nonce });
  const state = Buffer.from(statePayload).toString("base64url");

  // Store state in a secure cookie for validation in callback
  const cookieStore = await cookies();
  cookieStore.set("qbo_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  const authUrl = getAuthorizationUrl(state);
  return NextResponse.redirect(authUrl);
}
