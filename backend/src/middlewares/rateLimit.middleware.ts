import { rateLimit } from "express-rate-limit";

/**
 * Standard rate limiter for API endpoints.
 * @param windowMs Time window in milliseconds.
 * @param max Max number of requests per window.
 * @param message Custom error message.
 */
export const createRateLimiter = (
    windowMs: number = 15 * 60 * 1000, 
    max: number = 100, 
    message: string = "Too many requests from this IP, please try again later."
) => {
    return rateLimit({
        windowMs,
        max,
        message: {
            status: 429,
            message
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
};

// Specialized limiters
export const authRateLimiter = createRateLimiter(15 * 60 * 1000, 10, "Too many login attempts. Please try again in 15 minutes.");
export const responseRateLimiter = createRateLimiter(1 * 60 * 1000, 5, "You are voting too fast. Please slow down.");
