import "./instrument";
import * as Sentry from "@sentry/node";
import app from "./app";
import { logger } from "./lib/logger";
import { seedBrandsIfEmpty } from "./lib/seed";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    Sentry.captureException(err);
    // Listen callback errors happen outside any request context, so
    // setupExpressErrorHandler never sees them — capture explicitly, and
    // flush before exiting since Sentry sends events over the network
    // asynchronously and process.exit would otherwise cut that off.
    await Sentry.flush(2000);
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Seed initial brand data if the table is empty
  try {
    await seedBrandsIfEmpty();
  } catch (seedErr) {
    logger.error({ err: seedErr }, "Failed to seed brands");
    Sentry.captureException(seedErr);
  }
});
