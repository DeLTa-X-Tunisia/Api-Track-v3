const { getClient } = require('../config/database');

async function updateBobineStatus() {
  const client = await getClient();
  
  try {
    console.log('🔄 Mise à jour des statuts des bobines...\n');
    
    // Mettre toutes les bobines en 'epuisee' (format attendu par le frontend) sauf 74/3429201
    const updated1 = await client.query(
      "UPDATE bobines SET statut = 'epuisee' WHERE numero != '74/3429201'"
    );
    console.log(`✅ ${updated1.rowCount} bobines marquées "Épuisée"`);
    
    // Mettre 74/3429201 en 'en cours' (format attendu par le frontend)
    const updated2 = await client.query(
      "UPDATE bobines SET statut = 'en cours' WHERE numero = '74/3429201'"
    );
    console.log(`✅ Bobine 74/3429201 marquée "En cours"`);
    
    // Afficher le résultat
    const result = await client.query(
      'SELECT numero, statut FROM bobines ORDER BY date_reception'
    );
    
    console.log('\n📋 État des bobines:');
    console.log('─'.repeat(40));
    result.rows.forEach((b, i) => {
      const icon = b.statut === 'en cours' ? '🟢' : '🔴';
      console.log(`${i+1}. ${b.numero} → ${icon} ${b.statut}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

updateBobineStatus();
