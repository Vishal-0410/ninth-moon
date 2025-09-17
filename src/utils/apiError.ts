import { HttpStatusCode } from "@traits/httpStatus";

class ApiError extends Error {
  public statusCode: HttpStatusCode;
  public success: false;
  public errors: unknown[];
  public data: null;

  constructor(
    statusCode: HttpStatusCode,
    message = "Something went wrong",
    errors: unknown[] = [],
    stack = ""
  ) {
    super(message);

    this.statusCode = statusCode;
    this.success = false;
    this.errors = errors;
    this.data = null;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };
