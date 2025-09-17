import { Request, Response } from "express";
import { HTTP_STATUS } from "@traits/httpStatus";
import { ApiResponse } from "@utils/apiResponse";
import {
  CreateNotificationInput,
  UpdateNotificationInput,
  ActionNotificationInput,
} from "@validationSchema/notification";
import {
  CreateNotificationService,
  GetNotificationsService,
  GetNotificationByIdService,
  UpdateNotificationService,
  NotificationActionService,
} from "@services/notification";

export const CreateNotification = async (req: Request, res: Response) => {
  const { uid } = req.user!;
  const payload: CreateNotificationInput = req.body;

  const notification = await CreateNotificationService(uid, payload);
  return res
    .status(HTTP_STATUS.CREATED)
    .json(new ApiResponse(HTTP_STATUS.CREATED, notification, "Notification created successfully"));
};

export const GetNotifications = async (req: Request, res: Response) => {
  const { uid } = req.user!;
  const { type, limit, cursor } = req.query;

  const notificationType = typeof type === 'string' ? type : undefined;
  const notificationLimit = typeof limit === 'string' ? parseInt(limit, 10) : undefined;
  const notificationCursor = typeof cursor === 'string' ? cursor : undefined;

  const notifications = await GetNotificationsService(
    uid,
    notificationType,
    notificationLimit,
    notificationCursor
  );

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        notifications,
        "Notifications fetched successfully"
      )
    );
};

export const GetNotificationById = async (req: Request, res: Response) => {
  const { uid } = req.user!;
  const { notificationId } = req.params;
  const notification = await GetNotificationByIdService(uid, notificationId);
  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, notification, "Notification fetched successfully"));
};

export const UpdateNotification = async (req: Request, res: Response) => {
  const { uid } = req.user!;
  const { notificationId } = req.params;
  const payload: UpdateNotificationInput = req.body;

  const updated = await UpdateNotificationService(uid, notificationId, payload);
  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, updated, "Notification updated successfully"));
};

export const NotificationAction = async (req: Request, res: Response) => {
  const { uid } = req.user!;
  const { notificationId } = req.params;
  const payload: ActionNotificationInput = req.body;

  const result = await NotificationActionService(uid, notificationId, payload);
  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, result, `Notification ${payload.action} successfully`));
};
