// One-off import of the 100-brand CSV research batch. Run once, from inside
// the deployed container (DATABASE_URL is already set there):
//
//   railway ssh
//   cd /app/lib/db
//   node scripts/seed-batch-2.mjs
//
// Plain pg (not drizzle/TypeScript) on purpose: the container's Node (18.x)
// can't execute .ts directly, and @workspace/db only ships declaration files
// (emitDeclarationOnly), not compiled JS — see drizzle.config.ts / tsconfig.
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL must be set — run this from inside `railway ssh`.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const LOGO_DEV_TOKEN = "pk_BWwXndmOS_6o09K1eBTJnQ";
const logoUrl = (domain) => `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&size=128&format=png`;

// Original SEED_BRANDS categories ("fintech" / "investing" / "crypto") predate
// the 10-category consolidation and don't match any current filter chip —
// migrate them so filtering actually works for the 12 already-live brands too.
const EXISTING_CATEGORY_MIGRATION = [
  { from: "fintech", to: "Banking & Fintech" },
  { from: "investing", to: "Investing & Crypto" },
  { from: "crypto", to: "Investing & Crypto" },
];

const CATEGORY_MAP = {
  Banking: "Banking & Fintech",
  Insurance: "Insurance",
  Gyms: "Gyms & Fitness",
  "Medical/Weight-loss": "Medical & Weight Loss",
  Utilities: "Utilities",
  Retail: "Retail & Cashback",
  Cashback: "Retail & Cashback",
  Shopping: "Retail & Cashback",
  "Market Research": "Retail & Cashback",
  Finance: "Retail & Cashback",
  Other: "Retail & Cashback",
  Software: "Software & Apps",
  Investing: "Investing & Crypto",
  Travel: "Travel & Money Transfer",
  "Money Transfer": "Travel & Money Transfer",
  "Food and Drink": "Retail & Cashback",
  "EV Charging": "EV Charging",
};

