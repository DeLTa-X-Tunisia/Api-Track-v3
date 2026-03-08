const { query } = require('../config/database');

async function migrate() {
  try {
    console.log('Adding deleted_at column to tube_stage_history table...');
    
    // Add deleted_at column for soft delete
    await query(`
      ALTER TABLE tube_stage_history 
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL
    `);
    
    // Add deleted_by_id for audit
    await query(`
      ALTER TABLE tube_stage_history 
      ADD COLUMN IF NOT EXISTS deleted_by_id INTEGER DEFAULT NULL
    `);
    
    // Add deleted_by_name for audit
    await query(`
      ALTER TABLE tube_stage_history 
      ADD COLUMN IF NOT EXISTS deleted_by_name VARCHAR(255) DEFAULT NULL
    `);
    
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
