import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

/**
 * Get the current organization from Clerk auth context.
 * Returns the organization record from the database, or null if not found.
 */
export async function getCurrentOrganization() {
  const { orgId } = await auth();

  if (!orgId) {
    return null;
  }

  const org = await prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
  });

  return org;
}
