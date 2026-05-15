import type { Request, Response } from "express";
import * as PollService from "./poll.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

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
    const poll = await PollService.getPublicPoll(shareToken as string);
    return res.status(200).json(new ApiResponse(200, poll, "Public poll fetched successfully"));
}

export async function getPublicResults(req: Request, res: Response) {
    const { shareToken } = req.params;
    const snapshot = await PollService.getPublicResults(shareToken as string);
    
    // We also need the poll for status and expiresAt, but it's already fetched by getPublicResults inside the service.
    // However, to keep it simple, we can fetch it again or just map it.
    const poll = await PollService.getPublicPoll(shareToken as string);
    
    const mappedData = {
        pollId: snapshot.pollId,
        pollTitle: snapshot.title,
        status: poll?.status || "published",
        expiresAt: poll?.expiresAt || new Date().toISOString(),
        totalResponses: snapshot.totalResponses,
        completionRate: snapshot.completionRate,
        anonymousCount: 0, 
        authenticatedCount: snapshot.totalResponses,
        questions: snapshot.questionSummaries.map((q: any) => ({
            questionId: q.questionId,
            questionText: q.text,
            isMandatory: true,
            responseCount: snapshot.totalResponses,
            skippedCount: 0,
            options: q.options ? q.options.map((opt: any) => ({
                optionId: opt.text,
                optionText: opt.text,
                count: opt.voteCount,
                percentage: opt.percentage
            })) : [],
            topOption: q.options && q.options.length > 0 
                ? [...q.options].sort((a, b) => b.voteCount - a.voteCount).map((opt: any) => ({
                    optionId: opt.text,
                    optionText: opt.text,
                    count: opt.voteCount
                }))[0]
                : null
        })),
        timeline: snapshot.timeline.map((t: any) => ({
            date: t._id,
            count: t.count
        })),
        wordCloudData: []
    };

    return res.status(200).json(new ApiResponse(200, mappedData, "Public results fetched successfully"));
}
