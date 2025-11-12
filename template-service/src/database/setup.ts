import { Pool } from 'pg';

export async function setupDatabase(pool: Pool): Promise<void> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Create templates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) UNIQUE NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'email',
        language VARCHAR(10) DEFAULT 'en',
        variables JSONB DEFAULT '[]'::jsonb,
        is_active BOOLEAN DEFAULT true,
        version INTEGER DEFAULT 1,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create template_versions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS template_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        variables JSONB DEFAULT '[]'::jsonb,
        change_description TEXT,
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(template_id, version)
      );
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_templates_name ON templates(name);
      CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(type);
      CREATE INDEX IF NOT EXISTS idx_template_versions_template_id ON template_versions(template_id);
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