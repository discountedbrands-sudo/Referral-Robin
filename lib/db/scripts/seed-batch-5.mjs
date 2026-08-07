// Updates 3 existing placeholder rows with newly confirmed offer text (and
// flips them active), plus adds 3 new brands. Run once, from inside the
// deployed container (DATABASE_URL is already set there):
//
//   railway ssh
//   cd /app/lib/db
//   node scripts/seed-batch-5.mjs
//
// Plain pg (not drizzle/TypeScript) — same reasoning as seed-batch-2/3/4.mjs.
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL must be set — run this from inside `railway ssh`.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const LOGO_DEV_TOKEN = "pk_BWwXndmOS_6o09K1eBTJnQ";
const logoUrl = (domain) => `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&size=128&format=png`;

// name, currentOffer, active
const UPDATES = [
  ["Virgin Active", "You get 2 months free, they just need to make 2 full-price payments", true],
  ["Monese", "You get £5, then another £5 once they spend £500", true],
  ["Emma", "You get £15-£50 subscription credit (varies by offer)", true],
];

// name, domain, category, currentOffer, active
const ROWS = [
  ["Raisin UK", "raisin.co.uk", "Banking & Fintech", "You get £100, they get £100", true],
  // Ride-hailing Bolt (bolt.eu) — unrelated company from Bolt Pharmacy below,
  // despite the shared name. Exact UK referral amount isn't officially
  // stated anywhere, hence inactive pending verification.
  ["Bolt", "bolt.eu", "Travel & Money Transfer", "Ride discount for both sides on first eligible ride (~£10-15, varies)", false],
  ["Bolt Pharmacy", "boltpharmacy.co.uk", "Medical & Weight Loss", "You get £40 (£80 for your first-ever referral), they get a reward on their qualifying purchase", true],
];

async function main() {
  let updated = 0;
  const notFound = [];

  for (const [name, currentOffer, active] of UPDATES) {
    const { rowCount } = await pool.query(
      `UPDATE brands SET current_offer = $1, active = $2 WHERE lower(name) = lower($3)`,
      [currentOffer, active, name],
    );
    if (rowCount === 0) {
      notFound.push(name);
    } else {
      updated++;
    }
  }

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

  console.log(`\nUpdated: ${updated}  Not found: ${notFound.length}`);
  if (notFound.length) console.log(`  Missing rows expected to already exist: ${notFound.join(", ")}`);

  console.log(`\nInserted: ${inserted}  Skipped (already existed): ${skipped}`);
  console.log(`\nFlagged inactive — needs manual verification before going live (${flagged.length}):`);
  for (const name of flagged) console.log(`  - ${name}`);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
