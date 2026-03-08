const { query } = require('../config/database');

async function addInterruptTracking() {
  try {
    console.log('Adding interrupt tracking fields...');

    // Add interrupt tracking fields to tubes table
    await query(`
      ALTER TABLE tubes 
      ADD COLUMN IF NOT EXISTS interrupt_stage VARCHAR(50) DEFAULT NULL
    `);
    console.log('✅ Added interrupt_stage column to tubes');

    await query(`
      ALTER TABLE tubes 
      ADD COLUMN IF NOT EXISTS interrupt_history_id INTEGER REFERENCES tube_stage_history(id) DEFAULT NULL
    `);
    console.log('✅ Added interrupt_history_id column to tubes');

    await query(`
      ALTER TABLE tubes 
      ADD COLUMN IF NOT EXISTS interrupted_at TIMESTAMP DEFAULT NULL
    `);
    console.log('✅ Added interrupted_at column to tubes');

    // Add resume tracking fields to tube_interrupt_details table
    await query(`
      ALTER TABLE tube_interrupt_details 
      ADD COLUMN IF NOT EXISTS interrupted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);
    console.log('✅ Added interrupted_at column to tube_interrupt_details');

    await query(`
      ALTER TABLE tube_interrupt_details 
      ADD COLUMN IF NOT EXISTS resumed_at TIMESTAMP DEFAULT NULL
    `);
    console.log('✅ Added resumed_at column to tube_interrupt_details');

    await query(`
      ALTER TABLE tube_interrupt_details 
      ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT NULL
    `);
    console.log('✅ Added duration_seconds column to tube_interrupt_details');

    await query(`
      ALTER TABLE tube_interrupt_details 
      ADD COLUMN IF NOT EXISTS resumed_by_id INTEGER REFERENCES users(id) DEFAULT NULL
    `);
    console.log('✅ Added resumed_by_id column to tube_interrupt_details');

    await query(`
      ALTER TABLE tube_interrupt_details 
      ADD COLUMN IF NOT EXISTS resumed_by_name VARCHAR(255) DEFAULT NULL
    `);
    console.log('✅ Added resumed_by_name column to tube_interrupt_details');

    // Create index for better query performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_tubes_interrupt_stage ON tubes(interrupt_stage)
    `);
    console.log('✅ Created index on interrupt_stage');

    console.log('✅ All interrupt tracking fields added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding interrupt tracking fields:', error);
    process.exit(1);
  }
}

addInterruptTracking();
