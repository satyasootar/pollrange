import type { Request, Response } from "express";
import * as AnalyticsService from "./analytics.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { parseGranularity } from "../../utils/timeline.js";
import { Poll } from "../poll/poll.model.js";

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

export async function getFullAnalytics(req: Request, res: Response) {
    const { pollId } = req.params;
    const snapshot = await AnalyticsService.getPollAnalyticsSnapshot(pollId as string);
    const poll = await Poll.findById(pollId) as any;

    // Fetch word cloud data for each open-ended question and attach it to questions
    const questions = await Promise.all(snapshot.questionSummaries.map(async (q: any) => {
        const pollQ = poll?.questions.find((pq: any) => pq._id.toString() === q.questionId.toString()) as any;
        
        let wordCloudData = undefined;
        if (q.type === "open_ended") {
            wordCloudData = await AnalyticsService.getWordCloudData(pollId as string, q.questionId.toString());
        }

        return {
            questionId: q.questionId,
            questionText: q.text,
            type: q.type,
            isMandatory: pollQ?.isMandatory ?? true,
            responseCount: snapshot.totalResponses, // This should probably be more specific but for now matches snapshot
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
        completionRate: snapshot.completionRate,
        anonymousCount: 0, 
        authenticatedCount: snapshot.totalResponses,
        questions,
        timeline: snapshot.timeline.map((t: any) => ({
            date: t._id,
            count: t.count
        }))
    };

    return res.status(200).json(
        new ApiResponse(200, mappedData, "Full analytics fetched successfully")
    );
}

/**
 * Lists individual respondents (name + submission time) for the poll owner.
 * Exposes PII, so it verifies the requester owns the poll before returning data.
 */
export async function getRespondents(req: Request, res: Response) {
    const { pollId } = req.params;
    const user = (req as any).user;

    const poll = await Poll.findOne({ _id: pollId, creatorId: user._id, isDeleted: false });
    if (!poll) {
        throw new ApiError(404, "Poll not found or unauthorized");
    }

    const data = await AnalyticsService.getPollRespondents(pollId as string);
    return res.status(200).json(new ApiResponse(200, data, "Respondents fetched successfully"));
}

/** Sends (or re-sends) a respondent their copy of a response. */
export async function resendReceipt(req: Request, res: Response) {
    const { pollId, responseId } = req.params;
    const user = (req as any).user;
    const poll = await Poll.findOne({ _id: pollId, creatorId: user._id, isDeleted: false });
    if (!poll) throw new ApiError(404, "Poll not found or unauthorized");
    const status = await AnalyticsService.resendPollReceipt(poll, responseId as string);
    return res.status(200).json(new ApiResponse(200, status, status?.status === "sent" ? "Copy sent" : "Email could not be sent"));
}

export async function getSummary(req: Request, res: Response) {
    const { pollId } = req.params;
    const snapshot = await AnalyticsService.getPollAnalyticsSnapshot(pollId as string);
    const poll = await Poll.findById(pollId);
    
    return res.status(200).json(
        new ApiResponse(200, {
            totalResponses: snapshot.totalResponses,
            completionRate: snapshot.completionRate,
            status: poll?.status || "active"
        }, "Summary fetched successfully")
    );
}

export async function getTimeline(req: Request, res: Response) {
    const { pollId } = req.params;
    const groupBy = parseGranularity(req.query.groupBy);
    const data = await AnalyticsService.getPollTimeline(pollId as string, groupBy);

    return res.status(200).json(
        new ApiResponse(200, data, "Timeline fetched successfully")
    );
}

export async function exportData(req: Request, res: Response) {
    const { pollId } = req.params;
    const { format } = req.query;
    
    const snapshot = await AnalyticsService.getPollAnalyticsSnapshot(pollId as string);
    
    if (format === "csv") {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="poll-${pollId}-export.csv"`);
        
        const csvRows = ['Question/Option,Votes,Percentage'];
        
        snapshot.questionSummaries.forEach((q: any) => {
            // Question row
            csvRows.push(`"${q.text.replace(/"/g, '""')}",${q.totalVotes || 0},100%`);
            
            // Option rows (if applicable)
            if (q.options && q.options.length > 0) {
                q.options.forEach((opt: any) => {
                    const percentage = opt.percentage ? `${opt.percentage.toFixed(1)}%` : '0%';
                    csvRows.push(`"  - ${opt.text.replace(/"/g, '""')}",${opt.voteCount || 0},${percentage}`);
                });
            } else if (q.type === "open_ended") {
                csvRows.push(`"  - [Open Ended Responses]",${q.totalVotes || 0},N/A`);
            }
            
            // Empty row for spacing between questions
            csvRows.push('');
        });
        
        return res.status(200).send(csvRows.join('\n'));
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="poll-${pollId}-export.json"`);
    return res.status(200).json(snapshot);
}
