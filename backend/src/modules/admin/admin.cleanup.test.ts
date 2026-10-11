import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";

vi.mock("../../config/config.js", () => ({
  default: { CLOUDINARY_CLOUD_NAME: "demo", CLOUDINARY_API_KEY: "k", CLOUDINARY_API_SECRET: "s" },
}));
vi.mock("../form/form.model.js", () => ({ Form: { countDocuments: vi.fn(), find: vi.fn(), deleteMany: vi.fn() } }));
vi.mock("../form-response/form-response.model.js", () => ({
  FormResponse: { aggregate: vi.fn(), countDocuments: vi.fn(), deleteMany: vi.fn() },
}));
vi.mock("../user/user.model.js", () => ({ User: { find: vi.fn() } }));
vi.mock("./admin-audit.model.js", () => ({ AdminAudit: { create: vi.fn(), find: vi.fn() } }));
vi.mock("../../config/cloudinary.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../config/cloudinary.js")>();
  return { ...real, deleteCloudinaryAssets: vi.fn(async (a: unknown[]) => ({ deleted: a.length, notFound: 0, failed: 0 })) };
});

import { Form } from "../form/form.model.js";
import { FormResponse } from "../form-response/form-response.model.js";
import { User } from "../user/user.model.js";
import { AdminAudit } from "./admin-audit.model.js";
import { assetFromUrl, deleteCloudinaryAssets } from "../../config/cloudinary.js";
import { executeCleanupSchema, executeFormCleanup, formCleanupSchema, previewFormCleanup, MAX_FORMS_PER_RUN } from "./admin.cleanup.js";

const m = (fn: unknown) => fn as ReturnType<typeof vi.fn>;
const CDN = "https://res.cloudinary.com/demo/image/upload/v1712/kollects";

// Chainable query mock: every builder method returns itself, lean() resolves `value`.
const chain = (value: unknown) => {
  const q: any = {};
  for (const k of ["sort", "select", "populate"]) q[k] = () => q;
  q.lean = async () => value;
  return q;
};

const f1 = new mongoose.Types.ObjectId();
const f2 = new mongoose.Types.ObjectId();
const targets = [
  {
    _id: f1, title: "Old fest", status: "closed", isDeleted: false, createdAt: new Date("2025-01-02"), totalResponses: 2,
    creatorId: { email: "a@x.dev" },
    coverImageUrl: `${CDN}/forms/cover-shared.jpg`,
    sections: [{ questions: [{ imageUrl: `${CDN}/forms/q1.png`, options: [{ imageUrl: `${CDN}/forms/opt.webp` }] }] }],
  },
  {
    _id: f2, title: "Trashed", status: "draft", isDeleted: true, createdAt: new Date("2025-01-03"), totalResponses: 0,
    creatorId: null,
    coverImageUrl: "https://example.com/not-ours.jpg",
    sections: [],
  },
];

const filter = { from: "2025-01-01T00:00:00.000Z", to: "2025-01-31T23:59:59.999Z" };
const calls: string[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  calls.length = 0;
  m(Form.countDocuments).mockResolvedValue(targets.length);
  m(Form.find).mockImplementation((q: any) =>
    q._id?.$nin
      ? chain([{ coverImageUrl: `${CDN}/forms/cover-shared.jpg`, sections: [] }]) // a duplicate still uses the cover
      : chain(targets)
  );
  m(Form.deleteMany).mockImplementation(async () => (calls.push("forms.delete"), { deletedCount: 2 }));
  m(FormResponse.countDocuments).mockResolvedValue(3);
  m(FormResponse.aggregate).mockImplementation(async () => (calls.push("responses.files"), [
    { url: "https://res.cloudinary.com/demo/raw/upload/v9/kollects/form-uploads/brief.docx", size: 1000 },
    { url: `${CDN}/form-uploads/photo.jpg`, size: 2500 },
  ]));
  m(FormResponse.deleteMany).mockImplementation(async () => (calls.push("responses.delete"), { deletedCount: 3 }));
  m(User.find).mockReturnValue(chain([]));
});

