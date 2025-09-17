import { HTTP_STATUS } from "@traits/httpStatus";


export const HOME_PAGE_ERRORS = {
  USER_NOT_FOUND: { message: "User not found.", statusCode: HTTP_STATUS.NOT_FOUND },
  USER_JOURNEY_NOT_FOUND: { message: "User journey not found.", statusCode: HTTP_STATUS.NOT_FOUND },
  MOOD_REQUIRED: { message: "Mood is required.", statusCode: HTTP_STATUS.BAD_REQUEST },
  SYMPTOMS_REQUIRED: { message: "Symptoms are required and must be an array.", statusCode: HTTP_STATUS.BAD_REQUEST },
  FIELDS_REQUIRED: { message: "Required data fields (e.g., last menstrual cycle date) are missing.", statusCode: HTTP_STATUS.BAD_REQUEST },
  INTERNAL_SERVER_ERROR: { message: "An unexpected error occurred on the server.", statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR },
};
