import crypto from "crypto";
import config from "../../config/config.js";
import { User } from "../user/user.model.js";
import { parseUserAgent } from "../../utils/user-agent.js";
import { ConsentRecord, TrackEvent } from "./site-analytics.model.js";
import type { Attribution, ConsentInput, TrackInput } from "./site-analytics.validation.js";

interface RequestMeta {
  userId?: string | undefined;
  ip: string;
  userAgent: string;
}

/** Salted so the stored hash can't be matched against a list of IPs. */
const hashIp = (ip: string) => crypto.createHash("sha256").update(`${config.IP_HASH_SALT}:${ip}`).digest("hex");

/** Host of a URL, or undefined for junk / our own site (internal navigation isn't a referral). */
export function referrerHost(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const host = new URL(url).host.replace(/^www\./, "");
    const own = new URL(config.CLIENT_URL).host.replace(/^www\./, "");
    return host && host !== own ? host : undefined;
  } catch {
    return undefined;
  }
}

/** Drops empty strings so stored attribution only has the fields that were present. */
const clean = (a?: Attribution) => (a ? Object.fromEntries(Object.entries(a).filter(([, v]) => v)) : undefined);

export async function recordConsent(input: ConsentInput, meta: RequestMeta) {
  const { device, browser, os } = parseUserAgent(meta.userAgent);
  const { page, gpc, ...choice } = input;
  await ConsentRecord.create({
    ...choice,
    ...(page ? { page: page.split(/[?#]/)[0] } : {}),
    ...(gpc !== undefined ? { gpc } : {}),
    ...(meta.userId ? { userId: meta.userId } : {}),
    ipHash: hashIp(meta.ip),
    device,
    browser,
    os,
  });
}

export async function recordEvents(input: TrackInput, meta: RequestMeta) {
  const ua = parseUserAgent(meta.userAgent);
  if (ua.bot) return { stored: 0 };

  const utm = clean(input.utm);
  const docs = input.events.map((e) => {
    const referrer = referrerHost(e.referrer);
    return {
      visitorId: input.visitorId,
      sessionId: input.sessionId,
      ...(meta.userId ? { userId: meta.userId } : {}),
      type: e.type,
      ...(e.name ? { name: e.name } : {}),
      // Path only: query strings can hold tokens or emails.
      path: e.path.split(/[?#]/)[0] || "/",
      ...(e.title ? { title: e.title } : {}),
      ...(referrer ? { referrer } : {}),
      source: (utm?.source as string | undefined)?.toLowerCase() || referrer || "direct",
      ...(utm && Object.keys(utm).length ? { utm } : {}),
      ...(e.props ? { props: e.props } : {}),
      browser: ua.browser,
      os: ua.os,
      device: ua.device,
    };
  });
  await TrackEvent.insertMany(docs);

  // First time we see a signed-in visitor with attribution, remember how they found us.
  const first = clean(input.firstTouch);
  if (meta.userId && first && Object.keys(first).length) {
    const at = first.at ? new Date(first.at as string) : new Date();
    // Host only, same as events: full referrer URLs can carry personal data.
    const refHost = referrerHost(first.referrer as string | undefined);
    delete first.referrer;
    if (refHost) first.referrer = refHost;
    await User.updateOne(
      { _id: meta.userId, "acquisition.firstSeenAt": { $exists: false } },
      {
        $set: {
          acquisition: {
            ...first,
            source: (first.source as string | undefined)?.toLowerCase() || refHost || "direct",
            visitorId: input.visitorId,
            firstSeenAt: Number.isNaN(at.getTime()) ? new Date() : at,
          },
        },
      }
    );
  }
  return { stored: docs.length };
}
