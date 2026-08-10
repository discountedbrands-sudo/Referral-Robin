// One-off: adds a single new brand (Feel Good Contacts). Run once, from
// inside the deployed container (DATABASE_URL is already set there):
//
//   railway ssh
//   cd /app/lib/db
//   node scripts/add-feel-good-contacts.mjs
//
// Plain pg (not drizzle/TypeScript) — same reasoning as seed-batch-2/3/4/5.mjs.
// Unlike those earlier batches, the brands table now requires `slug`
// (NOT NULL + UNIQUE, see migrate-add-brand-slugs.mjs), so this generates
// one the same way POST /brands/submit does.
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

const ROW = {
  name: "Feel Good Contacts",
  domain: "feelgoodcontacts.com",
  category: "Retail & Cashback",
  currentOffer: "You get £5 · they get £5 (min £20 order)",
};

async function main() {
  const { rows: existing } = await pool.query("SELECT lower(name) AS name, slug FROM brands");
  const existingNames = new Set(existing.map((r) => r.name));
  const existingSlugs = new Set(existing.map((r) => r.slug).filter(Boolean));

  if (existingNames.has(ROW.name.toLowerCase())) {
    console.log(`SKIP (already exists): ${ROW.name}`);
    await pool.end();
    return;
  }

  const slug = uniqueSlug(ROW.name, existingSlugs);

  await pool.query(
    `INSERT INTO brands (name, slug, logo_url, current_offer, category, active)
     VALUES ($1, $2, $3, $4, $5, true)`,
    [ROW.name, slug, logoUrl(ROW.domain), ROW.currentOffer, ROW.category],
  );

  console.log(`Inserted: ${ROW.name} -> /${slug}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
