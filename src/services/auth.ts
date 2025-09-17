import "dotenv/config";
import bcrypt from "bcryptjs";
import { auth, db } from "@config/firebase";
import axios from "axios";
import { sendEmail } from "@utils/sendEmail";
import {
  generateAccessToken,
  generateRefreshToken,
} from "@utils/generateToken";
import { randomInt } from "crypto";
import jwt from "jsonwebtoken";
import { ApiError } from "@utils/apiError";
import { AUTH_ERROR_MESSAGES } from "@constant/errorMessages/auth";
import { COLLECTIONS } from "@constant/collection";
import {
  SignupServiceResult,
  LoginServiceResult,
  SocialLoginServiceResult,
  LogoutServiceResult,
  RefreshTokenServiceResult,
  VerifyOtpServiceResult,
  ResendOtpServiceResult,
  ForgotPasswordServiceResult,
  ResetPasswordServiceResult,
  VerifyForgotPasswordOtpServiceResult,
} from "@models/auth";
import { SocialLoginInput } from "@validationSchema/auth";
import { FieldValue } from "firebase-admin/firestore";
import { accountDeleteQueue, scheduleAccountDelete } from "@jobs/scheduleAccountDelete";

const JWT_SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = 10;

export const SignupService = async (
  email: string,
  password: string,
  confirmPassword: string,
  fcmToken: string | undefined
): Promise<SignupServiceResult> => {
  if (password !== confirmPassword) {
    throw new ApiError(
      AUTH_ERROR_MESSAGES.PASSWORD_MISMATCH.statusCode,
      AUTH_ERROR_MESSAGES.PASSWORD_MISMATCH.message
    );
  }
  let existingUser;
  try {
    existingUser = await auth.getUserByEmail(email);
  } catch (error: any) {
    if (error.code === "auth/user-not-found") {
      existingUser = null;
    }
  }
  if (existingUser) {
    if (existingUser.emailVerified) {
      throw new ApiError(
        AUTH_ERROR_MESSAGES.USER_ALREADY_EXISTS.statusCode,
        AUTH_ERROR_MESSAGES.USER_ALREADY_EXISTS.message
      );
    }
    await auth.deleteUser(existingUser.uid);
    await db.collection(COLLECTIONS.USERS).doc(existingUser.uid).delete();
  }

  try {
    const newUser = await auth.createUser({
      email,
      password,
      emailVerified: false,
    });

    const uid = newUser.uid;
    const otp = randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(otp, SALT_ROUNDS);
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();

    await db
      .collection(COLLECTIONS.USERS)
      .doc(uid)
      .set(
        {
          email,
          otp: {
            code: otpHash,
            createdAt,
            expiresAt,
            count: 0,
          },
          ...(fcmToken?.trim() ? { fcmToken: fcmToken.trim() } : {}),
          createdAt,
        },
        { merge: true }
      );

    await sendEmail({
      to: email,
      subject: "Your Email Verification OTP",
      html: `<p>Your OTP for email verification is <strong>${otp}</strong>. It will expire in 2 minute.</p>`,
    });

    return { uid: newUser.uid, email };
  } catch (error: any) {
    if (error.code === "auth/invalid-password") {
      throw new ApiError(
        AUTH_ERROR_MESSAGES.INVALID_PASSWORD.statusCode,
        AUTH_ERROR_MESSAGES.INVALID_PASSWORD.message
      );
    } else if (error.code === "auth/invalid-email") {
      throw new ApiError(
        AUTH_ERROR_MESSAGES.INVALID_EMAIL_FORMAT.statusCode,
        AUTH_ERROR_MESSAGES.INVALID_EMAIL_FORMAT.message
      );
    }
    throw new ApiError(
      AUTH_ERROR_MESSAGES.SIGNUP_FAILED.statusCode,
      AUTH_ERROR_MESSAGES.SIGNUP_FAILED.message
    );
  }
};

