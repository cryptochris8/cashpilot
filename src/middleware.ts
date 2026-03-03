import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/pipeline(.*)",
  "/invoices(.*)",
  "/customers(.*)",
  "/templates(.*)",
  "/reminders(.*)",
  "/analytics(.*)",
  "/settings(.*)",
  "/onboarding(.*)",
  "/api/qbo(.*)",
  "/api/invoices(.*)",
  "/api/customers(.*)",
  "/api/reminders(.*)",
  "/api/dashboard(.*)",
  "/api/billing(.*)",
  "/api/analytics(.*)",
]);

const isPublicRoute = createRouteMatcher([
  "/",
  "/pricing(.*)",
  "/login(.*)",
  "/signup(.*)",
  "/api/webhooks(.*)",
  "/api/unsubscribe(.*)",
  "/api/inngest(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const { pathname } = req.nextUrl;

  // Protect dashboard routes
  if (isProtectedRoute(req)) {
    if (!userId) {
      await auth.protect();
    }

    // Check if first-time user needs onboarding
    // (This is a lightweight check - full onboarding status is checked on the page)
    // Skip if already on onboarding page
    if (userId && pathname !== "/onboarding" && !pathname.startsWith("/api")) {
      // We could check onboarding status here, but to avoid DB calls in middleware,
      // the onboarding redirect is handled client-side in the dashboard page
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
