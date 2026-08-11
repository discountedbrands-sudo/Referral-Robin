# Referral Robin — Feature Backlog

A running list of feature ideas to build into the app over time. Add new ideas at the bottom of the list; each gets a number, a short title, and full detail so it can be handed straight to Claude Code when you're ready to build it.

---

## 1. Dead code reporting & quarantine flow

**Status:** Not started

**The problem:** A user gets served a referral code, tries to use it, and it doesn't work (expired, cancelled by the brand, already used, etc). Right now there's no way for them to flag this, so dead codes keep getting served to other people.

**The feature:**
- Add a "Report — this didn't work" button on the code reveal screen
- When tapped, the code is immediately **quarantined**: pulled out of the active rotation queue so nobody else gets served it
- The code's **owner** (the user who submitted it) gets a notification/message on their account saying the code has been flagged and they need to either:
  - Verify it still works (un-quarantine it), or
  - Update it to a new code, or
  - Delete it entirely
- The reporting user is **immediately** served a replacement code from the same brand — **the 10-minute cooldown does NOT apply in this case**. This is a deliberate exception: someone hitting a dead code shouldn't be punished with a wait, since they didn't get any real value from that reveal.

**Technical notes for later:**
- Needs a `status: "quarantined"` state on the `codes` collection (in addition to active/removed)
- Queue rebuild logic must skip quarantined codes entirely
- Cooldown-bypass logic needs its own flag/path in `getNextCode`, separate from the normal per-device cooldown check — e.g. a `reportAndReplace` function that quarantines + immediately serves next code in one call, ignoring the device's existing cooldown timestamp for that specific brand
- Consider a threshold — one report might be a fluke (or the user is lying) — decide whether 1 report is enough to quarantine, or whether it needs 2-3 reports before quarantining, to avoid abuse by someone maliciously reporting working codes

---

## 2. Visible "round" counter per brand

**Status:** Deferred — waiting until more codes/activity exist. A round counter with only a handful of codes per brand won't feel meaningful; revisit once submission volume grows (same reasoning as the Trending section needing real usage data before it showed anything useful). — needs a decision on display approach (see options below)

**The idea:** Show users something like "Round 17" or "still in round 1" for a given brand's queue, so there's a visible sense of fairness/activity — not just raw internal stats, but something that communicates "this queue is genuinely rotating and everyone's getting a turn."

**What "a round" means:** One full pass through every active code in a brand's queue. If there are 20 codes in Monzo's queue and all 20 have been served once, that's the end of Round 1; once code #1 gets served again, Round 2 begins.

**Where this could show up:**
- On the brand picker screen (e.g. a small badge: "Monzo — Round 12")
- On the code reveal screen itself ("You're part of round 12")
- On the submitter's dashboard, showing which round their own code is currently sitting in / how many times it's personally been through the rotation