export const LoginService = async (
  email: string,
  password: string,
  keepLoggedIn = false,
  fcmToken: string | undefined
): Promise<LoginServiceResult> => {
  if (!process.env.FIREBASE_API_KEY) {
    throw new ApiError(
      AUTH_ERROR_MESSAGES.FIREBASE_API_KEY_MISSING.statusCode,
      AUTH_ERROR_MESSAGES.FIREBASE_API_KEY_MISSING.message
    );
  }

  let firebaseResponse;
  try {
    firebaseResponse = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`,
      { email, password, returnSecureToken: true }
    );
  } catch (error: any) {
    if (error.response && error.response.data && error.response.data.error) {
      const errorCode = error.response.data.error.message;
      if (errorCode === "EMAIL_NOT_FOUND" || errorCode === "INVALID_PASSWORD") {
        throw new ApiError(
          AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS.statusCode,
          AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS.message
        );
      }
    }
    throw new ApiError(
      AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS.statusCode,
      AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS.message
    );
  }

  const { localId: uid } = firebaseResponse.data;
  const userRecord = await auth.getUser(uid);
  if (!userRecord.emailVerified) {
    throw new ApiError(
      AUTH_ERROR_MESSAGES.EMAIL_NOT_VERIFIED.statusCode,
      AUTH_ERROR_MESSAGES.EMAIL_NOT_VERIFIED.message
    );
  }

  const userProfileSnap = await db.collection(COLLECTIONS.USERS).doc(uid).get();
  const hasJourneyData =
    userProfileSnap.exists && userProfileSnap.data()?.journey;

  const accessToken = generateAccessToken({ uid, email });
  let refreshToken: string | null = null;

  if (keepLoggedIn) {
    refreshToken = generateRefreshToken({ uid, email });
    const hashToken = await bcrypt.hash(refreshToken, SALT_ROUNDS);
    await db
      .collection(COLLECTIONS.USERS)
      .doc(uid)
      .set({ refreshToken: hashToken, ...(fcmToken?.trim() ? { fcmToken: fcmToken.trim() } : {}) }, { merge: true });
  }
  return {
    uid,
    email,
    accessToken,
    refreshToken,
    message: !hasJourneyData
      ? "Complete your profile first"
      : "User logged in successfully",
  };
};

export const SocialLoginService = async ({
  provider,
  idToken,
  keepLoggedIn,
  fcmToken,
}: SocialLoginInput): Promise<SocialLoginServiceResult> => {
  let firebaseUserUid: string;
  let email: string;

  if (provider === "google") {
    const ticket = await auth.verifyIdToken(idToken);
    firebaseUserUid = ticket.uid;
    email = ticket.email!;
  } else if (provider === "apple") {
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${process.env.FIREBASE_API_KEY}`,
      {
        postBody: `id_token=${idToken}&providerId=apple.com`,
        requestUri: "http://localhost",
        returnSecureToken: true,
      }
    );
    const data = response.data;
    firebaseUserUid = data.localId;
    email = data.email;
  } else {
    throw new ApiError(
      AUTH_ERROR_MESSAGES.UNSUPPORTED_PROVIDER.statusCode,
      AUTH_ERROR_MESSAGES.UNSUPPORTED_PROVIDER.message
    );
  }

  try {
    await auth.getUser(firebaseUserUid);
  } catch {
    await auth.createUser({ uid: firebaseUserUid, email, emailVerified: true });
  }

  const userProfileSnap = await db
    .collection(COLLECTIONS.USERS)
    .doc(firebaseUserUid)
    .get();

  const hasProfileData =
    userProfileSnap.exists && userProfileSnap.data()?.journey;

  const accessToken = generateAccessToken({ uid: firebaseUserUid, email });
  let refreshToken: string | null = null;

  if (keepLoggedIn) {
    refreshToken = generateRefreshToken({ uid: firebaseUserUid, email });
    const hashToken = await bcrypt.hash(refreshToken, SALT_ROUNDS);
    await db
      .collection(COLLECTIONS.USERS)
      .doc(firebaseUserUid)
      .set({ refreshToken: hashToken, ...(fcmToken?.trim() ? { fcmToken: fcmToken.trim() } : {}) }, { merge: true });
  }

  return {
    uid: firebaseUserUid,
    email,
    accessToken,
    refreshToken,
    message: !hasProfileData
      ? "Complete your profile first"
      : "User logged in successfully",
  };
};

