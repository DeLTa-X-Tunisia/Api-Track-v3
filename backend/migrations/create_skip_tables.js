const { query } = require('../config/database');

async function migrate() {
  try {
    console.log('Creating skip (passer) tables...');

    // Table for skip causes
    await query(`
      CREATE TABLE IF NOT EXISTS causes_passer (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        libelle VARCHAR(255) NOT NULL,
        description TEXT,
        actif BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by_id INTEGER,
        created_by_name VARCHAR(255),
        updated_by_id INTEGER,
        updated_by_name VARCHAR(255)
      )
    `);
    console.log('✅ causes_passer table created');

    // Table for decisions
    await query(`
      CREATE TABLE IF NOT EXISTS decisions_passer (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        libelle VARCHAR(255) NOT NULL,
        description TEXT,
        actif BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by_id INTEGER,
        created_by_name VARCHAR(255),
        updated_by_id INTEGER,
        updated_by_name VARCHAR(255)
      )
    `);
    console.log('✅ decisions_passer table created');

    // Table for skip history details
    await query(`
      CREATE TABLE IF NOT EXISTS tube_skip_details (
        id SERIAL PRIMARY KEY,
        tube_id INTEGER REFERENCES tubes(id) ON DELETE CASCADE,
        stage VARCHAR(50) NOT NULL,
        history_id INTEGER REFERENCES tube_stage_history(id) ON DELETE CASCADE,
        cause_id INTEGER REFERENCES causes_passer(id),
        cause_code VARCHAR(50),
        cause_libelle VARCHAR(255),
        decision_id INTEGER REFERENCES decisions_passer(id),
        decision_code VARCHAR(50),
        decision_libelle VARCHAR(255),
        reporte BOOLEAN DEFAULT false,
        reporte_commentaire TEXT,
        validator_id INTEGER,
        validator_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ tube_skip_details table created');

    // Insert default causes
    await query(`
      INSERT INTO causes_passer (code, libelle, description) VALUES 
        ('CP001', 'Manque outillage', 'Outillage non disponible ou défaillant'),
        ('CP002', 'Problème équipement', 'Équipement en panne ou en maintenance'),
        ('CP003', 'Attente pièce', 'En attente de pièce ou matière'),
        ('CP004', 'Personnel absent', 'Opérateur ou technicien indisponible'),
        ('CP005', 'Priorité autre', 'Autre priorité de production'),
        ('CP006', 'Défaut détecté', 'Défaut identifié nécessitant analyse'),
        ('CP007', 'Contrôle qualité', 'En attente de validation qualité'),
        ('CP008', 'Autre', 'Autre raison')
      ON CONFLICT (code) DO NOTHING
    `);
    console.log('✅ Default causes inserted');

    // Insert default decisions
    await query(`
      INSERT INTO decisions_passer (code, libelle, description) VALUES 
        ('ALTUMET', 'ALTUMET', 'Décision ALTUMET'),
        ('DANIELI', 'DANIELI', 'Décision DANIELI'),
        ('INTERNE', 'Décision interne', 'Décision prise en interne'),
        ('CLIENT', 'Demande client', 'Suite à demande client'),
        ('QUALITE', 'Service qualité', 'Décision du service qualité'),
        ('PRODUCTION', 'Production', 'Décision de production'),
        ('MAINTENANCE', 'Maintenance', 'En attente maintenance'),
        ('AUTRE', 'Autre', 'Autre décision')
      ON CONFLICT (code) DO NOTHING
    `);
    console.log('✅ Default decisions inserted');

    // Create indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_causes_passer_actif ON causes_passer(actif)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_decisions_passer_actif ON decisions_passer(actif)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_tube_skip_details_tube ON tube_skip_details(tube_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_tube_skip_details_stage ON tube_skip_details(stage)`);
    console.log('✅ Indexes created');

    console.log('\n✅ All skip tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
