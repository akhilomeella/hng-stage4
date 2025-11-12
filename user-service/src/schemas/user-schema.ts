import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().optional(),
  phone_number: z.string().optional(),
  push_token: z.string().optional(),
});

export const updateUserSchema = z.object({
  full_name: z.string().optional(),
  phone_number: z.string().optional(),
  push_token: z.string().optional(),
});

export const updatePreferencesSchema = z.object({
  email_enabled: z.boolean().optional(),
  push_enabled: z.boolean().optional(),
  marketing_emails: z.boolean().optional(),
  transaction_emails: z.boolean().optional(),
});

export const queryUserSchema = z.object({
 page: z.coerce.number().min(1).default(1),  
  limit: z.coerce.number().min(1).default(10),
  search: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});