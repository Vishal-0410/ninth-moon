export interface BaseUser {
  uid: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  confirmPassword:string,
  fcmToken?:string
}

export interface LoginRequest {
  email: string;
  password: string;
  keepLoggedIn?: boolean;
  fcmToken?:string
}

export interface SocialLoginRequest {
  provider: "google" | "apple";
  idToken: string;
  keepLoggedIn?: boolean;
  fcmToken?:string
}

export interface LogoutRequest {
  uid?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface VerifyOtpRequest {
  uid: string;
  otp: string;
}

export interface ResendOtpRequest {
  uid: string;
  email?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface VerifyForgotPasswordOtpRequest {
  uid: string;
  otp: string;
}

export interface ResetPasswordRequest {
  newPassword: string;
  confirmPassword:string
}

export interface SignupResponse {
  uid: string;
  email: string;
  message: string;
}

export interface LoginResponse {
  uid: string;
  userEmail: string;
  accessToken: string;
  refreshToken?: string;
  message: string;
}

export interface SocialLoginResponse {
  uid: string;
  userEmail: string;
  accessToken: string;
  refreshToken?: string;
  message: string;
}

export interface LogoutResponse {
  message: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  message: string;
}

export interface VerifyOtpResponse {
  message: string;
}

export interface ResendOtpResponse {
  message: string;
  count: number;
}

export interface WrongEmailCleanupResponse {
  deleted: boolean;
  uid: string;
  email: string;
}

export interface ForgotPasswordResponse {
  uid: string;
  email: string;
  message: string;
}

export interface VerifyForgotPasswordOtpResponse {
  message: string;
  tempToken: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface SignupServiceResult {
  uid: string;
  email: string;
}

export interface LoginServiceResult {
  uid: string;
  email: string;
  accessToken: string;
  refreshToken: string | null;
  message: string;
}

export interface SocialLoginServiceResult {
  uid: string;
  email: string;
  accessToken: string;
  refreshToken: string | null;
  message: string;
}

export interface LogoutServiceResult {
  message: string;
}

export interface RefreshTokenServiceResult {
  accessToken: string;
  refreshToken: string;
  message: string;
}

export interface VerifyOtpServiceResult {
  message: string;
}

export interface ResendOtpServiceResult {
  message: string;
  count: number;
}

export interface WrongEmailCleanupServiceResult {
  deleted: boolean;
  uid: string;
  email: string;
}

export interface ForgotPasswordServiceResult {
  uid: string;
  email: string;
  message: string;
}

export interface VerifyForgotPasswordOtpServiceResult {
  message: string;
  tempToken: string;
}

export interface ResetPasswordServiceResult {
  message: string;
}

export interface AuthError {
  statusCode: number;
  message: string;
}

export interface OtpDocument {
  otp: string;
  expiresAt: string;
  count: number;
}

export interface BlacklistTokenDocument {
  uid: string;
  token: string;
  createdAt: string;
}

export interface ResetTokenDocument {
  uid: string;
  token: string;
  createdAt: string;
}