**Technical notes for later:**
- Needs a `roundNumber` counter per brand, incremented each time the queue cursor completes a full loop back to position 0
- With **weighted/premium codes** in the mix, "a round" gets fuzzier — a weight-3 code appears 3 times per lap, so does that count as 3 separate turns or 1 "round" for that code specifically? Worth deciding: either (a) round = one full cycle through the *weighted* order array (simplest, but premium codes get counted extra), or (b) track "distinct code has been served" separately from raw round count, so a premium code's owner sees "your code has appeared 45 times across 15 rounds" — two separate numbers, not conflated
- This is a nice-to-have display feature, not core logic — build after the dead-code reporting (#1) and after premium weighting is actually working, since the round-counting logic depends on how weighting affects the queue

---
---

## Reference: Brand seed list by category

Not a feature idea — a working list of real referral programs to use when populating/expanding the app's brand list. Verify current reward amounts before launch, as these change often (some sources below are from mid-2026, but referral schemes get paused or altered without notice).

### Banking / Fintech (already partly seeded)
- Monzo — mystery reward, typically £20 (personal), £50 (business)
- Revolut — flat referrer bonus, historically around £50
- Chase UK — around £20, reopens/closes periodically
- Tide — £100 (business banking)
- American Express — Avios points, varies by card
- Yonder — £10 + two months free
- Zilch — £5
- Starling — new trial scheme as of mid-2026, watch for it going live properly
- Co-Op Bank — reported up to £125 in some sources (verify)
- Tembo (savings/ISA platform) — random cash bonus, both sides

### Insurance
- Admiral — cash reward per policy taken out
- LV= — up to £60 in vouchers
- RAC (car insurance) — £20 cashback
- Animal Friends (pet insurance) — £10 gift card
- Tesco Pet Insurance — £30 gift card
- The AA — £20 gift card

### Gyms / Fitness
- The Gym Group — refer-a-friend scheme (check current reward)
- JD Gyms — prize-draw style (chance to win a year's membership)
- Gymshark — £10 off for the friend + reward for referrer (retail, not membership, but very referral-heavy brand)
- Many local/independent gyms run "bring a friend, get a free month" — worth including a generic "local gym" submission option since these won't all have a national program

### Software / SaaS / Apps
This category is more fragmented — mostly individual products rather than one big list. Worth targeting well-known consumer apps with public referral schemes rather than enterprise B2B tools (which usually need a sales conversation, not a code):
- Dropbox — extra storage for both parties (classic long-running example)
- Password managers, VPNs, and productivity apps often run referral/credit schemes — worth researching specific ones (e.g. 1Password, NordVPN) before adding, since terms vary a lot
- **Note for later:** software referral codes are usually per-product-signup, not per-friend cash, so this category may need a different display treatment ("get 1 month free" vs "get £50") — worth deciding whether the UI needs to support non-cash reward types before adding this category

### Utilities / Telecom / Other (bonus categories worth considering later)
- E.ON Energy — £50 gift card
- Sky (TV/Broadband/Mobile) — up to £100 gift card
- Virgin Media — up to £50 cashback
- BT — £50 Amazon voucher
- Vodafone — voucher-based scheme

---
---

## Reference: dev.local.ps1 behaviour (machine-local, not in git)

This file is gitignored on purpose (it has Windows-specific paths), so its contents aren't preserved in the repo. Noting what it does here so there's a record outside the file itself.

**What it does, as of the last update:**
- Starts Postgres, the API server, and Expo together with one command
- Auto-detects whether a physical Android phone is plugged in via USB
  - If a phone is attached: uses USB + `adb reverse` (tcp:8081 and tcp:8080) instead of WiFi — this is the fix for the WiFi chunked-encoding corruption bug (see `.agents/memory/metro-wifi-chunk-corruption.md` for the technical root cause)
  - If no phone is attached: falls back to emulator mode, using `--localhost` so the emulator reaches Metro via its internal `10.0.2.2` bridge
- Clears `$env:PORT` before launching Expo, so it doesn't inherit the API server's port (8080) and collide with it — Expo needs its own default (8081)

**Practical takeaway for day-to-day use:** plug the phone in via USB before running the startup script if you want to test on the physical device — it should now "just work" without manual `adb reverse` commands. Emulator-only sessions (no phone plugged in) still work as before.

---
---

## Pre-launch checklist (things to remember before going live)

- **Logo.dev attribution** — the free tier of logo.dev's Logo API requires an attribution link back to Logo.dev for commercial use (personal projects are exempt, but Referral Robin counts as commercial). Need to add an attribution link somewhere in the app — a footer, an About/Settings screen, or similar — before public launch. Alternatively, check logo.dev's paid plans if attribution isn't wanted.

---
---

## 3. Flexible offer structure per brand

**Status:** Not started — needs data model change

**The problem:** The current model assumes each brand has one static offer amount (e.g. "Monzo — £20"). In reality, offers change over time and some brands run multiple offer types simultaneously (e.g. Revolut might offer different amounts for different account tiers, or change the amount seasonally).

**The fix:** The `brands` collection's offer field needs to support flexible/changing values rather than being treated as a fixed constant — e.g. easily editable by whoever maintains the brand list, versioned so old offers don't linger, and potentially supporting multiple simultaneous offer variants per brand (not just one flat number). Exact structure to be decided with Claude Code, but the key requirement is: **don't hardcode offer amounts as if they're permanent** — build the data model assuming they change often.

---

## 4. UX principle: users already know what they want

**Product insight:** Most users arrive already knowing which deal they're after — they're not browsing to discover offers, they just need the code, fast. This should shape UX priorities:
- Search/brand-picker should be fast and prominent (people searching for "Monzo" directly, not scrolling to discover it)
- Don't over-invest in heavy descriptive marketing copy per brand — the offer amount + a fast reveal is what matters most
- Minimise steps between "open app" and "get code" for a known brand

---

## 5. "Trending / Most Requested" home page section

**Status:** Not started

**The idea:** A section on the home page showing which brand is most popular/requested that week or month — surfaces what's currently in demand, gives the app a sense of activity, and gives the top brand extra visibility.

**Technical notes for later:**
- Needs a way to count/rank code requests per brand over a rolling time window (weekly and/or monthly)
- Could be as simple as: sort brands by `timesServed` within the last 7/30 days, show the top one (or top 3-5) in a featured strip on the home screen
- Worth deciding: does this update live/real-time, or recalculate on a schedule (e.g. once a day)? Real-time is nicer but adds load; a daily recalculation is simpler and probably good enough

---
---

## 6. Website polish feedback (from live testing, Aug 5)

**Status:** Not started — park until backend outage is resolved

**Brand grid tile sizing/readability:** Icons/logos in the brand grid tiles are too small relative to the rest of the tile — needs the logo bigger and the surrounding text/elements smaller, general readability pass needed on the grid.

**Sign-in/sign-out reliability:** Reported as "doesn't work well" — needs a proper investigation once things are stable; not enough detail yet to hand to Claude Code, worth reproducing the specific failure and describing exact steps when picked up.

**More account features needed:** Current account screen is minimal (email display, link to My Codes, sign out). Worth deciding what's actually missing — e.g. profile editing, notification preferences, viewing referral stats more richly, deleting account. Needs a proper feature-scoping conversation before handing to Claude Code.

---
---

## 7. Signed-in navigation needs its own design

**Status:** Not started

**The problem:** The top nav bar (logo, Sign in / Sign up buttons) was built for signed-out visitors on the homepage. Once a user is signed in, `/` redirects them straight past the homepage into the app (Explore screen with the bottom tab bar) — so there's currently no way to get back to the actual marketing homepage, and the signed-out-style top nav doesn't make sense anymore once logged in.

**Needs deciding:**
- Does the top nav bar still show at all once signed in, or does the bottom tab bar (Explore/My Codes/Account) become the only navigation?
- If the top nav stays, what should it show instead of Sign in/Sign up — a profile icon, the user's name, nothing?
- Should there be a way to get back to the homepage at all once signed in (e.g. clicking the logo), or is that unnecessary once someone's a real user?

Related to idea #6 (old bottom tab bar not yet redesigned for web) — worth tackling both together as one "signed-in app shell for web" pass rather than separately.

---
---

## 8. Add a new company/brand (admin + user-suggested)

**Status:** Not started

**The problem:** Right now brands can only be added by directly seeding/editing the database — there's no in-app way to add a new company at all, for anyone.

**The feature, two tiers:**
- **Admin (Yaakov) — direct add:** a form that adds a brand straight to the live list, no review step
- **Signed-in users — suggest a brand:** same form, but submissions go into a "pending review" state rather than going live immediately; admin approves or rejects from a review queue

**Required fields for the form:**
- **Brand name** (required, text) — e.g. "Monzo"
- **Domain** (required, text) — e.g. "monzo.com" — used to auto-pull the logo via logo.dev, so this needs validation that it's a real-looking domain
- **Category** (required, select from existing list: Fintech, Investing, Crypto, Banking, Insurance, Gyms, Medical/Weight-loss, Utilities, Retail, Software, EV Charging — plus an option to type a new category if none fit, subject to review)
- **Offer description** (required, free text, not a fixed number) — per idea #3's flexibility decision, e.g. "£20 for both sides" or "Free month of Premium" rather than forcing a single currency amount
- **Active toggle** — defaults to true for admin adds; user-suggested brands default to inactive/pending until approved

**Technical notes for later:**
- Needs a `status` field on the brand record: `active`, `pending_review`, `rejected` (in addition to the existing simple `active: boolean`, or replacing it with a proper status enum)
- Admin review screen: a simple list of pending submissions with approve/reject buttons
- Consider basic spam/abuse protection on the user-suggestion form (e.g. rate-limiting how many a single user can suggest per day), since this is a public-facing form once live

**UX hook — "can't find it? add it now" flow:**
When a user searches for a brand and gets no results (or scrolls through and doesn't see what they're after), show a prompt right there in the empty state — something like:

> "Can't find [brand]? Add it now and be the first in the queue."

This turns the "no results" dead-end into an inviting call to action rather than a disappointment — the "be first in the queue" framing gives a real incentive (their own submitted code gets served before anyone else's once others start using that brand), which should meaningfully boost how many brands/codes get contributed organically rather than relying solely on manually-seeded content.

**Where this shows up specifically:**
- The Explore screen's search bar, when a search returns zero results
- Possibly also a persistent "Don't see your brand? Add it" link somewhere visible even without searching (e.g. bottom of the category grid)

---

- **Google OAuth 100-user cap** — the Google Cloud OAuth consent screen currently caps sign-ins via "Continue with Google" at 100 total users (lifetime, not resettable) until the app goes through Google's verification process. Not urgent now, but worth starting verification well before approaching 100 Google sign-ups — since only basic scopes (name, email) are requested, verification should be a lighter process than apps requesting sensitive scopes. Check Google Cloud Console → OAuth consent screen for the "Publish" / verification submission flow when ready.

---
---

## 9. Add Microsoft and Apple sign-in options

**Status:** Not started

**The idea:** Alongside email/password and Google, add "Continue with Microsoft" and "Continue with Apple" as additional sign-in options.

**Technical notes for later:**
- Clerk supports both as SSO connections, same pattern as the Google setup done tonight — each needs its own OAuth credentials (Microsoft: Azure AD app registration; Apple: Apple Developer account + Sign in with Apple service configuration)
- Apple Sign In has its own quirks worth knowing before starting: it requires a paid Apple Developer account ($99/year) if one isn't already in place, and Apple has specific requirements around how the button must look/behave if offering any other third-party sign-in option (their Human Interface Guidelines are stricter than Google's about button placement/prominence)
- Same redirect URI / consent screen pattern as Google — get Clerk's redirect URI first, then configure each provider's developer console before pasting credentials back into Clerk
- Worth prioritising Microsoft first if there's demand, since it doesn't require a paid developer account like Apple does — cheaper/faster to add

---
---

## 10. Let code owners manually expire their own code

**Status:** Not started

**The idea:** Currently, a submitted code can only be flagged dead by *other* users reporting it (idea #1). There's no way for the person who submitted a code to mark it as expired/retired themselves — e.g. if they know their referral scheme ended, or they no longer want their code in rotation.

**The feature:** On the dashboard/My Codes screen, next to each submitted code, add an "Expire this code" or "Retire" button — sets the code's status to inactive/removed, pulling it out of the rotation queue immediately, owner-initiated rather than waiting for someone else to report it.

---
---

## 11. Support both codes and personalised links

**Status:** Not started — real architectural decision, affects schema

**The problem:** Not every referral program gives a short text code — many give a personalised URL instead (e.g. "sign up via my.link/xyz123"). Right now the app only supports short text codes; links need different handling entirely.

**Decision:** Support both. Each submitted code has a **type**: `code` or `link`.

**How this changes things:**

**Submission form (submit.tsx):**
- Add a type selector: "Code" or "Link"
- If "Code": current behaviour, free text field
- If "Link": validate it looks like a real URL (basic `https://` check), store as a link instead

**Reveal screen (brand/[brandId].tsx):**
- If type is `code`: current behaviour — show the code, "Copy" button
- If type is `link`: show the link, button text becomes "Copy link" or "Open link" (opening it directly might be better UX — one tap takes them straight to the referral signup page, no need to paste anywhere)

**Dashboard/My Codes:**
- Show a small badge or icon distinguishing "Code" vs "Link" entries so the owner can tell at a glance

**Technical notes for later:**
- Schema: add a `type` field to the codes table (`code` | `link`, default `code` for backward compatibility with everything already seeded)
- Validation differs by type — a link needs URL validation, a code doesn't
- Consider: should "Open link" navigate away from the app entirely (external browser) vs opening in an in-app browser view? Worth deciding for a smoother experience, especially on mobile

---
---

## Status note: Android app deliberately parked (Aug 6 morning)

**Decision:** The Android app build (currently blocked on the Gradle/AGP "No variants exist" release-build bug) is being deliberately parked until the web app is in a state Yaakov is happy with. Not forgotten — just correctly deprioritised. Don't pick this back up unless explicitly asked to, even if it comes up in passing.

When it does get picked back up, the last known state was: a real, understood bug (native module dependency resolution failing specifically on `:app:assembleRelease`), with a working theory for the fix (pinning Gradle/AGP versions via the `expo-build-properties` config plugin) that was never actually tried. EAS-built dev-client APKs work fine — it's specifically the release build that fails.

---
---

## 12. Monetization: affiliate revenue from direct links back to sites

**Status:** Not started — business model idea, separate from idea #11 (which is about supporting user-submitted link-type codes)

**The idea:** Beyond the core "fair rotation of user-submitted codes" model, Referral Robin could also earn revenue directly — by joining affiliate programs for some brands and including Referral Robin's own tracked link alongside or instead of user codes for those specific brands. This is how competitors like Scrimpr actually make money (see the earlier "competitor notes" — Scrimpr profits from their own single referral link on every listing).

**How this could work without breaking the core fairness model:**
- Keep the user-submitted rotation as the primary mechanic — that's the actual product differentiator
- For brands where Referral Robin can get its own affiliate/partner link (separate from any individual user's personal code), consider: a small "powered by Referral Robin" bonus entry in the rotation, or a distinct "official partner link" option shown alongside user codes, clearly labelled as different from a personal referral
- Needs to stay transparent — users should be able to tell the difference between "this is someone's personal code, revealed once and rotated" vs. "this is Referral Robin's own affiliate link, always available"

**Worth deciding before building anything:**
- Does this dilute the "fair rotation, no one profits except the code owners" pitch that's core to the brand? Worth thinking through carefully — this is the same distinction that makes Referral Robin different from Scrimpr in the first place (see competitor notes in the website plan doc)
- Which brands actually offer affiliate programs distinct from personal referral schemes (not all do — some referral programs are personal-only, no separate affiliate/partner tier)
- Legal/disclosure requirements — UK rules (ASA/CMA) require clear disclosure of affiliate relationships, similar to what Scrimpr already does on their own site

---
---

## 13. Country/region filtering

**Status:** ✅ Shipped (Aug 10) — country field on brands (defaults "UK"), filter chip row on Explore defaulting to "All"

**The idea:** Split and search brands by country — so US-only referral schemes, UK-only ones, and others don't all mix together in one undifferentiated list. Right now everything's implicitly UK-focused (all the research has been UK-specific), but as the database grows this needs to be explicit.

**Technical notes for later:**
- Needs a `country` field on the brands table (or `countries` if a brand could apply to multiple — e.g. some banks operate in both UK and US)
- Add a country filter alongside the existing category filter — likely a similar chip/dropdown pattern
- Decide default behaviour: does a UK-based visitor see UK brands by default (auto-detected via browser locale/IP), or does everyone see everything until they filter?
- Existing 130+ brands would need a backfill — most are already UK, but worth auditing which (if any) are actually US-specific (e.g. Robinhood is more commonly US, though it has a UK arm)

---

## 14. Streamlined self-serve brand-add with validation rules instead of manual approval

**Status:** ✅ Shipped (Aug 10) — rule-based auto-approval (bare domain + plain-text offer validation), "recently auto-approved" admin spot-check section, submitter priority (first 2 reveals) verified end-to-end. Also shipped: expandable FAB on Explore replacing two unlabeled stacked buttons.

**The idea:** Right now, non-admin brand submissions go into a manual pending-review queue (idea #8). Instead, make it easier to add a new brand by enforcing strict validation *rules* at submission time — so most legitimate submissions can go live automatically without needing a human to manually approve each one, while still preventing abuse/junk data.

**Proposed rules:**
- **Domain field: TLD only, nothing else.** E.g. `monzo.com` is valid; `monzo.com/referral?ref=123`, subpaths, query strings, or anything after the domain itself gets rejected at the form level. This stops someone slipping their own personal tracking link into what's supposed to be a general brand domain field (domain is only used for the logo.dev lookup, not for actual referral tracking — codes themselves are separate).
- **Referral offer message: short, plain text only** — a brief description field, not free-form HTML/links/formatting that could be abused.
- **No user-supplied logo upload** — domain-based logo.dev lookup only, so nobody can upload an inappropriate or misleading image.

**Incentive for contributing a new brand:** whoever successfully adds a brand that gets approved/goes live gets a small reward — e.g. their own code (once submitted for that brand) gets priority in the queue for its first 2 referrals, ahead of the normal fair-rotation order. Encourages people to actually populate new brands rather than just requesting them and waiting.

**Decision:** auto-approve if validation rules pass (goes live immediately, no waiting on manual review) — but notify the admin (Yaakov) whenever a new brand gets auto-approved, so it can still be spot-checked and pulled if something's actually wrong, even though it's already live. Notification could be a simple in-app badge/list on the admin panel (e.g. "recently auto-approved" section) or an email/push alert — worth deciding the exact notification mechanism when building.

**Note on the incentive not being gameable:** the "first 2 referrals" priority only applies to the submitter's *own code* on that specific brand — not a general perk they can bank. So adding a brand with no code attached gains nothing; someone has to actually contribute a real, working code to benefit at all, which is the actual desired behaviour anyway.

---

## Session log — Aug 11

- **Google Search Console**: property verified for `www.referralrobin.com` (meta tag in `app/+html.tsx`), sitemap.xml submitted. Fixed a real bug along the way: `SITE_URL` was hardcoded to the apex domain in 4 places (`constants/seo.ts`, `robots.txt`, two build scripts), causing every sitemap URL to require a 308 redirect hop (apex → www) — Google won't reliably crawl sitemaps that redirect cross-host. Fixed all 4 to use `www.referralrobin.com` consistently; sitemap regenerated with all 126 URLs correct.
- Also checked/ruled out: robots.txt blocking, Content-Type headers, Vercel Deployment Protection (was ON — "Vercel Authentication / Require Log In" — now turned OFF), Cloudflare/WAF proxy (confirmed none — DNS resolves directly to Vercel, no proxy headers, cert issued by Let's Encrypt not Cloudflare). None of these were the actual live-serving problem in the end — Search Console's Sitemaps report was just showing stale/lagging status. Confirmed via URL Inspection → Live Test: **"URL is available to Google"** — genuinely fine. Requested indexing on both sitemap.xml and the homepage.
- **Minor DNS oddity flagged, not fixed**: `www.referralrobin.com` CNAMEs to the bare apex `referralrobin.com` rather than Vercel's recommended `cname.vercel-dns.com` target. Resolves fine currently, not causing any known issue — just worth knowing about if DNS propagation weirdness ever comes up.
- **New brands added** (Retail & Cashback): Feel Good Contacts, HelloFresh, Caffè Nero, Contactlenses.co.uk, Lensology. (Gousto attempted but already existed.) Also caught and fixed a duplicate "Caffe Nero" row that existed pre-session (deleted the old no-accent one, kept the new one with confirmed offer text).
- **UI fix**: replaced two unlabeled stacked floating action buttons (Explore screen) with a single expandable FAB — tap "+" to reveal labeled "Add Brand" / "Add Code" options, tap outside or again to collapse.
- **Confirmed shipped**: clearer domain-validation error message (was showing raw JSON in an alert). Root cause was server-side, not client — zod's `ZodError.message` was dumping the full issues array as JSON into every 400 response across `brands`/`codes`/`admin`/`cooldown` routes. Added a `firstIssueMessage()` helper (`artifacts/api-server/src/lib/zodError.ts`) to extract just the clean message instead, and updated the domain error text with a concrete example ("Enter just the domain, like monzo.com..."). Also made `isBareDomain` actually reject a `www.` prefix, since the new message calls that out explicitly.

---

## Session log — Aug 11 (cont'd): ReferMonkey brand diff batch-add

- Diffed our 122-brand export against ReferMonkey's (refermonkey.com/offers, 58 UK brands) to find gaps.
- 5 initially-flagged possible dupes confirmed as already existing under alternate names: E.ON, Park Christmas (Savings), Raisin UK, Yonder, Zopa (Biscuit Account) — correctly excluded from the batch.
- **26 new brands added to production**, script: `lib/db/scripts/add-batch-refermonkey-diff.mjs`, run via `railway ssh`. Same treatment as admin-direct add — `country: UK`, `active: true`, `submission_status: approved`. Zero collisions.
- New brands: brsk, Capital on Tap, Cheddar, Community Fibre, Dodl by AJ Bell, Hyperoptic Broadband, iFast, IG Investments, Joybuy, Lightyear, OakNorth Bank, Octopus Energy, People's Postcode Lottery, Remitly, Ribbon Rewards (Scraye), Rooster Money, ScottishPower, SumUp Pay, Talk Mobile, Three Mobile, TheFork, Tuck, Wealthify, Wealthyhood, Western Union, WorldFirst.
- Logo.dev coverage confirmed for all 26 — a handful (brsk.co.uk, scraye.com, cheddar.me, ifastgb.com, dodlinvest.com, wealthyhood.com) 404'd on first lookup since logo.dev generates logos on-demand for previously-unseen domains, but all resolved to 200 within seconds. App has a graceful initial-letter fallback regardless, so no broken-image risk either way.
- **Resolved:** this file has been moved into the repo at `docs/referral-robin-backlog.md` and is now tracked in git — no longer sandbox-only. Claude Code reads/writes it directly going forward; this is the source of truth.

---

## Open item: DNS/domain redirect cleanup (non-standard www/apex setup)

**Flagged Aug 11.** ChatGPT's web crawler couldn't fetch referralrobin.com properly (redirect issue), even though Google's Live Test confirms everything works fine for Googlebot. Root cause: the current DNS setup is backwards from Vercel's documented standard — `www.referralrobin.com` CNAMEs to the bare apex, and the apex holds the actual A record, instead of the recommended `www` (CNAME → cname.vercel-dns.com) as primary + apex redirecting to www via Vercel's own edge-level redirect.

**Fix needed (dashboard changes, not code — Claude Code can't do this):**
1. In Vercel project (not account) Settings → Domains, confirm both `referralrobin.com` and `www.referralrobin.com` are listed there together.
2. Set `www.referralrobin.com` as primary/target, no redirect on it.
3. Set `referralrobin.com` (apex) → "Redirect to" → `www.referralrobin.com` (Vercel edge-level redirect, not DNS-level).
4. In GoDaddy, `www` CNAME should point to `cname.vercel-dns.com` (Vercel's actual recommended target), not to the bare apex.
5. Verify with an external redirect checker afterward.

**Status:** ✅ Resolved (Aug 11) — `www` CNAME in GoDaddy updated to point to `cname.vercel-dns.com` (was pointing to bare apex). Verified via httpstatus.io: clean 2-hop chain (HTTP→HTTPS 308, apex→www 308) landing on `200` at `www.referralrobin.com`. No loops, no extra hops. Should resolve the ChatGPT crawler fetch failure along with any other non-Google crawler compatibility.

---

*(Next ideas go here — just tell Claude and it'll be added to this file.)*
