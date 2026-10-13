import { z } from "zod";
import mongoose from "mongoose";
import { Form } from "../form/form.model.js";
import { FormResponse } from "../form-response/form-response.model.js";
import { User } from "../user/user.model.js";
import { FORM_STATUSES } from "../form/form.validation.js";
import { ApiError } from "../../utils/ApiError.js";
import { assetFromUrl, deleteCloudinaryAssets, type CloudinaryAsset } from "../../config/cloudinary.js";
import { AdminAudit } from "./admin-audit.model.js";

// ponytail: runs inline in the request; refuse oversized sets rather than add a job queue.
export const MAX_FORMS_PER_RUN = 5000;

export const formCleanupSchema = z
  .object({
    from: z.coerce.date(),
    to: z.coerce.date(),
    statuses: z.array(z.enum(FORM_STATUSES)).optional(),
    onlyTrashed: z.boolean().default(false),
  })
  .refine((f) => f.from <= f.to, { message: "Start date must be before end date", path: ["from"] });

export type FormCleanupFilter = z.infer<typeof formCleanupSchema>;

export const executeCleanupSchema = formCleanupSchema.and(
  z.object({
    expectedForms: z.number().int().min(0),
    confirm: z.literal("DELETE", { message: 'Type "DELETE" to confirm' }),
  })
);

function matchFor(f: FormCleanupFilter) {
  return {
    createdAt: { $gte: f.from, $lte: f.to },
    ...(f.statuses?.length ? { status: { $in: f.statuses } } : {}),
    ...(f.onlyTrashed ? { isDeleted: true } : {}),
  };
}

const IMAGE_FIELDS = "coverImageUrl sections.questions.imageUrl sections.questions.options.imageUrl";

/** Every image URL a form document points at (cover, question and option images). */
function formImageUrls(form: any): string[] {
  const urls: string[] = [];
  if (form.coverImageUrl) urls.push(form.coverImageUrl);
  for (const s of form.sections ?? []) {
    for (const q of s.questions ?? []) {
      if (q.imageUrl) urls.push(q.imageUrl);
      for (const o of q.options ?? []) if (o.imageUrl) urls.push(o.imageUrl);
    }
  }
  return urls;
}

async function responseFiles(formIds: mongoose.Types.ObjectId[]) {
  const rows = await FormResponse.aggregate([
    { $match: { formId: { $in: formIds } } },
    { $unwind: "$answers" },
    { $unwind: "$answers.fileUrls" },
    { $project: { _id: 0, url: "$answers.fileUrls.url", size: { $ifNull: ["$answers.fileUrls.size", 0] } } },
  ]);
  return { urls: rows.map((r) => r.url as string).filter(Boolean), bytes: rows.reduce((s, r) => s + (r.size as number), 0) };
}

/**
 * URLs (from `urls`) still used by something we're NOT deleting: other forms (duplicates
 * copy image URLs) or a user's branding logo. Those assets must survive the cleanup.
 */
async function stillReferenced(urls: string[], excludeFormIds: mongoose.Types.ObjectId[]) {
  if (!urls.length) return new Set<string>();
  const [forms, users] = await Promise.all([
    Form.find({
      _id: { $nin: excludeFormIds },
      $or: [
        { coverImageUrl: { $in: urls } },
        { "sections.questions.imageUrl": { $in: urls } },
        { "sections.questions.options.imageUrl": { $in: urls } },
      ],
    })
      .select(IMAGE_FIELDS)
      .lean(),
    User.find({ "branding.logoUrl": { $in: urls } }).select("branding.logoUrl").lean(),
  ]);
  const wanted = new Set(urls);
  const kept = new Set<string>();
  for (const f of forms) for (const u of formImageUrls(f)) if (wanted.has(u)) kept.add(u);
  for (const u of users as any[]) if (wanted.has(u.branding?.logoUrl)) kept.add(u.branding.logoUrl);
  return kept;
}

function toAssets(urls: Iterable<string>): CloudinaryAsset[] {
  const out: CloudinaryAsset[] = [];
  for (const u of urls) {
    const a = assetFromUrl(u);
    if (a) out.push(a);
  }
  return out;
}