export const LogoutService = async (
  uid: string,
  accessToken: string,
  decoded: any
): Promise<LogoutServiceResult> => {
  if (!uid || !accessToken) {
    throw new ApiError(
      AUTH_ERROR_MESSAGES.UID_REQUIRED.statusCode,
      AUTH_ERROR_MESSAGES.UID_REQUIRED.message
    );
  }
  const userDocRef = db.collection(COLLECTIONS.USERS).doc(uid);
  const blacklistDocRef = db.collection(COLLECTIONS.BLACKLIST_TOKENS).doc(uid);
  const expiresAt = new Date(decoded.exp * 1000).toISOString();
  const now = new Date().toISOString();

  const blacklistDoc = await blacklistDocRef.get();

  const batch = db.batch();

  const newBlacklistedToken = { accessToken, expiresAt };

  if (blacklistDoc.exists) {
    const tokens = blacklistDoc.data()?.tokens || [];
    const updatedTokens = tokens
      .filter((token: any) => new Date(token.expiresAt) > new Date())
      .concat(newBlacklistedToken);

    batch.update(blacklistDocRef, {
      tokens: updatedTokens,
      updatedAt: now,
    });
  } else {
    batch.set(blacklistDocRef, {
      tokens: [newBlacklistedToken],
      createdAt: now,
      updatedAt: now,
    });
  }
  batch.update(userDocRef, {
    refreshToken: null,
  });
  await batch.commit();
  return { message: "User logged out successfully" };
};

export const RefreshTokenService = async (
  refreshToken: string
): Promise<RefreshTokenServiceResult> => {
  if (!JWT_SECRET) {
    throw new ApiError(
      AUTH_ERROR_MESSAGES.JWT_SECRET_MISSING.statusCode,
      AUTH_ERROR_MESSAGES.JWT_SECRET_MISSING.message
    );
  }
  let uid: string;
  try {
    const decodedToken = jwt.verify(refreshToken, JWT_SECRET) as {
      uid: string;
    };
    uid = decodedToken.uid;
  } catch (error) {
    throw new ApiError(
      AUTH_ERROR_MESSAGES.INVALID_REFRESH_TOKEN.statusCode,
      AUTH_ERROR_MESSAGES.INVALID_REFRESH_TOKEN.message
    );
  }
  const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();

  if (!userDoc.exists) {
    throw new ApiError(
      AUTH_ERROR_MESSAGES.INVALID_REFRESH_TOKEN.statusCode,
      AUTH_ERROR_MESSAGES.INVALID_REFRESH_TOKEN.message
    );
  }
  const tokenData = userDoc.data();
  if (!tokenData?.refreshToken) {
    throw new ApiError(
      AUTH_ERROR_MESSAGES.INVALID_REFRESH_TOKEN.statusCode,
      AUTH_ERROR_MESSAGES.INVALID_REFRESH_TOKEN.message
    );
  }
  const isMatch = await bcrypt.compare(refreshToken, tokenData.refreshToken);

  if (!isMatch) {
    throw new ApiError(
      AUTH_ERROR_MESSAGES.INVALID_REFRESH_TOKEN.statusCode,
      AUTH_ERROR_MESSAGES.INVALID_REFRESH_TOKEN.message
    );
  }
  const userRecord = await auth.getUser(uid);
  const email = userRecord.email!;

  const accessToken = generateAccessToken({ uid, email });
  const newRefreshToken = generateRefreshToken({ uid, email });
  const newHashRefreshToken = await bcrypt.hash(newRefreshToken, SALT_ROUNDS);

  await db.collection(COLLECTIONS.USERS).doc(uid).update({
    refreshToken: newHashRefreshToken,
  });

  return {
    accessToken,
    refreshToken: newRefreshToken,
    message: "Access token refreshed successfully",
  };
};

