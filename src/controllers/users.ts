import { Request, Response } from "express";
import { CreateUserService, GetUserProfileService, SaveFcmTokenService, UpdateProfileDetailsService, UploadProfileImageService } from "@services/users";
import { HTTP_STATUS } from "@traits/httpStatus";
import { asyncHandler } from "@utils/asyncHandler";
import { UserInput } from "@validationSchema/user";
import { ApiResponse } from "@utils/apiResponse";
import { USER_ERRORS } from "@constant/errorMessages/users";


export const SaveFcmToken = asyncHandler(async (req: Request, res: Response) => {
    const { uid } = req.user!;
    const { fcmToken } = req.body;
    const result = await SaveFcmTokenService(uid, fcmToken);
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, {result},"Token saved successfully"));
  })

export const CreateUser = asyncHandler(async (req: Request, res: Response) => {
  const userInput: UserInput = req.body;
  if(req?.user === undefined){
    return res.status(HTTP_STATUS.UNAUTHORIZED).json(new ApiResponse(USER_ERRORS.NO_TOKEN.statusCode,USER_ERRORS.NO_TOKEN.message));
  }
  const user = await CreateUserService(userInput, req?.user);

  return res
    .status(HTTP_STATUS.CREATED)
    .json(
      new ApiResponse(HTTP_STATUS.CREATED, user, "User created successfully")
    );
});

export const GetUserProfile = asyncHandler(async (req: Request, res: Response) => {
  const { uid } = req.user!;
  const user = await GetUserProfileService(uid);
  return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, user, "User profile fetched successfully"));
});

export const UploadProfileImage = asyncHandler(async (req: Request, res: Response) => {
  const { uid } = req.user!;
  const file = req.file!;

  const imageUrl = await UploadProfileImageService(uid, file.filename, file.path);
  return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, {imageUrl}, "Profile image uploaded successfully"));
});

export const UpdateProfileDetails = asyncHandler(async (req: Request, res: Response) => {
  const { uid } = req.user!;
  const { name, dob, country, timezone } = req.body;
  const {updates} = await UpdateProfileDetailsService(uid, name, dob, country, timezone);
  return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, {uid, ...updates}, "Profile details updated successfully"));
});