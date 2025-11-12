import { FastifyInstance } from 'fastify';
import { Redis } from 'ioredis';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
 declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      id: string;
      email: string;
    };
  }
 }

export interface PaginationMeta {
  total: number;
  limit: number;
  page: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message: string;
  meta?: PaginationMeta;
}

export const TemplateType = {
  EMAIL: 'email',
  PUSH: 'push',
} as const;
export type TemplateType = 'email' | 'push';

export interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: TemplateType;
  language: string;
  variables: string[];
  is_active: boolean;
  version: number;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface TemplateVersion {
  id: string;
  template_id: string;
  version: number;
  subject: string;
  body: string;
  variables: string[];
  change_description?: string;
  created_by?: string;
  created_at: Date;
}

export interface CreateTemplateInput {
  name: string;
  subject: string;
  body: string;
  type: TemplateType;
  language?: string;
  variables?: string[];
  description?: string;
  is_active?: boolean;
}

export interface UpdateTemplateInput {
  subject?: string;
  body?: string;
  language?: string;
  variables?: string[];
  description?: string;
  is_active?: boolean;
  change_description?: string;
}