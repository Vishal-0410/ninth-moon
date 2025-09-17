import { Router, type Router as ExpressRouter } from "express";
import {
  createNotificationSchema,
  updateNotificationSchema,
  actionNotificationSchema,
} from "../validationSchema/notification";
import { AuthMiddleware } from "@middlewares/auth";
import { ValidationMiddleware } from "@middlewares/schemaValidator";
import {
  CreateNotification,
  GetNotifications,
  GetNotificationById,
  UpdateNotification,
  NotificationAction,
} from "@controllers/notification";

const router: ExpressRouter = Router();

router.post(
  "/notifications",
  AuthMiddleware,
  ValidationMiddleware(createNotificationSchema),
  CreateNotification
);

router.get("/notifications", AuthMiddleware, GetNotifications);

router.get("/notifications/:notificationId", AuthMiddleware, GetNotificationById);

router.put(
  "/notifications/:notificationId",
  AuthMiddleware,
  ValidationMiddleware(updateNotificationSchema),
  UpdateNotification
);

router.patch(
  "/notifications/:notificationId/action",
  AuthMiddleware,
  ValidationMiddleware(actionNotificationSchema),
  NotificationAction
);

export default router;
