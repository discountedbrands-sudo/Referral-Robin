// Shared validators for the self-serve brand submit flow (see admin.ts's
// CreateBrandBody/UpdateBrandBody) — these are what make auto-approval
// "rule-based": if a request's domain/offer pass these checks, it publishes
// immediately instead of waiting on manual review.

// Bare top-level domain only, e.g. "monzo.com" — no protocol, no path/query
// string, no whitespace, no trailing punctuation. Case-insensitive (callers
// should lowercase-trim before testing, same as logo.dev's own lookup).
const BARE_DOMAIN_RE =
  /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))*\.[a-z]{2,24}$/;

export function isBareDomain(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  // "www." is syntactically a valid subdomain label, so the regex alone
  // wouldn't catch it — reject it explicitly so brands.co.uk and
  // www.brands.co.uk aren't silently treated as different domains.
  if (normalized.startsWith("www.")) return false;
  return BARE_DOMAIN_RE.test(normalized);
}

// Plain text only — no HTML tags, no links. Length cap is a spam/abuse
// guard, not a UX one; 280 comfortably fits real offer copy like "You get
// £10, they get £10 when you deposit £100 within 30 days."
const OFFER_MAX_LENGTH = 280;
const DISALLOWED_OFFER_PATTERN = /<|>|https?:\/\/|www\./i;

export function isPlainOfferText(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= OFFER_MAX_LENGTH && !DISALLOWED_OFFER_PATTERN.test(trimmed);
}
