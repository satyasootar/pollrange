import dotenv from "dotenv";
import type { SignOptions } from "jsonwebtoken";

dotenv.config();

interface Config {
    PORT: number | string;
    ENVIRONMENT: string;
    MONGODB_URI: string;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: SignOptions["expiresIn"];
    ACCESS_TOKEN_EXPIRY: SignOptions["expiresIn"];
    REFRESH_TOKEN_EXPIRY: SignOptions["expiresIn"];
    COOKIE_OPTIONS: {
        httpOnly: boolean;
        secure: boolean;
        sameSite: "strict" | "lax" | "none";
        maxAge: number;
    };
    RESEND_API_KEY: string;
    FROM_EMAIL: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    GOOGLE_CALLBACK_URL: string;
    CLIENT_URL: string;
    CLOUDINARY_CLOUD_NAME: string;
    CLOUDINARY_API_KEY: string;
    CLOUDINARY_API_SECRET: string;
    MISTRAL_API_KEY: string;
    MISTRAL_BASE_URL: string;
    MISTRAL_MODEL: string;
    ADMIN_EMAILS: string[];
}

const PORT = process.env.PORT || 8080;
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;

const config: Config = {
    PORT: PORT,
    ENVIRONMENT: process.env.ENVIRONMENT || "development",
    MONGODB_URI: process.env.MONGODB_URI || "",
    JWT_SECRET: process.env.JWT_SECRET || "",
    JWT_EXPIRES_IN:
        (process.env.JWT_EXPIRES_IN as SignOptions["expiresIn"]) || "7d",
    ACCESS_TOKEN_EXPIRY:
        (process.env.ACCESS_TOKEN_EXPIRY as SignOptions["expiresIn"]) || "15m",
    REFRESH_TOKEN_EXPIRY:
        (process.env.REFRESH_TOKEN_EXPIRY as SignOptions["expiresIn"]) || "7d",
    COOKIE_OPTIONS: {
        httpOnly: true,
        secure: process.env.ENVIRONMENT === "production",
        sameSite: process.env.ENVIRONMENT === "production" ? "none" : "lax",
        maxAge: 1000 * 60 * 60 * 24 * 7,
    },
    RESEND_API_KEY: process.env.RESEND_API_KEY || "",
    FROM_EMAIL: process.env.FROM_EMAIL || "onboarding@resend.dev",
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
    GOOGLE_CALLBACK_URL: `${BACKEND_URL}/api/auth/google/callback`,
    CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "",
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "",
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || "",
    MISTRAL_API_KEY: process.env.MISTRAL_API_KEY || "",
    MISTRAL_BASE_URL: process.env.MISTRAL_BASE_URL || "https://api.mistral.ai/v1",
    MISTRAL_MODEL: process.env.MISTRAL_MODEL || "mistral-small-latest",
    // Comma-separated. Only these (verified) accounts can reach /api/admin.
    ADMIN_EMAILS: (process.env.ADMIN_EMAILS || "satya.sootar06@gmail.com")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
};

export default config;