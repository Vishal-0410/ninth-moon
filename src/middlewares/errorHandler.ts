import { Request, Response, NextFunction } from "express";
import { ApiError } from "@utils/apiError";
import { ApiResponse } from "@utils/apiResponse";
import { HTTP_STATUS, HttpStatusCode } from "@traits/httpStatus";
import { ZodError } from "zod";
import logger from "@utils/logger";
import crypto from "crypto";
import { AUTH_ERROR_MESSAGES } from "@constant/errorMessages/auth";

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId =
    (req.headers["x-request-id"] as string) || crypto.randomUUID();

  let statusCode: HttpStatusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = "Something went wrong";
  let errors: unknown[] = [];
  let stack: string | undefined = undefined;

  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.message;
    errors = error.errors;
  } else if (error instanceof ZodError) {
    statusCode = AUTH_ERROR_MESSAGES.VALIDATION_ERROR.statusCode;
    message = AUTH_ERROR_MESSAGES.VALIDATION_ERROR.message;
    errors = error.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));
  } else if (error.name === "CastError") {
    statusCode = AUTH_ERROR_MESSAGES.VALIDATION_ERROR.statusCode;
    message = AUTH_ERROR_MESSAGES.VALIDATION_ERROR.message;
  } else if (error.name === "ValidationError") {
    statusCode = AUTH_ERROR_MESSAGES.VALIDATION_ERROR.statusCode;
    message = AUTH_ERROR_MESSAGES.VALIDATION_ERROR.message;
  } else if (error.name === "JsonWebTokenError") {
    statusCode = AUTH_ERROR_MESSAGES.USER_NOT_AUTHENTICATED.statusCode;
    message = AUTH_ERROR_MESSAGES.USER_NOT_AUTHENTICATED.message;
  } else if (error.name === "TokenExpiredError") {
    statusCode = AUTH_ERROR_MESSAGES.USER_NOT_AUTHENTICATED.statusCode;
    message = AUTH_ERROR_MESSAGES.USER_NOT_AUTHENTICATED.message;
  } else if (error.message?.includes("auth/")) {
    statusCode = AUTH_ERROR_MESSAGES.USER_NOT_AUTHENTICATED.statusCode;
    message = AUTH_ERROR_MESSAGES.USER_NOT_AUTHENTICATED.message;
  } else if (error.message?.includes("Request failed")) {
    statusCode = HTTP_STATUS.BAD_GATEWAY;
    message = AUTH_ERROR_MESSAGES.INTERNAL_SERVER_ERROR.message;
  }
  stack = error.stack;

  const logPayload = {
    requestId,
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    statusCode,
    timestamp: new Date().toISOString(),
    body: req.body,
    query: req.query,
    params: req.params,
  };

  if (statusCode >= 500) {
    logger.error(logPayload);
  } else if (statusCode >= 400) {
    logger.warn(logPayload);
  } else {
    logger.info(logPayload);
  }

  res.setHeader("X-Request-ID", requestId);

  if (process.env.NODE_ENV === "production") {
    const clientMessage = statusCode >= 500 ? "Something went wrong on our server. Please try again." : message;
    return res
      .status(statusCode)
      .json({ statusCode, data: null,message: clientMessage, success: false, requestId});
  } else {
  return res
    .status(statusCode)
    .json({statusCode,data:null,message,success:statusCode<400,meta:{},errors: errors.length > 0 ? errors : undefined, stack, requestId});
    }
};
