// One-off: activates every brand still flagged inactive (regardless of why
// it was left that way — some were "needs verification", some pre-date
// tonight's work entirely). Brands with no confirmed offer text get a
// generic placeholder instead of staying hidden for lack of one; brands
// that already had some offer text (even an approximate one, e.g. Bolt's
// "~£10-15, varies") keep it as-is rather than being overwritten. Run once,
// from inside the deployed container:
//
//   railway ssh
//   cd /app/lib/db
//   node scripts/activate-pending-brands.mjs
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL must be set — run this from inside `railway ssh`.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const GENERIC_OFFER = "Ask about current referral terms";

async function main() {
  const { rows: before } = await pool.query(
    `SELECT id, name, category, current_offer FROM brands WHERE active = false ORDER BY id`,
  );

  if (before.length === 0) {
    console.log("No inactive brands found — nothing to do.");
    await pool.end();
    return;
  }

  await pool.query(
    `UPDATE brands SET current_offer = $1 WHERE active = false AND current_offer IS NULL`,
    [GENERIC_OFFER],
  );
  await pool.query(`UPDATE brands SET active = true WHERE active = false`);

  console.log(`Activated ${before.length} brand(s):\n`);
  for (const b of before) {
    const offer = b.current_offer ?? GENERIC_OFFER;
    const flag = b.current_offer ? "" : "  (generic offer text applied)";
    console.log(`  ${b.name} [${b.category}] — "${offer}"${flag}`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
