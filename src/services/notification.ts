import { db } from "@config/firebase";
import { COLLECTIONS } from "@constant/collection";
import { NOTIFICATION_ERRORS } from "@constant/errorMessages/notification";
import { notificationQueue, scheduleNotification } from "@jobs/scheduleNotification";
import { Notification } from "@models/notifications";
import { ApiError } from "@utils/apiError";
import { localDateTimeToUTC } from "@utils/normalizeDate";

export const CreateNotificationService = async (
  uid: string,
  payload: Omit<
    Notification,
    | "uid"
    | "status"
    | "scheduledAt"
    | "createdAt"
    | "updatedAt"
    | "snoozeCount"
    | "lastSentAt"
  >
): Promise<Notification> => {
  const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
  const userDoc = await userRef.get();
  const userData = userDoc.data();

  if (!userDoc.exists || !userData || userData.status !== "active") {
    throw new ApiError(
      NOTIFICATION_ERRORS.USER_NOT_FOUND.statusCode,
      NOTIFICATION_ERRORS.USER_NOT_FOUND.message
    );
  }

  let scheduledAt = localDateTimeToUTC(
    payload.date,
    payload.time,
    userData.timezone
  );

  if (new Date(scheduledAt).getTime() < new Date().getTime()) {
    throw new ApiError(
      NOTIFICATION_ERRORS.INVALID_DATETIME.statusCode,
      NOTIFICATION_ERRORS.INVALID_DATETIME.message
    );
  }

  const notification: Notification = {
    ...payload,
    uid,
    status: "unread",
    snoozeCount: 0,
    scheduledAt,
    lastSentAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const docRef = await db
    .collection(COLLECTIONS.NOTIFICATIONS)
    .add(notification);

  const jobId=await scheduleNotification(docRef.id, uid, new Date(scheduledAt));

  await docRef.update({ jobId });

  return { id: docRef.id, jobId: jobId, ...notification };
};

export const GetNotificationsService = async (
  uid: string,
  type?: string,
  limit = 10,
  cursor?: string
): Promise<{
  notifications: Notification[];
  pagination: {
    hasNextPage: boolean;
    nextCursor?: string;
  };
}> => {
  let query = db
    .collection(COLLECTIONS.NOTIFICATIONS)
    .where("uid", "==", uid)
    .where("status", "!=", "deleted");

  if (type) {
    query = query.where("type", "==", type);
  }

  query = query.orderBy("updatedAt", "desc");

  query = query.limit(limit + 1);

  if (cursor) {
    const startAfterDoc = await db
      .collection(COLLECTIONS.NOTIFICATIONS)
      .doc(cursor)
      .get();

    if (startAfterDoc.exists) {
      query = query.startAfter(startAfterDoc);
    } else {
      throw new ApiError(
        NOTIFICATION_ERRORS.INVALID_DOCUMENT.statusCode,
        NOTIFICATION_ERRORS.INVALID_DOCUMENT.message
      );
    }
  }

  const snapshot = await query.get();

  let notifications = snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      } as Notification)
  );

  let hasNextPage = false;
  let nextCursor: string | undefined;

  if (notifications.length > limit) {
    const lastDoc = notifications.pop();
    nextCursor = lastDoc?.id;
    hasNextPage = true;
  }

  return {
    notifications,
    pagination: {
      hasNextPage,
      nextCursor,
    },
  };
};

export const GetNotificationByIdService = async (
  uid: string,
  notificationId: string
): Promise<Notification> => {
  const notificationRef = db
    .collection(COLLECTIONS.NOTIFICATIONS)
    .doc(notificationId);
  const notificationDoc = await notificationRef.get();

  if (!notificationDoc.exists) {
    throw new ApiError(
      NOTIFICATION_ERRORS.NOT_FOUND.statusCode,
      NOTIFICATION_ERRORS.NOT_FOUND.message
    );
  }

  const notificationData = notificationDoc.data() as Notification;

  if (notificationData.uid !== uid) {
    throw new ApiError(
      NOTIFICATION_ERRORS.FORBIDDEN.statusCode,
      NOTIFICATION_ERRORS.FORBIDDEN.message
    );
  }

  return { id: notificationDoc.id, ...notificationData };
};

