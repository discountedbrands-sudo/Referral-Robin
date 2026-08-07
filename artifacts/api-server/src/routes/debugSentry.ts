// Temporary — verifies Sentry.setupExpressErrorHandler actually reports
// unhandled errors. Remove after confirming the event lands in Sentry.
import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/debug-sentry", () => {
  throw new Error("Sentry backend test error — safe to ignore, verifying error monitoring setup");
});

export default router;
