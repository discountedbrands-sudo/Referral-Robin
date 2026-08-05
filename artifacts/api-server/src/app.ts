import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Clerk proxy — must be before body parsers (streams raw bytes)
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Origins allowed to present a session to this server. Without this, Clerk
// still validates the JWT signature/expiry, but not which origin it came
// from — this is the layer that specifically guards against subdomain
// cookie leaking / CSRF-style token replay from an untrusted origin.
// Keeping the old vercel.app domain during the referralrobin.com
// transition; drop it once nothing depends on it anymore.
const AUTHORIZED_PARTIES = [
  "https://referralrobin.com",
  "https://www.referralrobin.com",
  "https://referral-robin-api-server.vercel.app",
];

// Resolve publishable key from the incoming host so the same server can serve
// multiple Clerk custom domains in production.
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
    authorizedParties: AUTHORIZED_PARTIES,
  })),
);

app.use("/api", router);

export default app;
