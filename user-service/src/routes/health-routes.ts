import { FastifyInstance } from 'fastify';

export default async function healthRoutes(server: FastifyInstance) {
  server.get('/', async (request, reply) => {
    try {
      await server.pg.pool.query('SELECT 1');
      return {
        status: 'healthy',
        service: 'user-service',
        timestamp: new Date().toISOString(),
        database: 'connected',
      };
    } catch (error: any) {
      reply.code(503);
      return {
        status: 'unhealthy',
        service: 'user-service',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error.message,
      };
    }
  });
}