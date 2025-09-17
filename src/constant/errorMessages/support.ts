import { HTTP_STATUS } from "@traits/httpStatus";

export const SUPPORT_ERRORS = {

  VALIDATION_ERROR: { message: "Validation error.", statusCode: HTTP_STATUS.BAD_REQUEST },
  NOT_FOUND: { message: "Notification not found.", statusCode: HTTP_STATUS.NOT_FOUND },
  
};