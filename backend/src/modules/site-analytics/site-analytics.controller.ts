import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import config from "../../config/config.js";
import { Session } from "../session/session.model.js";
import * as SiteAnalytics from "./site-analytics.service.js";
import { consentSchema, trackSchema } from "./site-analytics.validation.js";

/**
 * The tracker posts with plain fetch, which never refreshes an expired access token, so fall
 * back to the refresh token (only if its session is still active) to identify the user.
 */
async function userId(req: Request): Promise<string | undefined> {
  const fromAccess = (req as any).user?._id?.toString();
  const refreshToken = req.cookies?.refreshToken;
  if (fromAccess || !refreshToken) return fromAccess;
  try {
    jwt.verify(refreshToken, config.JWT_SECRET);
    const session = await Session.findOne({ refreshToken, isActive: true }).select("userId").lean();
    return session?.userId?.toString();
  } catch {
    return undefined;
  }
}

const meta = async (req: Request) => ({
  userId: await userId(req),
  ip: req.ip || req.socket.remoteAddress || "unknown",
  userAgent: req.headers["user-agent"] || "",
});

/** Logs a cookie decision (proof of consent). */
export async function recordConsent(req: Request, res: Response) {
  await SiteAnalytics.recordConsent(consentSchema.parse(req.body), await meta(req));
  return res.status(204).end();
}

/** Ingests page views / events. The browser only sends these after analytics consent. */
export async function track(req: Request, res: Response) {
  await SiteAnalytics.recordEvents(trackSchema.parse(req.body), await meta(req));
  return res.status(204).end();
}
