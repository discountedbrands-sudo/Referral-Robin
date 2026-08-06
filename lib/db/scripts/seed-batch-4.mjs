// One-off import of 5 more brands (Lloyds Bank, Whatnot, Nuffield Health,
// David Lloyd Clubs, Anytime Fitness). Run once, from inside the deployed
// container (DATABASE_URL is already set there):
//
//   railway ssh
//   cd /app/lib/db
//   node scripts/seed-batch-4.mjs
//
// Plain pg (not drizzle/TypeScript) — same reasoning as seed-batch-2/3.mjs.
//
// Zable was NOT re-added here — it's already in seed-batch-3.mjs (same
// domain/category, equivalent offer text), whether or not that script has
// been run yet. This script's own dynamic "already exists" check would
// have skipped it anyway even if it had been included twice.
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL must be set — run this from inside `railway ssh`.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const LOGO_DEV_TOKEN = "pk_BWwXndmOS_6o09K1eBTJnQ";
const logoUrl = (domain) => `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&size=128&format=png`;

// name, domain, category, currentOffer, active
const ROWS = [
  ["Lloyds Bank", "lloydsbank.com", "Banking & Fintech", "You get £50, they get £50 (up to £250 total across referrals)", true],
  ["Whatnot", "whatnot.com", "Retail & Cashback", "You get £10-£200 credit, they get £10-£200 credit (random amount)", true],
  ["Nuffield Health", "nuffieldhealth.com", "Gyms & Fitness", "Free month for both sides", true],
  ["David Lloyd Clubs", "davidlloyd.co.uk", "Gyms & Fitness", "Reward on next visit for you, free membership sign-up for them", false],
  ["Anytime Fitness", "anytimefitness.co.uk", "Gyms & Fitness", "Ask about referral rewards", false],
];

async function main() {
  const { rows: existing } = await pool.query("SELECT lower(name) AS name FROM brands");
  const existingNames = new Set(existing.map((r) => r.name));

  let inserted = 0;
  let skipped = 0;
  const flagged = [];

  for (const [name, domain, category, currentOffer, active] of ROWS) {
    if (existingNames.has(name.toLowerCase())) {
      console.log(`  SKIP (already exists): ${name}`);
      skipped++;
      continue;
    }

    await pool.query(
      `INSERT INTO brands (name, logo_url, current_offer, category, active)
       VALUES ($1, $2, $3, $4, $5)`,
      [name, logoUrl(domain), currentOffer, category, active],
    );
    inserted++;
    if (!active) flagged.push(name);
  }

  console.log(`\nInserted: ${inserted}  Skipped (already existed): ${skipped}`);
  console.log(`\nFlagged inactive — needs manual verification before going live (${flagged.length}):`);
  for (const name of flagged) console.log(`  - ${name}`);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