export const VerifyOtpService = async (
  uid: string,
  otp: string
): Promise<VerifyOtpServiceResult> => {
  if (!uid || !otp) {
    throw new ApiError(
      AUTH_ERROR_MESSAGES.UID_AND_OTP_REQUIRED.statusCode,
      AUTH_ERROR_MESSAGES.UID_AND_OTP_REQUIRED.message
    );
  }

  const userDocRef = db.collection(COLLECTIONS.USERS).doc(uid);
  const userDoc = await userDocRef.get();
  if (!userDoc.exists) {
    throw new ApiError(
      AUTH_ERROR_MESSAGES.USER_NOT_FOUND.statusCode,
      AUTH_ERROR_MESSAGES.USER_NOT_FOUND.message
    );
  }
  const storedOtpData = userDoc.data()?.otp;

  if (!storedOtpData || !storedOtpData.code || !storedOtpData.expiresAt) {
    throw new ApiError(
      AUTH_ERROR_MESSAGES.OTP_NOT_FOUND.statusCode,
      AUTH_ERROR_MESSAGES.OTP_NOT_FOUND.message
    );
  }

  if (new Date(storedOtpData.expiresAt) <= new Date()) {
    await userDocRef.update({ otp: null });
    throw new ApiError(
      AUTH_ERROR_MESSAGES.OTP_EXPIRED.statusCode,
      AUTH_ERROR_MESSAGES.OTP_EXPIRED.message
    );
  }
  const isMatch = await bcrypt.compare(otp, storedOtpData.code);
  if (!isMatch) {
    throw new ApiError(
      AUTH_ERROR_MESSAGES.INVALID_OTP.statusCode,
      AUTH_ERROR_MESSAGES.INVALID_OTP.message
    );
  }

  const userRecord = await auth.getUser(uid);
  if (!userRecord.emailVerified) {
    await auth.updateUser(uid, { emailVerified: true });
    return { message: "Email verified successfully" };
  }

  await userDocRef.update({ otp: null });

  return { message: "Email verified successfully" };
};

export const ResendOtpService = async (
  uid: string
): Promise<ResendOtpServiceResult> => {
  if (!uid) {
    throw new ApiError(
      AUTH_ERROR_MESSAGES.UID_REQUIRED.statusCode,
      AUTH_ERROR_MESSAGES.UID_REQUIRED.message
    );
  }

  let email: string;
  try {
    const userRecord = await auth.getUser(uid);
    email = userRecord.email!;
  } catch (error: any) {
    if (error.code === "auth/user-not-found") {
      throw new ApiError(
        AUTH_ERROR_MESSAGES.USER_NOT_FOUND.statusCode,
        AUTH_ERROR_MESSAGES.USER_NOT_FOUND.message
      );
    }
    throw new ApiError(
      AUTH_ERROR_MESSAGES.INTERNAL_SERVER_ERROR.statusCode,
      AUTH_ERROR_MESSAGES.INTERNAL_SERVER_ERROR.message
    );
  }

  const userDocRef = db.collection(COLLECTIONS.USERS).doc(uid);
  const userDoc = await userDocRef.get();

  const storedOtpData = userDoc.data()?.otp;
  let count = storedOtpData?.count || 0;

  if (storedOtpData && storedOtpData.createdAt) {
    const lastCreated = new Date(storedOtpData.createdAt).getTime();
    const cooldownPeriod = 30_000;
    if (Date.now() - lastCreated < cooldownPeriod) {
      throw new ApiError(
        AUTH_ERROR_MESSAGES.RESEND_OTP_TIMEOUT.statusCode,
        AUTH_ERROR_MESSAGES.RESEND_OTP_TIMEOUT.message
      );
    }
  }

  const otp = randomInt(100000, 999999).toString();
  const otpHash = await bcrypt.hash(otp, SALT_ROUNDS);
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();

  const newOtpData = {
    code: otpHash,
    createdAt,
    expiresAt,
    count: count + 1,
  };

  await userDocRef.update({ otp: newOtpData });

  await sendEmail({
    to: email,
    subject: "Your New OTP",
    html: `<p>Your new OTP is <strong>${otp}</strong>. It will expire in 60 seconds.</p>`,
  });

  return { message: "OTP resent successfully", count: count + 1 };
};

