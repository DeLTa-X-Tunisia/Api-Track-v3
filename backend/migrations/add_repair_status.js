const { query } = require('../config/database');

async function addRepairStatus() {
  try {
    console.log('Adding repair status tracking to tubes table...');

    // Add repair_stage to track which stage is under repair
    await query(`
      ALTER TABLE tubes 
      ADD COLUMN IF NOT EXISTS repair_stage VARCHAR(50) DEFAULT NULL
    `);
    console.log('✅ Added repair_stage column');

    // Add repair_history_id to link to the repair history entry
    await query(`
      ALTER TABLE tubes 
      ADD COLUMN IF NOT EXISTS repair_history_id INTEGER REFERENCES tube_stage_history(id) DEFAULT NULL
    `);
    console.log('✅ Added repair_history_id column');

    // Create index for better query performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_tubes_repair_stage ON tubes(repair_stage)
    `);
    console.log('✅ Created index on repair_stage');

    console.log('✅ All repair status columns added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding repair status columns:', error);
    process.exit(1);
  }
}

addRepairStatus();
