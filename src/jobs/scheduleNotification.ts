import { Queue } from "bullmq";
import redisClient from "@config/redis";
import logger from "@utils/logger";
import { NotificationJobData } from "@models/notifications";

export const notificationQueue = new Queue("notifications", {
  connection: redisClient,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export const failedNotificationQueue = new Queue("failed_notifications", {
  connection: redisClient,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export const scheduleNotification = async (
  notificationId: string,
  uid: string,
  scheduledAt: Date
) => {
  const delay = scheduledAt.getTime() - Date.now();
  if (delay < 0) {
    logger.warn(
      JSON.stringify({
        action: "scheduleNotification",
        uid,
        notificationId,
        warning: "Scheduled time in past, sending immediately",
      })
    );
  }

  const payloadToAdd: NotificationJobData = { notificationId, uid };

  const job = await notificationQueue.add("sendNotification", payloadToAdd, {
    delay: Math.max(delay, 0),
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
  });

  logger.info(
    JSON.stringify({
      action: "scheduleNotification",
      uid,
      notificationId,
      scheduledAt,
    })
  );

  return job.id;
};