export const UpdateNotificationService = async (
  uid: string,
  notificationId: string,
  payload: Partial<Notification>
): Promise<Notification> => {
  const docRef = db.collection(COLLECTIONS.NOTIFICATIONS).doc(notificationId);
  const doc = await docRef.get();

  if (!doc.exists)
    throw new ApiError(
      NOTIFICATION_ERRORS.NOT_FOUND.statusCode,
      NOTIFICATION_ERRORS.NOT_FOUND.message
    );

  const data = doc.data() as Notification;

  if (data.uid !== uid)
    throw new ApiError(
      NOTIFICATION_ERRORS.FORBIDDEN.statusCode,
      NOTIFICATION_ERRORS.FORBIDDEN.message
    );

  payload.updatedAt = new Date().toISOString();
  
  if (payload.date || payload.time) {
    const datePart = payload.date || data.date;
    const timePart = payload.time || data.time;
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    const userData = userDoc.data();
    
    if (!userData) {
      throw new ApiError(
        NOTIFICATION_ERRORS.USER_NOT_FOUND.statusCode,
        NOTIFICATION_ERRORS.USER_NOT_FOUND.message
      );
    }

    const newScheduledAt = localDateTimeToUTC(datePart!, timePart!, userData.timezone);

    if (new Date(newScheduledAt).getTime() < new Date().getTime()) {
      throw new ApiError(
        NOTIFICATION_ERRORS.INVALID_DATETIME.statusCode,
        NOTIFICATION_ERRORS.INVALID_DATETIME.message
      );
    }

    payload.scheduledAt = newScheduledAt;

    if(data.jobId){
      const job = await notificationQueue.getJob(data.jobId);
      if (job) {
        await job.remove();
      }

    };
    const newJobId = await scheduleNotification(notificationId, uid, new Date(newScheduledAt));
    payload.jobId = newJobId;
  }

  await docRef.update(payload);

  return { id: doc.id, ...data, ...payload } as Notification;
};

export const NotificationActionService = async (
  uid: string,
  notificationId: string,
  payload: {
    action: "delete" | "done" | "snooze";
  }
): Promise<Notification> => {
  const docRef = db.collection(COLLECTIONS.NOTIFICATIONS).doc(notificationId);

  const [userDoc, notificationDoc] = await Promise.all([
    db.collection(COLLECTIONS.USERS).doc(uid).get(),
    docRef.get(),
  ]);

  const now = new Date();

  const userData = userDoc.data();
  if (!userDoc.exists || !userData || userData.status !== "active") {
    throw new ApiError(
      NOTIFICATION_ERRORS.USER_NOT_FOUND.statusCode,
      NOTIFICATION_ERRORS.USER_NOT_FOUND.message
    );
  }

  if (!notificationDoc.exists) {
    throw new ApiError(
      NOTIFICATION_ERRORS.NOT_FOUND.statusCode,
      NOTIFICATION_ERRORS.NOTIFICATION_NOT_FOUND.message
    );
  }

  const data = notificationDoc.data() as Notification;
  if (data.uid !== uid) {
    throw new ApiError(
      NOTIFICATION_ERRORS.FORBIDDEN.statusCode,
      NOTIFICATION_ERRORS.FORBIDDEN.message
    );
  }

  const updatePayload: Partial<Notification> = {
    updatedAt: now.toISOString(),
  };

  switch (payload.action) {
    case "done":
      updatePayload.status = "done";
      break;

    case "delete":
      if(data.jobId){
        const job =await notificationQueue.getJob(data.jobId);
        if(job){
          await job.remove();
        }
      }
      updatePayload.status = "deleted";
      break;

    case "snooze":
      if (data.scheduledAt && new Date(data.scheduledAt) > now) {
        throw new ApiError(
          NOTIFICATION_ERRORS.INVALID_SNOOZE.statusCode,
          NOTIFICATION_ERRORS.INVALID_SNOOZE.message
        );
      }

      const snoozeDurations = [5, 10, 15];
      const currentSnoozeCount = data.snoozeCount || 0;

      if (currentSnoozeCount >= snoozeDurations.length) {
        updatePayload.status = "done";
      } else {
        const nextSnoozeMinutes = snoozeDurations[currentSnoozeCount];
        const newScheduledAt = new Date(now.getTime() + nextSnoozeMinutes * 60 * 1000);

        updatePayload.status = "snoozed";
        updatePayload.scheduledAt = newScheduledAt.toISOString();
        updatePayload.snoozeCount = currentSnoozeCount + 1;

        const jobId = await scheduleNotification(notificationId, uid, newScheduledAt);
        if (jobId) updatePayload.jobId = jobId;
      }
      break;

    default:
      throw new ApiError(
        NOTIFICATION_ERRORS.INVALID_ACTION.statusCode,
        NOTIFICATION_ERRORS.INVALID_ACTION.message
      );
  }

  await docRef.update(updatePayload);
  return { id: docRef.id, ...data, ...updatePayload } as Notification;
};

