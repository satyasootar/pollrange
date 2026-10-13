import { ResponseModel } from "./response.model.js";
import { Poll } from "../poll/poll.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { emitAnalyticsUpdate } from "../../socket/index.js";
import mongoose from "mongoose";
import { consume, refund } from "../billing/billing.service.js";
import { sendSubmissionCopy } from "../../utils/receipt.js";
import config from "../../config/config.js";

/**
 * Processes a poll response submission.
 * Uses atomic $inc operators for concurrency-safe vote counting
 * and broadcasts real-time analytics via Socket.io.
 */
export async function submitResponse(
    pollId: string, 
    responseData: any, 
    meta: { respondentId?: string, userName?: string, userEmail?: string, ipHash: string, userAgent: string }
) {
    // Validate the poll exists and is active
    const poll = await Poll.findOne({ _id: pollId, isDeleted: false, status: "active" });
    
    if (!poll) {
        throw new ApiError(404, "Poll not found or not active");
    }

    if (poll.expiresAt && poll.expiresAt < new Date()) {
        poll.status = "closed";
        poll.closedAt = new Date();
        await poll.save();
        throw new ApiError(410, "This poll has expired");
    }

    // Enforce authentication if required by poll settings
    if (poll.responseMode === "authenticated" && !meta.respondentId) {
        throw new ApiError(401, "Authentication is required to vote on this poll");
    }

    // Ensure every mandatory question has a non-skipped answer.
    const answeredQuestionIds = new Set(
        (responseData.answers || [])
            .filter((a: any) => !a.skipped)
            .map((a: any) => a.questionId?.toString())
    );
    for (const question of poll.questions as any[]) {
        if (question.isMandatory && !answeredQuestionIds.has(question._id.toString())) {
            throw new ApiError(400, "All mandatory questions must be answered");
        }
    }

    // Prevent duplicate submissions from the same identity (enforced in all environments).
    const dupFilters: any[] = [];
    if (meta.respondentId) {
        dupFilters.push({ pollId, respondentId: meta.respondentId });
    }
    if (responseData.sessionToken) {
        dupFilters.push({ pollId, sessionToken: responseData.sessionToken });
    }

    if (dupFilters.length > 0) {
        const existing = await ResponseModel.findOne({ $or: dupFilters });
        if (existing) {
            throw new ApiError(403, "You have already submitted a response to this poll");
        }
    }

    // Create the response document.
    // The unique indexes on {pollId, sessionToken} / {pollId, respondentId} are the
    // race-safe backstop for the check above, so translate their duplicate-key error.
    // Plan quota (after validation/dedup so rejected submits don't count); refunded if the insert fails.
    await consume(poll.creatorId, "responses", "respondent");
    let response;
    try {
        response = await ResponseModel.create({
            ...responseData,
            pollId,
            respondentId: meta.respondentId,
            ipHash: meta.ipHash,
            userAgent: meta.userAgent,
            submittedAt: new Date(),
        });
    } catch (err: any) {
        await refund(poll.creatorId, "responses");
        if (err?.code === 11000) {
            throw new ApiError(403, "You have already submitted a response to this poll");
        }
        throw err;
    }

    // Atomic increment of totalResponses
    await Poll.updateOne({ _id: pollId }, { $inc: { totalResponses: 1 } });

    // Atomic increment of individual option vote counts
    for (const answer of responseData.answers) {
        if (answer.skipped) continue;

        const optionsToIncrement = [];
        if (answer.selectedOptionId) {
            optionsToIncrement.push(answer.selectedOptionId);
        }
        if (answer.selectedOptionIds && Array.isArray(answer.selectedOptionIds)) {
            optionsToIncrement.push(...answer.selectedOptionIds);
        }

        // De-duplicate in case both fields are present
        const uniqueOptions = [...new Set(optionsToIncrement.map(id => id.toString()))];

        for (const optionId of uniqueOptions) {
            await Poll.updateOne(
                { 
                    _id: pollId,
                    "questions._id": answer.questionId,
                    "questions.options._id": optionId 
                },
                { 
                    $inc: { "questions.$[q].options.$[o].voteCount": 1 } 
                },
                {
                    arrayFilters: [
                        { "q._id": new mongoose.Types.ObjectId(answer.questionId) },
                        { "o._id": new mongoose.Types.ObjectId(optionId) }
                    ]
                }
            );
        }
    }

    // Broadcast updated analytics to all connected clients in real-time
    const updatedPoll = await Poll.findById(pollId).select("questions totalResponses title");
    if (updatedPoll) {
        emitAnalyticsUpdate(pollId, {
            pollId,
            totalResponses: updatedPoll.totalResponses,
            questions: updatedPoll.questions,
        });
    }

    if (meta.respondentId) {
        const answers = new Map<string, any>(responseData.answers.map((a: any) => [String(a.questionId), a]));
        sendSubmissionCopy(
            meta.userEmail,
            {
                kind: "poll",
                title: poll.title,
                url: `${config.CLIENT_URL}/p/${poll.shareToken}`,
                name: meta.userName,
                rows: (poll.questions as any[]).map((q) => {
                    const a = answers.get(String(q._id));
                    const ids = a?.skipped ? [] : [a?.selectedOptionId, ...(a?.selectedOptionIds ?? [])].filter(Boolean).map(String);
                    const picked = (q.options ?? []).filter((o: any) => ids.includes(String(o._id))).map((o: any) => o.text);
                    return { question: q.text, answer: a?.skipped ? "" : picked.length ? picked.join(", ") : (a?.textResponse ?? "") };
                }),
            },
            `receipt-${response._id}`
        );
    }

    return response;
}

/**
 * Fetches the polls answered by a specific user.
 * Populates poll details needed for the history section.
 */
export async function getUserResponseHistory(userId: string) {
    return await ResponseModel.find({ respondentId: userId })
        .populate({
            path: "pollId",
            select: "title status shareToken",
            match: { isDeleted: false }
        })
        .sort({ submittedAt: -1 });
}
