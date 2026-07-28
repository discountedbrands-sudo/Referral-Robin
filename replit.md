# Referral Robin

A fair-rotation referral code marketplace for UK fintech brands. Users pick a brand, get served one code at a time from a server-side weighted queue, copy it, and face a 10-minute per-device cooldown before getting another from the same brand. Codes are never exposed in lists — always served one at a time through the API.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, served at `/api`)
- `pnpm --filter @workspace/referral-robin run dev` — run the Expo mobile app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY` — auto-provisioned by Replit

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- **Mobile:** Expo SDK 54 + Expo Router (file-based routing)
- **API:** Express 5 (artifacts/api-server)
- **Auth:** Clerk (Replit-managed) — email + Google sign-in
- **DB:** PostgreSQL + Drizzle ORM
- **Validation:** Zod (`zod/v4`), `drizzle-zod`
- **API codegen:** Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- **Build:** esbuild (CJS bundle for API server)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle schema: brands, codes, queue_state, device_cooldowns, users
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/queue.ts` — weighted round-robin queue builder
- `artifacts/referral-robin/app/` — Expo Router screens
- `artifacts/referral-robin/context/` — DeviceContext (persisted device UUID)

## Architecture decisions

- **Codes are never queried directly from the client.** All code access routes through `POST /api/codes/next` which enforces cooldown, advances the cursor, and returns exactly one code. No list endpoint for codes.
- **Weighted interleaved queue.** The queue is a flat ordered array stored as JSON in `queue_state.order_json`. Each code appears `weight` times, placed at evenly-spaced positions (not stacked). Phase 1: all codes weight=1. Phase 2 (premium): weight>1 for boosted codes.
- **Cooldown is per-device-per-brand.** Stored in `device_cooldowns` table keyed on `(device_id, brand_id)`. Device ID is a UUID generated on first launch and persisted in AsyncStorage.
- **Queue rebuilds on submit/report.** When a code is submitted or auto-removed after 3 reports, `rebuildQueue()` regenerates the weighted order array for that brand.
- **Clerk proxy via Express.** The server mounts `clerkProxyMiddleware` at `/api/__clerk` before body parsers. Mobile app uses bearer tokens via `setAuthTokenGetter`.

## Product (Phase 1)

- Brand picker with search + category filter (Fintech, Investing, Crypto)
- Code reveal: one code per device per 10 minutes, live countdown timer
- Copy-to-clipboard with haptic feedback + `confirmCopy` tracking
- Report dead codes (auto-removed at 3 reports)
- User dashboard: submitted codes with served/copied stats, lifetime totals
- Submit a code: brand picker + code input form
- Auth: email+password + Google via Clerk

## Phases Planned

- **Phase 2:** Google Play Billing, weight boosts on subscription purchase
- **Phase 3:** Sponsored brand slots, admin panel
- **Phase 4:** Admin review queue for reported codes, trust scoring

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After any OpenAPI spec change, run `pnpm --filter @workspace/api-spec run codegen` before using hooks.
- Use `type: number` (not `type: integer`) in the OpenAPI spec — Zod v3 compat mode doesn't have `z.int()`.
- Endpoint with both path + query params generates a `GetXxxParams` name collision — move one set to query-only to avoid it.
- Expo dev script must include `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=$CLERK_PUBLISHABLE_KEY` for auth to work.
- Never run `npx expo start` directly in shell — use the `artifacts/referral-robin: expo` workflow.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `clerk-auth` skill for auth setup and customization
