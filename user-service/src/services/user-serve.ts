import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { User, CreateUserInput, UpdateUserInput, UpdatePreferencesInput } from '../types';

export class UserService {
  constructor(private server: FastifyInstance) {}

  async create(input: CreateUserInput): Promise<Omit<User, 'password'>> {
    const client = await this.server.pg.pool.connect();
    
    try {
      // Check if user exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [input.email]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('Email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(input.password, 10);

      // Insert user
      const result = await client.query(
        `INSERT INTO users (email, password, full_name, phone_number, push_token)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, push_token, notification_preferences, is_active, 
                   full_name, phone_number, created_at, updated_at`,
        [input.email, hashedPassword, input.full_name, input.phone_number, input.push_token]
      );

      const user = result.rows[0];
      await this.cacheUser(user);
      return user;
    } finally {
      client.release();
    }
  }

  async findAll(page: number, limit: number, search?: string) {
    const offset = (page - 1) * limit;
    const client = await this.server.pg.pool.connect();

    try {
      let query = `
        SELECT id, email, push_token, notification_preferences, is_active, 
               full_name, phone_number, created_at, updated_at
        FROM users
        WHERE 1=1
      `;
      const params: any[] = [];

      if (search) {
        query += ` AND (email ILIKE $${params.length + 1} OR full_name ILIKE $${params.length + 1})`;
        params.push(`%${search}%`);
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const [usersResult, countResult] = await Promise.all([
        client.query(query, params),
        client.query('SELECT COUNT(*) FROM users WHERE 1=1' + (search ? ' AND (email ILIKE $1 OR full_name ILIKE $1)' : ''), 
                    search ? [`%${search}%`] : []),
      ]);

      const total = parseInt(countResult.rows[0].count);
      const total_pages = Math.ceil(total / limit);

      return {
        users: usersResult.rows,
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

  async findOne(id: string): Promise<Omit<User, 'password'>> {
    // Try cache first
    const cached = await this.getCachedUser(id);
    if (cached) return cached;

    const client = await this.server.pg.pool.connect();
    
    try {
      const result = await client.query(
        `SELECT id, email, push_token, notification_preferences, is_active, 
                full_name, phone_number, created_at, updated_at
         FROM users WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = result.rows[0];
      await this.cacheUser(user);
      return user;
    } finally {
      client.release();
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const client = await this.server.pg.pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async update(id: string, input: UpdateUserInput): Promise<Omit<User, 'password'>> {
    const client = await this.server.pg.pool.connect();
    
    try {
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (input.full_name !== undefined) {
        setClauses.push(`full_name = $${paramIndex++}`);
        values.push(input.full_name);
      }
      if (input.phone_number !== undefined) {
        setClauses.push(`phone_number = $${paramIndex++}`);
        values.push(input.phone_number);
      }
      if (input.push_token !== undefined) {
        setClauses.push(`push_token = $${paramIndex++}`);
        values.push(input.push_token);
      }

      setClauses.push(`updated_at = NOW()`);
      values.push(id);

      const result = await client.query(
        `UPDATE users SET ${setClauses.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING id, email, push_token, notification_preferences, is_active, 
                   full_name, phone_number, created_at, updated_at`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = result.rows[0];
      await this.cacheUser(user);
      return user;
    } finally {
      client.release();
    }
  }

  async updatePreferences(id: string, input: UpdatePreferencesInput): Promise<Omit<User, 'password'>> {
    const user = await this.findOne(id);
    const client = await this.server.pg.pool.connect();

    try {
      const updatedPreferences = {
        ...user.notification_preferences,
        ...input,
      };

      const result = await client.query(
        `UPDATE users 
         SET notification_preferences = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, email, push_token, notification_preferences, is_active, 
                   full_name, phone_number, created_at, updated_at`,
        [JSON.stringify(updatedPreferences), id]
      );

      const updatedUser = result.rows[0];
      await this.cacheUser(updatedUser);
      await this.cachePreferences(id, updatedPreferences);
      return updatedUser;
    } finally {
      client.release();
    }
  }

  async getPreferences(id: string) {
    // Try cache first
    const cached = await this.getCachedPreferences(id);
    if (cached) return cached;

    const user = await this.findOne(id);
    await this.cachePreferences(id, user.notification_preferences);
    return user.notification_preferences;
  }

  async remove(id: string): Promise<void> {
    const client = await this.server.pg.pool.connect();
    
    try {
      const result = await client.query('DELETE FROM users WHERE id = $1', [id]);
      
      if (result.rowCount === 0) {
        throw new Error('User not found');
      }

      await this.invalidateCache(id);
    } finally {
      client.release();
    }
  }

  // Cache methods
  private async cacheUser(user: any): Promise<void> {
    const key = `user:${user.id}`;
    await this.server.redis.setex(key, 3600, JSON.stringify(user));
  }

  private async getCachedUser(id: string): Promise<any | null> {
    const key = `user:${id}`;
    const cached = await this.server.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  private async cachePreferences(id: string, preferences: any): Promise<void> {
    const key = `user:${id}:preferences`;
    await this.server.redis.setex(key, 3600, JSON.stringify(preferences));
  }

  private async getCachedPreferences(id: string): Promise<any | null> {
    const key = `user:${id}:preferences`;
    const cached = await this.server.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  private async invalidateCache(id: string): Promise<void> {
    await this.server.redis.del(`user:${id}`);
    await this.server.redis.del(`user:${id}:preferences`);
  }
}