// name, narrower CSV category, domain, referrer_reward, referee_reward,
// needsVerification (Low confidence, or "unconfirmed" reward amounts, or
// explicitly flagged for manual vetting in the source research).
// Monzo/Revolut/Chase UK/Starling Bank/Curve/Wise already exist from the
// initial seed — omitted here (also re-checked dynamically below by name).
const ROWS = [
  ["Tide", "Banking", "tide.co", "£100", "£100", false],
  ["American Express", "Banking", "americanexpress.com", "Avios points (varies by card)", "Avios points (varies by card)", false],
  ["Yonder", "Banking", "getyonder.com", "£10 + 2 months free", "£10 + 2 months free", false],
  ["Zilch", "Banking", "zilch.com", "£5", "£5", false],
  ["Admiral", "Insurance", "admiral.com", "up to £75", "discount on policy", false],
  ["Direct Line", "Insurance", "directline.com", "£25-£50", "£25-£50", false],
  ["Sainsbury's Bank", "Insurance", "sainsburysbank.co.uk", "£30-£60", "£30-£60", false],
  ["Aviva", "Insurance", "aviva.co.uk", "£25-£50", "£25-£50", false],
  ["RAC", "Insurance", "rac.co.uk", "£20-£25", "discount", false],
  ["LV=", "Insurance", "lv.com", "up to £60", "voucher", false],
  ["PureGym", "Gyms", "puregym.com", "Free Friend membership (non-cash)", "Free/discounted access", false],
  ["Active Mid Devon", "Gyms", "activemiddevon.com", "1 month free membership", "£15 joining fee waived", false],
  ["Virgin Active", "Gyms", "virginactive.co.uk", "unspecified reward", "unspecified reward", true],
  ["MedExpress", "Medical/Weight-loss", "medexpress.co.uk", "£5 credit", "£5 off", true],
  ["Sky", "Utilities", "sky.com", "up to £100 voucher", "up to £100 voucher", false],
  ["Virgin Media", "Utilities", "virginmedia.com", "up to £50 (was £70 in limited promos)", "up to £50 (was £70 in limited promos)", false],
  ["E.ON", "Utilities", "eonnext.com", "£50 gift card", "£50 gift card", false],
  ["BT", "Utilities", "bt.com", "£50 Amazon voucher", "£50 Amazon voucher", false],
  ["Adidas", "Retail", "adidas.co.uk", "£10 (up to £100 via Creators Club)", "£10", false],
  ["Joe Browns", "Retail", "joebrowns.co.uk", "£10 voucher", "£10 voucher", false],
  ["Kate's Clothing", "Retail", "katesclothing.co.uk", "£10 off (min spend £30)", "£10 off (min spend £30)", false],
  ["Quidco", "Retail", "quidco.com", "£10 (£15 for Premium members)", "cashback bonus", false],
  ["TopCashback", "Retail", "topcashback.co.uk", "£5 (£7.50 for Plus members)", "cashback bonus", false],
  ["NordVPN", "Software", "nordvpn.com", "3 free months", "1-3 free months (plan-dependent)", false],
  ["Dropbox", "Software", "dropbox.com", "500MB-1GB extra storage", "500MB-1GB extra storage", false],
  ["Boots Online Doctor", "Medical/Weight-loss", "boots.com", "unconfirmed", "unconfirmed", true],
  ["LloydsPharmacy Online Doctor", "Medical/Weight-loss", "lloydspharmacy.com", "unconfirmed", "unconfirmed", true],
  ["Numan", "Medical/Weight-loss", "numan.com", "unconfirmed", "unconfirmed", true],
  ["Voy", "Medical/Weight-loss", "joinvoy.com", "unconfirmed", "unconfirmed", true],
  ["Zopa", "Banking", "zopa.com", "£20", "£20", false],
  ["Monese", "Banking", "monese.com", "unconfirmed amount", "unconfirmed amount", true],
  ["Emma", "Banking", "emma.to", "unconfirmed amount", "unconfirmed amount", true],
  ["Gemsloot", "Cashback", "gemsloot.com", "5% referral bonus", "3 Mystery Boxes", false],
  ["Rakuten", "Cashback", "rakuten.co.uk", "£25", "£25 (min spend £60)", false],
  ["JamDoughnut", "Cashback", "jamdoughnut.com", "£5", "£3", false],
  ["EverUp", "Cashback", "everup.co.uk", "£1.50", "£1.50", false],
  ["Attraction Tickets", "Travel", "attractiontickets.com", "£10 (min spend £400)", "£10", false],
  ["Gousto", "Food and Drink", "gousto.co.uk", "£20", "60% discount", false],
  ["Testing Time", "Market Research", "testingtime.com", "£5", "earn from studies", false],
  ["Smol", "Shopping", "smolproducts.com", "£6", "essentials bundle for £3", false],
  ["AJ Bell", "Investing", "ajbell.co.uk", "£100 (min spend £10000)", "£100", false],
  ["Airtime Rewards", "Cashback", "airtimerewards.co.uk", "£2 (min spend £5)", "£2", false],
  ["Motorway", "Other", "motorway.co.uk", "£50", "£50", false],
  ["TrainPal", "Travel", "trainpal.com", "TrainPal credit", "£3 discount", false],
  ["Skrill", "Money Transfer", "skrill.com", "£10 (min spend £100)", "£10", false],
  ["Kendamil", "Food and Drink", "kendamil.com", "150 Points (min spend £12)", "150 Points", false],
  ["Park Christmas", "Finance", "parkchristmas.co.uk", "£20 (min spend £50)", "£20", false],
  ["Respondent", "Market Research", "respondent.io", "$20", "earn from studies", false],
  ["Arran Sense of Scotland", "Shopping", "arranaromatics.com", "£15", "£10 discount", false],
  ["Beanstalk", "Investing", "beanstalk.co", "£5", "£5", false],
  ["Sprive", "Cashback", "sprive.com", "£10", "cashback rate boost", false],
  ["Voi", "Travel", "voiscooters.com", "£5", "£5", false],
  ["LemFi", "Money Transfer", "lemfi.com", "£10 (min spend £50)", "£10", false],
  ["Caffe Nero", "Food and Drink", "caffenero.com", "free coffee per referral", "up to 2 free coffees", false],
  ["Currensea", "Finance", "currensea.com", "£20", "£5", false],
  ["User Interviews", "Market Research", "userinterviews.com", "£8 voucher", "£8", false],
  ["Kit & Kin", "Shopping", "kitandkin.com", "£10 (min spend £40)", "£10", false],
  ["Charles Stanley", "Investing", "charles-stanley.co.uk", "£1500 (min spend £300)", "£250", false],
  ["Avios", "Cashback", "avios.com", "500 Avios", "500 Avios", false],
  ["Trip.com", "Travel", "trip.com", "Trip Coins per booking", "4% discount", false],
  ["WorldRemit", "Money Transfer", "worldremit.com", "£20-£25 (min spend £30)", "£10", false],
  ["Sous Chef", "Food and Drink", "souschef.co.uk", "£10", "£10", false],
  ["Perfume Direct", "Shopping", "perfumedirect.com", "£5", "£5", false],
  ["KidStart", "Cashback", "kidstart.co.uk", "£5", "none listed", false],
  ["Uber", "Travel", "uber.com", "ride credit per referral", "£25 discount", false],
  ["TapTap Send", "Money Transfer", "taptapsend.com", "£5 (min spend £25)", "£5", false],
  ["Costa Coffee", "Food and Drink", "costa.co.uk", "5 Beans", "5 Beans", false],
  ["Fidelity", "Investing", "fidelity.co.uk", "£100 (min spend £5000)", "£100", false],
  ["Simmer", "Food and Drink", "simmereats.com", "£20", "50% discount", false],
  ["Interactive Investor", "Investing", "ii.co.uk", "£200 (min spend £5000)", "fee-free year", false],
  ["Swagbucks", "Cashback", "swagbucks.com", "£10", "£10", false],
  ["Uber Eats", "Food and Drink", "ubereats.com", "credit per referral (min spend £15)", "£12 discount", false],
  ["grüum", "Shopping", "gruum.com", "£5", "£5", false],
  ["InvestEngine", "Investing", "investengine.com", "£20-£200 (min spend £100)", "£20-£200", false],
  ["Penfold", "Investing", "getpenfold.com", "£25 (min spend £25)", "£25", false],
  ["Virgin Red", "Cashback", "virginred.com", "£5", "£5", false],
  ["PensionBee", "Investing", "pensionbee.com", "£100", "£100", false],
  ["Picodi", "Cashback", "picodi.com", "£4", "£4", false],
  ["Robinhood", "Investing", "robinhood.com", "$7-$175", "$7-$175", false],
  ["Wahed Invest", "Investing", "wahed.com", "£10", "£10", false],
  ["Myprotein", "Shopping", "myprotein.com", "£15 (min spend £45)", "£15", false],
  ["Glasses Direct", "Shopping", "glassesdirect.co.uk", "£10 (min spend £49)", "£35 discount", false],
  ["eufy", "Shopping", "eufy.com", "gift card £30-£100 (min spend £229)", "£20-£30 discount", false],
  ["LookFantastic", "Shopping", "lookfantastic.com", "£10", "£10", false],
  ["Cult Beauty", "Shopping", "cultbeauty.co.uk", "£5 (min spend £25)", "£5", false],
  ["GLOSSYBOX", "Shopping", "glossybox.co.uk", "£5", "£5", false],
  ["Octopus Electroverse", "EV Charging", "electroverse.com", "£5 charging credit", "£5 charging credit", false],
  ["Ohme", "EV Charging", "ohme.com", "unconfirmed", "unconfirmed", true],
  ["Pod Point", "EV Charging", "pod-point.com", "unconfirmed", "unconfirmed", true],
  ["BP Pulse", "EV Charging", "bppulse.co.uk", "unconfirmed", "unconfirmed", true],
  ["InstaVolt", "EV Charging", "instavolt.co.uk", "unconfirmed", "unconfirmed", true],
  ["MotorEasy", "Insurance", "motoreasy.com", "£10-£25 (varies by product: £25 warranty, £20 GAP/alloy/tyre/cosmetic, £10 breakdown)", "15% off", false],
  ["ALA Insurance", "Insurance", "gapinsurance.co.uk", "unconfirmed", "unconfirmed", true],
  ["Direct Gap", "Insurance", "directgap.co.uk", "unconfirmed", "unconfirmed", true],
];

