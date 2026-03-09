const { getClient } = require('../config/database');

// Fonction pour générer une heure aléatoire entre 8h et 12h
function getRandomMorningTime() {
  const hour = 8 + Math.floor(Math.random() * 4); // 8, 9, 10, 11
  const minute = Math.floor(Math.random() * 60);
  const second = Math.floor(Math.random() * 60);
  return { hour, minute, second };
}

// Fonction pour ajouter des minutes à une date
function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

// Fonction pour générer un délai aléatoire entre 30 et 120 minutes
function getRandomDelay() {
  return 30 + Math.floor(Math.random() * 91); // 30 à 120
}

async function insertLots() {
  const client = await getClient();
  
  try {
    console.log('🔄 Connexion à la base de données...\n');
    
    // Données des lots à insérer
    const lotsData = [
      { numero: '31', bobine: '46/3330302', dateBase: '2025-12-05', createur: 'Mounir Azizi', statut: 'Terminé' },
      { numero: '32', bobine: '53/3475606', dateBase: '2025-12-07', createur: 'Mounir Azizi', statut: 'Terminé' },
      { numero: '33', bobine: '77/3449001', dateBase: '2025-12-29', createur: 'Mounir Azizi', statut: 'Terminé' },
      { numero: '34', bobine: '52/3449101', dateBase: '2026-01-07', createur: 'Mounir Azizi', statut: 'Terminé' },
      { numero: '35', bobine: '70/3475610', dateBase: '2026-02-18', createur: 'Mounir Azizi', statut: 'Terminé' },
      { numero: '36', bobine: '69/3248802', dateBase: '2026-02-23', createur: 'Mounir Azizi', statut: 'Terminé' },
      { numero: '37', bobine: '74/3429201', dateBase: '2026-03-08', createur: 'Nassim Mzerreg', statut: 'Production' },
    ];
    
    // Récupérer les IDs des utilisateurs
    const users = {};
    const userNames = ['Mounir Azizi', 'Nassim Mzerreg'];
    for (const name of userNames) {
      const [prenom, nom] = name.split(' ');
      const result = await client.query(
        'SELECT id FROM users WHERE prenom = $1 AND nom = $2',
        [prenom, nom]
      );
      if (result.rows.length > 0) {
        users[name] = result.rows[0].id;
        console.log(`👤 ${name}: ID ${users[name]}`);
      }
    }
    
    // Récupérer les IDs des bobines
    const bobines = {};
    for (const lot of lotsData) {
      const result = await client.query(
        'SELECT id FROM bobines WHERE numero = $1',
        [lot.bobine]
      );
      if (result.rows.length > 0) {
        bobines[lot.bobine] = result.rows[0].id;
      } else {
        console.log(`❌ Bobine ${lot.bobine} non trouvée`);
      }
    }
    console.log(`\n📦 Bobines trouvées: ${Object.keys(bobines).length}\n`);
    
    let inserted = 0;
    let updated = 0;
    let errors = 0;
    
    for (const lot of lotsData) {
      try {
        const bobineId = bobines[lot.bobine];
        const userId = users[lot.createur];
        
        if (!bobineId) {
          console.log(`❌ Bobine ${lot.bobine} non trouvée - lot ${lot.numero} ignoré`);
          errors++;
          continue;
        }
        
        if (!userId) {
          console.log(`❌ Utilisateur ${lot.createur} non trouvé - lot ${lot.numero} ignoré`);
          errors++;
          continue;
        }
        
        // Générer les timestamps avec délais réalistes
        const time = getRandomMorningTime();
        const baseDate = new Date(lot.dateBase);
        baseDate.setHours(time.hour, time.minute, time.second);
        
        const dateDemande = new Date(baseDate);
        const dateRecu = addMinutes(dateDemande, getRandomDelay());
        const dateInstalle = addMinutes(dateRecu, getRandomDelay());
        
        // Vérifier si le lot existe déjà
        const existing = await client.query(
          'SELECT id FROM lots WHERE numero = $1',
          [lot.numero]
        );
        
        if (existing.rows.length > 0) {
          // Mettre à jour
          await client.query(`
            UPDATE lots SET
              bobine_id = $1,
              date_demarrage = $2,
              demandee_validee = true,
              demandee_validator_id = $3,
              demandee_validator_name = $4,
              demandee_validated_at = $5,
              recue_validee = true,
              recue_validator_id = $6,
              recue_validator_name = $7,
              recue_validated_at = $8,
              installee_validee = true,
              installee_validator_id = $9,
              installee_validator_name = $10,
              statut = $11,
              created_by_user_id = $12,
              created_by_name = $13,
              created_at = $14
            WHERE numero = $15
          `, [
            bobineId,
            dateDemande.toISOString(),
            userId, lot.createur, dateDemande.toISOString(),
            userId, lot.createur, dateRecu.toISOString(),
            userId, lot.createur,
            lot.statut,
            userId, lot.createur,
            dateDemande.toISOString(),
            lot.numero
          ]);
          updated++;
          console.log(`🔄 Lot ${lot.numero} mis à jour`);
        } else {
          // Insérer
          await client.query(`
            INSERT INTO lots (
              numero, bobine_id, date_demarrage,
              demandee_validee, demandee_validator_id, demandee_validator_name, demandee_validated_at,
              recue_validee, recue_validator_id, recue_validator_name, recue_validated_at,
              installee_validee, installee_validator_id, installee_validator_name,
              statut, created_by_user_id, created_by_name, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          `, [
            lot.numero, bobineId, dateDemande.toISOString(),
            true, userId, lot.createur, dateDemande.toISOString(),
            true, userId, lot.createur, dateRecu.toISOString(),
            true, userId, lot.createur,
            lot.statut, userId, lot.createur, dateDemande.toISOString()
          ]);
          inserted++;
        }
        
        // Afficher les détails
        const formattedDemande = dateDemande.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
        const formattedRecu = dateRecu.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
        const formattedInstalle = dateInstalle.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
        console.log(`✅ Lot ${lot.numero}: ${lot.bobine} | ${formattedDemande} → ${formattedRecu} → ${formattedInstalle} | ${lot.statut}`);
        
      } catch (err) {
        console.log(`❌ Erreur lot ${lot.numero}: ${err.message}`);
        errors++;
      }
    }
    
    console.log(`\n📊 Résumé: ✅ Insérés: ${inserted}, 🔄 Mis à jour: ${updated}, ❌ Erreurs: ${errors}`);
    
    // Afficher les lots dans l'ordre
    const allLots = await client.query(`
      SELECT l.numero, b.numero as bobine, l.demandee_validated_at, l.recue_validated_at, l.statut, l.created_by_name
      FROM lots l
      JOIN bobines b ON l.bobine_id = b.id
      WHERE l.numero IN ('31', '32', '33', '34', '35', '36', '37')
      ORDER BY CAST(l.numero AS INTEGER)
    `);
    
    console.log('\n📋 Lots créés:');
    console.log('─'.repeat(100));
    allLots.rows.forEach((l, i) => {
      const demande = new Date(l.demandee_validated_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
      const recu = new Date(l.recue_validated_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
      console.log(`${i+1}. Lot ${l.numero} | ${l.bobine} | Demandé: ${demande} | Reçu: ${recu} | ${l.statut} | ${l.created_by_name}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

insertLots();
