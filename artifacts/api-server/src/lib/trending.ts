import { sql, desc, gte, inArray } from "drizzle-orm";
import { db, brandsTable, codeServesTable, trendingBrandsTable, type Brand } from "@workspace/db";

const RECALC_INTERVAL_MS = 24 * 60 * 60 * 1000; // once a day
const TOP_N = 5;
// Below this many total serve events in the 7-day window, there's not
// enough signal yet (e.g. just launched) — fall back to a 30-day window
// instead of showing a near-empty or misleadingly sparse top-5.
const MIN_EVENTS_FOR_SHORT_WINDOW = 5;

async function topBrandsSince(since: Date) {
  return db
    .select({
      brandId: codeServesTable.brandId,
      requestCount: sql<number>`count(*)::int`.as("request_count"),
    })
    .from(codeServesTable)
    .where(gte(codeServesTable.servedAt, since))
    .groupBy(codeServesTable.brandId)
    .orderBy(desc(sql`count(*)`))
    .limit(TOP_N);
}

async function recomputeTrending(): Promise<void> {
  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  let windowDays = 7;
  let rows = await topBrandsSince(sevenDaysAgo);
  const totalEvents7d = rows.reduce((sum, r) => sum + r.requestCount, 0);

  if (totalEvents7d < MIN_EVENTS_FOR_SHORT_WINDOW) {
    windowDays = 30;
    rows = await topBrandsSince(thirtyDaysAgo);
  }

  await db.transaction(async (tx) => {
    await tx.delete(trendingBrandsTable);
    if (rows.length > 0) {
      await tx.insert(trendingBrandsTable).values(
        rows.map((r) => ({ brandId: r.brandId, requestCount: r.requestCount, windowDays })),
      );
    }
  });
}

/**
 * Returns the cached trending brands, transparently recomputing first if
 * the cache is missing or more than a day old. Callers never pay for the
 * aggregation query themselves except on that once-a-day refresh.
 */
export async function getTrendingBrands(): Promise<Brand[]> {
  const [mostRecent] = await db
    .select({ computedAt: trendingBrandsTable.computedAt })
    .from(trendingBrandsTable)
    .orderBy(desc(trendingBrandsTable.computedAt))
    .limit(1);

  const isStale = !mostRecent || Date.now() - mostRecent.computedAt.getTime() > RECALC_INTERVAL_MS;
  if (isStale) {
    await recomputeTrending();
  }

  const cached = await db
    .select({ brandId: trendingBrandsTable.brandId, requestCount: trendingBrandsTable.requestCount })
    .from(trendingBrandsTable)
    .orderBy(desc(trendingBrandsTable.requestCount));

  if (cached.length === 0) return [];

  const brands = await db
    .select()
    .from(brandsTable)
    .where(inArray(brandsTable.id, cached.map((c) => c.brandId)));
  const brandById = new Map(brands.map((b) => [b.id, b]));

  // Preserve the cached ranking order; drop anything deleted/deactivated
  // since the last computation instead of surfacing stale entries.
  return cached
    .map((c) => brandById.get(c.brandId))
    .filter((b): b is Brand => !!b && b.active);
}
