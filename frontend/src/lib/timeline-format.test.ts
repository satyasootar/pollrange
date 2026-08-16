import { describe, it, expect } from "vitest";
import { formatTimelineLabel, TIMELINE_GRANULARITIES } from "./timeline-format";

describe("formatTimelineLabel", () => {
  it("exposes all five granularities in order", () => {
    expect(TIMELINE_GRANULARITIES.map((g) => g.value)).toEqual([
      "minute",
      "hour",
      "day",
      "week",
      "month",
    ]);
  });

  it("formats a month bucket as 'Mon YYYY'", () => {
    expect(formatTimelineLabel("2026-08", "month")).toMatch(/Aug 2026/);
  });

  it("formats a week bucket by spacing the -W", () => {
    expect(formatTimelineLabel("2026-W33", "week")).toBe("2026 W33");
  });

  it("formats an hour bucket into a localized date+hour string", () => {
    const out = formatTimelineLabel("2026-08-16 14:00", "hour");
    // localized, but must not be the raw key and must reference the day
    expect(out).not.toBe("2026-08-16 14:00");
    expect(out).toMatch(/16/);
  });

  it("formats a minute bucket into a time string", () => {
    const out = formatTimelineLabel("2026-08-16 14:05", "minute");
    expect(out).toMatch(/05/);
    expect(out).not.toContain("2026-08-16");
  });

  it("falls back to the raw key for an unparseable date", () => {
    // Invalid ISO components → Invalid Date → the raw key is returned unchanged.
    expect(formatTimelineLabel("2026-13-40 30:00", "hour")).toBe("2026-13-40 30:00");
    expect(formatTimelineLabel("2026-13", "month")).toBe("2026-13");
  });
});
