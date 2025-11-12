import { authPlugin } from './auth';
import fs from 'fs';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import postgres from '@fastify/postgres';
import { config } from './config';
import { setupDatabase } from './database/setup';
import { createRedisClient } from './database/redis';
import userRoutes from './routes/user-routes';
import authRoutes from './routes/auth-routes';
import healthRoutes from './routes/health-routes';

const server = Fastify({
  logger: {
    level: config.nodeEnv === 'development' ? 'info' : 'error',
  },
});

async function start() {
  try {
    // Register plugins
    await server.register(cors, {
      origin: true,
    });

    await server.register(jwt, {
      secret: config.jwtSecret,
    });

    await server.register(postgres, {
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.name,
      ssl: config.database.sslEnabled
    ? {
        rejectUnauthorized: false,
        ca: config.database.caCert
      }
    : false,
    });

    // Setup Redis
    const redis = createRedisClient();
    server.decorate('redis', redis);

    // Register auth plugin 
    await server.register(authPlugin);

    // Setup database tables
    await setupDatabase(server.pg.pool);

    // Register routes
    await server.register(userRoutes, { prefix: '/users' });
    await server.register(authRoutes, { prefix: '/auth' });
    await server.register(healthRoutes, { prefix: '/health' });

    // Start server
    await server.listen({ port: config.port, host: 'localhost' });
    console.log(`🚀 User Service running on port ${config.port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();