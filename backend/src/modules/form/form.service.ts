import { Form } from "./form.model.js";
import { FormResponse } from "../form-response/form-response.model.js";
import { ApiError } from "../../utils/ApiError.js";
import crypto from "crypto";
import type { ICreateForm, IUpdateForm, ICreateSection } from "./form.validation.js";
import { GRADABLE_TYPES } from "./form.validation.js";
import { emitFormStatusChange, emitQuizLiveState } from "../../socket/index.js";
import { assertFeature, assertLiveCapacity, hasFeature } from "../billing/billing.service.js";
import { resolveBrand } from "../branding/branding.service.js";
import type { FormBranding } from "../branding/branding.validation.js";
import { settleExpiredForm, SUBMIT_GRACE_MS } from "./form-results.service.js";
import { QuizAttempt } from "../form-response/quiz-attempt.model.js";

/**
 * Validates branching + quiz integrity before persisting. Throws ApiError(400) on
 * a bad navigation target, a branching cycle, or a quiz question missing its key.
 */
function validateFormStructure(sections: ICreateSection[], isQuiz: boolean) {
  const keyOf = (s: ICreateSection, i: number) => s._id ?? String(i);
  const sectionKeys = new Set(sections.map(keyOf));

  // Build the branch graph: section -> set of reachable target section keys.
  const graph = new Map<string, Set<string>>();

  sections.forEach((section, i) => {
    const targets = new Set<string>();
    const nav = section.navigation;
    if (nav?.type === "byAnswer") {
      for (const q of section.questions) {
        for (const target of Object.values(q.optionNavigation ?? {})) {
          if (target === "submit") continue;
          if (!sectionKeys.has(target)) {
            throw new ApiError(400, `Branch target "${target}" does not reference an existing section`);
          }
          targets.add(target);
        }
      }
    } else if (nav?.type === "next" || nav === undefined) {
      const next = sections[i + 1];
      if (next) targets.add(keyOf(next, i + 1));
    }
    graph.set(keyOf(section, i), targets);
  });

  // Detect cycles via DFS colouring (white/grey/black).
  const state = new Map<string, number>();
  const hasCycle = (node: string): boolean => {
    state.set(node, 1);
    for (const next of graph.get(node) ?? []) {
      const s = state.get(next) ?? 0;
      if (s === 1) return true;
      if (s === 0 && hasCycle(next)) return true;
    }
    state.set(node, 2);
    return false;
  };
  for (const node of graph.keys()) {
    if ((state.get(node) ?? 0) === 0 && hasCycle(node)) {
      throw new ApiError(400, "Branching creates an infinite loop between sections");
    }
  }

  if (isQuiz) {
    for (const section of sections) {
      for (const q of section.questions) {
        if (q.points && q.points > 0) {
          const key = q.answerKey;
          const hasCorrect =
            (key?.correctOptionIds && key.correctOptionIds.length > 0) ||
            (key?.correctText && key.correctText.length > 0);
          if (GRADABLE_TYPES.includes(q.type) && !hasCorrect) {
            throw new ApiError(400, `Quiz question "${q.title}" is worth points but has no answer key`);
          }
        }
      }
    }
  }
}

/** True when a paid override field (not the kit on/off switch) gets a new non-empty value. */
function brandingChanged(current: FormBranding | undefined, next: FormBranding | undefined) {
  if (!next) return false;
  return (["accentColor", "redirectUrl", "shareTitle", "shareDescription", "shareImageUrl"] as const).some(
    (k) => !!next[k] && next[k] !== current?.[k]
  );
}

/** Respondents must sign in to upload files, so any file question forces sign-in mode. */
const hasFileUpload = (sections: ICreateSection[]) => sections.some((s) => s.questions.some((q) => q.type === "file_upload"));

