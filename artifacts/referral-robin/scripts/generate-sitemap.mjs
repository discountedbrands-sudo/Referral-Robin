// Regenerates public/sitemap.xml from the live brand list. Runs as part of
// `pnpm run export:web` (see vercel.json's buildCommand), so a transient API
// failure here must not fail the whole site deploy — falls back to the
// static pages only and lets the build continue.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const SITE_URL = 'https://referralrobin.com';
// referralrobin.com itself only serves the static frontend — the API lives
// on a separate host (Railway). Same default as constants/seo.ts's
// API_BASE_URL; override with SITEMAP_API_URL=... if that host changes.
const API_URL = process.env.SITEMAP_API_URL || 'https://positive-youth-production-9d09.up.railway.app';
const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outPath = path.join(projectRoot, 'public', 'sitemap.xml');

const staticPaths = ['/', '/privacy', '/terms'];

async function fetchActiveBrandSlugs() {
  try {
    const res = await fetch(`${API_URL}/api/brands`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const brands = await res.json();
    return brands.filter((b) => b.active).map((b) => b.slug);
  } catch (err) {
    console.warn(`Failed to fetch brand list from ${API_URL}/api/brands (${err.message}) — writing static pages only.`);
    return [];
  }
}

function buildXml(urls) {
  const today = new Date().toISOString().slice(0, 10);
  const entries = urls
    .map((u) => `  <url>\n    <loc>${SITE_URL}${u}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

const brandSlugs = await fetchActiveBrandSlugs();
const urls = [...staticPaths, ...brandSlugs.map((slug) => `/brand/${slug}`)];

fs.writeFileSync(outPath, buildXml(urls));
console.log(`Wrote ${urls.length} URLs to ${outPath}`);
