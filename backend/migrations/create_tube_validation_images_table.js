const { query } = require('../config/database');

async function createTubeValidationImagesTable() {
  try {
    console.log('Creating tube_validation_images table...');
    
    await query(`
      CREATE TABLE IF NOT EXISTS tube_validation_images (
        id SERIAL PRIMARY KEY,
        tube_id INTEGER REFERENCES tubes(id) ON DELETE CASCADE,
        stage VARCHAR(50) NOT NULL,
        image_path VARCHAR(500) NOT NULL,
        original_name VARCHAR(255),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        uploaded_by_id INTEGER REFERENCES users(id),
        uploaded_by_name VARCHAR(255)
      )
    `);
    
    console.log('✅ tube_validation_images table created successfully!');
    
    // Create indexes for better performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_tube_validation_images_tube_id 
      ON tube_validation_images(tube_id)
    `);
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_tube_validation_images_stage 
      ON tube_validation_images(tube_id, stage)
    `);
    
    console.log('✅ Indexes created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating tube_validation_images table:', error);
  } finally {
    process.exit(0);
  }
}

createTubeValidationImagesTable();
