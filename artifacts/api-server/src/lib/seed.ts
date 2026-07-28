import { db } from "@workspace/db";
import { brandsTable } from "@workspace/db";
import { logger } from "./logger";

const SEED_BRANDS = [
  { name: "Monzo", category: "fintech", currentOffer: "£5 sign-up bonus", logoUrl: null, active: true },
  { name: "Revolut", category: "fintech", currentOffer: "3 months Premium free", logoUrl: null, active: true },
  { name: "Starling Bank", category: "fintech", currentOffer: "£25 welcome bonus", logoUrl: null, active: true },
  { name: "Chase UK", category: "fintech", currentOffer: "1% cashback for 12 months", logoUrl: null, active: true },
  { name: "Wise", category: "fintech", currentOffer: "Free first transfer", logoUrl: null, active: true },
  { name: "Curve", category: "fintech", currentOffer: "£10 credit", logoUrl: null, active: true },
  { name: "Freetrade", category: "investing", currentOffer: "Free share worth up to £200", logoUrl: null, active: true },
  { name: "Trading 212", category: "investing", currentOffer: "Free fractional share", logoUrl: null, active: true },
  { name: "Coinbase", category: "crypto", currentOffer: "$10 in Bitcoin", logoUrl: null, active: true },
  { name: "Kraken", category: "crypto", currentOffer: "$10 bonus on first trade", logoUrl: null, active: true },
  { name: "eToro", category: "investing", currentOffer: "Copy trading credits", logoUrl: null, active: true },
  { name: "Chip", category: "fintech", currentOffer: "£10 sign-up bonus", logoUrl: null, active: true },
];

export async function seedBrandsIfEmpty(): Promise<void> {
  const existing = await db.select().from(brandsTable).limit(1);
  if (existing.length > 0) return;

  logger.info("Seeding initial brands...");
  await db.insert(brandsTable).values(SEED_BRANDS);
  logger.info({ count: SEED_BRANDS.length }, "Brands seeded");
}
