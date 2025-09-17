import { Request, Response } from "express";
import { asyncHandler } from "@utils/asyncHandler";
import { HTTP_STATUS } from "@traits/httpStatus";
import { ApiResponse } from "@utils/apiResponse";
import { ApiError } from "@utils/apiError";
import { AddUserNotesServices, DeleteUserNotesServices, GetUserNotesServices, UpdateUserNotesServices, GetUserNotesByIdServices } from "@services/calender";
import { CALENDER_PAGE_ERRORS } from "@constant/errorMessages/calender";
import { AddNoteInput, GetUserNotesInput, UpdateNoteInput } from "@validationSchema/calender";

export const GetUserNotes = asyncHandler(
  async (req: Request, res: Response) => {
    const { page, limit } = req.query as unknown as GetUserNotesInput;
    if (!req?.user) {
      throw new ApiError(
        CALENDER_PAGE_ERRORS.UNAUTHORIZED.statusCode,
        CALENDER_PAGE_ERRORS.UNAUTHORIZED.message
      );
    }

    const { notes, pagination } = await GetUserNotesServices(
      req.user!.uid,
      page,
      limit
    );

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          notes,
          "Notes fetched successfully",
          pagination
        )
      );
  }
);

export const GetUserNotesById = asyncHandler(async (req: Request, res: Response) => {
  const {noteId} = req.params;
  if (!req?.user) {
    throw new ApiError(
      CALENDER_PAGE_ERRORS.UNAUTHORIZED.statusCode,
      CALENDER_PAGE_ERRORS.UNAUTHORIZED.message
    );
  }
  const noteResponse = await GetUserNotesByIdServices(req.user.uid, noteId);
  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, noteResponse, "Note fetched successfully")
    );
});

export const AddNotes = asyncHandler(async (req: Request, res: Response) => {
  if (!req?.user) {
    throw new ApiError(
      CALENDER_PAGE_ERRORS.UNAUTHORIZED.statusCode,
      CALENDER_PAGE_ERRORS.UNAUTHORIZED.message
    );
  }
  const { date, note }: AddNoteInput = req.body;

  const noteResponse = await AddUserNotesServices(date, note, req.user!.uid);
  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, noteResponse, "Note added successfully")
    );
});

export const UpdateNotesNotes = asyncHandler(async (req: Request, res: Response) => {
  const { noteId } = req.params;
  const { date, note }: UpdateNoteInput = req.body;

  if (!req?.user) {
    throw new ApiError(
      CALENDER_PAGE_ERRORS.UNAUTHORIZED.statusCode,
      CALENDER_PAGE_ERRORS.UNAUTHORIZED.message
    );
  }
  if (!noteId) {
    throw new ApiError(CALENDER_PAGE_ERRORS.NOTE_ID_NOT_FOUND.statusCode, CALENDER_PAGE_ERRORS.NOTE_ID_NOT_FOUND.message);
  }

  const noteResponse = await UpdateUserNotesServices(req.user.uid, noteId, date, note);
  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, noteResponse, "Note updated successfully")
    );
});

export const DeleteNotes = asyncHandler(async (req: Request, res: Response) => {
  const {noteId} = req.params;
  if (!req?.user) {
    throw new ApiError(
      CALENDER_PAGE_ERRORS.UNAUTHORIZED.statusCode,
      CALENDER_PAGE_ERRORS.UNAUTHORIZED.message
    );
  }
  const noteResponse = await DeleteUserNotesServices(req.user.uid, noteId);
  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, noteResponse, "Note deleted successfully")
    );
});