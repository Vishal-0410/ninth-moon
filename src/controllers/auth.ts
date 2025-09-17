import { Request, Response } from "express";
import { asyncHandler } from "@utils/asyncHandler";
import { ApiResponse } from "@utils/apiResponse";
import { ApiError } from "@utils/apiError";
import { HTTP_STATUS } from "@traits/httpStatus";
import { AUTH_ERROR_MESSAGES } from "@constant/errorMessages/auth";
import {
  signupSchema,
  loginSchema,
  socialLoginSchema,
  refreshTokenSchema,
  verifyOtpSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  verifyForgotPasswordOtpSchema,
  resetPasswordSchema,
} from "@validationSchema/auth";
import {
  SignupService,
  LoginService,
  LogoutService,
  SocialLoginService,
  RefreshTokenService,
  VerifyOtpService,
  ResendOtpService,
  ForgotPasswordService,
  ResetPasswordService,
  VerifyForgotPasswordOtpService,
  DeleteAccountService,
  UndoAccountDeletionService,
} from "@services/auth";
import {
  SignupRequest,
  LoginRequest,
  SocialLoginRequest,
  RefreshTokenRequest,
  VerifyOtpRequest,
  ResendOtpRequest,
  ForgotPasswordRequest,
  VerifyForgotPasswordOtpRequest,
  ResetPasswordRequest,
} from "@models/auth";

export const SignUp = asyncHandler(async (req: Request, res: Response) => {
  const validatedData = signupSchema.parse(req.body) as SignupRequest;
  const { email, password, confirmPassword, fcmToken } = validatedData;

  const user = await SignupService(email, password,confirmPassword,fcmToken);

  return res
    .status(HTTP_STATUS.CREATED)    
    .json(
      new ApiResponse(HTTP_STATUS.CREATED, user, "OTP sent successfully")
    );
});

export const LogIn = asyncHandler(async (req: Request, res: Response) => {
  const validatedData = loginSchema.parse(req.body) as LoginRequest;
  const { email, password, keepLoggedIn=false, fcmToken } = validatedData;

  const {
    uid,
    email: userEmail,
    accessToken,
    refreshToken,
    message,
  } = await LoginService(email, password, keepLoggedIn, fcmToken);

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        { uid, userEmail, accessToken, refreshToken },
        message
      )
    );
});

export const SocialLogin = asyncHandler(async (req: Request, res: Response) => {
  const validatedData = socialLoginSchema.parse(req.body) as SocialLoginRequest;
  const { provider, idToken, keepLoggedIn=false } = validatedData;

  const {
    uid,
    email: userEmail,
    accessToken,
    refreshToken,
    message,
  } = await SocialLoginService({ provider, idToken, keepLoggedIn });

  return res.status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        { uid, userEmail, accessToken, refreshToken },
        message
      )
    );
});

export const LogOut = asyncHandler(async (req: Request, res: Response) => {
  const uid = req?.user?.uid;

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(
      AUTH_ERROR_MESSAGES.AUTHORIZATION_HEADER_MISSING.statusCode,
      AUTH_ERROR_MESSAGES.AUTHORIZATION_HEADER_MISSING.message
    );
  }
  const accessToken = authHeader.split(" ")[1];

  if (!uid || !accessToken) {
    throw new ApiError(
      AUTH_ERROR_MESSAGES.USER_NOT_AUTHENTICATED.statusCode,
      AUTH_ERROR_MESSAGES.USER_NOT_AUTHENTICATED.message
    );
  }

  await LogoutService(uid, accessToken, req?.user);

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, null, "User logged out successfully")
    );
});

export const RefreshToken = asyncHandler(
  async (req: Request, res: Response) => {
    const validatedData = refreshTokenSchema.parse(
      req.body
    ) as RefreshTokenRequest;
    const { refreshToken } = validatedData;

    const { accessToken, refreshToken: newRefreshToken } =
      await RefreshTokenService(refreshToken);

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed successfully"
        )
      );
  }
);

export const VerifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const validatedData = verifyOtpSchema.parse(req.body) as VerifyOtpRequest;
  const { uid, otp } = validatedData;

  const result = await VerifyOtpService(uid, otp);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, null, result.message));
});

export const ResendOtp = asyncHandler(async (req: Request, res: Response) => {
  const validatedData = resendOtpSchema.parse(req.body) as ResendOtpRequest;
  const { uid } = validatedData;

  const result = await ResendOtpService(uid);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, null, result.message));
});

export const ForgotPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const validatedData = forgotPasswordSchema.parse(
      req.body
    ) as ForgotPasswordRequest;
    const { email } = validatedData;

    const result = await ForgotPasswordService(email);

    return res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, result, result.message));
  }
);

export const VerifyForgotPasswordOtp = asyncHandler(
  async (req: Request, res: Response) => {
    const validatedData = verifyForgotPasswordOtpSchema.parse(
      req.body
    ) as VerifyForgotPasswordOtpRequest;
    const { uid, otp } = validatedData;

    const result = await VerifyForgotPasswordOtpService(uid, otp);

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          result,
          "OTP verified. You can now reset your password."
        )
      );
  }
);

export const ResetPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const uid = req?.user?.uid;
    const validatedData = resetPasswordSchema.parse(
      req.body
    ) as ResetPasswordRequest;
    const { newPassword,confirmPassword } = validatedData;

    if (!uid) {
      throw new ApiError(
        AUTH_ERROR_MESSAGES.USER_NOT_AUTHENTICATED.statusCode,
        AUTH_ERROR_MESSAGES.USER_NOT_AUTHENTICATED.message
      );
    }

    const result = await ResetPasswordService(uid, newPassword,confirmPassword);

    return res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, null, result.message));
  }
);

export const DeleteAccount = asyncHandler(async (req: Request, res: Response) => {
  const { uid } = req.user!;

  const result = await DeleteAccountService(uid);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, null, result.message));
});

export const UndoAccountDeletion = asyncHandler(async (req: Request, res: Response) => {
  const { uid } = req.user!;

  const result = await UndoAccountDeletionService(uid);

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, null, result.message));
});
