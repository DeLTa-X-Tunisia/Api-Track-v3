const { query } = require('../config/database');

async function createTubeStageHistoryTable() {
  try {
    console.log('Creating tube_stage_history table...');
    
    await query(`
      CREATE TABLE IF NOT EXISTS tube_stage_history (
        id SERIAL PRIMARY KEY,
        tube_id INTEGER REFERENCES tubes(id) ON DELETE CASCADE,
        stage VARCHAR(50) NOT NULL,
        action VARCHAR(50) NOT NULL,
        comment TEXT,
        
        -- Repair details (for repair actions)
        defaut VARCHAR(255),
        cause VARCHAR(255),
        responsabilite VARCHAR(100),
        action_future TEXT,
        
        -- Validation details
        validator_id INTEGER REFERENCES users(id),
        validator_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ tube_stage_history table created successfully!');
    
    // Create indexes for better performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_tube_stage_history_tube_id 
      ON tube_stage_history(tube_id)
    `);
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_tube_stage_history_stage 
      ON tube_stage_history(tube_id, stage)
    `);
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_tube_stage_history_action 
      ON tube_stage_history(action)
    `);
    
    console.log('✅ Indexes created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating tube_stage_history table:', error);
  } finally {
    process.exit(0);
  }
}

createTubeStageHistoryTable();
