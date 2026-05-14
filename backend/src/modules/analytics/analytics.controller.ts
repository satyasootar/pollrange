import type { Request, Response } from "express";
import * as AnalyticsService from "./analytics.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

/**
 * Controller for handling analytics-related requests.
 */
export async function getWordCloud(req: Request, res: Response) {
    const { pollId, questionId } = req.params;
    
    const data = await AnalyticsService.getWordCloudData(pollId as string, questionId as string);

    return res.status(200).json(
        new ApiResponse(200, data, "Word cloud data fetched successfully")
    );
}

export async function getSnapshot(req: Request, res: Response) {
    const { pollId } = req.params;
    const data = await AnalyticsService.getPollAnalyticsSnapshot(pollId as string);
    
    return res.status(200).json(
        new ApiResponse(200, data, "Poll snapshot fetched successfully")
    );
}
