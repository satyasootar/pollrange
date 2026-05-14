import type { Request, Response } from "express";
import * as ResponseService from "./response.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
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
