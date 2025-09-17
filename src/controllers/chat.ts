import { Request, Response } from 'express';
import { asyncHandler } from '@utils/asyncHandler';
import { ApiResponse } from '@utils/apiResponse';
import { HTTP_STATUS } from '@traits/httpStatus';
import { ChatService } from '@services/chat';

export const Chat = asyncHandler(async (req: Request, res: Response) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json(new ApiResponse(HTTP_STATUS.BAD_REQUEST,null, "Message is required"));
  }
  const messageResponse = await ChatService(message, req.user!.uid);
  return res.status(200).json({ response: messageResponse });
  
});