import { db, codesTable, queueStateTable } from "@workspace/db";
import { eq, and, or, isNull, gt } from "drizzle-orm";

/**
 * Weighted round-robin queue builder.
 *
 * Each code appears `weight` times in the queue, interleaved so that
 * premium codes (higher weight) are spread evenly throughout the rotation
 * rather than stacked back-to-back.
 *
 * Example: weights [A=3, B=2, C=1] → [A, B, A, B, A, C] (6 slots, interleaved)
 */
export function buildWeightedQueue(
  codes: { id: number; weight: number }[],
): number[] {
  if (codes.length === 0) return [];

  const total = codes.reduce((s, c) => s + c.weight, 0);
  const result: number[] = new Array(total).fill(-1);

  // Sort heaviest codes first so they get the best spread
  const sorted = [...codes].sort((a, b) => b.weight - a.weight);

  for (const code of sorted) {
    const emptyIndices = result
      .map((v, i) => i)
      .filter((i) => result[i] === -1);

    const step = emptyIndices.length / code.weight;

    for (let i = 0; i < code.weight; i++) {
      const targetIdx = Math.min(
        Math.round(i * step),
        emptyIndices.length - 1,
      );
      result[emptyIndices[targetIdx]] = code.id;
    }
  }

  return result.filter((v) => v !== -1);
}

/**
 * Rebuilds the weighted queue for a brand from its active codes.
 * Resets cursor to 0.
 */
export async function rebuildQueue(brandId: number): Promise<void> {
  const now = new Date();
  const activeCodes = await db
    .select({ id: codesTable.id, weight: codesTable.weight })
    .from(codesTable)
    .where(
      and(
        eq(codesTable.brandId, brandId),
        eq(codesTable.status, "active"),
        // Exclude codes that have expired
        or(isNull(codesTable.expiresAt), gt(codesTable.expiresAt, now)),
      ),
    );

  const order = buildWeightedQueue(activeCodes);

  await db
    .insert(queueStateTable)
    .values({ brandId, orderJson: JSON.stringify(order), cursor: 0 })
    .onConflictDoUpdate({
      target: queueStateTable.brandId,
      set: { orderJson: JSON.stringify(order), cursor: 0 },
    });
}
