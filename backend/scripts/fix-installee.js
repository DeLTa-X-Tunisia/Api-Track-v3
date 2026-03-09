const { getClient } = require('../config/database');

// Fonction pour générer un délai aléatoire entre 30 et 120 minutes
function getRandomDelay() {
  return 30 + Math.floor(Math.random() * 91);
}

async function fixInstalleeValidation() {
  const client = await getClient();
  
  try {
    console.log('🔄 Correction de la validation "Bobine installée"...\n');
    
    // 1. Vérifier si la colonne installee_validated_at existe
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'lots' AND column_name = 'installee_validated_at'
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log('📝 Ajout de la colonne installee_validated_at...');
      await client.query(`
        ALTER TABLE lots 
        ADD COLUMN installee_validated_at TIMESTAMP
      `);
      console.log('✅ Colonne ajoutée\n');
    } else {
      console.log('✅ Colonne installee_validated_at existe déjà\n');
    }
    
    // 2. Récupérer tous les lots qui ont le statut "Terminé" et une date de réception
    const lots = await client.query(`
      SELECT l.id, l.numero, l.recue_validated_at, l.recue_validator_id, l.recue_validator_name, 
             l.installee_validated_at, l.statut, b.numero as bobine
      FROM lots l
      LEFT JOIN bobines b ON l.bobine_id = b.id
      WHERE l.statut = 'Terminé' AND l.recue_validated_at IS NOT NULL
      ORDER BY CAST(l.numero AS INTEGER)
    `);
    
    console.log(`📦 Lots "Terminé" à corriger: ${lots.rows.length}\n`);
    
    let updated = 0;
    
    for (const lot of lots.rows) {
      // Calculer la date d'installation (30-120 min après réception)
      const recueDate = new Date(lot.recue_validated_at);
      const delayMinutes = getRandomDelay();
      const installeeDate = new Date(recueDate.getTime() + delayMinutes * 60000);
      
      // Mettre à jour le lot
      await client.query(`
        UPDATE lots SET
          installee_validee = true,
          installee_validated_at = $1,
          installee_validator_id = $2,
          installee_validator_name = $3
        WHERE id = $4
      `, [
        installeeDate.toISOString(),
        lot.recue_validator_id,
        lot.recue_validator_name,
        lot.id
      ]);
      
      const recueStr = recueDate.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
      const installeeStr = installeeDate.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
      console.log(`✅ Lot ${lot.numero} | ${lot.bobine} | Reçu: ${recueStr} → Installé: ${installeeStr} (+${delayMinutes} min)`);
      updated++;
    }
    
    console.log(`\n📊 Résumé: ${updated} lots mis à jour`);
    
    // Afficher le résultat final
    const result = await client.query(`
      SELECT l.numero, b.numero as bobine, 
             l.demandee_validated_at, l.recue_validated_at, l.installee_validated_at,
             l.statut, l.created_by_name
      FROM lots l
      LEFT JOIN bobines b ON l.bobine_id = b.id
      WHERE l.numero IN ('31', '32', '33', '34', '35', '36', '37')
      ORDER BY CAST(l.numero AS INTEGER)
    `);
    
    console.log('\n📋 État final des lots:');
    console.log('─'.repeat(110));
    result.rows.forEach((l, i) => {
      const demande = l.demandee_validated_at ? new Date(l.demandee_validated_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '❌';
      const recu = l.recue_validated_at ? new Date(l.recue_validated_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '❌';
      const installe = l.installee_validated_at ? new Date(l.installee_validated_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '❌';
      console.log(`${i+1}. Lot ${l.numero} | ${l.bobine} | Demandé: ${demande} | Reçu: ${recu} | Installé: ${installe} | ${l.statut}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

fixInstalleeValidation();
