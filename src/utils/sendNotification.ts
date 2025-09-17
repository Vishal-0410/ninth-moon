import { fcm } from "@config/firebase";
import logger from "@utils/logger";
import { ApiError } from "@utils/apiError";
import { HTTP_STATUS } from "@traits/httpStatus";

interface FCMNotificationPayload {
  message:string
  data?: Record<string, string>;
}

export const sendFCMNotification = async (
  token: string,
  payload: FCMNotificationPayload
) => {
  try {
    const message = {
      token,
      notification: {
        body:payload.message
      },
      data: payload.data || {},
    };

    return await fcm.send(message);
  } catch (error: any) {
    logger.error(
      JSON.stringify({ action: "sendFCMNotification", token, error: error.message })
    );
    throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message);
  }
};

export const sendFCMMulticast = async (
  tokens: string[],
  payload: FCMNotificationPayload
): Promise<{ successCount: number; failureCount: number; invalidTokens: string[] }> => {
  if (!tokens || tokens.length === 0) {
    return { successCount: 0, failureCount: 0, invalidTokens: [] };
  }

  try {
    const chunkSize = 500;
    let successCount = 0;
    let failureCount = 0;
    const invalidTokens: string[] = [];

    for (let i = 0; i < tokens.length; i += chunkSize) {
      const chunk = tokens.slice(i, i + chunkSize);

      const message = {
        tokens: chunk,
        notification: {
          body:payload.message
        },
        data: payload.data || {},
      };

      const response = await fcm.sendEachForMulticast(message);

      successCount += response.successCount;
      failureCount += response.failureCount;

      response.responses.forEach((resp, index) => {
        if (!resp.success) {
          const errCode = resp.error?.code;
          if (
            errCode === "messaging/invalid-argument" ||
            errCode === "messaging/registration-token-not-registered"
          ) {
            invalidTokens.push(chunk[index]);
          }
        }
      });

      logger.info(
        JSON.stringify({
          action: "sendFCMMulticast",
          batch: i / chunkSize + 1,
          successCount: response.successCount,
          failureCount: response.failureCount,
        })
      );
    }

    return { successCount, failureCount, invalidTokens };
  } catch (error: any) {
    logger.error(
      JSON.stringify({ action: "sendFCMMulticast", error: error.message })
    );
    throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message);
  }
};
