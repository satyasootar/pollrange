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

/**
 * Generates Access and Refresh tokens for a user and creates a new session in the database.
 */
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
        throw new ApiError(500, "Something went wrong while generating tokens");
    }
}

/**
 * Generates a verification token and sends an email to the user.
 */
export async function sendVerificationEmail(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.emailVerificationToken = token;
    user.emailVerificationExpiry = expiry;
    await user.save();

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    
    await sendEmail({
        to: user.email,
        subject: "Verify your email - PollCraft",
        html: `<h1>Welcome to PollCraft</h1>
               <p>Please click the link below to verify your email address:</p>
               <a href="${verificationUrl}">${verificationUrl}</a>`,
    });
}

/**
 * Registers a new user and triggers the verification email flow.
 */
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

    sendVerificationEmail(user._id.toString()).catch(console.error);

    const createdUser = await User.findById(user._id).select("-passwordHash");
    if (!createdUser) throw new ApiError(500, "Failed to register user");

    const tokens = await generateAccessAndRefreshTokens(user._id.toString());
    return { user: createdUser, ...tokens };
}

/**
 * Authenticates a user with email and password.
 */
export async function login(input: LoginInput) {
    const user = await User.findOne({ email: input.email }).select("+passwordHash");
    
    if (!user || !user.passwordHash) {
        throw new ApiError(401, "Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) throw new ApiError(401, "Invalid email or password");

    const loggedInUser = await User.findById(user._id).select("-passwordHash");
    const tokens = await generateAccessAndRefreshTokens(user._id.toString());

    return { user: loggedInUser, ...tokens };
}

/**
 * Logs out a user by deleting their session from the database.
 */
export async function logout(refreshToken: string) {
    if (!refreshToken) throw new ApiError(400, "Refresh token is required");
    await Session.findOneAndDelete({ refreshToken });
    return { success: true };
}

/**
 * Implements token rotation by verifying the refresh token and generating a new pair.
 */
export async function refreshAccessToken(incomingRefreshToken: string) {
    if (!incomingRefreshToken) throw new ApiError(401, "Refresh token is required");

    const session = await Session.findOne({ 
        refreshToken: incomingRefreshToken,
        isActive: true,
        expiresAt: { $gt: new Date() }
    });

    if (!session) throw new ApiError(401, "Refresh token is invalid or expired");

    try {
        jwt.verify(incomingRefreshToken, config.JWT_SECRET as string);
    } catch (error) {
        throw new ApiError(401, "Invalid refresh token");
    }

    await Session.findByIdAndDelete(session._id);

    const tokens = await generateAccessAndRefreshTokens(session.userId.toString());
    const user = await User.findById(session.userId).select("-passwordHash");
    
    if (!user) throw new ApiError(404, "User not found");
    return { user, ...tokens };
}

/**
 * Changes the password for an authenticated user.
 */
export async function changePassword(userId: string, input: ChangePasswordInput) {
    const user = await User.findById(userId).select("+passwordHash");
    if (!user || !user.passwordHash) throw new ApiError(404, "User not found");

    const isPasswordValid = await bcrypt.compare(input.oldPassword, user.passwordHash);
    if (!isPasswordValid) throw new ApiError(400, "Invalid old password");

    user.passwordHash = await bcrypt.hash(input.newPassword, 10);
    await user.save();

    return { success: true };
}

/**
 * Verifies a user's email address using a verification token.
 */
export async function verifyEmail(input: VerifyEmailInput) {
    const user = await User.findOne({
        emailVerificationToken: input.token,
        emailVerificationExpiry: { $gt: new Date() },
    });

    if (!user) throw new ApiError(400, "Invalid or expired verification token");

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;
    await user.save();

    return { success: true };
}

/**
 * Initiates the password reset flow by sending a reset link via email.
 */
export async function forgotPassword(input: ForgotPasswordInput) {
    const user = await User.findOne({ email: input.email });
    if (!user) return { success: true };

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 1 * 60 * 60 * 1000);

    user.passwordResetToken = token;
    user.passwordResetExpiry = expiry;
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await sendEmail({
        to: user.email,
        subject: "Reset your password - PollCraft",
        html: `<p>Click the link below to reset your password:</p>
               <a href="${resetUrl}">${resetUrl}</a>`,
    });

    return { success: true };
}

/**
 * Resets a user's password using a valid reset token.
 */
export async function resetPassword(input: ResetPasswordInput) {
    const user = await User.findOne({
        passwordResetToken: input.token,
        passwordResetExpiry: { $gt: new Date() },
    });

    if (!user) throw new ApiError(400, "Invalid or expired reset token");

    user.passwordHash = await bcrypt.hash(input.newPassword, 10);
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    await user.save();

    return { success: true };
}
