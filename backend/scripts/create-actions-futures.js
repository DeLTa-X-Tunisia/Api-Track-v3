const { query } = require('../config/database');

async function createActionsFuturesTable() {
  try {
    console.log('Creating actions_futures table...');
    
    // Create the table
    await query(`
      CREATE TABLE IF NOT EXISTS actions_futures (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        libelle VARCHAR(255) NOT NULL,
        description TEXT,
        actif BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by_id INTEGER,
        created_by_name VARCHAR(255),
        updated_by_id INTEGER,
        updated_by_name VARCHAR(255)
      )
    `);
    console.log('✅ actions_futures table created');

    // Insert default values
    const defaultActions = [
      { code: 'ACT001', libelle: 'Soudure de pointage à réparer avant la scie' },
      { code: 'ACT002', libelle: 'Réglage des paramètres' },
      { code: 'ACT003', libelle: 'Formage à vérifier et régler' },
      { code: 'ACT004', libelle: 'Nettoyage et vérification du système et des filtres de flux' },
      { code: 'ACT005', libelle: 'En cours d\'investigation' },
    ];

    for (const action of defaultActions) {
      try {
        await query(
          `INSERT INTO actions_futures (code, libelle) VALUES ($1, $2)
           ON CONFLICT (code) DO NOTHING`,
          [action.code, action.libelle]
        );
        console.log(`✅ Inserted action: ${action.code} - ${action.libelle}`);
      } catch (err) {
        if (err.code === '23505') {
          console.log(`⏭️ Action ${action.code} already exists, skipping`);
        } else {
          throw err;
        }
      }
    }

    console.log('\n✅ All actions_futures inserted successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createActionsFuturesTable();
