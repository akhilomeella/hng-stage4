import { FastifyInstance } from 'fastify';
import Handlebars from 'handlebars';
import { Template, TemplateVersion, CreateTemplateInput, UpdateTemplateInput } from '../types';

export class TemplateService {
  constructor(private server: FastifyInstance) {
    this.registerHandlebarsHelpers();
  }

  private registerHandlebarsHelpers() {
    Handlebars.registerHelper('uppercase', (str: string) => str?.toUpperCase());
    Handlebars.registerHelper('lowercase', (str: string) => str?.toLowerCase());
    Handlebars.registerHelper('capitalize', (str: string) =>
      str ? str.charAt(0).toUpperCase() + str.slice(1) : '',
    );
  }

  async create(input: CreateTemplateInput): Promise<Template> {
    const client = await this.server.pg.pool.connect();
    
    try {
      // Check if template exists
      const existingTemplate = await client.query(
        'SELECT id FROM templates WHERE name = $1',
        [input.name]
      );

      if (existingTemplate.rows.length > 0) {
        throw new Error('Template with this name already exists');
      }

      // Extract variables from template body
      const variables = this.extractVariables(input.body);

      // Insert template
      const result = await client.query(
        `INSERT INTO templates (name, subject, body, type, language, variables, is_active, description, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)
         RETURNING *`,
        [
          input.name,
          input.subject,
          input.body,
          input.type,
          input.language || 'en',
          JSON.stringify(input.variables || []),
          input.is_active !== undefined ? input.is_active : true,
          input.description,
        ]
      );

      const template = result.rows[0];
      template.variables = JSON.parse(template.variables);

      // Create initial version
      await this.createVersion(template.id, template, 'Initial version');
      await this.cacheTemplate(template);

      return template;
    } finally {
      client.release();
    }
  }

  async findAll(page: number, limit: number, search?: string, type?: string, language?: string) {
    const offset = (page - 1) * limit;
    const client = await this.server.pg.pool.connect();

    try {
      let query = 'SELECT * FROM templates WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (search) {
        query += ` AND name ILIKE $${paramIndex++}`;
        params.push(`%${search}%`);
      }

      if (type) {
        query += ` AND type = $${paramIndex++}`;
        params.push(type);
      }

      if (language) {
        query += ` AND language = $${paramIndex++}`;
        params.push(language);
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
      params.push(limit, offset);

      const countQuery = query.substring(0, query.indexOf('ORDER BY'));
      const countParams = params.slice(0, -2);

      const [templatesResult, countResult] = await Promise.all([
        client.query(query, params),
        client.query(`SELECT COUNT(*) FROM (${countQuery}) as count_query`, countParams),
      ]);

      const templates = templatesResult.rows.map(t => ({
        ...t,
        variables: JSON.parse(t.variables),
      }));

      const total = parseInt(countResult.rows[0].count);
      const total_pages = Math.ceil(total / limit);

      return {
        templates,
        meta: {
          total,
          limit,
          page,
          total_pages,
          has_next: page < total_pages,
          has_previous: page > 1,
        },
      };
    } finally {
      client.release();
    }
  }

  async findOne(id: string): Promise<Template> {
    // Try cache first
    const cached = await this.getCachedTemplate(id);
    if (cached) return cached;

    const client = await this.server.pg.pool.connect();
    
    try {
      const result = await client.query('SELECT * FROM templates WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        throw new Error('Template not found');
      }

      const template = result.rows[0];
      template.variables = JSON.parse(template.variables);
      
      await this.cacheTemplate(template);
      return template;
    } finally {
      client.release();
    }
  }

  async findByName(name: string): Promise<Template> {
    const client = await this.server.pg.pool.connect();
    
    try {
      const result = await client.query('SELECT * FROM templates WHERE name = $1', [name]);

      if (result.rows.length === 0) {
        throw new Error('Template not found');
      }

      const template = result.rows[0];
      template.variables = JSON.parse(template.variables);
      return template;
    } finally {
      client.release();
    }
  }

