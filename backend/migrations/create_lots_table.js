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
    console.log('Running migration: Create lots table...');
    
    // Create lots table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lots (
        id SERIAL PRIMARY KEY,
        numero VARCHAR(50) UNIQUE NOT NULL,
        bobine_id INTEGER REFERENCES bobines(id) ON DELETE SET NULL,
        date_demarrage TIMESTAMP NOT NULL,
        created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_by_name VARCHAR(200),
        statut VARCHAR(50) DEFAULT 'En attente',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created lots table');
    
    // Create index on numero for faster lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_lots_numero ON lots(numero)
    `);
    console.log('✅ Created index on numero');
    
    // Create index on bobine_id
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_lots_bobine_id ON lots(bobine_id)
    `);
    console.log('✅ Created index on bobine_id');
    
    // Create index on statut
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_lots_statut ON lots(statut)
    `);
    console.log('✅ Created index on statut');
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error.message);
  } finally {
    await pool.end();
  }
}

migrate();
