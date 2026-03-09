const { getClient } = require('../config/database');

async function fixBobines() {
  const client = await getClient();
  try {
    console.log('🔄 Correction des dates de toutes les bobines...\n');
    
    // Corrections des dates avec timezone explicite (UTC+1)
    const corrections = [
      { numero: '46/3330302', date_reception: '2025-12-05', created_at: '2025-12-05' },
      { numero: '53/3475606', date_reception: '2025-12-07', created_at: '2025-12-07' },
      { numero: '77/3449001', date_reception: '2025-12-29', created_at: '2025-12-29' },
      { numero: '52/3449101', date_reception: '2026-01-07', created_at: '2026-01-07' },
      { numero: '70/3475610', date_reception: '2026-01-14', created_at: '2026-01-14' },
      { numero: '69/3248802', date_reception: '2026-02-23', created_at: '2026-02-23' },
      { numero: '74/3429201', date_reception: '2026-02-26', created_at: '2026-02-26' },
    ];
    
    for (const bob of corrections) {
      const result = await client.query(`
        UPDATE bobines 
        SET date_reception = $1::date, 
            created_at = $2::timestamp
        WHERE numero = $3
        RETURNING numero
      `, [bob.date_reception, bob.created_at + ' 12:00:00', bob.numero]);
      
      if (result.rows.length > 0) {
        console.log(`✅ ${bob.numero} → ${bob.date_reception}`);
      }
    }
    
    // Display all bobines ordered by date_reception
    const bobines = await client.query(`
      SELECT id, numero, date_reception, created_at 
      FROM bobines 
      ORDER BY date_reception ASC
    `);
    
    console.log('\n📋 Bobines dans l\'ordre (par date de réception):');
    bobines.rows.forEach((b, i) => {
      const dateRec = b.date_reception.toLocaleDateString('fr-FR');
      const dateCrea = b.created_at.toLocaleDateString('fr-FR');
      console.log(`${i+1}. ${b.numero} - Réception: ${dateRec}, Création: ${dateCrea}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

fixBobines();
