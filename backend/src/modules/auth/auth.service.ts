import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import config from "../../config/config.js";
import { User } from "../user/user.model.js";
import { Session } from "../session/session.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { sendEmail } from "../../utils/mail.js";
import type { 
    RegisterInput, 
    LoginInput, 
    ChangePasswordInput, 
    ForgotPasswordInput, 
    ResetPasswordInput, 
    VerifyEmailInput 
} from "./auth.validation.js";

export async function generateAccessAndRefreshTokens(userId: string) {
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

        const expiresInDays = parseInt((config.REFRESH_TOKEN_EXPIRY as string || "7d").replace(/\D/g, "")) || 7;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        await Session.create({
            userId,
            refreshToken,
            expiresAt,
            isActive: true,
        });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access tokens");
    }
}

export async function sendVerificationEmail(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    user.emailVerificationToken = token;
    user.emailVerificationExpiry = expiry;
    await user.save();

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    
    await sendEmail({
        to: user.email,
        subject: "Verify your email - PollCraft",
        html: `<h1>Welcome to PollCraft</h1>
               <p>Please click the link below to verify your email address:</p>
               <a href="${verificationUrl}">${verificationUrl}</a>
               <p>This link will expire in 24 hours.</p>`,
    });
}

export async function register(input: RegisterInput) {
    const existingUser = await User.findOne({ email: input.email });
    if (existingUser) {
        throw new ApiError(409, "User with this email already exists");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await User.create({
        name: input.name,
        email: input.email,
        passwordHash,
    });

    // Send verification email asynchronously
    sendVerificationEmail(user._id.toString()).catch(console.error);

    const createdUser = await User.findById(user._id).select("-passwordHash");
    if (!createdUser) {
        throw new ApiError(500, "Failed to register user");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id.toString());

    return { user: createdUser, accessToken, refreshToken };
}

export async function login(input: LoginInput) {
    const user = await User.findOne({ email: input.email }).select("+passwordHash");
    
    if (!user) {
        throw new ApiError(401, "Invalid email or password");
    }

    if (!user.passwordHash) {
        throw new ApiError(401, "This account was created with Google. Please use Google Login.");
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid email or password");
    }

    const loggedInUser = await User.findById(user._id).select("-passwordHash");
    
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id.toString());

    return { user: loggedInUser, accessToken, refreshToken };
}

export async function logout(refreshToken: string) {
    if (!refreshToken) {
        throw new ApiError(400, "Refresh token is required");
    }

    await Session.findOneAndDelete({ refreshToken });
    return { success: true };
}

export async function refreshAccessToken(incomingRefreshToken: string) {
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh token is required");
    }

    // Find the session and verify it's still active
    const session = await Session.findOne({ 
        refreshToken: incomingRefreshToken,
        isActive: true,
        expiresAt: { $gt: new Date() }
    });

    if (!session) {
        throw new ApiError(401, "Refresh token is invalid or expired");
    }

    // Verify the JWT itself
    try {
        jwt.verify(incomingRefreshToken, config.JWT_SECRET as string);
    } catch (error) {
        throw new ApiError(401, "Invalid refresh token");
    }

    // Delete the old session (token rotation for security)
    await Session.findByIdAndDelete(session._id);

    // Generate new tokens
    const tokens = await generateAccessAndRefreshTokens(session.userId.toString());
    
    const user = await User.findById(session.userId).select("-passwordHash");
    if (!user) throw new ApiError(404, "User not found");

    return { user, ...tokens };
}

export async function changePassword(userId: string, input: ChangePasswordInput) {
    const user = await User.findById(userId).select("+passwordHash");
    
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (!user.passwordHash) {
        throw new ApiError(400, "Please set a password using Forgot Password before trying to change it.");
    }

    const isPasswordValid = await bcrypt.compare(input.oldPassword, user.passwordHash);
    
    if (!isPasswordValid) {
        throw new ApiError(400, "Invalid old password");
    }

    user.passwordHash = await bcrypt.hash(input.newPassword, 10);
    await user.save();

    return { success: true };
}

export async function verifyEmail(input: VerifyEmailInput) {
    const user = await User.findOne({
        emailVerificationToken: input.token,
        emailVerificationExpiry: { $gt: new Date() },
    });

    if (!user) {
        throw new ApiError(400, "Invalid or expired verification token");
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;
    await user.save();

    return { success: true };
}

export async function forgotPassword(input: ForgotPasswordInput) {
    const user = await User.findOne({ email: input.email });
    if (!user) {
        // We don't want to reveal if a user exists or not for security
        return { success: true };
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    user.passwordResetToken = token;
    user.passwordResetExpiry = expiry;
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await sendEmail({
        to: user.email,
        subject: "Reset your password - PollCraft",
        html: `<h1>Password Reset Request</h1>
               <p>You requested to reset your password. Click the link below to proceed:</p>
               <a href="${resetUrl}">${resetUrl}</a>
               <p>This link will expire in 1 hour.</p>
               <p>If you didn't request this, please ignore this email.</p>`,
    });

    return { success: true };
}

export async function resetPassword(input: ResetPasswordInput) {
    const user = await User.findOne({
        passwordResetToken: input.token,
        passwordResetExpiry: { $gt: new Date() },
    });

    if (!user) {
        throw new ApiError(400, "Invalid or expired reset token");
    }

    user.passwordHash = await bcrypt.hash(input.newPassword, 10);
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    await user.save();

    return { success: true };
}