export async function createForm(userId: string, formData: ICreateForm) {
  validateFormStructure(formData.sections, formData.isQuiz ?? false);
  if (hasFileUpload(formData.sections)) formData = { ...formData, responseMode: "authenticated" };
  // A live quiz's end time is set when the host presses Start, never up front.
  if (formData.quizTimer?.mode === "live") formData = { ...formData, expiresAt: null };
  const { slug, ...persistedFormData } = formData;
  if (slug) await assertFeature(userId, "customSlug");
  if (brandingChanged(undefined, formData.branding)) await assertFeature(userId, "branding");
  await assertLiveCapacity(userId); // new forms go live immediately
  const shareToken = slug || crypto.randomUUID();
  if (slug && (await Form.exists({ shareToken }))) {
    throw new ApiError(409, "That form slug is already in use. Choose another slug.");
  }
  return await Form.create({
    ...persistedFormData,
    creatorId: userId,
    shareToken,
    status: "active",
  } as any);
}

export async function getFormByCreator(userId: string, formId: string) {
  const form = await Form.findOne({ _id: formId, creatorId: userId, isDeleted: false });
  if (!form) throw new ApiError(404, "Form not found or unauthorized");
  return form;
}

export async function listFormsByCreator(
  userId: string,
  filters: { status?: string; search?: string; page?: number; limit?: number }
) {
  const { status, search, page = 1, limit = 10 } = filters;
  const skip = (page - 1) * limit;

  const query: any = { creatorId: userId, isDeleted: false };
  if (status && status !== "all") query.status = status;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const forms = await Form.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
  const total = await Form.countDocuments(query);

  return {
    forms,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}

const LOCKED_MESSAGE = "This form already has responses or published results, so it can't be edited. Duplicate it to make changes.";

/**
 * Updates a form — only while nobody has responded and results aren't out. Responses,
 * scores, the leaderboard, answer reviews and analytics all reference the questions and
 * options by id (and were graded against the answer key), so editing after that corrupts them.
 */
export async function updateForm(userId: string, formId: string, updateData: IUpdateForm) {
  const current = await Form.findOne({ _id: formId, creatorId: userId, isDeleted: false })
    .select("branding shareToken status totalResponses quizTimer liveStartedAt")
    .lean();
  if (!current) throw new ApiError(404, "Form not found or unauthorized");
  if (current.liveStartedAt) throw new ApiError(409, "This live quiz has already started, so it can't be edited.");
  const live = (updateData.quizTimer?.mode ?? current.quizTimer?.mode) === "live";
  // The responses check also covers a submit that's saved but hasn't bumped totalResponses yet.
  if (current.status === "published" || (current.totalResponses ?? 0) > 0 || (await FormResponse.exists({ formId }))) {
    throw new ApiError(409, LOCKED_MESSAGE);
  }

  if (updateData.sections) {
    validateFormStructure(updateData.sections, updateData.isQuiz ?? false);
    if (hasFileUpload(updateData.sections)) updateData = { ...updateData, responseMode: "authenticated" };
  }
  const { slug, expiresAt, ...rest } = updateData;
  const persistedUpdateData = live || expiresAt === undefined ? rest : { ...rest, expiresAt };
  if (updateData.branding && brandingChanged(current.branding as FormBranding | undefined, updateData.branding)) {
    await assertFeature(userId, "branding");
  }
  if (slug !== undefined) {
    // Only a *changed* link needs the plan feature; editors resend the current one on every save.
    if (current.shareToken !== slug) await assertFeature(userId, "customSlug");
    const existing = await Form.findOne({ shareToken: slug, _id: { $ne: formId }, isDeleted: false }).select("_id");
    if (existing) throw new ApiError(409, "That form slug is already in use. Choose another slug.");
  }
  // Re-check the lock atomically: a response may have landed since the read above.
  const form = await Form.findOneAndUpdate(
    { _id: formId, creatorId: userId, isDeleted: false, totalResponses: 0, status: { $ne: "published" } },
    {
      $set: { ...persistedUpdateData, ...(slug !== undefined ? { shareToken: slug } : {}) },
      ...(live ? { $unset: { expiresAt: 1 } } : {}),
    },
    { returnDocument: "after" }
  );
  if (!form) throw new ApiError(409, LOCKED_MESSAGE);
  return form;
}

export async function checkSlugAvailability(userId: string, slug: string, formId?: string) {
  const existing = await Form.exists({
    shareToken: slug,
    isDeleted: false,
    ...(formId ? { _id: { $ne: formId } } : {}),
  });
  return { slug, available: !existing };
}

export async function deleteForm(userId: string, formId: string) {
  const form = await Form.findOneAndUpdate(
    { _id: formId, creatorId: userId },
    { $set: { isDeleted: true } },
    { returnDocument: "after" }
  );
  if (!form) throw new ApiError(404, "Form not found or unauthorized");
  return { success: true };
}

export async function duplicateForm(userId: string, formId: string) {
  const original = await Form.findOne({ _id: formId, creatorId: userId, isDeleted: false });
  if (!original) throw new ApiError(404, "Form not found or unauthorized");
  await assertLiveCapacity(userId); // the copy is created live

  const copy = original.toObject() as any;
  delete copy._id;
  delete copy.createdAt;
  delete copy.updatedAt;
  copy.title = `${copy.title} (Copy)`;
  copy.shareToken = crypto.randomUUID();
  copy.totalResponses = 0;
  copy.status = "active";
  copy.isResultsPublic = false;
  copy.publishedAt = undefined;
  copy.closedAt = undefined;
  copy.resultsPublishedAt = undefined;
  copy.liveStartedAt = undefined;
  if (copy.quizTimer?.mode === "live") copy.expiresAt = undefined;
  // reset denormalized option counts
  for (const section of copy.sections ?? []) {
    for (const q of section.questions ?? []) {
      for (const opt of q.options ?? []) opt.responseCount = 0;
    }
  }
  return await Form.create(copy);
}

/**
 * Strips answer keys + denormalized counts for public taking. Keeps them for results.
 */
function sanitizeForTaking(form: any) {
  const sanitized = form.toObject() as any;
  delete sanitized.creatorId;
  delete sanitized.branding; // resolved into `brand` by the caller
  sanitized.formId = sanitized._id;
  for (const section of sanitized.sections ?? []) {
    for (const q of section.questions ?? []) {
      delete q.answerKey;
      for (const opt of q.options ?? []) delete opt.responseCount;
    }
  }
  return sanitized;
}

export async function getPublicForm(
  shareToken: string,
  context: { sessionToken?: string; userId?: string } = {}
) {
  const form = await Form.findOne({ shareToken, isDeleted: false });
  if (!form) throw new ApiError(404, "Form not found");

  await settleExpiredForm(form);
  if (form.status === "draft") throw new ApiError(404, "Form not found");

  let alreadyResponded = false;
  if (context.sessionToken || context.userId) {
    const dup: any[] = [];
    if (context.userId) dup.push({ formId: form._id, respondentId: context.userId });
    if (context.sessionToken) dup.push({ formId: form._id, sessionToken: context.sessionToken });
    alreadyResponded = (await FormResponse.exists({ $or: dup })) !== null;
  }

  const sanitized = sanitizeForTaking(form);
  sanitized.alreadyResponded = alreadyResponded;
  // A per-person timer already running for this taker: the client resumes it instead of restarting.
  if (form.isQuiz && form.quizTimer?.mode === "per_person" && (context.sessionToken || context.userId)) {
    const identity: Record<string, unknown>[] = [];
    if (context.userId) identity.push({ formId: form._id, respondentId: context.userId });
    if (context.sessionToken) identity.push({ formId: form._id, sessionToken: context.sessionToken });
    const attempt = await QuizAttempt.findOne({ $or: identity }).select("startedAt endsAt").lean();
    if (attempt) sanitized.attempt = { startedAt: attempt.startedAt, endsAt: attempt.endsAt };
  }
  // Past the deadline but still inside the submit grace window: new visitors see it as ended.
  if (sanitized.status === "active" && form.expiresAt && form.expiresAt < new Date()) sanitized.status = "closed";
  // Lets the client run its countdown on server time rather than a possibly-skewed device clock.
  sanitized.serverTime = new Date();
  sanitized.brand = await resolveBrand(form.creatorId, form.branding as FormBranding | undefined);
  sanitized.showPoweredBy = !sanitized.brand && !(await hasFeature(form.creatorId, "branding"));
  return sanitized;
}

export async function publishFormResults(
  userId: string,
  formId: string,
  mode: "live" | "permanent" = "permanent"
) {
  const form = await Form.findOne({ _id: formId, creatorId: userId, isDeleted: false });
  if (!form) throw new ApiError(404, "Form not found or unauthorized");
  if (!form.isQuiz) throw new ApiError(400, "Only quizzes have results to publish");
  if (form.status === "draft") throw new ApiError(400, "A draft has no results to publish");

  if (mode === "permanent") {
    form.status = "published";
    form.publishedAt = new Date();
    if (!form.closedAt) form.closedAt = new Date();
  }
  form.isResultsPublic = true;
  form.resultsPublishedAt = new Date();
  await form.save();

  emitFormStatusChange(form._id.toString(), {
    status: form.status,
    closedAt: form.closedAt,
    reason: mode === "permanent" ? "published" : "results-live",
  });
  if (mode === "permanent") endLiveBroadcast(form);

  return form;
}

/** Hides published results again; a published form falls back to closed. */
export async function unpublishFormResults(userId: string, formId: string) {
  const form = await Form.findOne({ _id: formId, creatorId: userId, isDeleted: false });
  if (!form) throw new ApiError(404, "Form not found or unauthorized");
  form.isResultsPublic = false;
  form.resultsPublishedAt = undefined;
  if (form.status === "published") form.status = "closed";
  await form.save();

  emitFormStatusChange(form._id.toString(), { status: form.status, closedAt: form.closedAt, reason: "results-hidden" });
  return form;
}

/** Tells a live quiz's takers it's over (they auto-submit). No-op for other forms. */
function endLiveBroadcast(form: { _id: unknown; quizTimer?: { mode?: string } | null | undefined; liveStartedAt?: Date | null | undefined; expiresAt?: Date | null | undefined }) {
  if (form.quizTimer?.mode === "live") {
    emitQuizLiveState(String(form._id), { state: "ended", startedAt: form.liveStartedAt, endsAt: form.expiresAt });
  }
}

/** A creator's live quiz, settled first so a timer that already ran out reads as ended. */
async function ownedLiveQuiz(userId: string, formId: string) {
  const form = await Form.findOne({ _id: formId, creatorId: userId, isDeleted: false });
  if (!form) throw new ApiError(404, "Form not found or unauthorized");
  if (!form.isQuiz || form.quizTimer?.mode !== "live") throw new ApiError(400, "This quiz isn't set up as a live quiz.");
  await settleExpiredForm(form);
  return form;
}

/** Live quiz: start one shared timer for everyone (late joiners get the time left). */
export async function startLiveQuiz(userId: string, formId: string, durationMinutes?: number) {
  const form = await ownedLiveQuiz(userId, formId);
  if (form.liveStartedAt) throw new ApiError(409, "This quiz has already started.");
  if (form.status !== "active") throw new ApiError(400, "This quiz is closed.");
  const minutes = durationMinutes ?? form.quizTimer?.durationMinutes;
  if (!minutes) throw new ApiError(400, "Set how many minutes the quiz lasts.");

  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime() + minutes * 60_000);
  // Conditional so a double click (or two hosts) starts it exactly once.
  const updated = await Form.findOneAndUpdate(
    { _id: form._id, status: "active", liveStartedAt: null },
    { $set: { liveStartedAt: startedAt, expiresAt: endsAt, "quizTimer.durationMinutes": minutes } },
    { returnDocument: "after" }
  );
  if (!updated) throw new ApiError(409, "This quiz has already started.");
  emitQuizLiveState(String(form._id), { state: "running", startedAt, endsAt });
  return updated;
}

