const { query } = require('../config/database');

async function addAuditColumns() {
  try {
    console.log('Adding audit columns to repair tables...');
    
    // Add audit columns to defauts table
    await query(`
      ALTER TABLE defauts 
      ADD COLUMN IF NOT EXISTS created_by_id INTEGER,
      ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS updated_by_id INTEGER,
      ADD COLUMN IF NOT EXISTS updated_by_name VARCHAR(255)
    `);
    console.log('✅ Audit columns added to defauts');

    // Add audit columns to causes_defaut table
    await query(`
      ALTER TABLE causes_defaut 
      ADD COLUMN IF NOT EXISTS created_by_id INTEGER,
      ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS updated_by_id INTEGER,
      ADD COLUMN IF NOT EXISTS updated_by_name VARCHAR(255)
    `);
    console.log('✅ Audit columns added to causes_defaut');

    // Add audit columns to responsabilites table
    await query(`
      ALTER TABLE responsabilites 
      ADD COLUMN IF NOT EXISTS created_by_id INTEGER,
      ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS updated_by_id INTEGER,
      ADD COLUMN IF NOT EXISTS updated_by_name VARCHAR(255)
    `);
    console.log('✅ Audit columns added to responsabilites');

    // Create history table for tracking changes
    await query(`
      CREATE TABLE IF NOT EXISTS parametres_history (
        id SERIAL PRIMARY KEY,
        table_name VARCHAR(50) NOT NULL,
        record_id INTEGER NOT NULL,
        action VARCHAR(20) NOT NULL,
        old_values JSONB,
        new_values JSONB,
        changed_by_id INTEGER,
        changed_by_name VARCHAR(255),
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ parametres_history table created');

    // Create index for faster history lookups
    await query(`CREATE INDEX IF NOT EXISTS idx_parametres_history_table ON parametres_history(table_name, record_id)`);
    console.log('✅ Index created');

    console.log('\n✅ All audit columns added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addAuditColumns();
