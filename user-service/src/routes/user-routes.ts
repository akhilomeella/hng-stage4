import { FastifyInstance } from 'fastify';
import { UserService } from '../services/user-serve';
import {
  createUserSchema,
  updateUserSchema,
  updatePreferencesSchema,
  queryUserSchema,
} from '../schemas/user-schema';
import { createResponse } from '../utils/response';

export default async function userRoutes(server: FastifyInstance) {
  const userService = new UserService(server);

  // Create user (no auth required)
  server.post('/', async (request, reply) => {
    try {
      const body = createUserSchema.parse(request.body);
      const user = await userService.create(body);
      return createResponse(true, 'User created successfully', user);
    } catch (error: any) {
      reply.code(error.message === 'Email already exists' ? 409 : 400);
      return createResponse(false, 'Failed to create user', undefined, error.message);
    }
  });

  // Get all users (WITH AUTH) - Use preHandler instead of onRequest
  server.get('/', {
    preHandler: server.authenticate,  // ⭐ Changed from onRequest
  }, async (request, reply) => {
    try {
      const query = queryUserSchema.parse(request.query);
      const { users, meta } = await userService.findAll(
        Number(query.page),
        Number(query.limit),
        query.search
      );
      return createResponse(true, 'Users retrieved successfully', users, undefined, meta);
    } catch (error: any) {
      reply.code(400);
      return createResponse(false, 'Failed to retrieve users', undefined, error.message);
    }
  });

  // Get user by ID (WITH AUTH)
  server.get('/:id', {
    preHandler: server.authenticate,  // ⭐ Changed
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = await userService.findOne(id);
      return createResponse(true, 'User retrieved successfully', user);
    } catch (error: any) {
      reply.code(404);
      return createResponse(false, 'User not found', undefined, error.message);
    }
  });

  // Update user (WITH AUTH)
  server.patch('/:id', {
    preHandler: server.authenticate,  // ⭐ Changed
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = updateUserSchema.parse(request.body);
      const user = await userService.update(id, body);
      return createResponse(true, 'User updated successfully', user);
    } catch (error: any) {
      reply.code(error.message === 'User not found' ? 404 : 400);
      return createResponse(false, 'Failed to update user', undefined, error.message);
    }
  });

  // Update preferences (WITH AUTH)
  server.patch('/:id/preferences', {
    preHandler: server.authenticate,  // ⭐ Changed
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = updatePreferencesSchema.parse(request.body);
      const user = await userService.updatePreferences(id, body);
      return createResponse(true, 'Preferences updated successfully', user);
    } catch (error: any) {
      reply.code(error.message === 'User not found' ? 404 : 400);
      return createResponse(false, 'Failed to update preferences', undefined, error.message);
    }
  });

  // Get preferences (WITH AUTH)
  server.get('/:id/preferences', {
    preHandler: server.authenticate,  // ⭐ Changed
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const preferences = await userService.getPreferences(id);
      return createResponse(true, 'Preferences retrieved successfully', preferences);
    } catch (error: any) {
      reply.code(404);
      return createResponse(false, 'User not found', undefined, error.message);
    }
  });

  // Delete user (WITH AUTH)
  server.delete('/:id', {
    preHandler: server.authenticate,  // ⭐ Changed
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      await userService.remove(id);
      return createResponse(true, 'User deleted successfully');
    } catch (error: any) {
      reply.code(404);
      return createResponse(false, 'Failed to delete user', undefined, error.message);
    }
  });

  // Get current user profile (WITH AUTH)
  server.get('/me/profile', {
    preHandler: server.authenticate,  // ⭐ Changed
  }, async (request, reply) => {
    try {
      const user = request.user as any;
      const profile = await userService.findOne(user.id);
      return createResponse(true, 'Profile retrieved successfully', profile);
    } catch (error: any) {
      reply.code(404);
      return createResponse(false, 'Profile not found', undefined, error.message);
    }
  });
}