/** Live quiz: give everyone more time while it's running. */
export async function extendLiveQuiz(userId: string, formId: string, minutes: number) {
  const form = await ownedLiveQuiz(userId, formId);
  const now = new Date();
  const updated = await Form.findOneAndUpdate(
    { _id: form._id, status: "active", liveStartedAt: { $ne: null }, expiresAt: { $gt: now } },
    [{ $set: { expiresAt: { $add: ["$expiresAt", minutes * 60_000] } } }],
    { returnDocument: "after" }
  );
  if (!updated) throw new ApiError(400, "The quiz isn't running.");
  emitQuizLiveState(String(form._id), { state: "running", startedAt: updated.liveStartedAt, endsAt: updated.expiresAt });
  return updated;
}

/**
 * Live quiz: end it now. The end time becomes "now", so takers' clients auto-submit what they
 * have and the usual submit grace still accepts those in-flight answers; the quiz is settled
 * (closed, auto-published if set) once the grace has passed.
 */
export async function endLiveQuiz(userId: string, formId: string) {
  const form = await ownedLiveQuiz(userId, formId);
  if (!form.liveStartedAt || form.status !== "active") throw new ApiError(400, "The quiz isn't running.");
  const endsAt = new Date();
  const updated = await Form.findOneAndUpdate(
    { _id: form._id, status: "active" },
    { $set: { expiresAt: endsAt } },
    { returnDocument: "after" }
  );
  if (!updated) throw new ApiError(400, "The quiz isn't running.");
  emitQuizLiveState(String(form._id), { state: "ended", startedAt: updated.liveStartedAt, endsAt });
  // ponytail: in-process timer (single-instance, like the expiry job); the job settles it anyway within a minute.
  setTimeout(() => {
    void Form.findById(form._id)
      .then((f) => f && settleExpiredForm(f))
      .catch(() => {});
  }, SUBMIT_GRACE_MS + 1_000).unref();
  return updated;
}