export const ForgotPasswordService = async (
  email: string
): Promise<ForgotPasswordServiceResult> => {
  if (!email) {
    throw new ApiError(
      AUTH_ERROR_MESSAGES.EMAIL_REQUIRED.statusCode,
      AUTH_ERROR_MESSAGES.EMAIL_REQUIRED.message
    );
  }

  try {
    const user = await auth.getUserByEmail(email);

    const otp = randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(otp, SALT_ROUNDS);
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 2 * 30 * 1000).toISOString();

    const userDocRef = db
      .collection(COLLECTIONS.USERS)
      .doc(user.uid)
      .set(
        {
          otp: {
            code: otpHash,
            createdAt,
            expiresAt,
            count: 0,
          },
        },
        { merge: true }
      );

    await sendEmail({
      to: email,
      subject: "Your Password Reset OTP",
      html: `<p>Your OTP for password reset is <strong>${otp}</strong>. It will expire in 2 minutes.</p>`,
    });

    return { uid: user.uid, email, message: "OTP sent to email" };
  } catch (error: any) {
    if (error.code === "auth/user-not-found") {
      throw new ApiError(
        AUTH_ERROR_MESSAGES.USER_NOT_FOUND.statusCode,
        AUTH_ERROR_MESSAGES.USER_NOT_FOUND.message
      );
    }
    throw new ApiError(
      AUTH_ERROR_MESSAGES.PASSWORD_RESET_OTP_FAILED.statusCode,
      AUTH_ERROR_MESSAGES.PASSWORD_RESET_OTP_FAILED.message
    );
  }
};

export const VerifyForgotPasswordOtpService = async (
  uid: string,
  otp: string
): Promise<VerifyForgotPasswordOtpServiceResult> => {
  if (!uid || !otp) {
    throw new ApiError(
      AUTH_ERROR_MESSAGES.UID_AND_OTP_REQUIRED.statusCode,
      AUTH_ERROR_MESSAGES.UID_AND_OTP_REQUIRED.message
    );
  }

  if (!JWT_SECRET) {
    throw new ApiError(
      AUTH_ERROR_MESSAGES.JWT_SECRET_MISSING.statusCode,
      AUTH_ERROR_MESSAGES.JWT_SECRET_MISSING.message
    );
  }

  const userDocRef = db.collection(COLLECTIONS.USERS).doc(uid);
  const userDoc = await userDocRef.get();

  if (!userDoc.exists) {
    throw new ApiError(
      AUTH_ERROR_MESSAGES.USER_NOT_FOUND.statusCode,
      AUTH_ERROR_MESSAGES.USER_NOT_FOUND.message
    );
  }

  const storedOtpData = userDoc.data()?.otp;

  if (!storedOtpData || !storedOtpData.code || !storedOtpData.expiresAt) {
    throw new ApiError(
      AUTH_ERROR_MESSAGES.OTP_NOT_FOUND.statusCode,
      AUTH_ERROR_MESSAGES.OTP_NOT_FOUND.message
    );
  }

  if (new Date(storedOtpData.expiresAt) <= new Date()) {
    throw new ApiError(
      AUTH_ERROR_MESSAGES.OTP_EXPIRED.statusCode,
      AUTH_ERROR_MESSAGES.OTP_EXPIRED.message
    );
  }

  const isMatch = await bcrypt.compare(otp, storedOtpData.code);
  if (!isMatch) {
    throw new ApiError(
      AUTH_ERROR_MESSAGES.INVALID_OTP.statusCode,
      AUTH_ERROR_MESSAGES.INVALID_OTP.message
    );
  }

  await userDocRef.update({ otp: null });

  const tempToken = await jwt.sign({ uid }, JWT_SECRET, { expiresIn: "5m" });

  return {
    message: "OTP verified. You can now reset your password.",
    tempToken,
  };
};

