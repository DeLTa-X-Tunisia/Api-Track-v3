// Migration: Add created_by_id to bobines table
const { query } = require('./config/database');

const migrate = async () => {
  try {
    console.log('🔄 Running migration: Add created_by_id to bobines...');
    
    await query(`
      ALTER TABLE bobines 
      ADD COLUMN IF NOT EXISTS created_by_id INTEGER REFERENCES users(id)
    `);
    
    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
};

migrate();
