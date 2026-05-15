import type { Request, Response } from "express";
import * as ResponseService from "./response.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import crypto from "crypto";

/**
 * Handles submission of a poll response.
 * Generates an IP hash for duplicate detection and triggers the response service.
 */
export async function submitResponse(req: Request, res: Response) {
    const { pollId } = req.params;
    const user = (req as any).user;
    
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const ipHash = crypto.createHash("sha256").update(ip).digest("hex");
    
    const response = await ResponseService.submitResponse(
        pollId as string, 
        req.body, 
        {
            respondentId: user?._id?.toString(),
            ipHash,
            userAgent: req.headers["user-agent"] || "unknown",
        }
    );


    return res.status(201).json(new ApiResponse(201, response, "Response submitted successfully"));
}

/**
 * Retrieves the history of polls answered by the authenticated user.
 */
export async function getUserHistory(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user) {
        throw new ApiError(401, "Authentication is required");
    }

    const history = await ResponseService.getUserResponseHistory(user._id.toString());
    
    // Filter out responses where the poll was deleted (pollId would be null due to match in populate)
    const filteredHistory = history.filter(item => item.pollId);

    return res.status(200).json(new ApiResponse(200, filteredHistory, "User response history fetched successfully"));
}
