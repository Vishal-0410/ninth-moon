import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { HTTP_STATUS } from "@traits/httpStatus";
import { ApiError } from "@utils/apiError";
import { AUTH_ERROR_MESSAGES } from "@constant/errorMessages/auth";

export const ValidationMiddleware = (schema: ZodSchema<any>) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const parseBody = await schema.parseAsync(req.body);
      req.body = parseBody;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(
          new ApiError(
            AUTH_ERROR_MESSAGES.VALIDATION_ERROR.statusCode,
            AUTH_ERROR_MESSAGES.VALIDATION_ERROR.message,
            err.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            }))
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
};
