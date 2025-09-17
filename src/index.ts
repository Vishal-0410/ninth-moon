import app from '@app';
import 'dotenv/config';
import http from 'http';
import { db } from '@config/firebase';
import logger from '@utils/logger';
import redisClient from '@config/redis';

const port = process.env.PORT ? Number(process.env.PORT) : 3000;

(async () => {
  try {
    await db.collection('test').limit(1).get();
    logger.info('Firestore connection successful!');

    await redisClient.ping();
    logger.info('Redis connection successful!');

    const server = http.createServer(app);

    server.listen(port, '0.0.0.0', () => {
      logger.info(`Server started on port ${port}`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err as Error);
    process.exit(1);
  }
})();