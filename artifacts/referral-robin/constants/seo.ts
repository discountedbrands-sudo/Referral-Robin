export const SITE_URL = 'https://referralrobin.com';
export const DEFAULT_TITLE = 'Referral Robin – Get Referral Codes, Fairly';
export const DEFAULT_DESCRIPTION =
  'Banks, apps, insurance, gyms — hundreds of companies give real rewards for referrals. ' +
  'Referral Robin rotates real codes from real people, so everyone gets a fair turn.';
// 1200x630 social-share banner; source design in attached_assets/og-banner-source.png.
export const OG_IMAGE = `${SITE_URL}/og-image.png`;

// referralrobin.com only serves the static frontend — the API lives on a
// separate Railway host. Used at build time only (generateStaticParams in
// brand/[brandId].tsx, scripts/generate-sitemap.mjs) to fetch the brand list.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://positive-youth-production-9d09.up.railway.app';
