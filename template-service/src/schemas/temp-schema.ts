import { z } from 'zod';

export const createTemplateSchema = z.object({
  name: z.string(),
  subject: z.string(),
  body: z.string(),
  type: z.enum(['email', 'push']),
  language: z.string().optional().default('en'),
  variables: z.array(z.string()).optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional().default(true),
});

export const updateTemplateSchema = z.object({
  subject: z.string().optional(),
  body: z.string().optional(),
  language: z.string().optional(),
  variables: z.array(z.string()).optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
  change_description: z.string().optional(),
});

export const queryTemplateSchema = z.object({
  page: z.coerce.number().min(1).default(1),  
  limit: z.coerce.number().min(1).default(10),
  search: z.string().optional(),
  type: z.enum(['email', 'push']).optional(),
  language: z.string().optional(),
});

export const renderTemplateSchema = z.object({
  variables: z.record(z.string(), z.any()),
});