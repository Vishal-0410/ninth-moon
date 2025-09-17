import { z } from "zod";

export const emailSchema = z
  .string()
  .email("Invalid email format")
  .min(1, "Email is required");

export const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters long")
  .max(128, "Password too long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[\W_]/, "Password must contain at least one special character");

export const uidSchema = z.string().min(1, "UID is required");

export const otpSchema = z
  .string()
  .length(6, "OTP must be exactly 6 digits")
  .regex(/^\d{6}$/, "OTP must contain only digits");

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword:passwordSchema,
  fcmToken:z.string().trim().min(1, "FCM token is required").optional()
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  keepLoggedIn: z.boolean().optional().default(false),
  fcmToken:z.string().trim().min(1, "FCM token is required").optional()
});

export const socialLoginSchema = z.object({
  provider: z.enum(["google", "apple"], {
    errorMap: () => ({
      message: "Provider must be either 'google' or 'apple'",
    }),
  }),
  idToken: z.string().min(1, "ID token is required"),
  keepLoggedIn: z.boolean().optional().default(false),
  fcmToken:z.string().trim().min(1, "FCM token is required").optional()
});

export const logoutSchema = z.object({
  uid: uidSchema.optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const verifyOtpSchema = z.object({
  uid: uidSchema,
  otp: otpSchema,
});

export const resendOtpSchema = z.object({
  uid: uidSchema,
  email: emailSchema.optional(), 
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const verifyForgotPasswordOtpSchema = z.object({
  uid: uidSchema,
  otp: otpSchema,
});

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
  confirmPassword:passwordSchema
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SocialLoginInput = z.infer<typeof socialLoginSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type VerifyForgotPasswordOtpInput = z.infer<
  typeof verifyForgotPasswordOtpSchema
>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