export const ResetPasswordService = async (
  uid: string,
  newPassword: string,
  confirmPassword: string
): Promise<ResetPasswordServiceResult> => {
  
  const userRecord = await auth.getUser(uid);
  const isSocialLogin = userRecord.providerData.some(
    (provider) => provider.providerId !== 'password'
  );

  if (isSocialLogin) {
    throw new ApiError(
      AUTH_ERROR_MESSAGES.PASSWORD_RESET_NOT_ALLOWED.statusCode,
      'Password reset not allowed for social login accounts.'
    );
  }
  try {
    if (newPassword !== confirmPassword) {
      throw new ApiError(
        AUTH_ERROR_MESSAGES.PASSWORD_MISMATCH.statusCode,
        AUTH_ERROR_MESSAGES.PASSWORD_MISMATCH.message
      );
    }
    await auth.updateUser(uid, { password: newPassword });
    return { message: "Password reset successfully" };
  } catch (error) {
    throw new ApiError(
      AUTH_ERROR_MESSAGES.PASSWORD_UPDATE_FAILED.statusCode,
      AUTH_ERROR_MESSAGES.PASSWORD_UPDATE_FAILED.message
    );
  }
};

export const DeleteAccountService = async (uid: string) => {
  const userDocRef = db.collection(COLLECTIONS.USERS).doc(uid);
  const userDoc = await userDocRef.get();

  if (!userDoc.exists || !userDoc.data()) {
    throw new ApiError(
      AUTH_ERROR_MESSAGES.USER_NOT_FOUND.statusCode,
      AUTH_ERROR_MESSAGES.USER_NOT_FOUND.message
    );
  }

  const userData = userDoc.data()!;
  if (userData.status === "pending_deletion") {
    return {
      message: "Account deletion already scheduled",
      scheduledDeletionAt: userData.scheduledDeletionAt,
    };
  }

  const scheduledAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  
  await userDocRef.set(
    {
      status: "pending_deletion",
      scheduledDeletionAt: scheduledAt.toISOString(),
    },
    { merge: true }
  );
  const jobId = await scheduleAccountDelete({ uid }, scheduledAt);
  await userDocRef.set({ jobId }, { merge: true });
  return {
    message: "Account deletion scheduled",
    scheduledDeletionAt: scheduledAt,
  };
};


export const UndoAccountDeletionService = async (uid: string) => {
  const userDocRef = db.collection(COLLECTIONS.USERS).doc(uid);
  const userDoc = await userDocRef.get();

  if (!userDoc.exists || !userDoc.data()) {
    throw new ApiError(
      AUTH_ERROR_MESSAGES.USER_NOT_FOUND.statusCode,
      AUTH_ERROR_MESSAGES.USER_NOT_FOUND.message
    );
  }

  const userData = userDoc.data()!;
  if (userData.status !== "pending_deletion") {
    return { message: "No scheduled account deletion to undo" };
  }

  if (userData.jobId) {
    const job = await accountDeleteQueue.getJob(userData.jobId);
    if (job) {
      await job.remove().catch(() => null);
    }
  }

  await userDocRef.set(
    {
      status: "active",
      jobId: null,
      scheduledDeletionAt: null,
    },
    { merge: true }
  );

  return { message: "Account deletion cancelled successfully", status: "active" };
};
