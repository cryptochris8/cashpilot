import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId, userId } = await auth();
  if (!orgId || !userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { clerkOrgId: orgId } });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const { id } = await params;
  const body = await request.json();

  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId: org.id },
  });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const note = await prisma.invoiceNote.create({
    data: {
      invoiceId: id,
      authorId: userId,
      content: body.content,
      noteType: body.noteType || "GENERAL",
    },
  });

  return NextResponse.json(note, { status: 201 });
}
