// Must be imported before anything else in src/index.ts — Sentry's
// process-level uncaught-exception/unhandled-rejection handlers need to be
// registered before other modules get a chance to run. If SENTRY_DSN is
// unset, Sentry.init() safely no-ops (documented behavior), so this is safe
// to import unconditionally in every environment.
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? "development",
});
