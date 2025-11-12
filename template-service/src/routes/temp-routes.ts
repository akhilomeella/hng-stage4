import { FastifyInstance } from 'fastify';
import { TemplateService } from '../services/temp-service';
import {
  createTemplateSchema,
  updateTemplateSchema,
  queryTemplateSchema,
  renderTemplateSchema,
} from '../schemas/temp-schema';
import { createResponse } from '../utils/response';

export default async function templateRoutes(server: FastifyInstance) {
  const templateService = new TemplateService(server);

  // Create template
  server.post('/', {
     preHandler: server.authenticate,
  }, async (request, reply) => {
    try {
      const body = createTemplateSchema.parse(request.body);
      const template = await templateService.create(body);
      return createResponse(true, 'Template created successfully', template);
    } catch (error: any) {
      reply.code(error.message.includes('already exists') ? 409 : 400);
      return createResponse(false, 'Failed to create template', undefined, error.message);
    }
  });

  // Get all templates
  server.get('/', async (request, reply) => {
    try {
      const query = queryTemplateSchema.parse(request.query);
      const { templates, meta } = await templateService.findAll(
        Number(query.page),
        Number(query.limit),
        query.search,
        query.type,
        query.language
      );
      return createResponse(true, 'Templates retrieved successfully', templates, undefined, meta);
    } catch (error: any) {
      reply.code(400);
      return createResponse(false, 'Failed to retrieve templates', undefined, error.message);
    }
  });

  // Get template by ID
  server.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const template = await templateService.findOne(id);
      return createResponse(true, 'Template retrieved successfully', template);
    } catch (error: any) {
      reply.code(404);
      return createResponse(false, 'Template not found', undefined, error.message);
    }
  });

  // Get template by name
  server.get('/name/:name', async (request, reply) => {
    try {
      const { name } = request.params as { name: string };
      const template = await templateService.findByName(name);
      return createResponse(true, 'Template retrieved successfully', template);
    } catch (error: any) {
      reply.code(404);
      return createResponse(false, 'Template not found', undefined, error.message);
    }
  });

  // Update template
  server.patch('/:id', {
     preHandler: server.authenticate,
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = updateTemplateSchema.parse(request.body);
      const template = await templateService.update(id, body);
      return createResponse(true, 'Template updated successfully', template);
    } catch (error: any) {
      reply.code(error.message === 'Template not found' ? 404 : 400);
      return createResponse(false, 'Failed to update template', undefined, error.message);
    }
  });

  // Delete template
  server.delete('/:id', {
     preHandler: server.authenticate,
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      await templateService.remove(id);
      return createResponse(true, 'Template deleted successfully');
    } catch (error: any) {
      reply.code(404);
      return createResponse(false, 'Failed to delete template', undefined, error.message);
    }
  });

  // Render template
  server.post('/:id/render', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = renderTemplateSchema.parse(request.body);
      const rendered = await templateService.renderTemplate(id, body.variables);
      return createResponse(true, 'Template rendered successfully', rendered);
    } catch (error: any) {
      reply.code(400);
      return createResponse(false, 'Failed to render template', undefined, error.message);
    }
  });

  // Get versions
  server.get('/:id/versions', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const versions = await templateService.getVersions(id);
      return createResponse(true, 'Versions retrieved successfully', versions);
    } catch (error: any) {
      reply.code(404);
      return createResponse(false, 'Failed to retrieve versions', undefined, error.message);
    }
  });

  // Get specific version
  server.get('/:id/versions/:version', async (request, reply) => {
    try {
      const { id, version } = request.params as { id: string; version: string };
      const templateVersion = await templateService.getVersion(id, parseInt(version));
      return createResponse(true, 'Version retrieved successfully', templateVersion);
    } catch (error: any) {
      reply.code(404);
      return createResponse(false, 'Version not found', undefined, error.message);
    }
  });

  // Revert to version
  server.post('/:id/revert/:version', {
     preHandler: server.authenticate,
  }, async (request, reply) => {
    try {
      const { id, version } = request.params as { id: string; version: string };
      const template = await templateService.revertToVersion(id, parseInt(version));
      return createResponse(true, `Template reverted to version ${version}`, template);
    } catch (error: any) {
      reply.code(404);
      return createResponse(false, 'Failed to revert template', undefined, error.message);
    }
  });
}