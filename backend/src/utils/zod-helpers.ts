import { z } from "zod";

/**
 * A client-supplied expiry date/time. Treats "" the same as omitted/null (no
 * expiry) instead of failing — clients (including the AI-driven builders)
 * commonly represent "no expiry" as an empty string rather than omitting the
 * field entirely. A genuinely invalid value still fails, with a message
 * clear enough for a human — or an AI tool-calling loop — to self-correct.
 */
export const optionalExpiresAtSchema = z.preprocess(
  (v) => (v === "" ? null : v),
  z.coerce.date({ error: "Invalid expiry date. Provide a valid date/time, or leave it empty for no expiry." }).optional().nullable()
);
