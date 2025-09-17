import { HTTP_STATUS } from "@traits/httpStatus";

export const USER_ERRORS = {

  NO_TOKEN: {
    statusCode: HTTP_STATUS.UNAUTHORIZED,
    message: "Unauthorized: No token provided",
  },
  INVALID_CREDENTIALS: {
    statusCode: HTTP_STATUS.UNAUTHORIZED,
    message: "Invalid credentials",
  },
  USER_PROFILE_EXISTS: {
    statusCode: HTTP_STATUS.CONFLICT,
    message: "User profile already exists",
  },
  NOT_FCM_TOKEN: {
    statusCode: HTTP_STATUS.BAD_REQUEST,
    message: "Not a FCM token",
  },
  NO_TOKEN_FOUND: {
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: "No token found",
  },
  USER_NOT_FOUND: {
    statusCode: HTTP_STATUS.NOT_FOUND,
    message: "User not found",
  },
};