export async function closeForm(userId: string, formId: string) {
  const form = await Form.findOne({ _id: formId, creatorId: userId, isDeleted: false });
  if (!form) throw new ApiError(404, "Form not found or unauthorized");
  // Closing a published quiz would silently demote it and leave its results half-hidden.
  if (form.status !== "active") throw new ApiError(400, "Only active forms can be closed");

  form.status = "closed";
  form.closedAt = new Date();
  await form.save();

  emitFormStatusChange(form._id.toString(), {
    status: "closed",
    closedAt: form.closedAt,
    reason: "closed-by-creator",
  });
  endLiveBroadcast(form);
  return form;
}

export async function reopenForm(userId: string, formId: string, expiresAt?: Date | null) {
  const form = await Form.findOne({ _id: formId, creatorId: userId, isDeleted: false });
  if (!form) throw new ApiError(404, "Form not found or unauthorized");
  if (form.status !== "closed") throw new ApiError(400, "Only closed forms can be reopened");
  await assertLiveCapacity(userId);

  form.status = "active";
  form.closedAt = undefined;
  if (expiresAt === null || expiresAt === undefined) {
    form.expiresAt = undefined;
  } else {
    if (expiresAt <= new Date()) throw new ApiError(400, "New expiry date must be in the future");
    form.expiresAt = expiresAt;
  }
  await form.save();

  emitFormStatusChange(form._id.toString(), {
    status: "active",
    closedAt: null,
    reason: "reopened",
  });
  return form;
}

export async function regenerateShareToken(userId: string, formId: string) {
  const form = await Form.findOne({ _id: formId, creatorId: userId, isDeleted: false });
  if (!form) throw new ApiError(404, "Form not found or unauthorized");
  const shareToken = crypto.randomUUID();
  form.shareToken = shareToken;
  await form.save();
  return { shareToken };
}

export async function checkFormStatus(
  shareToken: string,
  context: { sessionToken?: string; userId?: string } = {}
) {
  const form = await Form.findOne({ shareToken, isDeleted: false });
  if (!form) throw new ApiError(404, "Form not found");

  let alreadyResponded = false;
  if (context.sessionToken || context.userId) {
    const dup: any[] = [];
    if (context.userId) dup.push({ formId: form._id, respondentId: context.userId });
    if (context.sessionToken) dup.push({ formId: form._id, sessionToken: context.sessionToken });
    alreadyResponded = (await FormResponse.exists({ $or: dup })) !== null;
  }

  return {
    formId: form._id,
    status: form.status,
    expiresAt: form.expiresAt,
    isExpired: !!form.expiresAt && form.expiresAt < new Date(),
    alreadyResponded,
    totalResponses: form.totalResponses,
    settings: form.settings,
  };
}
