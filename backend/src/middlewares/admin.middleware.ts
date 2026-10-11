import type { Request, Response, NextFunction } from "express";
import config from "../config/config.js";
import { ApiError } from "../utils/ApiError.js";

/** Admin = email on the ADMIN_EMAILS allowlist AND verified (so nobody can claim it by signing up unverified). */
export function isAdminUser(user: { email?: string; isEmailVerified?: boolean } | undefined): boolean {
  return !!user?.email && !!user.isEmailVerified && config.ADMIN_EMAILS.includes(user.email.toLowerCase());
}

/** Use after verifyJWT. 404 (not 403) so the admin surface isn't discoverable. */
export const requireAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (!isAdminUser((req as any).user)) return next(new ApiError(404, "Not found"));
  next();
};
