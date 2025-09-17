import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "@utils/generateToken";
import { db } from "@config/firebase";
import { ApiError } from "@utils/apiError";
import { AUTH_ERROR_MESSAGES } from "@constant/errorMessages/auth";
import { COLLECTIONS } from "@constant/collection";

export const AuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return next(
      new ApiError(
        AUTH_ERROR_MESSAGES.AUTHORIZATION_HEADER_MISSING.statusCode,
        AUTH_ERROR_MESSAGES.AUTHORIZATION_HEADER_MISSING.message
      )
    );
  }

  const token = Array.isArray(authHeader)
    ? authHeader[0].split(" ")[1]
    : authHeader.split(" ")[1];

  if (!token) {
    return next(
      new ApiError(
        AUTH_ERROR_MESSAGES.ACCESS_TOKEN_REQUIRED.statusCode,
        AUTH_ERROR_MESSAGES.ACCESS_TOKEN_REQUIRED.message
      )
    );
  }

  try {
    const blacklisted = await db
      .collection(COLLECTIONS.BLACKLIST_TOKENS)
      .doc(token)
      .get();
    if (blacklisted.exists) {
      return next(
        new ApiError(
          AUTH_ERROR_MESSAGES.USER_NOT_AUTHENTICATED.statusCode,
          AUTH_ERROR_MESSAGES.USER_NOT_AUTHENTICATED.message
        )
      );
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return next(
        new ApiError(
          AUTH_ERROR_MESSAGES.USER_NOT_AUTHENTICATED.statusCode,
          AUTH_ERROR_MESSAGES.USER_NOT_AUTHENTICATED.message
        )
      );
    }

    (req as any).user = decoded;

    return next();
  } catch (err: any) {
    if (err?.name === "TokenExpiredError") {
      return next(
        new ApiError(
          AUTH_ERROR_MESSAGES.USER_NOT_AUTHENTICATED.statusCode,
          AUTH_ERROR_MESSAGES.USER_NOT_AUTHENTICATED.message
        )
      );
    }

    return next(
      new ApiError(
        AUTH_ERROR_MESSAGES.INTERNAL_SERVER_ERROR.statusCode,
        AUTH_ERROR_MESSAGES.INTERNAL_SERVER_ERROR.message
      )
    );
  }
};
