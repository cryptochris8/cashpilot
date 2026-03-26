import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const customer = await prisma.customer.findFirst({
    where: { unsubscribeToken: token },
  });

  if (!customer) {
    return new NextResponse(
      `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Invalid Link</title>
<style>body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f5f5f5}
.card{background:white;padding:2rem;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);max-width:400px;text-align:center}</style>
</head>
<body><div class="card"><h1>Invalid Link</h1><p>This unsubscribe link is no longer valid or has already been used.</p></div></body></html>`,
      { status: 404, headers: { "Content-Type": "text/html" } }
    );
  }

  if (customer.unsubscribed) {
    return new NextResponse(
      `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Already Unsubscribed</title>
<style>body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f5f5f5}
.card{background:white;padding:2rem;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);max-width:400px;text-align:center}</style>
</head>
<body><div class="card"><h1>Already Unsubscribed</h1><p>You have already been unsubscribed from reminder emails.</p></div></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  return new NextResponse(
    `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Unsubscribe</title>
<style>body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f5f5f5}
.card{background:white;padding:2rem;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);max-width:400px;text-align:center}
button{background:#ef4444;color:white;border:none;padding:0.75rem 1.5rem;border-radius:6px;font-size:1rem;cursor:pointer;margin-top:1rem}
button:hover{background:#dc2626}</style>
</head>
<body>
<div class="card">
<h1>Unsubscribe from Reminders</h1>
<p>Are you sure you want to unsubscribe <strong>${escapeHtml(customer.displayName)}</strong> from all payment reminder emails?</p>
<form method="POST">
<button type="submit">Yes, Unsubscribe Me</button>
</form>
</div>
</body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const customer = await prisma.customer.findFirst({
    where: { unsubscribeToken: token },
  });

  if (!customer) {
    return new NextResponse(
      `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Invalid Link</title>
<style>body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f5f5f5}
.card{background:white;padding:2rem;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);max-width:400px;text-align:center}</style>
</head>
<body><div class="card"><h1>Invalid Link</h1><p>This unsubscribe link is no longer valid.</p></div></body></html>`,
      { status: 404, headers: { "Content-Type": "text/html" } }
    );
  }

  await prisma.customer.update({
    where: { id: customer.id },
    data: { unsubscribed: true },
  });

  return new NextResponse(
    `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Unsubscribed</title>
<style>body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f5f5f5}
.card{background:white;padding:2rem;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);max-width:400px;text-align:center}
.check{color:#22c55e;font-size:3rem}</style>
</head>
<body>
<div class="card">
<div class="check">&#10003;</div>
<h1>Unsubscribed Successfully</h1>
<p><strong>${escapeHtml(customer.displayName)}</strong> has been unsubscribed from all payment reminder emails. You will no longer receive automated reminders.</p>
</div>
</body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
