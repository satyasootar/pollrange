import { z } from "zod";

/** Random IDs minted in the browser (crypto.randomUUID). */
const clientId = z.string().regex(/^[A-Za-z0-9-]{8,64}$/, "Invalid id");
const text = (max: number) => z.string().trim().max(max);

/** Campaign / referral info captured on a visit (UTM tags, referrer, landing page). */
export const attributionSchema = z.object({
  source: text(100).optional(),
  medium: text(100).optional(),
  campaign: text(150).optional(),
  term: text(150).optional(),
  content: text(150).optional(),
  referrer: text(300).optional(),
  landingPage: text(300).optional(),
  at: text(40).optional(),
});
export type Attribution = z.infer<typeof attributionSchema>;

export const CONSENT_ACTIONS = ["accept_all", "reject_all", "custom"] as const;

export const consentSchema = z.object({
  consentId: clientId,
  analytics: z.boolean(),
  marketing: z.boolean(),
  action: z.enum(CONSENT_ACTIONS),
  version: z.number().int().min(1).max(1000),
  source: z.enum(["banner", "settings"]),
  page: text(300).optional(),
  /** Browser sent the Global Privacy Control signal. */
  gpc: z.boolean().optional(),
});
export type ConsentInput = z.infer<typeof consentSchema>;

const props = z
  .record(z.string().max(40), z.union([z.string().max(200), z.number(), z.boolean()]))
  .refine((p) => Object.keys(p).length <= 10, "Too many properties");

export const trackSchema = z.object({
  visitorId: clientId,
  sessionId: clientId,
  events: z
    .array(
      z.object({
        type: z.enum(["pageview", "event"]),
        /** snake_case event name, e.g. signup, poll_created. */
        name: z.string().regex(/^[a-z0-9_]{1,60}$/).optional(),
        path: text(300),
        title: text(200).optional(),
        referrer: text(500).optional(),
        props: props.optional(),
      })
    )
    .min(1)
    .max(20),
  /** UTM tags on the current visit (marketing consent only). */
  utm: attributionSchema.optional(),
  /** First-ever visit attribution, saved to the account once known (marketing consent only). */
  firstTouch: attributionSchema.optional(),
});
export type TrackInput = z.infer<typeof trackSchema>;
