// Rewrites the generic site-wide title/description/OG/Twitter tags that
// `expo export` bakes into each dist/brand/{slug}.html with real per-brand
// values. Necessary because Expo Router's static renderer never awaits this
// page's own data fetch (see the comment above generateStaticParams in
// app/(home)/brand/[slug].tsx) — there's no supported way to get build-
// time-fetched data into that render pass, so this rewrites the already-
// exported HTML directly instead. Run after `expo export -p web` (see
// vercel.json's buildCommand). A transient API failure here must not fail
// the whole site deploy — the generic tags remain in place if so.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const SITE_URL = 'https://referralrobin.com';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://positive-youth-production-9d09.up.railway.app';
const OG_IMAGE = `${SITE_URL}/og-image.png`;

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distDir = path.join(projectRoot, 'dist');

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function replaceTagContent(html, matchAttr, value) {
  const re = new RegExp(`(<[a-z]+ data-rh="true"[^>]*${matchAttr}[^>]*(?:content|href)=")[^"]*(")`, 'i');
  if (!re.test(html)) {
    console.warn(`  ! pattern not found for ${matchAttr} — template may have changed, skipping this tag`);
    return html;
  }
  return html.replace(re, `$1${value}$2`);
}

async function main() {
  let brands;
  try {
    const res = await fetch(`${API_BASE_URL}/api/brands`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    brands = await res.json();
  } catch (err) {
    console.warn(`Failed to fetch brand list from ${API_BASE_URL}/api/brands (${err.message}) — leaving generic tags in place.`);
    return;
  }

  let updated = 0;
  for (const brand of brands.filter((b) => b.active)) {
    const filePath = path.join(distDir, 'brand', `${brand.slug}.html`);
    if (!fs.existsSync(filePath)) continue;

    const title = escapeHtml(`${brand.name} referral code – Referral Robin`);
    const description = escapeHtml(
      brand.currentOffer || `Get a ${brand.name} referral code, fairly rotated from real people on Referral Robin.`
    );
    const url = `${SITE_URL}/brand/${brand.slug}`;
    const image = brand.logoUrl || OG_IMAGE;

    let html = fs.readFileSync(filePath, 'utf-8');
    html = html.replace(/(<title data-rh="true">)[^<]*(<\/title>)/, `$1${title}$2`);
    html = replaceTagContent(html, 'name="description"', description);
    html = replaceTagContent(html, 'rel="canonical"', url);
    html = replaceTagContent(html, 'property="og:url"', url);
    html = replaceTagContent(html, 'property="og:title"', title);
    html = replaceTagContent(html, 'property="og:description"', description);
    html = replaceTagContent(html, 'property="og:image"', image);
    html = replaceTagContent(html, 'name="twitter:title"', title);
    html = replaceTagContent(html, 'name="twitter:description"', description);
    html = replaceTagContent(html, 'name="twitter:image"', image);

    fs.writeFileSync(filePath, html);
    updated++;
  }
  console.log(`Injected per-brand SEO tags into ${updated} static page(s).`);
}

main().catch((err) => {
  console.warn(`inject-brand-seo failed unexpectedly (${err.message}) — leaving generic tags in place.`);
});
