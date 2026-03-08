const { query } = require('../config/database');

async function addCrossWelding() {
  try {
    console.log('Adding cross welding fields to tubes table...');
    
    // Add is_cross_welding boolean field
    await query(`
      ALTER TABLE tubes 
      ADD COLUMN IF NOT EXISTS is_cross_welding BOOLEAN DEFAULT FALSE
    `);
    console.log('✅ Added is_cross_welding column');
    
    // Add lot2_id for the second lot in cross welding
    await query(`
      ALTER TABLE tubes 
      ADD COLUMN IF NOT EXISTS lot2_id INTEGER REFERENCES lots(id) ON DELETE SET NULL
    `);
    console.log('✅ Added lot2_id column');
    
    // Create index on is_cross_welding for faster filtering
    await query(`
      CREATE INDEX IF NOT EXISTS idx_tubes_is_cross_welding ON tubes(is_cross_welding)
    `);
    console.log('✅ Created index on is_cross_welding');
    
    // Create index on lot2_id
    await query(`
      CREATE INDEX IF NOT EXISTS idx_tubes_lot2_id ON tubes(lot2_id)
    `);
    console.log('✅ Created index on lot2_id');
    
    console.log('✅ Cross welding migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    throw error;
  }
}

// Run migration if executed directly
if (require.main === module) {
  addCrossWelding()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = addCrossWelding;
