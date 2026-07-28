import { Router, type IRouter } from "express";
import { eq, and, ilike, sql } from "drizzle-orm";
import { db, brandsTable, codesTable } from "@workspace/db";
import { ListBrandsQueryParams, GetBrandParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/brands", async (req, res): Promise<void> => {
  const parsed = ListBrandsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { category, search } = parsed.data;

  const conditions = [eq(brandsTable.active, true)];
  if (category) conditions.push(eq(brandsTable.category, category));
  if (search) conditions.push(ilike(brandsTable.name, `%${search}%`));

  const brands = await db
    .select({
      id: brandsTable.id,
      name: brandsTable.name,
      logoUrl: brandsTable.logoUrl,
      currentOffer: brandsTable.currentOffer,
      offerUpdatedAt: brandsTable.offerUpdatedAt,
      category: brandsTable.category,
      active: brandsTable.active,
      codeCount: sql<number>`cast(count(${codesTable.id}) filter (where ${codesTable.status} = 'active') as int)`,
    })
    .from(brandsTable)
    .leftJoin(codesTable, eq(codesTable.brandId, brandsTable.id))
    .where(and(...conditions))
    .groupBy(brandsTable.id)
    .orderBy(brandsTable.name);

  res.json(brands);
});

router.get("/brands/:brandId", async (req, res): Promise<void> => {
  const parsed = GetBrandParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [brand] = await db
    .select({
      id: brandsTable.id,
      name: brandsTable.name,
      logoUrl: brandsTable.logoUrl,
      currentOffer: brandsTable.currentOffer,
      offerUpdatedAt: brandsTable.offerUpdatedAt,
      category: brandsTable.category,
      active: brandsTable.active,
      codeCount: sql<number>`cast(count(${codesTable.id}) filter (where ${codesTable.status} = 'active') as int)`,
    })
    .from(brandsTable)
    .leftJoin(codesTable, eq(codesTable.brandId, brandsTable.id))
    .where(and(eq(brandsTable.id, parsed.data.brandId), eq(brandsTable.active, true)))
    .groupBy(brandsTable.id);

  if (!brand) {
    res.status(404).json({ error: "Brand not found" });
    return;
  }

  res.json(brand);
});

export default router;
