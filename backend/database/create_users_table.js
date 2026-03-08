const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: '2012704',
  host: 'localhost',
  port: 5432,
  database: 'apitrack'
});

const sql = `
-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    matricule VARCHAR(20) NOT NULL UNIQUE,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'observateur_limite',
    code_acces VARCHAR(6) NOT NULL,
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_users_matricule ON users(matricule);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_actif ON users(actif);
`;

async function createTable() {
  try {
    await pool.query(sql);
    console.log('✅ Users table created successfully!');
  } catch (error) {
    console.error('❌ Error creating table:', error.message);
  } finally {
    await pool.end();
  }
}

createTable();
