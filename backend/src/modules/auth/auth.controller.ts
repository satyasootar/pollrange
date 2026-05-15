import type { Request, Response } from "express";
import * as AuthService from "./auth.service.js";
import { 
    registerSchema, 
    loginSchema, 
    changePasswordSchema, 
    forgotPasswordSchema, 
    resetPasswordSchema, 
    verifyEmailSchema 
} from "./auth.validation.js";
import config from "../../config/config.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";

const cookieOptions = config.COOKIE_OPTIONS as any;

/**
 * Registers a new user and sets auth cookies.
 */
export async function register(req: Request, res: Response) {
    const parsedData = registerSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await AuthService.register(parsedData);

    return res.status(201)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(new ApiResponse(201, { user, accessToken, refreshToken }, "User registered successfully. Verification email sent."));
}

/**
 * Logins a user and sets auth cookies.
 */
export async function login(req: Request, res: Response) {
    const parsedData = loginSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await AuthService.login(parsedData);

    return res.status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(new ApiResponse(200, { user, accessToken, refreshToken }, "User logged in successfully"));
}

/**
 * Logs out the user by clearing cookies and deleting the session.
 */
export async function logout(req: Request, res: Response) {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    
    if (refreshToken) {
        await AuthService.logout(refreshToken);
    }

    return res.status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
}

/**
 * Refreshes the access token using the refresh token.
 */
export async function refreshAccessToken(req: Request, res: Response) {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    const { user, accessToken, refreshToken } = await AuthService.refreshAccessToken(incomingRefreshToken);

    return res.status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(new ApiResponse(200, { user, accessToken, refreshToken }, "Access token refreshed successfully"));
}

/**
 * Returns the currently authenticated user.
 */
export async function getCurrentUser(req: Request, res: Response) {
    const user = (req as any).user;
    return res.status(200).json(new ApiResponse(200, user, "Current user fetched successfully"));
}

/**
 * Changes the authenticated user's password.
 */
export async function changePassword(req: Request, res: Response) {
    const user = (req as any).user;
    const parsedData = changePasswordSchema.parse(req.body);
    
    await AuthService.changePassword(user._id.toString(), parsedData);

    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"));
}

/**
 * Verifies the user's email using a token.
 */
export async function verifyEmail(req: Request, res: Response) {
    const parsedData = verifyEmailSchema.parse(req.body);
    await AuthService.verifyEmail(parsedData);

    return res.status(200).json(new ApiResponse(200, {}, "Email verified successfully"));
}

/**
 * Triggers the forgot password email flow.
 */
export async function forgotPassword(req: Request, res: Response) {
    const parsedData = forgotPasswordSchema.parse(req.body);
    await AuthService.forgotPassword(parsedData);

    return res.status(200).json(new ApiResponse(200, {}, "If an account exists with that email, a password reset link has been sent."));
}

/**
 * Resets the user's password using a token.
 */
export async function resetPassword(req: Request, res: Response) {
    const parsedData = resetPasswordSchema.parse(req.body);
    await AuthService.resetPassword(parsedData);

    return res.status(200).json(new ApiResponse(200, {}, "Password reset successfully"));
}

/**
 * Manually requests a new verification email.
 */
export async function requestVerificationEmail(req: Request, res: Response) {
    const user = (req as any).user;
    await AuthService.sendVerificationEmail(user._id.toString());

    return res.status(200).json(new ApiResponse(200, {}, "Verification email sent successfully"));
}

/**
 * Handles the Google OAuth callback and redirects to the frontend with tokens.
 */
export async function googleAuthCallback(req: Request, res: Response) {
    const user = (req as any).user;
    
    if (!user) {
        throw new ApiError(500, "Google authentication failed");
    }

    const { accessToken, refreshToken } = await AuthService.generateAccessAndRefreshTokens(user._id.toString());
    const frontendUrl = process.env.CLIENT_URL || "http://localhost:5173";

    return res
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .redirect(`${frontendUrl}/auth-success?accessToken=${accessToken}&refreshToken=${refreshToken}`);
}