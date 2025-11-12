import { FastifyInstance } from 'fastify';
import { Redis } from 'ioredis';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
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

export interface User {
  id: string;
  email: string;
  password: string;
  push_token?: string;
  notification_preferences: {
    email_enabled: boolean;
    push_enabled: boolean;
    marketing_emails: boolean;
    transaction_emails: boolean;
  };
  is_active: boolean;
  full_name?: string;
  phone_number?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserInput {
  email: string;
  password: string;
  full_name?: string;
  phone_number?: string;
  push_token?: string;
}

export interface UpdateUserInput {
  full_name?: string;
  phone_number?: string;
  push_token?: string;
}

export interface UpdatePreferencesInput {
  email_enabled?: boolean;
  push_enabled?: boolean;
  marketing_emails?: boolean;
  transaction_emails?: boolean;
}