  async update(id: string, input: UpdateTemplateInput): Promise<Template> {
    const template = await this.findOne(id);
    const client = await this.server.pg.pool.connect();

    try {
      const setClauses: string[] = ['updated_at = NOW()'];
      const values: any[] = [];
      let paramIndex = 1;

      // Check if body has changed to create new version
      const bodyChanged = input.body && input.body !== template.body;

      if (input.subject !== undefined) {
        setClauses.push(`subject = $${paramIndex++}`);
        values.push(input.subject);
      }

      if (input.body !== undefined) {
        setClauses.push(`body = $${paramIndex++}`);
        values.push(input.body);
        const variables = this.extractVariables(input.body);
        setClauses.push(`variables = $${paramIndex++}`);
        values.push(JSON.stringify(variables));
      }

      if (input.language !== undefined) {
        setClauses.push(`language = $${paramIndex++}`);
        values.push(input.language);
      }

      if (input.description !== undefined) {
        setClauses.push(`description = $${paramIndex++}`);
        values.push(input.description);
      }

      if (input.is_active !== undefined) {
        setClauses.push(`is_active = $${paramIndex++}`);
        values.push(input.is_active);
      }

      if (bodyChanged) {
        setClauses.push(`version = version + 1`);
      }

      values.push(id);

      const result = await client.query(
        `UPDATE templates SET ${setClauses.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`,
        values
      );

      const updatedTemplate = result.rows[0];
      updatedTemplate.variables = JSON.parse(updatedTemplate.variables);

      if (bodyChanged) {
        await this.createVersion(
          id,
          updatedTemplate,
          input.change_description || 'Template updated'
        );
      }

      await this.cacheTemplate(updatedTemplate);
      return updatedTemplate;
    } finally {
      client.release();
    }
  }

  async remove(id: string): Promise<void> {
    const client = await this.server.pg.pool.connect();
    
    try {
      const result = await client.query('DELETE FROM templates WHERE id = $1', [id]);
      
      if (result.rowCount === 0) {
        throw new Error('Template not found');
      }

      await this.invalidateCache(id);
    } finally {
      client.release();
    }
  }

  async renderTemplate(id: string, variables: Record<string, any>): Promise<{ subject: string; body: string }> {
    const template = await this.findOne(id);

    if (!template.is_active) {
      throw new Error('Template is not active');
    }

    try {
      const subjectTemplate = Handlebars.compile(template.subject);
      const bodyTemplate = Handlebars.compile(template.body);

      const subject = subjectTemplate(variables);
      const body = bodyTemplate(variables);

      return { subject, body };
    } catch (error: any) {
      throw new Error(`Failed to render template: ${error.message}`);
    }
  }

  async getVersions(id: string): Promise<TemplateVersion[]> {
    const client = await this.server.pg.pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM template_versions WHERE template_id = $1 ORDER BY version DESC',
        [id]
      );

      return result.rows.map(v => ({
        ...v,
        variables: JSON.parse(v.variables),
      }));
    } finally {
      client.release();
    }
  }

  async getVersion(templateId: string, versionNumber: number): Promise<TemplateVersion> {
    const client = await this.server.pg.pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM template_versions WHERE template_id = $1 AND version = $2',
        [templateId, versionNumber]
      );

      if (result.rows.length === 0) {
        throw new Error('Template version not found');
      }

      const version = result.rows[0];
      version.variables = JSON.parse(version.variables);
      return version;
    } finally {
      client.release();
    }
  }

  async revertToVersion(templateId: string, versionNumber: number): Promise<Template> {
    const template = await this.findOne(templateId);
    const version = await this.getVersion(templateId, versionNumber);
    const client = await this.server.pg.pool.connect();

    try {
      const result = await client.query(
        `UPDATE templates 
         SET subject = $1, body = $2, variables = $3, version = version + 1, updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [version.subject, version.body, JSON.stringify(version.variables), templateId]
      );

      const updatedTemplate = result.rows[0];
      updatedTemplate.variables = JSON.parse(updatedTemplate.variables);

      await this.createVersion(
        templateId,
        updatedTemplate,
        `Reverted to version ${versionNumber}`
      );

      await this.cacheTemplate(updatedTemplate);
      return updatedTemplate;
    } finally {
      client.release();
    }
  }

  private async createVersion(
    templateId: string,
    template: Template,
    changeDescription: string,
  ): Promise<void> {
    const client = await this.server.pg.pool.connect();
    
    try {
      await client.query(
        `INSERT INTO template_versions (template_id, version, subject, body, variables, change_description)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          templateId,
          template.version,
          template.subject,
          template.body,
          JSON.stringify(template.variables),
          changeDescription,
        ]
      );
    } finally {
      client.release();
    }
  }

  private extractVariables(template: string): string[] {
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const variables = new Set<string>();
    let match;

    while ((match = variableRegex.exec(template)) !== null) {
      const variable = match[1].trim().split(' ')[0];
      variables.add(variable);
    }

    return Array.from(variables);
  }

  // Cache methods
  private async cacheTemplate(template: Template): Promise<void> {
    const key = `template:${template.id}`;
    await this.server.redis.setex(key, 3600, JSON.stringify(template));
  }

  private async getCachedTemplate(id: string): Promise<Template | null> {
    const key = `template:${id}`;
    const cached = await this.server.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  private async invalidateCache(id: string): Promise<void> {
    await this.server.redis.del(`template:${id}`);
  }
}