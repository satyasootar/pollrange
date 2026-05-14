import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import config from "../../config/config.js";
import { User } from "../user/user.model.js";
import { Session } from "../session/session.model.js";
import type { RegisterInput, LoginInput, ChangePasswordInput } from "./auth.validation.js";

async function generateAccessAndRefreshTokens(userId: string) {
    try {
        const accessToken = jwt.sign(
            { _id: userId },
            config.JWT_SECRET as string,
            { expiresIn: config.ACCESS_TOKEN_EXPIRY || "15m" }
        );

        const refreshToken = jwt.sign(
            { _id: userId },
            config.JWT_SECRET as string,
            { expiresIn: config.REFRESH_TOKEN_EXPIRY || "7d" }
        );

        // Calculate expire date for DB session
        const expiresInDays = parseInt((config.REFRESH_TOKEN_EXPIRY as string || "7d").replace(/\D/g, "")) || 7;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        // Store session in database
        await Session.create({
            userId,
            refreshToken,
            expiresAt,
            isActive: true,
        });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new Error("Something went wrong while generating refresh and access tokens");
    }
}

export async function register(input: RegisterInput) {
    const existingUser = await User.findOne({ email: input.email });
    if (existingUser) {
        throw new Error("User with this email already exists");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await User.create({
        name: input.name,
        email: input.email,
        passwordHash,
    });

    const createdUser = await User.findById(user._id).select("-passwordHash");
    if (!createdUser) {
        throw new Error("Failed to register user");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id.toString());

    return { user: createdUser, accessToken, refreshToken };
}

export async function login(input: LoginInput) {
    // Need to explicitly select passwordHash as it is select: false in schema
    const user = await User.findOne({ email: input.email }).select("+passwordHash");
    
    if (!user) {
        throw new Error("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    
    if (!isPasswordValid) {
        throw new Error("Invalid email or password");
    }

    const loggedInUser = await User.findById(user._id).select("-passwordHash");
    
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id.toString());

    return { user: loggedInUser, accessToken, refreshToken };
}

export async function logout(refreshToken: string) {
    if (!refreshToken) {
        throw new Error("Refresh token is required");
    }

    await Session.findOneAndDelete({ refreshToken });
    return { success: true };
}

export async function changePassword(userId: string, input: ChangePasswordInput) {
    const user = await User.findById(userId).select("+passwordHash");
    
    if (!user) {
        throw new Error("User not found");
    }

    const isPasswordValid = await bcrypt.compare(input.oldPassword, user.passwordHash);
    
    if (!isPasswordValid) {
        throw new Error("Invalid old password");
    }

    user.passwordHash = await bcrypt.hash(input.newPassword, 10);
    await user.save();

    return { success: true };
}
