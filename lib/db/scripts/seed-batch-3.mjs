// One-off import of 5 more brands (SMARTY, Zable, giffgaff, VOXI, Lebara).
// Run once, from inside the deployed container (DATABASE_URL is already set
// there):
//
//   railway ssh
//   cd /app/lib/db
//   node scripts/seed-batch-3.mjs
//
// Plain pg (not drizzle/TypeScript) — same reasoning as seed-batch-2.mjs:
// the container's Node (18.x) can't execute .ts directly, and @workspace/db
// only ships declaration files (emitDeclarationOnly), not compiled JS.
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL must be set — run this from inside `railway ssh`.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const LOGO_DEV_TOKEN = "pk_BWwXndmOS_6o09K1eBTJnQ";
const logoUrl = (domain) => `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&size=128&format=png`;

// name, domain, category, currentOffer — all active:true (High/Medium
// confidence, unlike the earlier CSV batch's Low-confidence rows). Offer
// text given here is already a finished single line, not
// referrer/referee pairs, so used verbatim rather than recomputed.
const ROWS = [
  ["SMARTY", "smarty.co.uk", "Utilities", "Up to £40 gift card (Amazon/John Lewis/Uber/PayPal) for both sides"],
  ["Zable", "zable.co.uk", "Banking & Fintech", "£10 for both sides"],
  ["giffgaff", "giffgaff.com", "Utilities", "£5 Payback for both sides"],
  ["VOXI", "voxi.co.uk", "Utilities", "Up to £40 gift card (Amazon/JustEat/PayPal) for both sides"],
  ["Lebara", "lebara.co.uk", "Utilities", "You get cash, they get 50% off for 3 months"],
];

async function main() {
  const { rows: existing } = await pool.query("SELECT lower(name) AS name FROM brands");
  const existingNames = new Set(existing.map((r) => r.name));

  let inserted = 0;
  let skipped = 0;

  for (const [name, domain, category, currentOffer] of ROWS) {
    if (existingNames.has(name.toLowerCase())) {
      console.log(`  SKIP (already exists): ${name}`);
      skipped++;
      continue;
    }

    await pool.query(
      `INSERT INTO brands (name, logo_url, current_offer, category, active)
       VALUES ($1, $2, $3, $4, true)`,
      [name, logoUrl(domain), currentOffer, category],
    );
    inserted++;
  }

  console.log(`\nInserted: ${inserted}  Skipped (already existed): ${skipped}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
