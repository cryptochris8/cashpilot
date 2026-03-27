/**
 * One-time backfill script: populate `paidAt` for existing PAID invoices.
 * Sets paidAt = updatedAt for all PAID invoices where paidAt is null.
 *
 * Usage:
 *   npx dotenv -e .env.local -- npx tsx -r tsconfig-paths/register scripts/backfill-paid-at.ts
 *
 * This is safe to run multiple times — it only updates records where paidAt is null.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import path from "node:path";

// Load env
config({ path: path.join(__dirname, "..", ".env.local") });
config({ path: path.join(__dirname, "..", ".env") });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL not found in environment. Aborting.");
  process.exit(1);
}

async function main() {
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    const count = await prisma.invoice.count({
      where: { status: "PAID", paidAt: null },
    });

    console.log(`Found ${count} PAID invoices with null paidAt.`);

    if (count === 0) {
      console.log("Nothing to backfill.");
      return;
    }

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