function isPlaceholder(value) {
  return /unconfirmed|unspecified|^none\b/i.test(value.trim());
}

function combineOffer(referrer, referee) {
  const refereeBlank = isPlaceholder(referee);
  const referrerBlank = isPlaceholder(referrer);
  if (refereeBlank && referrerBlank) return null;
  if (refereeBlank) return `They get ${referrer}`;
  if (referrerBlank) return `You get ${referee}`;
  return `You get ${referee} · they get ${referrer}`;
}

async function main() {
  console.log("Migrating existing brands' pre-consolidation categories...");
  for (const { from, to } of EXISTING_CATEGORY_MIGRATION) {
    const res = await pool.query("UPDATE brands SET category = $1 WHERE category = $2", [to, from]);
    console.log(`  ${from} -> ${to}: ${res.rowCount} row(s)`);
  }

  const { rows: existing } = await pool.query("SELECT lower(name) AS name FROM brands");
  const existingNames = new Set(existing.map((r) => r.name));

  let inserted = 0;
  let skipped = 0;
  const flagged = [];

  for (const [name, narrowCategory, domain, referrer, referee, needsVerification] of ROWS) {
    if (existingNames.has(name.toLowerCase())) {
      console.log(`  SKIP (already exists): ${name}`);
      skipped++;
      continue;
    }

    const category = CATEGORY_MAP[narrowCategory];
    if (!category) throw new Error(`No category mapping for "${narrowCategory}" (${name})`);

    const currentOffer = combineOffer(referrer, referee);
    const active = !needsVerification;

    await pool.query(
      `INSERT INTO brands (name, logo_url, current_offer, category, active)
       VALUES ($1, $2, $3, $4, $5)`,
      [name, logoUrl(domain), currentOffer, category, active],
    );
    inserted++;
    if (needsVerification) flagged.push(name);
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
