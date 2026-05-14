import { ResponseModel } from "../response/response.model.js";
import { Poll } from "../poll/poll.model.js";
import { ApiError } from "../../utils/ApiError.js";
import mongoose from "mongoose";

const STOP_WORDS = new Set([
    "a", "an", "the", "and", "or", "but", "if", "then", "else", "when", "at", "from", "by", "for", "with", "about", 
    "against", "between", "into", "through", "during", "before", "after", "above", "below", "to", "up", "down", 
    "in", "out", "on", "off", "over", "under", "again", "further", "once", "here", "there", "where", "why", "how", 
    "all", "any", "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", 
    "same", "so", "than", "too", "very", "s", "t", "can", "will", "just", "don", "should", "now", "i", "me", "my", 
    "myself", "we", "our", "ours", "ourselves", "you", "your", "yours", "yourself", "yourselves", "he", "him", "his", 
    "himself", "she", "her", "hers", "herself", "it", "its", "itself", "they", "them", "their", "theirs", "themselves",
    "is", "am", "are", "was", "were", "be", "been", "being", "have", "has", "had", "having", "do", "does", "did", "doing"
]);

/**
 * Generates word frequency data from open-ended question responses for word cloud rendering.
 */
export async function getWordCloudData(pollId: string, questionId: string) {
    const responses = await ResponseModel.find({
        pollId,
        "answers.questionId": questionId
    }).select("answers");

    if (!responses || responses.length === 0) {
        return [];
    }

    const wordFrequencies: Record<string, number> = {};

    responses.forEach((response: any) => {
        const answer = response.answers.find((a: any) => a.questionId.toString() === questionId);
        if (answer && answer.textResponse) {
            const words: string[] = answer.textResponse
                .toLowerCase()
                .replace(/[^\w\s]/g, "")
                .split(/\s+/)
                .filter((word: string) => word.length > 2 && !STOP_WORDS.has(word));

            words.forEach((word: string) => {
                wordFrequencies[word] = (wordFrequencies[word] || 0) + 1;
            });
        }
    });

    return Object.entries(wordFrequencies)
        .map(([text, value]) => ({ text, value }))
        .sort((a: any, b: any) => b.value - a.value)
        .slice(0, 50);
}

/**
 * Gets a comprehensive analytics snapshot for a poll including:
 * - Total responses
 * - Completion rate
 * - Participation timeline (daily)
 * - Browser/Platform breakdown
 */
export async function getPollAnalyticsSnapshot(pollId: string) {
    const poll = await Poll.findById(pollId);
    if (!poll) {
        throw new ApiError(404, "Poll not found");
    }

    const totalResponses = await ResponseModel.countDocuments({ pollId });
    const completedResponses = await ResponseModel.countDocuments({ pollId, isComplete: true });

    // Participation Timeline (Grouped by Day - Last 30 Days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const timeline = await ResponseModel.aggregate([
        { 
            $match: { 
                pollId: new mongoose.Types.ObjectId(pollId),
                submittedAt: { $gte: thirtyDaysAgo } 
            } 
        },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$submittedAt" } },
                count: { $sum: 1 }
            }
        },
        { $sort: { "_id": 1 } }
    ]);

    // Simple Browser Breakdown
    const responses = await ResponseModel.find({ pollId }).select("userAgent");
    
    // Using a typed object to avoid TS18048 "possibly undefined"
    const browserStats = {
        Chrome: 0,
        Firefox: 0,
        Safari: 0,
        Edge: 0,
        Mobile: 0,
        Other: 0
    };

    responses.forEach(r => {
        const ua = r.userAgent || "";
        if (ua.includes("Mobi")) browserStats.Mobile++;
        
        if (ua.includes("Chrome")) {
            browserStats.Chrome++;
        } else if (ua.includes("Firefox")) {
            browserStats.Firefox++;
        } else if (ua.includes("Safari") && !ua.includes("Chrome")) {
            browserStats.Safari++;
        } else if (ua.includes("Edg")) {
            browserStats.Edge++;
        } else {
            browserStats.Other++;
        }
    });

    return {
        pollId,
        title: poll.title,
        totalResponses,
        completionRate: totalResponses > 0 ? (completedResponses / totalResponses) * 100 : 0,
        timeline,
        browserStats,
        questionSummaries: poll.questions.map((q: any) => {
            const options = q.options || [];
            const questionTotalVotes = q.type === "single_choice" 
                ? options.reduce((acc: number, opt: any) => acc + (opt.voteCount || 0), 0) 
                : 0;

            return {
                questionId: q._id,
                text: q.text,
                type: q.type,
                totalVotes: q.type === "single_choice" ? questionTotalVotes : null,
                options: q.type === "single_choice" ? options.map((opt: any) => ({
                    text: opt.text,
                    voteCount: opt.voteCount,
                    percentage: questionTotalVotes > 0 ? ((opt.voteCount || 0) / questionTotalVotes) * 100 : 0
                })) : null
            };
        })
    };
}
