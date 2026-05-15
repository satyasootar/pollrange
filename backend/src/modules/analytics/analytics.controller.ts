import type { Request, Response } from "express";
import * as AnalyticsService from "./analytics.service.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
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
    const poll = await Poll.findById(pollId);

    // Find first open-ended question for global word cloud
    const openEndedQuestion = poll?.questions.find(q => q.type === "open_ended") as any;
    let wordCloudData: any[] = [];
    if (openEndedQuestion) {
        wordCloudData = await AnalyticsService.getWordCloudData(pollId as string, openEndedQuestion._id.toString());
    }

    const mappedData = {
        pollId: snapshot.pollId,
        pollTitle: snapshot.title,
        status: poll?.status || "active",
        expiresAt: poll?.expiresAt || new Date().toISOString(),
        totalResponses: snapshot.totalResponses,
        completionRate: snapshot.completionRate,
        anonymousCount: 0, 
        authenticatedCount: snapshot.totalResponses,
        questions: snapshot.questionSummaries.map((q: any) => {
            const pollQ = poll?.questions.find((pq: any) => pq._id.toString() === q.questionId.toString()) as any;
            return {
                questionId: q.questionId,
                questionText: q.text,
                type: q.type,
                isMandatory: pollQ?.isMandatory ?? true,
                responseCount: snapshot.totalResponses,
                skippedCount: 0,
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
                        count: opt.count
                    }))[0]
                    : null
            };
        }),
        timeline: snapshot.timeline.map((t: any) => ({
            date: t._id,
            count: t.count
        })),
        wordCloudData
    };

    return res.status(200).json(
        new ApiResponse(200, mappedData, "Full analytics fetched successfully")
    );
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
    const snapshot = await AnalyticsService.getPollAnalyticsSnapshot(pollId as string);
    
    const mappedTimeline = snapshot.timeline.map((t: any) => ({
        date: t._id,
        count: t.count
    }));

    return res.status(200).json(
        new ApiResponse(200, mappedTimeline, "Timeline fetched successfully")
    );
}

export async function exportData(req: Request, res: Response) {
    const { pollId } = req.params;
    const { format } = req.query;
    
    const snapshot = await AnalyticsService.getPollAnalyticsSnapshot(pollId as string);
    
    if (format === "csv") {
        // Simple CSV generation
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="poll-${pollId}-export.csv"`);
        const csvRows = ['Question,Responses'];
        snapshot.questionSummaries.forEach((q: any) => {
            csvRows.push(`"${q.text}",${q.totalVotes || 0}`);
            if (q.options) {
                q.options.forEach((opt: any) => {
                    csvRows.push(`"- ${opt.text}",${opt.voteCount}`);
                });
            }
        });
        return res.status(200).send(csvRows.join('\n'));
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="poll-${pollId}-export.json"`);
    return res.status(200).json(snapshot);
}
