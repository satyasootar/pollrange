import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../config/config.js", () => ({ default: { CLIENT_URL: "https://app.test" } }));
vi.mock("../user/user.model.js", () => ({ User: { findById: vi.fn() } }));
vi.mock("../form/form.model.js", () => ({ Form: { findOne: vi.fn() } }));
vi.mock("../poll/poll.model.js", () => ({ Poll: { findOne: vi.fn() } }));

import { User } from "../user/user.model.js";
import { Form } from "../form/form.model.js";
import { resolveBrand, renderSharePage } from "./branding.service.js";
import { brandingInputSchema } from "./branding.validation.js";

const m = (fn: unknown) => fn as ReturnType<typeof vi.fn>;
const chain = (v: unknown) => ({ select: () => ({ lean: async () => v }) });
const asUser = (planId: string, branding: object = {}) => m(User.findById).mockReturnValue(chain({ plan: { id: planId }, branding }));
const asForm = (form: object | null) => m(Form.findOne).mockReturnValue(chain(form));

const kit = { companyName: "Chai Co", logoUrl: "https://cdn.test/logo.png", accentColor: "#112233", font: "poppins" };

beforeEach(() => vi.clearAllMocks());

describe("resolveBrand", () => {
  it("is null on Free so the Kollects look stays", async () => {
    asUser("free", kit);
    expect(await resolveBrand("u1")).toBeNull();
  });

  it("is null when the form opts out, without loading the user", async () => {
    expect(await resolveBrand("u1", { useKit: false })).toBeNull();
    expect(User.findById).not.toHaveBeenCalled();
  });

  it("merges kit, defaults and the form's accent/redirect override", async () => {
    asUser("plus", kit);
    expect(await resolveBrand("u1")).toMatchObject({ companyName: "Chai Co", accentColor: "#112233", font: "poppins", radius: "sharp", redirectUrl: "" });
    const b = await resolveBrand("u1", { accentColor: "#abcdef", redirectUrl: "https://chai.test/thanks" });
    expect(b).toMatchObject({ accentColor: "#abcdef", redirectUrl: "https://chai.test/thanks" });
  });
});

describe("renderSharePage", () => {
  it("404s drafts and missing forms", async () => {
    asForm(null);
    expect(await renderSharePage("f", "x")).toBeNull();
    asForm({ status: "draft", title: "t" });
    expect(await renderSharePage("f", "x")).toBeNull();
  });

  it("uses the share override for paid creators and escapes HTML", async () => {
    asUser("plus", kit);
    asForm({ status: "active", title: "Order form", creatorId: "u1", branding: { shareTitle: `Big "sale" <now>` } });
    const html = (await renderSharePage("f", "tok"))!;
    expect(html).toContain('og:title" content="Big &quot;sale&quot; &lt;now&gt;"');
    expect(html).toContain('og:image" content="https://cdn.test/logo.png"');
    expect(html).toContain('og:site_name" content="Chai Co"');
    expect(html).toContain("https://app.test/f/tok");
  });

  it("ignores the share override on Free and falls back to Kollects", async () => {
    asUser("free", kit);
    asForm({ status: "active", title: "Order form", creatorId: "u1", branding: { shareTitle: "Nope" } });
    const html = (await renderSharePage("f", "tok"))!;
    expect(html).toContain('og:title" content="Order form"');
    expect(html).toContain("https://app.test/logo/logo1.png");
  });
});

describe("brandingInputSchema", () => {
  it("accepts blanks to clear fields and rejects unsafe URLs / bad colours", () => {
    expect(brandingInputSchema.safeParse({ website: "", accentColor: "" }).success).toBe(true);
    expect(brandingInputSchema.safeParse({ website: "javascript:alert(1)" }).success).toBe(false);
    expect(brandingInputSchema.safeParse({ accentColor: "red" }).success).toBe(false);
    expect(brandingInputSchema.safeParse({ font: "comic-sans" }).success).toBe(false);
  });
});
