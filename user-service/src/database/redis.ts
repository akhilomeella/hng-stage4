import Redis from 'ioredis';
import { config } from '../config';

export function createRedisClient(): Redis {
  const redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password, // ✅ Add this line
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  redis.on('connect', () => {
    console.log('✅ Redis connected');
  });

  redis.on('error', (err) => {
    console.error('❌ Redis error:', err);
  });

  return redis;
}
