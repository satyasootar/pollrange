import OpenAI from "openai";
import config from "../../config/config.js";

/**
 * OpenAI SDK pointed at Mistral's OpenAI-compatible endpoint. Swap MISTRAL_BASE_URL
 * / MISTRAL_MODEL for any other OpenAI-compatible provider — no other code changes.
 */
export const aiClient = new OpenAI({
  // SDK throws at construction without a key; placeholder lets the server boot. Calls are gated by isAiConfigured().
  apiKey: config.MISTRAL_API_KEY || "not-configured",
  baseURL: config.MISTRAL_BASE_URL,
});

export const AI_MODEL = config.MISTRAL_MODEL;

export const isAiConfigured = () => !!config.MISTRAL_API_KEY;
