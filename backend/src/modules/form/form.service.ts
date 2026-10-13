import { Form } from "./form.model.js";
import { FormResponse } from "../form-response/form-response.model.js";
import { ApiError } from "../../utils/ApiError.js";
import crypto from "crypto";
import type { ICreateForm, IUpdateForm, ICreateSection } from "./form.validation.js";
import { GRADABLE_TYPES } from "./form.validation.js";
import { emitFormStatusChange } from "../../socket/index.js";
import { assertFeature, assertLiveCapacity, hasFeature } from "../billing/billing.service.js";
import { resolveBrand } from "../branding/branding.service.js";
import type { FormBranding } from "../branding/branding.validation.js";

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

export async function createForm(userId: string, formData: ICreateForm) {
  validateFormStructure(formData.sections, formData.isQuiz ?? false);
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

/**
 * Updates a form. Unlike polls, editing is allowed anytime, even after responses
 * exist — the client warns that removing a question orphans answers.
 */
export async function updateForm(userId: string, formId: string, updateData: IUpdateForm) {
  if (updateData.sections) {
    validateFormStructure(updateData.sections, updateData.isQuiz ?? false);
  }
  const { slug, ...persistedUpdateData } = updateData;
  if (updateData.branding) {
    const current = await Form.findOne({ _id: formId, creatorId: userId }).select("branding").lean();
    if (brandingChanged(current?.branding as FormBranding | undefined, updateData.branding)) await assertFeature(userId, "branding");
  }
  if (slug !== undefined) {
    // Only a *changed* link needs the plan feature; editors resend the current one on every save.
    const current = await Form.findOne({ _id: formId, creatorId: userId }).select("shareToken").lean();
    if (current && current.shareToken !== slug) await assertFeature(userId, "customSlug");
    const existing = await Form.findOne({ shareToken: slug, _id: { $ne: formId }, isDeleted: false }).select("_id");
    if (existing) throw new ApiError(409, "That form slug is already in use. Choose another slug.");
  }
  const form = await Form.findOneAndUpdate(
    { _id: formId, creatorId: userId, isDeleted: false },
    { $set: { ...persistedUpdateData, ...(slug !== undefined ? { shareToken: slug } : {}) } },
    { returnDocument: "after" }
  );
  if (!form) throw new ApiError(404, "Form not found or unauthorized");
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

  if (form.status === "active" && form.expiresAt && form.expiresAt < new Date()) {
    form.status = "closed";
    form.closedAt = new Date();
    await form.save();
  }

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

  return form;
}

export async function closeForm(userId: string, formId: string) {
  const form = await Form.findOne({ _id: formId, creatorId: userId, isDeleted: false });
  if (!form) throw new ApiError(404, "Form not found or unauthorized");
  if (form.status === "closed") throw new ApiError(400, "Form is already closed");

  form.status = "closed";
  form.closedAt = new Date();
  await form.save();

  emitFormStatusChange(form._id.toString(), {
    status: "closed",
    closedAt: form.closedAt,
    reason: "closed-by-creator",
  });
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
