import { spawnSync } from "node:child_process";

const {
  CLERK_PUBLISHABLE_KEY,
  REPLIT_DEV_DOMAIN,
  REPLIT_EXPO_DEV_DOMAIN,
  REPL_ID,
  PORT,
} = process.env;

const env = { ...process.env };
const args = ["exec", "expo", "start"];

if (CLERK_PUBLISHABLE_KEY) {
  env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY = CLERK_PUBLISHABLE_KEY;
}

if (REPLIT_DEV_DOMAIN) {
  // On Replit, Metro must bind to localhost and be reached through the
  // Replit-managed proxy domain rather than a LAN address.
  env.EXPO_PACKAGER_PROXY_URL = `https://${REPLIT_EXPO_DEV_DOMAIN}`;
  env.EXPO_PUBLIC_DOMAIN = REPLIT_DEV_DOMAIN;
  env.EXPO_PUBLIC_REPL_ID = REPL_ID;
  env.REACT_NATIVE_PACKAGER_HOSTNAME = REPLIT_DEV_DOMAIN;
  args.push("--localhost");
}

if (PORT) {
  args.push("--port", PORT);
}

args.push(...process.argv.slice(2));

const result = spawnSync("pnpm", args, { stdio: "inherit", env, shell: true });
process.exit(result.status ?? 0);
