import { ContactUsFormService } from "@services/support";
import { HTTP_STATUS } from "@traits/httpStatus";
import { ApiResponse } from "@utils/apiResponse";
import { asyncHandler } from "@utils/asyncHandler";
import { Request, Response } from "express";

export const ContactUsForm = asyncHandler(
  async (req: Request, res: Response) => {
    const { uid } = req.user!;
    const payload = req.body;
    const form = await ContactUsFormService(uid, payload);

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          form,
          "Contact us form submitted successfully"
        )
      );
  }
);
