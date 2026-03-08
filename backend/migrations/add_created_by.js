const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'apitrack',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '2012704',
});

async function migrate() {
  try {
    console.log('Running migration: Add created_by columns to bobines...');
    
    // Add created_by_user_id column
    await pool.query(`
      ALTER TABLE bobines 
      ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
    `);
    console.log('✅ Added created_by_user_id column');
    
    // Add created_by_name column (to preserve name even if user is deleted)
    await pool.query(`
      ALTER TABLE bobines 
      ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(200)
    `);
    console.log('✅ Added created_by_name column');
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error.message);
  } finally {
    await pool.end();
  }
}

migrate();
