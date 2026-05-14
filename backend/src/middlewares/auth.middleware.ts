import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "../config/config.js";
import { User } from "../modules/user/user.model.js";
import { ApiError } from "../utils/ApiError.js";


export const verifyJWT = async (req: Request, _res: Response, next: NextFunction) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            throw new ApiError(401, "Unauthorized: No token provided");
        }

        const decodedToken = jwt.verify(token, config.JWT_SECRET as string) as { _id: string };

        const user = await User.findById(decodedToken?._id).select("-passwordHash");

        if (!user) {
            throw new ApiError(401, "Invalid Access Token");
        }

        if (!user.isActive) {
            throw new ApiError(403, "Your account is deactivated");
        }

        (req as any).user = user;
        next();
    } catch (error: any) {
        next(new ApiError(401, error?.message || "Invalid access token"));
    }
};
