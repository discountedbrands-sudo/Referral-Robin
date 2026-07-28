import { getAuth } from "@clerk/express";
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
