import { getAuth, clerkClient } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";

/**
 * Middleware that requires a valid Clerk session.
 * Attaches `req.userId` (Clerk userId string) on success.
 */
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  // Attach to request for downstream handlers
  (req as Request & { userId: string }).userId = userId;
  next();
};

// Comma-separated allowlist, e.g. "discountedbrands@gmail.com". Deliberately
// a plain env var rather than a Clerk role/metadata setup — this is a
// single-admin stopgap ("just me, no review queue yet"), not real RBAC.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * Plain boolean check, reused by requireAdmin (below, for endpoints only
 * admins may call at all) and by POST /brands/submit (which every signed-in
 * user may call, but branches its *outcome* on this — admin submissions go
 * straight to live, everyone else's land as pending).
 */
export async function isAdminUser(userId: string): Promise<boolean> {
  try {
    const user = await clerkClient.users.getUser(userId);
    const email = user.primaryEmailAddress?.emailAddress?.toLowerCase();
    return !!email && ADMIN_EMAILS.includes(email);
  } catch {
    return false;
  }
}

/**
 * Middleware that requires the caller to be signed in AND have an email on
 * the ADMIN_EMAILS allowlist. Always call after (or combined with)
 * requireAuth-style logic — this checks auth itself too, so it's safe to use
 * standalone.
 */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!(await isAdminUser(userId))) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  (req as Request & { userId: string }).userId = userId;
  next();
};
