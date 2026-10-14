import { describe, it, expect, vi, beforeEach } from "vitest";

const userFind = vi.fn();
vi.mock("../user/user.model.js", () => ({ User: { find: userFind } }));
vi.mock("./site-analytics.model.js", () => ({ ConsentRecord: {}, TrackEvent: {} }));

const { consentFilter, parseConsentFilters, csvCell, toConsentCsv, toConsentRow } = await import("./site-analytics.admin.js");

/** User.find(...).select(...).limit(...).lean() resolving to these ids. */
const usersMatching = (ids: string[]) =>
  userFind.mockReturnValue({ select: () => ({ limit: () => ({ lean: async () => ids.map((_id) => ({ _id })) }) }) });

describe("consent admin", () => {
  beforeEach(() => userFind.mockReset());

  it("parses only well-formed filters from the query string", () => {
    expect(parseConsentFilters({ action: "accept_all", analytics: "false", marketing: "true", source: "settings", version: "2", gpc: "true", search: "  abc  " })).toEqual({
      action: "accept_all",
      analytics: false,
      marketing: true,
      source: "settings",
      version: 2,
      gpc: true,
      search: "abc",
    });
    const junk = parseConsentFilters({ action: "nope", analytics: "yes", source: "x", version: "-1", search: "   " });
    expect(Object.values(junk).every((v) => v === undefined)).toBe(true);
  });

  it("builds exact-match filters, with gpc=false also matching records that never had the field", async () => {
    expect(await consentFilter({ action: "reject_all", analytics: false, version: 2, gpc: false })).toEqual({
      action: "reject_all",
      analytics: false,
      version: 2,
      gpc: { $ne: true },
    });
    expect(userFind).not.toHaveBeenCalled();
  });

  it("search matches consent-ID prefix, page path, and users by name/email (regex-escaped)", async () => {
    usersMatching(["u1", "u2"]);
    const where = await consentFilter({ search: "a.b+" });
    expect(userFind.mock.calls[0]![0]).toEqual({ $or: [{ name: { $regex: "a\\.b\\+", $options: "i" } }, { email: { $regex: "a\\.b\\+", $options: "i" } }] });
    expect(where.$or).toEqual([{ consentId: { $regex: "^a\\.b\\+" } }, { page: { $regex: "a\\.b\\+", $options: "i" } }, { userId: { $in: ["u1", "u2"] } }]);
  });

  it("search with no matching users leaves out the user clause", async () => {
    usersMatching([]);
    expect((await consentFilter({ search: "zzz" })).$or).toHaveLength(2);
  });

  it("CSV cells are quoted when needed and formula-like values are defused", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell('say "hi", ok')).toBe('"say ""hi"", ok"');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("-1+1")).toBe("'-1+1");
    expect(csvCell(null)).toBe("");
  });

  it("CSV has a header and one row per decision", () => {
    const row = toConsentRow({
      _id: "r1",
      consentId: "abcd-1234",
      userId: { _id: "u1", name: "Ana", email: "ana@x.io" },
      analytics: true,
      marketing: false,
      action: "custom",
      source: "banner",
      version: 2,
      page: "/pricing",
      createdAt: new Date("2026-10-01T10:00:00Z"),
    });
    const [header, line] = toConsentCsv([row]).split("\r\n");
    expect(header).toBe("when,consent_id,decision,analytics,campaign,source,policy_version,page,gpc,user_email,device,browser,os");
    expect(line).toBe("2026-10-01T10:00:00.000Z,abcd-1234,custom,allowed,denied,banner,2,/pricing,no,ana@x.io,,,");
  });
});
