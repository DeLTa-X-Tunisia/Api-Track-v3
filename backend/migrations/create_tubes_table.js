const { query } = require('../config/database');

async function createTubesTable() {
  try {
    console.log('Creating tubes table with 12-step pipeline...');
    
    await query(`
      CREATE TABLE IF NOT EXISTS tubes (
        id SERIAL PRIMARY KEY,
        numero VARCHAR(100) NOT NULL UNIQUE,
        lot_id INTEGER REFERENCES lots(id) ON DELETE SET NULL,
        bobine_id INTEGER REFERENCES bobines(id) ON DELETE SET NULL,
        diametre_pouce DECIMAL(10,2) NOT NULL,
        diametre_mm DECIMAL(10,2) NOT NULL,
        longueur DECIMAL(10,2) NOT NULL,
        statut VARCHAR(50) DEFAULT 'En attente',
        notes TEXT,
        created_by_user_id INTEGER REFERENCES users(id),
        created_by_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Pipeline Stage 1: Formage
        formage_validee BOOLEAN DEFAULT FALSE,
        formage_validator_id INTEGER REFERENCES users(id),
        formage_validator_name VARCHAR(255),
        formage_validated_at TIMESTAMP,
        
        -- Pipeline Stage 2: Pointage (GMAW)
        pointage_validee BOOLEAN DEFAULT FALSE,
        pointage_validator_id INTEGER REFERENCES users(id),
        pointage_validator_name VARCHAR(255),
        pointage_validated_at TIMESTAMP,
        
        -- Pipeline Stage 3: CV Pointage
        cv_pointage_validee BOOLEAN DEFAULT FALSE,
        cv_pointage_validator_id INTEGER REFERENCES users(id),
        cv_pointage_validator_name VARCHAR(255),
        cv_pointage_validated_at TIMESTAMP,
        
        -- Pipeline Stage 4: SAW ID/OD OFFLINE
        saw_validee BOOLEAN DEFAULT FALSE,
        saw_validator_id INTEGER REFERENCES users(id),
        saw_validator_name VARCHAR(255),
        saw_validated_at TIMESTAMP,
        
        -- Pipeline Stage 5: CV Cordon
        cv_cordon_validee BOOLEAN DEFAULT FALSE,
        cv_cordon_validator_id INTEGER REFERENCES users(id),
        cv_cordon_validator_name VARCHAR(255),
        cv_cordon_validated_at TIMESTAMP,
        
        -- Pipeline Stage 6: Macro
        macro_validee BOOLEAN DEFAULT FALSE,
        macro_validator_id INTEGER REFERENCES users(id),
        macro_validator_name VARCHAR(255),
        macro_validated_at TIMESTAMP,
        
        -- Pipeline Stage 7: Chanfrein
        chanfrein_validee BOOLEAN DEFAULT FALSE,
        chanfrein_validator_id INTEGER REFERENCES users(id),
        chanfrein_validator_name VARCHAR(255),
        chanfrein_validated_at TIMESTAMP,
        
        -- Pipeline Stage 8: Hydrotest
        hydrotest_validee BOOLEAN DEFAULT FALSE,
        hydrotest_validator_id INTEGER REFERENCES users(id),
        hydrotest_validator_name VARCHAR(255),
        hydrotest_validated_at TIMESTAMP,
        
        -- Pipeline Stage 9: CV Fuite
        cv_fuite_validee BOOLEAN DEFAULT FALSE,
        cv_fuite_validator_id INTEGER REFERENCES users(id),
        cv_fuite_validator_name VARCHAR(255),
        cv_fuite_validated_at TIMESTAMP,
        
        -- Pipeline Stage 10: UT
        ut_validee BOOLEAN DEFAULT FALSE,
        ut_validator_id INTEGER REFERENCES users(id),
        ut_validator_name VARCHAR(255),
        ut_validated_at TIMESTAMP,
        
        -- Pipeline Stage 11: Radio Scopie
        radio_validee BOOLEAN DEFAULT FALSE,
        radio_validator_id INTEGER REFERENCES users(id),
        radio_validator_name VARCHAR(255),
        radio_validated_at TIMESTAMP,
        
        -- Pipeline Stage 12: Contrôle dimensionnel
        controle_dim_validee BOOLEAN DEFAULT FALSE,
        controle_dim_validator_id INTEGER REFERENCES users(id),
        controle_dim_validator_name VARCHAR(255),
        controle_dim_validated_at TIMESTAMP
      )
    `);
    
    console.log('✅ Tubes table created successfully!');
    
    // Create index for better performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_tubes_lot_id ON tubes(lot_id);
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_tubes_bobine_id ON tubes(bobine_id);
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_tubes_statut ON tubes(statut);
    `);
    
    console.log('✅ Indexes created successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating tubes table:', error);
    process.exit(1);
  }
}

createTubesTable();
