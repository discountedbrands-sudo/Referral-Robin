// One-off migration: adds brands.slug (backfilled for every existing row,
// then locked to NOT NULL + UNIQUE). Run once, from inside the deployed
// container (DATABASE_URL is already set there):
//
//   railway ssh
//   cd /app/lib/db
//   node scripts/migrate-add-brand-slugs.mjs
//
// Plain pg (not drizzle-kit push) — drizzle-kit's interactive prompts need a
// real TTY this environment doesn't reliably have, and push can't resolve
// "existing rows, new NOT NULL column" on its own anyway. This does the
// same 3 steps push would ask about, explicitly: add nullable column,
// backfill, then lock it down. Safe to re-run — skips rows that already
// have a slug.
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL must be set — run this from inside `railway ssh`.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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

async function main() {
  await pool.query(`ALTER TABLE brands ADD COLUMN IF NOT EXISTS slug text`);

  const { rows } = await pool.query(
    `SELECT id, name, slug FROM brands ORDER BY id`,
  );

  const existingSlugs = new Set(rows.filter((r) => r.slug).map((r) => r.slug));
  let backfilled = 0;

  for (const row of rows) {
    if (row.slug) continue;
    const slug = uniqueSlug(row.name, existingSlugs);
    existingSlugs.add(slug);
    await pool.query(`UPDATE brands SET slug = $1 WHERE id = $2`, [slug, row.id]);
    console.log(`  ${row.id}: "${row.name}" -> ${slug}`);
    backfilled++;
  }

  console.log(`\nBackfilled ${backfilled} row(s), ${rows.length - backfilled} already had a slug.`);

  await pool.query(
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'brands_slug_unique') THEN
         ALTER TABLE brands ADD CONSTRAINT brands_slug_unique UNIQUE (slug);
       END IF;
     END $$;`,
  );
  await pool.query(`ALTER TABLE brands ALTER COLUMN slug SET NOT NULL`);

  console.log("slug is now NOT NULL + UNIQUE.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
