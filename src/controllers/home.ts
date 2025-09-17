import { Request, Response } from "express";
import { FertilityDetailsCreateService, HomePageService, MoodLogsServices, SymptomsService } from "@services/home";
import { ApiResponse } from "@utils/apiResponse";
import { asyncHandler } from "@utils/asyncHandler";
import { HOME_PAGE_ERRORS } from "@constant/errorMessages/home";
import { FertilityHomeLatestLMPInput, MoodInput, SymptomInput } from "@validationSchema/home";
import { AUTH_ERROR_MESSAGES } from "@constant/errorMessages/auth";
import { HTTP_STATUS } from "@traits/httpStatus";

export const HomePage = asyncHandler(async (req: Request, res: Response) => {
  const homePageData = await HomePageService(req.user!.uid);
  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        homePageData,
        "Home page data retrieved successfully"
      )
    );
});

export const MoodLogs = asyncHandler(async (req: Request, res: Response) => {
  const { mood }: MoodInput = req.body;
  if (!mood) {
    return res
      .status(HOME_PAGE_ERRORS.MOOD_REQUIRED.statusCode)
      .json(
        new ApiResponse(
          HOME_PAGE_ERRORS.MOOD_REQUIRED.statusCode,
          null,
          HOME_PAGE_ERRORS.MOOD_REQUIRED.message
        )
      );
  }
  if(req?.user === undefined){
    return res.status(HTTP_STATUS.UNAUTHORIZED).json(new ApiResponse(AUTH_ERROR_MESSAGES.ACCESS_TOKEN_REQUIRED.statusCode,AUTH_ERROR_MESSAGES.ACCESS_TOKEN_REQUIRED.message));
  }

  const userMoodLog = await MoodLogsServices(req?.user?.uid, mood);
    return res
    .status(HTTP_STATUS.CREATED)
    .json(
      new ApiResponse(
        HTTP_STATUS.CREATED,
        userMoodLog,
        "Mood logged successfully"
      )
    );
});
export const SymptompLogs = asyncHandler(async (req: Request, res: Response) => {
  const { symptoms }: SymptomInput = req.body;

  if (!symptoms || !Array.isArray(symptoms)) {
    return res
      .status(HOME_PAGE_ERRORS.SYMPTOMS_REQUIRED.statusCode)
      .json(
        new ApiResponse(
          HOME_PAGE_ERRORS.SYMPTOMS_REQUIRED.statusCode,
          null,
          HOME_PAGE_ERRORS.SYMPTOMS_REQUIRED.message
        )
      );
  }

  const userSymptomsLog = await SymptomsService(req.user!.uid, symptoms);
  return res
    .status(HTTP_STATUS.CREATED)
    .json(
      new ApiResponse(
        HTTP_STATUS.CREATED,
        userSymptomsLog,
        "Symptoms logged successfully"
      )
    );
});
export const FertilityDetailsCreate = asyncHandler(async (req: Request, res: Response) => {
    const { lastMenstrualPeriod}: FertilityHomeLatestLMPInput=
      req.body;
    if (!lastMenstrualPeriod) {
      return res
        .status(HOME_PAGE_ERRORS.FIELDS_REQUIRED.statusCode)
        .json(
          new ApiResponse(
            HOME_PAGE_ERRORS.FIELDS_REQUIRED.statusCode,
            null,
            HOME_PAGE_ERRORS.FIELDS_REQUIRED.message
          )
        );
    }
    const userId = req.user!.uid;
    const fertilityDetails = await FertilityDetailsCreateService(
      userId,
      lastMenstrualPeriod,
    );
    return res
      .status(HTTP_STATUS.CREATED)
      .json(
        new ApiResponse(
          HTTP_STATUS.CREATED,
          fertilityDetails,
          "Fertility details created successfully"
        )
      );
  }
);



