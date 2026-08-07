import { db } from "@workspace/db";
import { brandsTable, slugify } from "@workspace/db";
import { logger } from "./logger";

// Clearbit's free logo API (logo.clearbit.com) was discontinued after the
// HubSpot acquisition — logo.dev is the maintained replacement.
// Free-tier logos require attribution for commercial use; see
// https://www.logo.dev/docs/logo-images/introduction
const LOGO_DEV_TOKEN = "pk_BWwXndmOS_6o09K1eBTJnQ";
const logoUrl = (domain: string) =>
  `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&size=128&format=png`;

const SEED_BRANDS = [
  { name: "Monzo",        category: "fintech",    currentOffer: "£5 sign-up bonus",             logoUrl: logoUrl("monzo.com"),         active: true },
  { name: "Revolut",      category: "fintech",    currentOffer: "3 months Premium free",         logoUrl: logoUrl("revolut.com"),       active: true },
  { name: "Starling Bank",category: "fintech",    currentOffer: "£25 welcome bonus",             logoUrl: logoUrl("starlingbank.com"),  active: true },
  { name: "Chase UK",     category: "fintech",    currentOffer: "1% cashback for 12 months",     logoUrl: logoUrl("chase.co.uk"),       active: true },
  { name: "Wise",         category: "fintech",    currentOffer: "Free first transfer",           logoUrl: logoUrl("wise.com"),          active: true },
  { name: "Curve",        category: "fintech",    currentOffer: "£10 credit",                    logoUrl: logoUrl("curve.com"),         active: true },
  { name: "Freetrade",    category: "investing",  currentOffer: "Free share worth up to £200",   logoUrl: logoUrl("freetrade.io"),      active: true },
  { name: "Trading 212",  category: "investing",  currentOffer: "Free fractional share",         logoUrl: logoUrl("trading212.com"),    active: true },
  { name: "Coinbase",     category: "crypto",     currentOffer: "$10 in Bitcoin",                logoUrl: logoUrl("coinbase.com"),      active: true },
  { name: "Kraken",       category: "crypto",     currentOffer: "$10 bonus on first trade",      logoUrl: logoUrl("kraken.com"),        active: true },
  { name: "eToro",        category: "investing",  currentOffer: "Copy trading credits",          logoUrl: logoUrl("etoro.com"),         active: true },
  { name: "Chip",         category: "fintech",    currentOffer: "£10 sign-up bonus",             logoUrl: logoUrl("chip.co.uk"),        active: true },
];

export async function seedBrandsIfEmpty(): Promise<void> {
  const existing = await db.select().from(brandsTable).limit(1);
  if (existing.length > 0) return;

  logger.info("Seeding initial brands...");
  // Only ever runs against an empty table (see the guard above), so no
  // collision-checking against existing rows is needed here — every name
  // in SEED_BRANDS above is already distinct.
  await db.insert(brandsTable).values(SEED_BRANDS.map((b) => ({ ...b, slug: slugify(b.name) })));
  logger.info({ count: SEED_BRANDS.length }, "Brands seeded");
}
