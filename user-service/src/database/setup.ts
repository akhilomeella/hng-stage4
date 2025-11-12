import { Pool } from 'pg';

export async function setupDatabase(pool: Pool): Promise<void> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        push_token TEXT,
        notification_preferences JSONB DEFAULT '{"email_enabled": true, "push_enabled": true, "marketing_emails": false, "transaction_emails": true}'::jsonb,
        is_active BOOLEAN DEFAULT true,
        full_name VARCHAR(255),
        phone_number VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create index on email
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    await client.query('COMMIT');
    console.log('✅ Database tables created successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error setting up database:', error);
    throw error;
  } finally {
    client.release();
  }
}