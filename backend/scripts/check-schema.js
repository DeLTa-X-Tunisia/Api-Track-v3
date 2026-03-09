const { getClient } = require('../config/database');

async function checkSchema() {
  const client = await getClient();
  try {
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'lots' 
      ORDER BY ordinal_position
    `);
    console.log('📋 Structure de la table lots:');
    result.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
  } finally {
    client.release();
    process.exit(0);
  }
}

checkSchema();
