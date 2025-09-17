import { Queue, JobsOptions } from "bullmq";
import redisClient from "@config/redis";
import logger from "@utils/logger";

interface AccountJobData {
  uid: string;
  reason?: string;
  requestedBy?: string;
  requestedAt?: string;
}

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 1000 },
  removeOnComplete: true,
  removeOnFail: false,
};

export const accountDeleteQueue = new Queue<AccountJobData>("accounts", {
  connection: redisClient,
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

export const scheduleAccountDelete = async (
  payload: AccountJobData,
  scheduledAt: Date
) => {
  const delay = Math.max(scheduledAt.getTime() - Date.now(), 0);

  if (delay === 0) {
    logger.warn({
      action: "removeAccount",
      uid: payload.uid,
      warning: "Scheduled time is in the past or now",
    });
  }

  const job = await accountDeleteQueue.add("removeAccount", payload, { delay });

  logger.info({
    action: "removeAccount",
    payload,
    scheduledAt: scheduledAt.toISOString(),
    jobId: job.id,
    delay,
  });

  return job.id;
};
