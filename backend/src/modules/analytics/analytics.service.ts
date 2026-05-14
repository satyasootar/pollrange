import { Response as ResponseModel } from "../response/response.model.js";
import { ApiError } from "../../utils/ApiError.js";

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
 * Service for processing poll analytics and generating advanced data visualizations.
 */
export async function getWordCloudData(pollId: string, questionId: string) {
    // Fetch all responses for this specific question
    const responses = await ResponseModel.find({
        pollId,
        "answers.questionId": questionId
    }).select("answers");

    if (!responses || responses.length === 0) {
        return [];
    }

    const wordFrequencies: Record<string, number> = {};

    responses.forEach(response => {
        const answer = response.answers.find(a => a.questionId.toString() === questionId);
        if (answer && answer.textResponse) {
            // Tokenize and clean text
            const words = answer.textResponse
                .toLowerCase()
                .replace(/[^\w\s]/g, "") // Remove punctuation
                .split(/\s+/)
                .filter(word => word.length > 2 && !STOP_WORDS.has(word));

            words.forEach(word => {
                wordFrequencies[word] = (wordFrequencies[word] || 0) + 1;
            });
        }
    });

    // Convert to array format suitable for word cloud libraries (e.g., d3-cloud)
    return Object.entries(wordFrequencies)
        .map(([text, value]) => ({ text, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 50); // Return top 50 words
}

/**
 * Gets a comprehensive analytics snapshot for a poll.
 * (Already mostly handled by the Poll model's voteCount fields, but this can add extra insights).
 */
export async function getPollAnalyticsSnapshot(pollId: string) {
    // This could return time-series data or geographic insights if implemented
    return {
        message: "Detailed snapshots can be expanded here."
    };
}
