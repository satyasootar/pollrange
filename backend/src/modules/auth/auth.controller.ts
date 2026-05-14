import type { Request, Response } from "express";
import * as AuthService from "./auth.service.js";
import { registerSchema, loginSchema, changePasswordSchema } from "./auth.validation.js";
import config from "../../config/config.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";

const cookieOptions = config.COOKIE_OPTIONS as any;

export async function register(req: Request, res: Response) {
    const parsedData = registerSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await AuthService.register(parsedData);

    return res.status(201)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(new ApiResponse(201, { user, accessToken, refreshToken }, "User registered successfully"));
}

export async function login(req: Request, res: Response) {
    const parsedData = loginSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await AuthService.login(parsedData);

    return res.status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(new ApiResponse(200, { user, accessToken, refreshToken }, "User logged in successfully"));
}

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

export async function changePassword(req: Request, res: Response) {
    const userId = (req as any).user?._id || req.body.userId; 

    if (!userId) {
        throw new ApiError(401, "Unauthorized: User ID required");
    }

    const parsedData = changePasswordSchema.parse(req.body);
    await AuthService.changePassword(userId, parsedData);

    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"));
}