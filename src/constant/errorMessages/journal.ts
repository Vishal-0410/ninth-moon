import { HTTP_STATUS } from "@traits/httpStatus";

export const JOURNAL_ERRORS = {

  NO_TOKEN: { statusCode: HTTP_STATUS.UNAUTHORIZED, message: "Unauthorized: No token provided" },
  NOT_FOUND: { statusCode: HTTP_STATUS.NOT_FOUND, message: "Not found" },
  USER_NOT_FOUND: { statusCode: HTTP_STATUS.NOT_FOUND, message: "User not found" },
  POST_NOT_FOUND: { statusCode: HTTP_STATUS.NOT_FOUND, message: "Post not found" },
  COMMENT_NOT_FOUND: { statusCode: HTTP_STATUS.NOT_FOUND, message: "Comment not found" },
  REPLY_NOT_FOUND: { statusCode: HTTP_STATUS.NOT_FOUND, message: "Reply not found" },
  POST_ALREADY_LIKED: { statusCode: HTTP_STATUS.CONFLICT, message: "Post already liked" },
  FORBIDDEN: { statusCode: HTTP_STATUS.FORBIDDEN, message: "You are not authorized to perform this action" },
  INVALID_SORT: { statusCode: HTTP_STATUS.BAD_REQUEST, message: "Invalid sort" },
  INVALID_CATEGORY: { statusCode: HTTP_STATUS.BAD_REQUEST, message: "Invalid category" },
  USER_ALREADY_BLOCKED: { statusCode: HTTP_STATUS.CONFLICT, message: "User already blocked" },
  POST_REMOVED: { statusCode: HTTP_STATUS.CONFLICT, message: "Post already removed" },
  REPORT_ALREADY_EXISTS: { statusCode: HTTP_STATUS.CONFLICT, message: "You can re-report within 7 days" },

};