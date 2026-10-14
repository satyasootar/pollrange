import mongoose, { Schema } from "mongoose";

/** Kept for ~13 months, the usual ceiling for analytics data. */
const EVENT_TTL_SECONDS = 60 * 60 * 24 * 400;

const attribution = {
  source: String,
  medium: String,
  campaign: String,
  term: String,
  content: String,
  referrer: String,
  landingPage: String,
};

/**
 * Proof of consent: one immutable row per decision (GDPR Art. 7(1) / DPDP s.6 ask us to be
 * able to show what each visitor agreed to, when, and to which version of the policy).
 */
const consentRecordSchema = new Schema(
  {
    consentId: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    analytics: { type: Boolean, required: true },
    marketing: { type: Boolean, required: true },
    action: { type: String, enum: ["accept_all", "reject_all", "custom"], required: true },
    version: { type: Number, required: true },
    source: { type: String, enum: ["banner", "settings"], required: true },
    page: String,
    gpc: Boolean,
    ipHash: String,
    browser: String,
    os: String,
    device: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
consentRecordSchema.index({ createdAt: -1 });
consentRecordSchema.index({ userId: 1, createdAt: -1 }, { sparse: true });

export const ConsentRecord = mongoose.model("ConsentRecord", consentRecordSchema);

/** One page view or product event from a visitor who allowed analytics. */
const trackEventSchema = new Schema(
  {
    visitorId: { type: String, required: true },
    sessionId: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    type: { type: String, enum: ["pageview", "event"], required: true },
    name: String,
    path: { type: String, required: true },
    title: String,
    /** Referring site's host only (full referrer URLs can carry personal data). */
    referrer: String,
    /** Where this visit came from: utm_source, else external referrer host, else "direct". */
    source: { type: String, default: "direct" },
    utm: attribution,
    props: Schema.Types.Mixed,
    browser: String,
    os: String,
    device: String,
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);
trackEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: EVENT_TTL_SECONDS });
trackEventSchema.index({ sessionId: 1, createdAt: 1 });
trackEventSchema.index({ type: 1, createdAt: -1 });

export const TrackEvent = mongoose.model("TrackEvent", trackEventSchema);
