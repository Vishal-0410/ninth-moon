import { HTTP_STATUS } from '@traits/httpStatus';
import { ApiError } from '@utils/apiError';
import logger from '@utils/logger';
import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Redis URL is not defined');
}

const redisClient = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  retryStrategy(times) {
    return Math.min(times * 50, 2000);
  },
});

redisClient.on('connect', () => {
  logger.info('Redis connected successfully!');
});

redisClient.on('error', (err) => {
  logger.error('Redis connection error:', err.message);
});

export default redisClient;
