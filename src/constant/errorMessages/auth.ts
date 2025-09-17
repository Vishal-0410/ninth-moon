import { HTTP_STATUS } from "@traits/httpStatus";
import { INVALID } from "zod";

export const AUTH_ERROR_MESSAGES = {
  // Signup errors
  USER_ALREADY_EXISTS: {
    statusCode: HTTP_STATUS.CONFLICT,
    message: "User already signed up",
  },
  SIGNUP_FAILED: {
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: "Failed to create user account",
  },
  EMAIL_REQUIRED: {
    statusCode: HTTP_STATUS.BAD_REQUEST,
    message: "Email is required",
  },
  PASSWORD_REQUIRED: {
    statusCode: HTTP_STATUS.BAD_REQUEST,
    message: "Password is required",
  },
  INVALID_EMAIL_FORMAT: {
    statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
    message: "Invalid email format",
  },
  PASSWORD_TOO_SHORT: {
    statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
    message: "Password must be at least 6 characters long",
  },
  PASSWORD_MISMATCH: {
    statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
    message: "Passwords do not match",
  },
  INVALID_PASSWORD: {
    statusCode: HTTP_STATUS.BAD_REQUEST,
    message: "Invalid password",
  },

  // Login errors
  INVALID_CREDENTIALS: {
    statusCode: HTTP_STATUS.UNAUTHORIZED,
    message: "Invalid email or password",
  },
  EMAIL_NOT_VERIFIED: {
    statusCode: HTTP_STATUS.UNAUTHORIZED,
    message: "Email not verified. Please verify your email first.",
  },
  FIREBASE_API_KEY_MISSING: {
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: "Authentication service configuration error",
  },

  // Social login errors
  PROVIDER_REQUIRED: {
    statusCode: HTTP_STATUS.BAD_REQUEST,
    message: "Provider is required",
  },
  ID_TOKEN_REQUIRED: {
    statusCode: HTTP_STATUS.BAD_REQUEST,
    message: "ID token is required",
  },
  UNSUPPORTED_PROVIDER: {
    statusCode: HTTP_STATUS.BAD_REQUEST,
    message: "Unsupported provider",
  },

  // Logout errors
  UID_REQUIRED: {
    statusCode: HTTP_STATUS.BAD_REQUEST,
    message: "User ID is required",
  },
  ACCESS_TOKEN_REQUIRED: {
    statusCode: HTTP_STATUS.BAD_REQUEST,
    message: "Access token is required",
  },
  AUTHORIZATION_HEADER_MISSING: {
    statusCode: HTTP_STATUS.UNAUTHORIZED,
    message: "Authorization header missing or invalid",
  },
  USER_NOT_AUTHENTICATED: {
    statusCode: HTTP_STATUS.UNAUTHORIZED,
    message: "User not authenticated or token invalid",
  },

  // Refresh token errors
  REFRESH_TOKEN_REQUIRED: {
    statusCode: HTTP_STATUS.BAD_REQUEST,
    message: "Refresh token is required",
  },
  INVALID_REFRESH_TOKEN: {
    statusCode: HTTP_STATUS.UNAUTHORIZED,
    message: "Invalid refresh token",
  },
  REFRESH_TOKEN_EXPIRED: {
    statusCode: HTTP_STATUS.UNAUTHORIZED,
    message: "Refresh token expired",
  },

  // OTP errors
  UID_AND_OTP_REQUIRED: {
    statusCode: HTTP_STATUS.BAD_REQUEST,
    message: "UID and OTP are required",
  },
  OTP_NOT_FOUND: {
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: "OTP not found or expired",
  },
  OTP_EXPIRED: {
    statusCode: HTTP_STATUS.UNAUTHORIZED,
    message: "OTP expired. Please request a new one.",
  },
  INVALID_OTP: {
    statusCode: HTTP_STATUS.UNAUTHORIZED,
    message: "Invalid OTP",
  },
  OTP_VERIFICATION_FAILED: {
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: "Failed to verify OTP",
  },

  // Password reset errors
  PASSWORD_RESET_OTP_FAILED: {
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: "Failed to send password reset OTP",
  },
  PASSWORD_RESET_NOT_ALLOWED: {
    statusCode: HTTP_STATUS.BAD_REQUEST,
    message: "Password reset not allowed for social login accounts.",
  },
  USER_NOT_FOUND: {
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: "User with this email does not exist",
  },
  NEW_PASSWORD_REQUIRED: {
    statusCode: HTTP_STATUS.BAD_REQUEST,
    message: "New password is required",
  },
  PASSWORD_UPDATE_FAILED: {
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: "Failed to update password",
  },
  JWT_SECRET_MISSING: {
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: "Server configuration error",
  },

  // General errors
  INTERNAL_SERVER_ERROR: {
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: "Something went wrong",
  },
  VALIDATION_ERROR: {
    statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
    message: "Validation failed",
  },
  RATE_LIMIT_EXCEEDED: {
    statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
    message: "Too many requests. Please try again later.",
  },
  RESEND_OTP_TIMEOUT: {
    statusCode: HTTP_STATUS.BAD_REQUEST,
    message: "Resend after 30 seconds",
  },
} as const;

export type AuthErrorMessageKey = keyof typeof AUTH_ERROR_MESSAGES;
