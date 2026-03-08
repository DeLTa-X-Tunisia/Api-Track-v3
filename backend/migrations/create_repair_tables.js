const { query } = require('../config/database');

async function createRepairTables() {
  try {
    console.log('Creating repair-related tables...');
    
    // Table for defect types (Défauts)
    await query(`
      CREATE TABLE IF NOT EXISTS defauts (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        libelle VARCHAR(255) NOT NULL,
        description TEXT,
        actif BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ defauts table created');

    // Table for defect causes (Causes de défaut)
    await query(`
      CREATE TABLE IF NOT EXISTS causes_defaut (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        libelle VARCHAR(255) NOT NULL,
        description TEXT,
        actif BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ causes_defaut table created');

    // Table for responsibilities (Responsabilités)
    await query(`
      CREATE TABLE IF NOT EXISTS responsabilites (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        libelle VARCHAR(255) NOT NULL,
        description TEXT,
        actif BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ responsabilites table created');

    // Table for repairs (linked to tube_stage_history)
    await query(`
      CREATE TABLE IF NOT EXISTS tube_reparations (
        id SERIAL PRIMARY KEY,
        tube_id INTEGER REFERENCES tubes(id) ON DELETE CASCADE,
        stage VARCHAR(50) NOT NULL,
        history_id INTEGER REFERENCES tube_stage_history(id) ON DELETE CASCADE,
        defaut_id INTEGER REFERENCES defauts(id),
        defaut_code VARCHAR(50),
        defaut_libelle VARCHAR(255),
        cause_id INTEGER REFERENCES causes_defaut(id),
        cause_code VARCHAR(50),
        cause_libelle VARCHAR(255),
        responsabilite_id INTEGER REFERENCES responsabilites(id),
        responsabilite_code VARCHAR(50),
        responsabilite_libelle VARCHAR(255),
        reparation_a_faire TEXT,
        action_future TEXT,
        commentaire TEXT,
        validator_id INTEGER,
        validator_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ tube_reparations table created');

    // Table for repair images
    await query(`
      CREATE TABLE IF NOT EXISTS tube_reparation_images (
        id SERIAL PRIMARY KEY,
        reparation_id INTEGER REFERENCES tube_reparations(id) ON DELETE CASCADE,
        tube_id INTEGER REFERENCES tubes(id) ON DELETE CASCADE,
        stage VARCHAR(50) NOT NULL,
        image_path VARCHAR(500) NOT NULL,
        original_name VARCHAR(255),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        uploaded_by_id INTEGER,
        uploaded_by_name VARCHAR(255)
      )
    `);
    console.log('✅ tube_reparation_images table created');

    // Insert default defauts
    await query(`
      INSERT INTO defauts (code, libelle, description) VALUES 
        ('DEF001', 'Défaut de soudure', 'Défaut détecté sur la zone de soudure'),
        ('DEF002', 'Porosité', 'Porosité dans le métal'),
        ('DEF003', 'Fissure', 'Fissure détectée'),
        ('DEF004', 'Inclusion', 'Inclusion de corps étrangers'),
        ('DEF005', 'Déformation', 'Déformation géométrique'),
        ('DEF006', 'Corrosion', 'Traces de corrosion'),
        ('DEF007', 'Défaut dimensionnel', 'Non-conformité dimensionnelle'),
        ('DEF008', 'Défaut de surface', 'Défaut visible en surface')
      ON CONFLICT (code) DO NOTHING
    `);
    console.log('✅ Default defauts inserted');

    // Insert default causes
    await query(`
      INSERT INTO causes_defaut (code, libelle, description) VALUES 
        ('CAU001', 'Paramètres machine', 'Réglages machine incorrects'),
        ('CAU002', 'Matériau défectueux', 'Problème avec le matériau source'),
        ('CAU003', 'Erreur opérateur', 'Erreur humaine pendant l opération'),
        ('CAU004', 'Usure équipement', 'Usure des outils ou équipements'),
        ('CAU005', 'Contamination', 'Contamination du matériau ou process'),
        ('CAU006', 'Conditions ambiantes', 'Température, humidité non conformes'),
        ('CAU007', 'Défaut process', 'Processus de fabrication inadapté'),
        ('CAU008', 'Maintenance insuffisante', 'Maintenance préventive insuffisante')
      ON CONFLICT (code) DO NOTHING
    `);
    console.log('✅ Default causes inserted');

    // Insert default responsabilites
    await query(`
      INSERT INTO responsabilites (code, libelle, description) VALUES 
        ('ALTUMET', 'ALTUMET', 'Responsabilité interne ALTUMET'),
        ('DANIELI', 'DANIELI', 'Responsabilité fournisseur DANIELI'),
        ('FOURNISSEUR', 'Fournisseur matière', 'Responsabilité du fournisseur de matière première'),
        ('OPERATEUR', 'Opérateur', 'Responsabilité opérateur'),
        ('MAINTENANCE', 'Maintenance', 'Responsabilité service maintenance'),
        ('QUALITE', 'Qualité', 'Responsabilité service qualité'),
        ('AUTRE', 'Autre', 'Autre responsabilité')
      ON CONFLICT (code) DO NOTHING
    `);
    console.log('✅ Default responsabilites inserted');

    // Create indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_tube_reparations_tube ON tube_reparations(tube_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_tube_reparations_stage ON tube_reparations(stage)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_tube_reparations_history ON tube_reparations(history_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_tube_reparation_images_reparation ON tube_reparation_images(reparation_id)`);
    console.log('✅ Indexes created');

    console.log('\n✅ All repair tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

createRepairTables();
