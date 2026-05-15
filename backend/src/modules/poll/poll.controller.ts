import type { Request, Response } from "express";
import * as PollService from "./poll.service.js";
import * as AnalyticsService from "../analytics/analytics.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { Poll } from "./poll.model.js";

/**
 * Handles creation of a new poll for the authenticated user.
 */
export async function createPoll(req: Request, res: Response) {
    const user = (req as any).user;
    const poll = await PollService.createPoll(user._id.toString(), req.body);
    return res.status(201).json(new ApiResponse(201, poll, "Poll created successfully"));
}

/**
 * Retrieves all polls created by the authenticated user.
 */
export async function getMyPolls(req: Request, res: Response) {
    const user = (req as any).user;
    const { page, limit, status, search } = req.query;
    const result = await PollService.listPollsByCreator(
        user._id.toString(), 
        {
            page: Number(page) || 1, 
            limit: Number(limit) || 10,
            status: status as string,
            search: search as string
        }
    );
    return res.status(200).json(new ApiResponse(200, result, "Polls fetched successfully"));
}

/**
 * Retrieves the full details of a specific poll owned by the user.
 */
export async function getPollDetail(req: Request, res: Response) {
    const user = (req as any).user;
    const { pollId } = req.params;
    const poll = await PollService.getPollByCreator(user._id.toString(), pollId as string);
    return res.status(200).json(new ApiResponse(200, poll, "Poll details fetched successfully"));
}

/**
 * Updates an existing poll's settings or questions (only if no responses exist).
 */
export async function updatePoll(req: Request, res: Response) {
    const user = (req as any).user;
    const { pollId } = req.params;
    const poll = await PollService.updatePoll(user._id.toString(), pollId as string, req.body);
    return res.status(200).json(new ApiResponse(200, poll, "Poll updated successfully"));
}

/**
 * Soft-deletes a poll from the system.
 */
export async function deletePoll(req: Request, res: Response) {
    const user = (req as any).user;
    const { pollId } = req.params;
    await PollService.deletePoll(user._id.toString(), pollId as string);
    return res.status(200).json(new ApiResponse(200, {}, "Poll deleted successfully"));
}

/**
 * Publishes poll results, making them visible to the public.
 */
export async function publishPoll(req: Request, res: Response) {
    const user = (req as any).user;
    const { pollId } = req.params;
    const poll = await PollService.publishPollResults(user._id.toString(), pollId as string);
    return res.status(200).json(new ApiResponse(200, poll, "Poll results published successfully"));
}

/**
 * Fetches a poll's structure for voting using a share token (unauthenticated).
 */
export async function getPublicPoll(req: Request, res: Response) {
    const { shareToken } = req.params;
    const { sessionToken } = req.query;
    const user = (req as any).user;
    const poll = await PollService.getPublicPoll(shareToken as string, { 
        sessionToken: sessionToken as string,
        userId: user?._id?.toString()
    });
    return res.status(200).json(new ApiResponse(200, poll, "Public poll fetched successfully"));
}

export async function getPublicResults(req: Request, res: Response) {
    const { shareToken } = req.params;
    const snapshot = await PollService.getPublicResults(shareToken as string);
    const poll = await Poll.findOne({ shareToken: shareToken as string, isDeleted: false }) as any;

    const questions = await Promise.all(snapshot.questionSummaries.map(async (q: any) => {
        const pollQ = poll?.questions.find((pq: any) => pq._id.toString() === q.questionId.toString()) as any;
        
        let wordCloudData = undefined;
        if (q.type === "open_ended") {
            wordCloudData = await AnalyticsService.getWordCloudData(poll?._id?.toString() || "", q.questionId.toString());
        }

        return {
            questionId: q.questionId,
            questionText: q.text,
            type: q.type,
            isMandatory: pollQ?.isMandatory ?? true,
            responseCount: snapshot.totalResponses,
            skippedCount: 0,
            wordCloudData,
            options: q.options ? q.options.map((opt: any) => ({
                optionId: opt.text,
                optionText: opt.text,
                count: opt.voteCount,
                percentage: opt.percentage
            })) : [],
            topOption: q.options && q.options.length > 0 
                ? [...q.options].sort((a: any, b: any) => b.voteCount - a.voteCount).map((opt: any) => ({
                    optionId: opt.text,
                    optionText: opt.text,
                    count: opt.voteCount,
                    percentage: opt.percentage
                }))[0]
                : null
        };
    }));

    const mappedData = {
        pollId: snapshot.pollId,
        pollTitle: snapshot.title,
        status: poll?.status || "active",
        expiresAt: poll?.expiresAt || new Date().toISOString(),
        totalResponses: snapshot.totalResponses,
        questions
    };

    return res.status(200).json(
        new ApiResponse(200, mappedData, "Public results fetched successfully")
    );
}

/**
 * Closes an active poll.
 */
export async function closePoll(req: Request, res: Response) {
    const user = (req as any).user;
    const { pollId } = req.params;
    const poll = await PollService.closePoll(user._id.toString(), pollId as string);
    return res.status(200).json(new ApiResponse(200, poll, "Poll closed successfully"));
}

/**
 * Reopens a closed poll.
 */
export async function reopenPoll(req: Request, res: Response) {
    const user = (req as any).user;
    const { pollId } = req.params;
    const poll = await PollService.reopenPoll(user._id.toString(), pollId as string);
    return res.status(200).json(new ApiResponse(200, poll, "Poll reopened successfully"));
}

/**
 * Regenerates the public share token for a poll.
 */
export async function regenerateToken(req: Request, res: Response) {
    const user = (req as any).user;
    const { pollId } = req.params;
    const result = await PollService.regenerateShareToken(user._id.toString(), pollId as string);
    return res.status(200).json(new ApiResponse(200, result, "Share token regenerated successfully"));
}

/**
 * Checks public poll status.
 */
export async function getPollStatus(req: Request, res: Response) {
    const { shareToken } = req.params;
    const { sessionToken } = req.query;
    const user = (req as any).user;
    
    const status = await PollService.checkPollStatus(shareToken as string, {
        sessionToken: sessionToken as string,
        userId: user?._id?.toString()
    });
    return res.status(200).json(new ApiResponse(200, status, "Poll status fetched successfully"));
}
