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
  branding: z.object({
    companyName: z.string().optional(),
    businessDetails: z.string().optional(),
    logoUrl: z.string().optional(),
    qrColor: z.string().optional(),
  }).optional(),
});

export const updateProfileZodSchema = z.object({
  name: z.string().min(3).optional(),
  avatarUrl: z.string().optional(),
  branding: z.object({
    companyName: z.string().optional(),
    businessDetails: z.string().optional(),
    logoUrl: z.string().optional(),
    qrColor: z.string().optional(),
  }).optional(),
});

export type IUser = z.infer<typeof userZodSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileZodSchema>;