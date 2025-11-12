import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import postgres from '@fastify/postgres';
import { config } from './config';
import { setupDatabase } from './database/setup';
import { createRedisClient } from './database/redis';
import { authPlugin } from './auth';
import templateRoutes from './routes/temp-routes';
import healthRoutes from './routes/health-route';

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

    // Setup auth plugin
    await server.register(authPlugin);

    // Setup database tables
    await setupDatabase(server.pg.pool);

    // Register routes
    await server.register(templateRoutes, { prefix: '/templates' });
    await server.register(healthRoutes, { prefix: '/health' });

    // Start server
    await server.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`🚀 Template Service running on port ${config.port}`);
  } catch (err) {
    server.log.error(err);
   
  }
}

start();