async function findTargets(filter: FormCleanupFilter) {
  const total = await Form.countDocuments(matchFor(filter));
  if (total > MAX_FORMS_PER_RUN) {
    throw new ApiError(400, `${total} forms match. Narrow the date range to ${MAX_FORMS_PER_RUN} or fewer per run.`);
  }
  const forms = await Form.find(matchFor(filter))
    .sort({ createdAt: 1 })
    .select(`title status isDeleted createdAt totalResponses creatorId ${IMAGE_FIELDS}`)
    .populate("creatorId", "name email")
    .lean();
  return forms as any[];
}

export async function previewFormCleanup(filter: FormCleanupFilter) {
  const forms = await findTargets(filter);
  const ids = forms.map((f) => f._id as mongoose.Types.ObjectId);
  const [responses, files] = await Promise.all([FormResponse.countDocuments({ formId: { $in: ids } }), responseFiles(ids)]);

  const imageUrls = [...new Set(forms.flatMap(formImageUrls))];
  const allUrls = [...new Set([...imageUrls, ...files.urls])];
  const kept = await stillReferenced(allUrls, ids);
  const deletable = toAssets(allUrls.filter((u) => !kept.has(u)));

  const byStatus: Record<string, number> = {};
  for (const f of forms) byStatus[f.status] = (byStatus[f.status] ?? 0) + 1;

  return {
    forms: forms.length,
    byStatus,
    trashed: forms.filter((f) => f.isDeleted).length,
    live: forms.filter((f) => !f.isDeleted && (f.status === "active" || f.status === "published")).length,
    responses,
    files: { count: files.urls.length, bytes: files.bytes },
    images: imageUrls.length,
    assets: { toDelete: deletable.length, keptShared: kept.size, external: allUrls.length - kept.size - deletable.length },
    sample: forms.slice(0, 25).map((f) => ({
      id: String(f._id),
      title: f.title,
      status: f.status,
      isDeleted: !!f.isDeleted,
      createdAt: f.createdAt,
      responses: f.totalResponses ?? 0,
      creator: f.creatorId?.email ?? "deleted user",
    })),
  };
}

export async function executeFormCleanup(
  input: z.infer<typeof executeCleanupSchema>,
  admin: { _id: mongoose.Types.ObjectId; email: string }
) {
  const { expectedForms, confirm: _confirm, ...filter } = input;
  const forms = await findTargets(filter);
  if (forms.length !== expectedForms) {
    throw new ApiError(409, `The matching forms changed since your preview (${expectedForms} → ${forms.length}). Preview again before deleting.`);
  }
  const ids = forms.map((f) => f._id as mongoose.Types.ObjectId);
  const imageUrls = forms.flatMap(formImageUrls);

  // Forms first: once they're gone no new response (or upload) can attach to them.
  const formsDeleted = (await Form.deleteMany({ _id: { $in: ids } })).deletedCount;
  const files = await responseFiles(ids);
  const responsesDeleted = (await FormResponse.deleteMany({ formId: { $in: ids } })).deletedCount;

  const allUrls = [...new Set([...imageUrls, ...files.urls])];
  const kept = await stillReferenced(allUrls, ids);
  const assets = toAssets(allUrls.filter((u) => !kept.has(u)));
  const cloud = await deleteCloudinaryAssets(assets);

  const result = {
    formsDeleted,
    responsesDeleted,
    assets: { ...cloud, attempted: assets.length, keptShared: kept.size },
    bytesFreed: files.bytes,
  };
  await AdminAudit.create({
    adminId: admin._id,
    adminEmail: admin.email,
    action: "forms.cleanup",
    params: { from: filter.from, to: filter.to, statuses: filter.statuses ?? [], onlyTrashed: filter.onlyTrashed },
    result,
  });
  return result;
}

export async function recentAudit(limit = 20) {
  // Only cleanups: plan changes share this log but have a different result shape.
  const rows = await AdminAudit.find({ action: "forms.cleanup" }).sort({ createdAt: -1 }).limit(limit).lean();
  return rows.map((r: any) => ({ id: String(r._id), adminEmail: r.adminEmail, action: r.action, params: r.params, result: r.result, at: r.createdAt }));
}
