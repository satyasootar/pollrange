import type { Request, Response } from "express";
import * as SiteAnalytics from "./site-analytics.service.js";
import { consentSchema, trackSchema } from "./site-analytics.validation.js";

const meta = (req: Request) => ({
  userId: (req as any).user?._id?.toString(),
  ip: req.ip || req.socket.remoteAddress || "unknown",
  userAgent: req.headers["user-agent"] || "",
});

/** Logs a cookie decision (proof of consent). */
export async function recordConsent(req: Request, res: Response) {
  await SiteAnalytics.recordConsent(consentSchema.parse(req.body), meta(req));
  return res.status(204).end();
}

/** Ingests page views / events. The browser only sends these after analytics consent. */
export async function track(req: Request, res: Response) {
  await SiteAnalytics.recordEvents(trackSchema.parse(req.body), meta(req));
  return res.status(204).end();
}
