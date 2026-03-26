/**
 * One-time backfill script: populate `paidAt` for existing PAID invoices.
 * Sets paidAt = updatedAt for all PAID invoices where paidAt is null.
 *
 * Usage:
 *   npx tsx scripts/backfill-paid-at.ts
 *
 * This is safe to run multiple times — it only updates records where paidAt is null.
 */

import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();

  try {
    // Count how many need backfilling
    const count = await prisma.invoice.count({
      where: { status: "PAID", paidAt: null },
    });

    console.log(`Found ${count} PAID invoices with null paidAt.`);

    if (count === 0) {
      console.log("Nothing to backfill.");
      return;
    }

    // Batch update: set paidAt = updatedAt for all PAID invoices missing paidAt
    // Prisma doesn't support UPDATE SET col = other_col, so we fetch and batch update
    const batchSize = 500;
    let processed = 0;

    while (processed < count) {
      const invoices = await prisma.invoice.findMany({
        where: { status: "PAID", paidAt: null },
        select: { id: true, updatedAt: true },
        take: batchSize,
      });

      if (invoices.length === 0) break;

      await prisma.$transaction(
        invoices.map((inv) =>
          prisma.invoice.update({
            where: { id: inv.id },
            data: { paidAt: inv.updatedAt },
          })
        )
      );

      processed += invoices.length;
      console.log(`Backfilled ${processed}/${count} invoices.`);
    }

    console.log("Backfill complete.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
