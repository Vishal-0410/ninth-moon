import {
  LogIn,
  SignUp,
  LogOut,
  SocialLogin,
  RefreshToken,
  ResendOtp,
  VerifyOtp,
  ForgotPassword,
  VerifyForgotPasswordOtp,
  ResetPassword,
  DeleteAccount,
  UndoAccountDeletion,
} from "@controllers/auth";
import { AuthMiddleware } from "@middlewares/auth";
import { Router } from "express";
import type { Router as ExpressRouter } from "express";
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
import { ValidationMiddleware } from "@middlewares/schemaValidator";

const router: ExpressRouter = Router();

router.post("/signup", ValidationMiddleware(signupSchema), SignUp);
router.post("/login", ValidationMiddleware(loginSchema), LogIn);
router.post(
  "/social-login",
  ValidationMiddleware(socialLoginSchema),
  SocialLogin
);
router.post("/logout", AuthMiddleware, LogOut);
router.post(
  "/refresh-token",
  ValidationMiddleware(refreshTokenSchema),
  RefreshToken
);
router.post("/verify-otp", ValidationMiddleware(verifyOtpSchema), VerifyOtp);
router.post("/resend-otp", ValidationMiddleware(resendOtpSchema), ResendOtp);
router.post(
  "/forgot-password",
  ValidationMiddleware(forgotPasswordSchema),
  ForgotPassword
);
router.post(
  "/verify-forgot-password-otp",
  ValidationMiddleware(verifyForgotPasswordOtpSchema),
  VerifyForgotPasswordOtp
);
router.post(
  "/reset-password",
  AuthMiddleware,
  ValidationMiddleware(resetPasswordSchema),
  ResetPassword
);
router.post("/undo-account-deletion", AuthMiddleware, UndoAccountDeletion);
router.delete("/delete-account", AuthMiddleware, DeleteAccount);

export default router;
