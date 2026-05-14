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
    const { page, limit } = req.query;
    const result = await PollService.listPollsByCreator(
        user._id.toString(), 
        Number(page) || 1, 
        Number(limit) || 10
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
