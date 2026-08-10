// One-off: adds a batch of Retail & Cashback brands. Run once, from inside
// the deployed container (DATABASE_URL is already set there):
//
//   railway ssh
//   cd /app/lib/db
//   node scripts/add-batch-retail-cashback.mjs
//
// Plain pg (not drizzle/TypeScript) — same reasoning as seed-batch-2/3/4/5.mjs
// and add-feel-good-contacts.mjs. Skips any row whose name already exists
// (idempotent / safe to re-run), and generates a slug the same way
// POST /brands/submit does.
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL must be set — run this from inside `railway ssh`.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const LOGO_DEV_TOKEN = "pk_BWwXndmOS_6o09K1eBTJnQ";
const logoUrl = (domain) => `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&size=128&format=png`;

function slugify(name) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "brand";
}

function uniqueSlug(name, existing) {
  const base = slugify(name);
  if (!existing.has(base)) return base;
  let suffix = 2;
  while (existing.has(`${base}-${suffix}`)) suffix++;
  return `${base}-${suffix}`;
}

// name, domain, currentOffer — all category "Retail & Cashback"
const ROWS = [
  ["HelloFresh", "hellofresh.co.uk", "You get £20 credit · they get £20 off first box"],
  ["Gousto", "gousto.co.uk", "You get £20 credit per friend (up to £400/month) · they get a discounted first box"],
  ["Caffè Nero", "caffenero.com", "You get a free coffee per friend who signs up and orders"],
  ["Contactlenses.co.uk", "contactlenses.co.uk", "You get 2,500 points · they get 250 points (min £10 order)"],
  ["Lensology", "lensology.co.uk", "You get £5 credit (referral program currently paused for new sign-ups)"],
  ["Feel Good Contacts", "feelgoodcontacts.com", "You get £5 · they get £5 (min £20 order)"],
];

async function main() {
  const { rows: existing } = await pool.query("SELECT lower(name) AS name, slug FROM brands");
  const existingNames = new Set(existing.map((r) => r.name));
  const existingSlugs = new Set(existing.map((r) => r.slug).filter(Boolean));

  let inserted = 0;
  let skipped = 0;

  for (const [name, domain, currentOffer] of ROWS) {
    if (existingNames.has(name.toLowerCase())) {
      console.log(`  SKIP (already exists): ${name}`);
      skipped++;
      continue;
    }

    const slug = uniqueSlug(name, existingSlugs);
    existingSlugs.add(slug);

    await pool.query(
      `INSERT INTO brands (name, slug, logo_url, current_offer, category, active)
       VALUES ($1, $2, $3, $4, $5, true)`,
      [name, slug, logoUrl(domain), currentOffer, "Retail & Cashback"],
    );
    console.log(`  Inserted: ${name} -> /${slug}`);
    inserted++;
  }

  console.log(`\nInserted: ${inserted}  Skipped (already existed): ${skipped}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
