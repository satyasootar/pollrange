import type { Request, Response } from "express";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { Conversation } from "./conversation.model.js";
import { isAiConfigured } from "./ai.client.js";
import { runChat, type ChatMsg } from "./ai.service.js";
import type { Surface } from "./ai.tools.js";
import { consume } from "../billing/billing.service.js";

const SURFACES: Surface[] = ["dashboard", "poll-builder", "form-builder"];

function summarizeBuilder(builderState: unknown): string | undefined {
  if (!builderState || typeof builderState !== "object") return undefined;
  const s = builderState as { title?: string; questions?: unknown };
  const titles = Array.isArray(s.questions) ? s.questions.map((q) => String(q)).filter(Boolean) : [];
  if (!s.title && titles.length === 0) return undefined;
  const head = s.title ? `titled "${s.title}"` : "untitled";
  return `${head}, ${titles.length} question(s)${titles.length ? `: ${titles.join("; ")}` : ""}.`;
}

export async function chat(req: Request, res: Response) {
  if (!isAiConfigured()) {
    throw new ApiError(503, "AI is not configured. Set MISTRAL_API_KEY in the backend .env and restart.");
  }
  const user = (req as any).user;
  const userId = user._id.toString();
  const { surface, conversationId, message, messages, builderState } = req.body ?? {};

  if (!SURFACES.includes(surface)) throw new ApiError(400, "Invalid surface");
  // ponytail: counted up front, not refunded if the LLM call fails; add a refund if that proves common.
  await consume(user._id, "aiMessages");
  const builderSummary = summarizeBuilder(builderState);

  // ─── Builder surfaces: stateless, client sends full history ──────────────────
  if (surface !== "dashboard") {
    const history: ChatMsg[] = Array.isArray(messages)
      ? messages
          .filter((m: ChatMsg) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
          .map((m: ChatMsg) => ({ role: m.role, content: m.content }))
      : [];
    if (history.length === 0) throw new ApiError(400, "messages required");
    const { reply, actions } = await runChat({ userId, surface, messages: history, builderSummary });
    return res.status(200).json(new ApiResponse(200, { reply, actions }, "ok"));
  }

  // ─── Dashboard: persisted conversation ───────────────────────────────────────
  if (typeof message !== "string" || !message.trim()) throw new ApiError(400, "message required");

  let convo = conversationId ? await Conversation.findOne({ _id: conversationId, userId }) : null;
  if (conversationId && !convo) throw new ApiError(404, "Conversation not found");
  if (!convo) {
    convo = await Conversation.create({ userId, title: message.slice(0, 60), messages: [] });
  }

  convo.messages.push({ role: "user", content: message } as never);
  const history: ChatMsg[] = convo.messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const { reply, actions } = await runChat({ userId, surface: "dashboard", messages: history });

  convo.messages.push({ role: "assistant", content: reply, actions: actions.length ? actions : undefined } as never);
  await convo.save();

  return res
    .status(200)
    .json(new ApiResponse(200, { conversationId: convo._id, reply, actions, title: convo.title }, "ok"));
}

export async function listConversations(req: Request, res: Response) {
  const userId = (req as any).user._id.toString();
  const items = await Conversation.find({ userId }).select("title updatedAt").sort({ updatedAt: -1 }).limit(50).lean();
  return res.status(200).json(new ApiResponse(200, items, "ok"));
}

export async function getConversation(req: Request, res: Response) {
  const userId = (req as any).user._id.toString();
  const convo = await Conversation.findOne({ _id: req.params.id, userId }).lean();
  if (!convo) throw new ApiError(404, "Conversation not found");
  return res.status(200).json(new ApiResponse(200, convo, "ok"));
}

export async function deleteConversation(req: Request, res: Response) {
  const userId = (req as any).user._id.toString();
  const result = await Conversation.deleteOne({ _id: req.params.id, userId });
  if (result.deletedCount === 0) throw new ApiError(404, "Conversation not found");
  return res.status(200).json(new ApiResponse(200, { deleted: true }, "ok"));
}
