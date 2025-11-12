import { FastifyInstance } from 'fastify';
import { AuthService } from '../services/auth-service';
import { loginSchema } from '../schemas/user-schema';
import { createResponse } from '../utils/response';

export default async function authRoutes(server: FastifyInstance) {
  const authService = new AuthService(server);

  server.post('/login', async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body);
      const result = await authService.login(body.email, body.password);
      return createResponse(true, 'Login successful', result);
    } catch (error: any) {
      reply.code(401);
      return createResponse(false, 'Login failed', undefined, error.message);
    }
  });
}

