import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { invoiceNoteSchema } from "@/lib/validations/api";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId, userId } = await auth();
  if (!orgId || !userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { clerkOrgId: orgId } });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const { id } = await params;

  const raw = await request.json();
  const parsed = invoiceNoteSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const body = parsed.data;

  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId: org.id },
  });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const note = await prisma.invoiceNote.create({
    data: {
      invoiceId: id,
      authorId: userId,
      content: body.content,
      noteType: body.noteType,
    },
  });

  return NextResponse.json(note, { status: 201 });
}
