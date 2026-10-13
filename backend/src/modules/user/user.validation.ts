import { brandingInputSchema } from "../branding/branding.validation.js";
import { attributionSchema } from "../site-analytics/site-analytics.validation.js";
import { z } from "zod";

export const userZodSchema = z.object({
  name: z.string().min(3),

  email: z
    .string()
    .email()
    .toLowerCase(),

  passwordHash: z.string().optional(),

  googleId: z.string().optional(),

  avatarUrl: z.string().optional(),

  isEmailVerified: z.boolean().default(false),

  emailVerificationToken: z.string().optional(),

  emailVerificationExpiry: z.date().optional(),

  passwordResetToken: z.string().optional(),

  passwordResetExpiry: z.date().optional(),

  role: z.enum(["user", "admin"]).default("user"),
  isActive: z.boolean().default(true),
  branding: brandingInputSchema.optional(),
  acquisition: attributionSchema.extend({ visitorId: z.string().optional(), firstSeenAt: z.date().optional() }).optional(),

  plan: z.object({
    id: z.enum(["free", "plus", "pro"]).default("free"),
    expiresAt: z.date().optional(),
    assignedBy: z.any().optional(),
    assignedAt: z.date().optional(),
  }).optional(),
  hasCompletedOnboarding: z.boolean().default(false),
  onboarding: z.object({
    usage: z.enum(["company", "education", "public_sector", "non_profit", "student", "other"]).optional(),
    usageDetail: z.string().optional(),
    intent: z.enum(["explore", "create_polls", "other"]).optional(),
    plan: z.enum(["free", "basic", "plus", "pro"]).optional(),
    firstAction: z.enum(["word_cloud", "polls", "quiz", "open_ended"]).optional(),
  }).optional(),
});

export const updateProfileZodSchema = z.object({
  name: z.string().min(3).optional(),
  avatarUrl: z.string().optional(),
  branding: brandingInputSchema.optional(),
});

export const completeOnboardingZodSchema = z.object({
  usage: z.enum(["company", "education", "public_sector", "non_profit", "student", "other"]),
  usageDetail: z.string().min(1).optional(),
  intent: z.enum(["explore", "create_polls", "other"]),
  plan: z.enum(["free", "basic", "plus", "pro"]),
  firstAction: z.enum(["word_cloud", "polls", "quiz", "open_ended"]),
});

export type IUser = z.infer<typeof userZodSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileZodSchema>;
export type CompleteOnboardingInput = z.infer<typeof completeOnboardingZodSchema>;