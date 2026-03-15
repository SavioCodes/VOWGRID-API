import { Queue, type ConnectionOptions } from 'bullmq';
import { redis } from './redis.js';

export const bullmqConnection = redis as unknown as ConnectionOptions;

export const executionQueue = new Queue('execution', {
  connection: bullmqConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});
