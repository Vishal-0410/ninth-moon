import 'dotenv/config';
import { Worker, Job } from "bullmq";
import { db } from "@config/firebase";
import { sendFCMNotification } from "@utils/sendNotification";
import logger from "@utils/logger";
import redisConnection from "@config/redis";
import {
  failedNotificationQueue,
  scheduleNotification,
} from "@jobs/scheduleNotification";
import { COLLECTIONS } from "@constant/collection";
import { addHours, addDays, addWeeks, addMonths } from "date-fns";
import { NotificationJobData } from "@models/notifications";

const calculateNextOccurrence = (current: Date, repeat: string): Date | null => {
  switch (repeat) {
    case "never":
      return null;
    case "hourly":
      return addHours(current, 1);
    case "daily":
      return addDays(current, 1);
    case "weekly":
      return addWeeks(current, 1);
    case "weekdays":
      let next = addDays(current, 1);
      while (next.getDay() === 0 || next.getDay() === 6) next = addDays(next, 1);
      return next;
    case "weekends":
      let weekend = addDays(current, 1);
      while (weekend.getDay() !== 0 && weekend.getDay() !== 6)
        weekend = addDays(weekend, 1);
      return weekend;
    case "biweekly":
      return addWeeks(current, 2);
    case "monthly":
      return addMonths(current, 1);
    default:
      return null;
  }
};

export const notificationWorker = new Worker<NotificationJobData>(
  "notifications",
  async (job: Job<NotificationJobData>) => {
    const { notificationId, uid } = job.data;
    const notificationDocRef = db
      .collection(COLLECTIONS.NOTIFICATIONS)
      .doc(notificationId);

    try {
      const notificationDoc = await notificationDocRef.get();
      if (!notificationDoc.exists){
        logger.warn(
          JSON.stringify({
            action: "notificationWorker",
            jobId: job.id,
            warning: "Notification document not found",
            notificationId,
          })
        );
        return;
      }

      const notificationData = notificationDoc.data();
      if (!notificationData) {
        logger.warn(
          JSON.stringify({
            action: "notificationWorker",
            jobId: job.id,
            warning: "Notification data not found",
            notificationId,
          })
        );
        return;
      }
      if (
        notificationData.status === "deleted" ||
        notificationData.status === "done"
      ) {
        logger.info(
          `Skipping notification ${notificationId} because its status is ${notificationData.status}`
        );
        return;
      }

      const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
      if (!userDoc.exists){
        logger.warn(
          JSON.stringify({
            action: "notificationWorker",
            jobId: job.id,
            warning: "User not found",
            uid,
          })
        );
        return;
      }

      const userData = userDoc.data();
      const token: string | undefined = userData?.fcmToken;
      if (!token){
        if (!token) {
          logger.warn(
            JSON.stringify({
              action: "notificationWorker",
              jobId: job.id,
              warning: "FCM token not found for user",
              uid,
            })
          );
          return;
      };
      const now = new Date().toISOString();
      try {
        await sendFCMNotification(token, {
          message: notificationData.message,
          data: { notificationId, ...(notificationData.data || {}) },
        });
      } catch (err: any) {
        if (
          err.message.includes("messaging/invalid-argument") ||
          err.message.includes("messaging/registration-token-not-registered")
        ) {
          await db.collection(COLLECTIONS.USERS).doc(uid).update({ fcmToken: null });
        }
        throw err;
      }
      if (notificationData.status === "snoozed") {
        await notificationDocRef.update({
          lastSentAt: now,
        });
      } else if (notificationData.repeat && notificationData.repeat !== "never") {
        const nextScheduledDate = calculateNextOccurrence(
          new Date(),
          notificationData.repeat
        );
        if (nextScheduledDate) {
         const jobId = await scheduleNotification(
            notificationId,
            uid,
            nextScheduledDate,
          );
          await notificationDocRef.update({
            jobId,
            scheduledAt: nextScheduledDate.toISOString(),
            status: "unread",
            lastSentAt: now,
          });
        }
      } else {
        await notificationDocRef.update({
          status: "done",
          lastSentAt: now,
        });
      }

      logger.info(
        JSON.stringify({
          jobId: job.id,
          uid,
          notificationId,
        })
      );
    } 
  }catch (err: any) {
      await failedNotificationQueue.add("failedNotification", {
        jobId: job.id,
        uid,
        notificationId,
        error: err.message,
        failedAt: new Date().toISOString(),
      });
      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency: 20,
    autorun: true,
    limiter: { max: 100, duration: 1000 },
  }
);

notificationWorker.on("failed", (job, err) => {
  logger.error(
    JSON.stringify({
      jobId: job?.id,
      attempts: job?.attemptsMade,
      error: err.message,
    })
  );
});

notificationWorker.on("completed", (job) => {
  logger.info(JSON.stringify({ jobId: job.id, status: "completed" }));
});

notificationWorker.on("error", (err) => {
  logger.error(JSON.stringify({ error: err.message, fatal: true }));
});

process.on("SIGINT", async () => {
  logger.info("Shutting down notification worker...");
  await notificationWorker.close();
  process.exit(0);
});
