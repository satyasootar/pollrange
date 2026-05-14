import type { Request, Response } from "express";
import * as AuthService from "./auth.service.js";
import { registerSchema, loginSchema, changePasswordSchema } from "./auth.validation.js";
import config from "../../config/config.js";

const cookieOptions = config.COOKIE_OPTIONS as any;

export async function register(req: Request, res: Response) {
    try {
        const parsedData = registerSchema.parse(req.body);
        const { user, accessToken, refreshToken } = await AuthService.register(parsedData);

        res.status(201)
            .cookie("accessToken", accessToken, cookieOptions)
            .cookie("refreshToken", refreshToken, cookieOptions)
            .json({
                success: true,
                message: "User registered successfully",
                data: {
                    user,
                    accessToken,
                    refreshToken
                }
            });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message || "Registration failed", error });
    }
}

export async function login(req: Request, res: Response) {
    try {
        const parsedData = loginSchema.parse(req.body);
        const { user, accessToken, refreshToken } = await AuthService.login(parsedData);

        res.status(200)
            .cookie("accessToken", accessToken, cookieOptions)
            .cookie("refreshToken", refreshToken, cookieOptions)
            .json({
                success: true,
                message: "User logged in successfully",
                data: {
                    user,
                    accessToken,
                    refreshToken
                }
            });
    } catch (error: any) {
        res.status(401).json({ success: false, message: error.message || "Login failed", error });
    }
}

export async function logout(req: Request, res: Response) {
    try {
        const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
        
        if (refreshToken) {
            await AuthService.logout(refreshToken);
        }

        res.status(200)
            .clearCookie("accessToken", cookieOptions)
            .clearCookie("refreshToken", cookieOptions)
            .json({
                success: true,
                message: "User logged out successfully"
            });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || "Logout failed", error });
    }
}

export async function changePassword(req: Request, res: Response) {
    try {
        const userId = (req as any).user?._id || req.body.userId; 

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized: User ID required" });
        }

        const parsedData = changePasswordSchema.parse(req.body);
        await AuthService.changePassword(userId, parsedData);

        res.status(200).json({
            success: true,
            message: "Password changed successfully"
        });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message || "Password change failed", error });
    }
}