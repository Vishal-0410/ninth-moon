import { HTTP_STATUS } from "@traits/httpStatus";

export const NOTIFICATION_ERRORS = {
  USER_NOT_FOUND: { message: "User not found.", statusCode: HTTP_STATUS.NOT_FOUND },
  NOT_FOUND: { message: "Notification not found.", statusCode: HTTP_STATUS.NOT_FOUND },
  NOTIFICATION_NOT_FOUND: { message: "Notification not found.", statusCode: HTTP_STATUS.NOT_FOUND },
  INVALID_DATE: { message: "Invalid date format.", statusCode: HTTP_STATUS.BAD_REQUEST },
  INVALID_TIME: { message: "Invalid time format.", statusCode: HTTP_STATUS.BAD_REQUEST },
  INVALID_REPEAT: { message: "Invalid repeat format.", statusCode: HTTP_STATUS.BAD_REQUEST },
  INVALID_STATUS: { message: "Invalid status.", statusCode: HTTP_STATUS.BAD_REQUEST },
  INVALID_SNOOZE_UNTIL: { message: "Invalid snooze until date.", statusCode: HTTP_STATUS.BAD_REQUEST },
  INTERNAL_SERVER_ERROR: { message: "An unexpected error occurred on the server.", statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR },
  FORBIDDEN: { message: "You are not authorized to perform this action.", statusCode: HTTP_STATUS.FORBIDDEN },
  SNOOZE_UNTIL_REQUIRED: { message: "Snooze until date is required.", statusCode: HTTP_STATUS.BAD_REQUEST },
  INVALID_ACTION: { message: "Invalid action.", statusCode: HTTP_STATUS.BAD_REQUEST },
  INVALID_DATETIME: { message: "Invalid date time.", statusCode: HTTP_STATUS.BAD_REQUEST },
  INVALID_DOCUMENT: { message: "Invalid document.", statusCode: HTTP_STATUS.BAD_REQUEST },
  INVALID_SNOOZE: { message: "you can only snooze notifications that sent", statusCode: HTTP_STATUS.BAD_REQUEST },
};