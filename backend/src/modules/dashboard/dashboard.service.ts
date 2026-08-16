import mongoose from "mongoose";
import { Poll } from "../poll/poll.model.js";
import { Form } from "../form/form.model.js";
import { ResponseModel } from "../response/response.model.js";
import { FormResponse } from "../form-response/form-response.model.js";
import { aggregateTimelineForIds, bucketKeys, type Granularity } from "../../utils/timeline.js";

const STATUSES = ["active", "published", "draft", "closed", "expired"];
const ACTIVE = new Set(["active", "published"]);

/**
 * Cross-entity overview for the creator dashboard: totals, poll/form response
 * split, status breakdown, top performers, and a combined responses timeline.
 */
export async function getDashboardOverview(userId: string, groupBy: Granularity) {
  const creatorId = new mongoose.Types.ObjectId(userId);

  const [polls, forms] = await Promise.all([
    Poll.find({ creatorId, isDeleted: false }).select("title status totalResponses").lean(),
    Form.find({ creatorId, isDeleted: false }).select("title status totalResponses").lean(),
  ]);

  const pollIds = polls.map((p) => p._id);
  const formIds = forms.map((f) => f._id);
  const pollResponses = polls.reduce((s, p) => s + (p.totalResponses || 0), 0);
  const formResponses = forms.reduce((s, f) => s + (f.totalResponses || 0), 0);
  const all = [...polls, ...forms];

  const statusBreakdown = STATUSES.map((status) => ({
    status,
    polls: polls.filter((p) => p.status === status).length,
    forms: forms.filter((f) => f.status === status).length,
  })).filter((s) => s.polls || s.forms);

  const rank = (items: any[]) =>
    [...items]
      .sort((a, b) => (b.totalResponses || 0) - (a.totalResponses || 0))
      .slice(0, 5)
      .map((x) => ({ id: String(x._id), title: x.title, responses: x.totalResponses || 0, status: x.status }));

  const [pollTl, formTl] = await Promise.all([
    aggregateTimelineForIds(ResponseModel, "pollId", pollIds, groupBy),
    aggregateTimelineForIds(FormResponse, "formId", formIds, groupBy),
  ]);
  // Build a continuous, zero-filled series so both series share one axis and gaps
  // render as zeros. Trim leading buckets with no activity at all.
  const pollCounts = new Map(pollTl.map((t) => [t.date, t.count]));
  const formCounts = new Map(formTl.map((t) => [t.date, t.count]));
  const hasData = pollTl.length > 0 || formTl.length > 0;
  const full = hasData
    ? bucketKeys(groupBy).map((date) => ({
        date,
        polls: pollCounts.get(date) ?? 0,
        forms: formCounts.get(date) ?? 0,
      }))
    : [];
  const firstActive = full.findIndex((p) => p.polls > 0 || p.forms > 0);
  const timeline = firstActive <= 0 ? full : full.slice(firstActive);

  return {
    totals: {
      polls: polls.length,
      forms: forms.length,
      responses: pollResponses + formResponses,
      active: all.filter((x) => ACTIVE.has(x.status)).length,
      drafts: all.filter((x) => x.status === "draft").length,
    },
    responsesSplit: { polls: pollResponses, forms: formResponses },
    statusBreakdown,
    topPolls: rank(polls),
    topForms: rank(forms),
    timeline,
  };
}
