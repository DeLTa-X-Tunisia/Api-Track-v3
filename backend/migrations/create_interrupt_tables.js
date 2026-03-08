const { query } = require('../config/database');

async function createInterruptTables() {
  try {
    console.log('Creating interrupt tables...');

    // Create causes_interruption table
    await query(`
      CREATE TABLE IF NOT EXISTS causes_interruption (
        id SERIAL PRIMARY KEY,
        code VARCHAR(20) UNIQUE NOT NULL,
        libelle VARCHAR(255) NOT NULL,
        note TEXT,
        is_autre BOOLEAN DEFAULT FALSE,
        icon VARCHAR(50),
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create tube_interrupt_details table to store interrupt details with multiple causes
    await query(`
      CREATE TABLE IF NOT EXISTS tube_interrupt_details (
        id SERIAL PRIMARY KEY,
        history_id INTEGER REFERENCES tube_stage_history(id) ON DELETE CASCADE,
        tube_id INTEGER REFERENCES tubes(id) ON DELETE CASCADE,
        stage_key VARCHAR(50) NOT NULL,
        responsabilite_id INTEGER,
        responsabilite_libelle VARCHAR(255),
        autre_cause TEXT,
        commentaire TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create junction table for multiple causes per interrupt
    await query(`
      CREATE TABLE IF NOT EXISTS tube_interrupt_causes (
        id SERIAL PRIMARY KEY,
        interrupt_detail_id INTEGER REFERENCES tube_interrupt_details(id) ON DELETE CASCADE,
        cause_id INTEGER,
        cause_libelle VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default causes
    const defaultCauses = [
      { code: 'CI001', libelle: 'Manque de fictif', icon: 'Package' },
      { code: 'CI002', libelle: 'Pas de bobine', icon: 'Circle' },
      { code: 'CI003', libelle: 'Panne machine', icon: 'AlertTriangle' },
      { code: 'CI004', libelle: 'Paramètre soudure', icon: 'Settings' },
      { code: 'CI005', libelle: 'Attente de décision', icon: 'Clock' },
      { code: 'CI006', libelle: 'Pas de place pour stockage', icon: 'Archive' },
      { code: 'CI999', libelle: 'Autre', icon: 'MoreHorizontal', is_autre: true },
    ];

    for (const cause of defaultCauses) {
      await query(`
        INSERT INTO causes_interruption (code, libelle, icon, is_autre)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (code) DO NOTHING
      `, [cause.code, cause.libelle, cause.icon, cause.is_autre || false]);
    }

    console.log('✅ Interrupt tables created successfully');
    console.log('   - causes_interruption (7 default causes)');
    console.log('   - tube_interrupt_details');
    console.log('   - tube_interrupt_causes');
    
  } catch (error) {
    console.error('❌ Error creating interrupt tables:', error);
    throw error;
  }
}

createInterruptTables()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
