import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcrypt";

vi.mock("../user/user.model.js", () => ({ User: { findById: vi.fn(), exists: vi.fn() } }));
vi.mock("../session/session.model.js", () => ({ Session: {} }));
vi.mock("../../utils/mail.js", () => ({ sendEmail: vi.fn() }));
vi.mock("../billing/billing.service.js", () => ({ assertFeature: vi.fn() }));

import { User } from "../user/user.model.js";
import { changePassword } from "./auth.service.js";

const userWith = (passwordHash?: string) => {
  const doc: any = { passwordHash, save: vi.fn() };
  (User.findById as any).mockReturnValue({ select: async () => doc });
  return doc;
};

describe("changePassword", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lets a Google-only account add a first password without an old one", async () => {
    const doc = userWith(undefined);
    await expect(changePassword("u", { newPassword: "new-secret-1" })).resolves.toEqual({ success: true, created: true });
    expect(await bcrypt.compare("new-secret-1", doc.passwordHash)).toBe(true);
    expect(doc.save).toHaveBeenCalled();
  });

  it("requires and checks the current password once one exists", async () => {
    const doc = userWith(await bcrypt.hash("old-secret-1", 4));
    await expect(changePassword("u", { newPassword: "new-secret-1" })).rejects.toMatchObject({ statusCode: 400 });
    await expect(changePassword("u", { oldPassword: "wrong", newPassword: "new-secret-1" })).rejects.toMatchObject({ statusCode: 400 });
    expect(doc.save).not.toHaveBeenCalled();

    await expect(changePassword("u", { oldPassword: "old-secret-1", newPassword: "new-secret-1" })).resolves.toEqual({ success: true, created: false });
    expect(await bcrypt.compare("new-secret-1", doc.passwordHash)).toBe(true);
  });
});
