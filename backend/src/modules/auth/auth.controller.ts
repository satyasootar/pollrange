import type { Request, Response } from "express";
import { AuthService } from "./auth.service.js";
import { registerSchema, loginSchema, changePasswordSchema } from "./auth.validation.js";
import config from "../../config/config.js";

const cookieOptions = config.COOKIE_OPTIONS as any;

export class AuthController {
    static async register(req: Request, res: Response) {
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

    static async login(req: Request, res: Response) {
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

    static async logout(req: Request, res: Response) {
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

    static async changePassword(req: Request, res: Response) {
        try {
            // Note: In a real app, req.user._id would come from auth middleware
            // But since middleware is not provided in context, we assume it's set or passed in body for now.
            // Assuming auth middleware sets `req.user`
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
}
