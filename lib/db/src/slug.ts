// Lowercase, hyphenated, URL-safe slug from a brand name — e.g.
// "Bolt Pharmacy" -> "bolt-pharmacy". Slugs are generated once at brand
// creation and never regenerated on rename (see POST /brands/submit) —
// changing a live URL breaks bookmarks/indexed search results, so a slug
// is stable for the brand's lifetime even if the display name changes.
export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "brand";
}

// Appends -2, -3, etc. until the result isn't in `existing` — for two
// brands whose names collapse to the same base slug (e.g. two brands both
// named close variants of "Bolt").
export function uniqueSlug(name: string, existing: ReadonlySet<string>): string {
  const base = slugify(name);
  if (!existing.has(base)) return base;

  let suffix = 2;
  while (existing.has(`${base}-${suffix}`)) suffix++;
  return `${base}-${suffix}`;
}
