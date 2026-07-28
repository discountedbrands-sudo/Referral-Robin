import { db } from "@workspace/db";
import { brandsTable } from "@workspace/db";
import { logger } from "./logger";

const SEED_BRANDS = [
  { name: "Monzo",        category: "fintech",    currentOffer: "£5 sign-up bonus",             logoUrl: "https://logo.clearbit.com/monzo.com",         active: true },
  { name: "Revolut",      category: "fintech",    currentOffer: "3 months Premium free",         logoUrl: "https://logo.clearbit.com/revolut.com",       active: true },
  { name: "Starling Bank",category: "fintech",    currentOffer: "£25 welcome bonus",             logoUrl: "https://logo.clearbit.com/starlingbank.com",  active: true },
  { name: "Chase UK",     category: "fintech",    currentOffer: "1% cashback for 12 months",     logoUrl: "https://logo.clearbit.com/chase.co.uk",       active: true },
  { name: "Wise",         category: "fintech",    currentOffer: "Free first transfer",           logoUrl: "https://logo.clearbit.com/wise.com",          active: true },
  { name: "Curve",        category: "fintech",    currentOffer: "£10 credit",                    logoUrl: "https://logo.clearbit.com/curve.com",         active: true },
  { name: "Freetrade",    category: "investing",  currentOffer: "Free share worth up to £200",   logoUrl: "https://logo.clearbit.com/freetrade.io",      active: true },
  { name: "Trading 212",  category: "investing",  currentOffer: "Free fractional share",         logoUrl: "https://logo.clearbit.com/trading212.com",    active: true },
  { name: "Coinbase",     category: "crypto",     currentOffer: "$10 in Bitcoin",                logoUrl: "https://logo.clearbit.com/coinbase.com",      active: true },
  { name: "Kraken",       category: "crypto",     currentOffer: "$10 bonus on first trade",      logoUrl: "https://logo.clearbit.com/kraken.com",        active: true },
  { name: "eToro",        category: "investing",  currentOffer: "Copy trading credits",          logoUrl: "https://logo.clearbit.com/etoro.com",         active: true },
  { name: "Chip",         category: "fintech",    currentOffer: "£10 sign-up bonus",             logoUrl: "https://logo.clearbit.com/chip.co.uk",        active: true },
];

export async function seedBrandsIfEmpty(): Promise<void> {
  const existing = await db.select().from(brandsTable).limit(1);
  if (existing.length > 0) return;

  logger.info("Seeding initial brands...");
  await db.insert(brandsTable).values(SEED_BRANDS);
  logger.info({ count: SEED_BRANDS.length }, "Brands seeded");
}