describe("assetFromUrl", () => {
  it("maps image and raw URLs to public ids", () => {
    expect(assetFromUrl(`${CDN}/forms/q1.png`, "demo")).toEqual({ resourceType: "image", publicId: "kollects/forms/q1" });
    expect(assetFromUrl("https://res.cloudinary.com/demo/raw/upload/v9/kollects/form-uploads/brief.docx", "demo")).toEqual({
      resourceType: "raw",
      publicId: "kollects/form-uploads/brief.docx",
    });
    expect(assetFromUrl("https://res.cloudinary.com/demo/image/upload/kollects/a%20b.jpg", "demo")?.publicId).toBe("kollects/a b");
  });

  it("refuses other clouds, other folders and non-Cloudinary URLs", () => {
    expect(assetFromUrl("https://res.cloudinary.com/other/image/upload/v1/kollects/x.png", "demo")).toBeNull();
    expect(assetFromUrl("https://res.cloudinary.com/demo/image/upload/v1/marketing/x.png", "demo")).toBeNull();
    expect(assetFromUrl("https://example.com/kollects/x.png", "demo")).toBeNull();
    expect(assetFromUrl(undefined, "demo")).toBeNull();
  });
});

describe("cleanup validation", () => {
  it("requires from <= to and the DELETE confirmation", () => {
    expect(formCleanupSchema.safeParse({ from: "2025-02-01", to: "2025-01-01" }).success).toBe(false);
    expect(executeCleanupSchema.safeParse({ ...filter, expectedForms: 2, confirm: "delete" }).success).toBe(false);
    expect(executeCleanupSchema.safeParse({ ...filter, expectedForms: 2, confirm: "DELETE" }).success).toBe(true);
  });

  it("refuses runs that match too many forms", async () => {
    m(Form.countDocuments).mockResolvedValue(MAX_FORMS_PER_RUN + 1);
    await expect(previewFormCleanup(formCleanupSchema.parse(filter))).rejects.toThrow(/Narrow the date range/);
  });
});

describe("previewFormCleanup", () => {
  it("counts forms, responses, files and deletable assets without deleting anything", async () => {
    const p = await previewFormCleanup(formCleanupSchema.parse(filter));
    expect(p).toMatchObject({
      forms: 2,
      trashed: 1,
      live: 0,
      responses: 3,
      files: { count: 2, bytes: 3500 },
      images: 4,
      // 6 URLs: shared cover kept, example.com is not ours, 4 deletable
      assets: { toDelete: 4, keptShared: 1, external: 1 },
    });
    expect(p.sample[1]!.creator).toBe("deleted user");
    expect(Form.deleteMany).not.toHaveBeenCalled();
    expect(FormResponse.deleteMany).not.toHaveBeenCalled();
    expect(deleteCloudinaryAssets).not.toHaveBeenCalled();
  });
});

describe("executeFormCleanup", () => {
  const admin = { _id: new mongoose.Types.ObjectId(), email: "satya.sootar06@gmail.com" };
  const input = () => executeCleanupSchema.parse({ ...filter, expectedForms: 2, confirm: "DELETE" });

  it("deletes forms before collecting files, then responses, then only unshared assets, and audits it", async () => {
    const r = await executeFormCleanup(input(), admin);

    expect(calls).toEqual(["forms.delete", "responses.files", "responses.delete"]);
    const assets = m(deleteCloudinaryAssets).mock.calls[0]![0] as { publicId: string }[];
    expect(assets.map((a) => a.publicId).sort()).toEqual([
      "kollects/form-uploads/brief.docx",
      "kollects/form-uploads/photo",
      "kollects/forms/opt",
      "kollects/forms/q1",
    ]);
    expect(r).toMatchObject({ formsDeleted: 2, responsesDeleted: 3, bytesFreed: 3500, assets: { deleted: 4, keptShared: 1 } });
    expect(m(AdminAudit.create).mock.calls[0]![0]).toMatchObject({ adminEmail: admin.email, action: "forms.cleanup" });
  });

  it("aborts with 409 when the matching set changed since the preview", async () => {
    await expect(executeFormCleanup({ ...input(), expectedForms: 5 }, admin)).rejects.toMatchObject({ statusCode: 409 });
    expect(Form.deleteMany).not.toHaveBeenCalled();
    expect(deleteCloudinaryAssets).not.toHaveBeenCalled();
  });
});
