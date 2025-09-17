import 'dotenv/config';
import { Worker, Job } from "bullmq";
import { auth, db } from "@config/firebase";
import logger from "@utils/logger";
import redisConnection from "@config/redis";
import { COLLECTIONS } from "@constant/collection";

const ACTION = "removeAccount";

interface AccountJobData {
  uid: string;
  reason?: string;
  requestedBy?: string;
  requestedAt?: string;
}

const COLLECTIONS_TO_DELETE = [
  COLLECTIONS.USERS,
];

export const accountWorker = new Worker<AccountJobData>(
  "accounts",
  async (job: Job<AccountJobData>) => {
    const { uid } = job.data;
    const userDocRef = db.collection(COLLECTIONS.USERS).doc(uid);

    try {
      const userDoc = await userDocRef.get();
      if (!userDoc.exists) {
        logger.warn({ action: ACTION, jobId: job.id, uid, warning: "User doc not found" });
        return;
      }

      const userData = userDoc.data();
      if (!userData) {
        logger.warn({ action: ACTION, jobId: job.id, uid, warning: "User data missing" });
        return;
      }

      if (userData.status !== "pending_deletion") {
        logger.info({
          action: ACTION,
          jobId: job.id,
          uid,
          info: `Skipping removal (status=${userData.status})`,
        });
        return;
      }

      try {
        await auth.deleteUser(uid);
      } catch (err: any) {
        if (err.code === "auth/user-not-found") {
          logger.warn({ action: ACTION, jobId: job.id, uid, warning: "User already removed in Auth" });
        } else {
          throw err;
        }
      }

      await Promise.all(
        COLLECTIONS_TO_DELETE.map(async (col) => {
          try {
            await db.collection(col).doc(uid).delete();
          } catch (err: any) {
            logger.error({ action: ACTION, jobId: job.id, uid, collection: col, error: err.message });
          }
        })
      );

      logger.info({ action: ACTION, jobId: job.id, uid, status: "deleted" });
    } catch (err: any) {
      logger.error({ action: ACTION, jobId: job.id, uid, error: err.message });
      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency: 10,
    autorun: true,
  }
);

accountWorker.on("failed", (job, err) => {
  logger.error({
    action: ACTION,
    jobId: job?.id,
    attempts: job?.attemptsMade,
    error: err.message,
  });
});

accountWorker.on("completed", (job) => {
  logger.info({ action: ACTION, jobId: job.id, status: "completed" });
});

accountWorker.on("error", (err) => {
  logger.error({ action: ACTION, error: err.message, fatal: true });
});

process.on("SIGINT", async () => {
  logger.info("Shutting down account worker...");
  await accountWorker.close();
  process.exit(0);
});
