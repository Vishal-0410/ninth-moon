import { HTTP_STATUS } from "@traits/httpStatus";


export const CALENDER_PAGE_ERRORS = {
  UNAUTHORIZED:{ message: "Unauthorized", statusCode: HTTP_STATUS.UNAUTHORIZED },
  USER_NOT_FOUND: { message: "User not found.", statusCode: HTTP_STATUS.NOT_FOUND },
  INTERNAL_SERVER_ERROR: { message: "Internal server error.", statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR },
  NOTE_NOT_FOUND: { message: "Note not found.", statusCode: HTTP_STATUS.NOT_FOUND },
  NOTE_ID_NOT_FOUND: { message: "Note id not found.", statusCode: HTTP_STATUS.NOT_FOUND },
};
