/**
 * Script to insert bobines data
 * Run with: node scripts/insert-bobines.js
 */

const { query, getClient } = require('../config/database');

const bobinesData = [
  { numero: '46/3330302', grade: 'X52', nuance: 'API 5L', epaisseur: 12, largeur: 1500, poids: 31840, fournisseur: 'SEVERSTAL', date_reception: '2025-12-05', created_by: 'Mounir Azizi', created_at: '2025-12-05' },
  { numero: '53/3475606', grade: 'X52', nuance: 'API 5L', epaisseur: 12, largeur: 1500, poids: 31600, fournisseur: 'SEVERSTAL', date_reception: '2025-12-07', created_by: 'Mounir Azizi', created_at: '2025-12-07' },
  { numero: '77/3449001', grade: 'X52', nuance: 'API 5L', epaisseur: 12, largeur: 1500, poids: 30020, fournisseur: 'SEVERSTAL', date_reception: '2025-12-29', created_by: 'Mounir Azizi', created_at: '2025-12-29' },
  { numero: '52/3449101', grade: 'X52', nuance: 'API 5L', epaisseur: 12, largeur: 1500, poids: 31340, fournisseur: 'SEVERSTAL', date_reception: '2026-01-07', created_by: 'Mounir Azizi', created_at: '2026-01-07' },
  { numero: '70/3475610', grade: 'X52', nuance: 'API 5L', epaisseur: 12, largeur: 1500, poids: 31700, fournisseur: 'SEVERSTAL', date_reception: '2025-01-14', created_by: 'Mounir Azizi', created_at: '2025-01-14' },
  { numero: '69/3248802', grade: 'X52', nuance: 'API 5L', epaisseur: 12, largeur: 1500, poids: 31860, fournisseur: 'SEVERSTAL', date_reception: '2026-02-23', created_by: 'Mounir Azizi', created_at: '2026-02-23' },
  { numero: '74/3429201', grade: 'X52', nuance: 'API 5L', epaisseur: 12, largeur: 1500, poids: 30040, fournisseur: 'SEVERSTAL', date_reception: '2026-02-26', created_by: 'Nassim Mzerreg', created_at: '2026-02-26' },
];

async function insertBobines() {
  const { client, release } = await getClient();
  
  try {
    console.log('🔄 Connexion à la base de données...');
    
    // Get or create grade X52
    let gradeResult = await client.query("SELECT id FROM grades WHERE UPPER(code) = 'X52'");
    let gradeId = gradeResult.rows[0]?.id;
    
    if (!gradeId) {
      console.log('📝 Création du grade X52...');
      const insertGrade = await client.query(
        "INSERT INTO grades (code, description) VALUES ('X52', 'Grade API 5L X52') RETURNING id"
      );
      gradeId = insertGrade.rows[0].id;
    }
    console.log(`✅ Grade X52: ID ${gradeId}`);
    
    // Get or create nuance API 5L (linked to the grade)
    let nuanceResult = await client.query("SELECT id FROM nuances WHERE (UPPER(code) = 'API 5L' OR UPPER(code) = 'API5L') AND grade_id = $1", [gradeId]);
    let nuanceId = nuanceResult.rows[0]?.id;
    
    if (!nuanceId) {
      // Try without grade_id
      nuanceResult = await client.query("SELECT id FROM nuances WHERE UPPER(code) = 'API 5L' OR UPPER(code) = 'API5L'");
      nuanceId = nuanceResult.rows[0]?.id;
    }
    
    if (!nuanceId) {
      console.log('📝 Création de la nuance API 5L...');
      const insertNuance = await client.query(
        "INSERT INTO nuances (code, description, grade_id) VALUES ('API 5L', 'Norme API 5L pour tubes de canalisation', $1) RETURNING id",
        [gradeId]
      );
      nuanceId = insertNuance.rows[0].id;
    }
    console.log(`✅ Nuance API 5L: ID ${nuanceId}`);
    
    // Get or create fournisseur SEVERSTAL
    let fournisseurResult = await client.query("SELECT id FROM fournisseurs WHERE UPPER(nom) = 'SEVERSTAL'");
    let fournisseurId = fournisseurResult.rows[0]?.id;
    
    if (!fournisseurId) {
      console.log('📝 Création du fournisseur SEVERSTAL...');
      const insertFournisseur = await client.query(
        "INSERT INTO fournisseurs (nom, pays, contact) VALUES ('SEVERSTAL', 'Russie', 'contact@severstal.com') RETURNING id"
      );
      fournisseurId = insertFournisseur.rows[0].id;
    }
    console.log(`✅ Fournisseur SEVERSTAL: ID ${fournisseurId}`);
    
    // Get user IDs
    const users = {};
    const userNames = ['Mounir Azizi', 'Nassim Mzerreg'];
    
    for (const name of userNames) {
      const nameParts = name.split(' ');
      const userResult = await client.query(
        "SELECT id FROM users WHERE LOWER(prenom) = LOWER($1) AND LOWER(nom) = LOWER($2)",
        [nameParts[0], nameParts[1]]
      );
      users[name] = userResult.rows[0]?.id || null;
      console.log(`👤 Utilisateur ${name}: ID ${users[name] || 'Non trouvé'}`);
    }
    
    console.log('\n🔄 Insertion des bobines...\n');
    
    let inserted = 0;
    let updated = 0;
    let errors = 0;
    
    for (const bobine of bobinesData) {
      try {
        // Check if bobine already exists
        const existingBobine = await client.query(
          "SELECT id FROM bobines WHERE numero = $1",
          [bobine.numero]
        );
        
        const userId = users[bobine.created_by];
        
        if (existingBobine.rows.length > 0) {
          // Update existing bobine
          await client.query(`
            UPDATE bobines SET
              grade_id = $1,
              nuance_id = $2,
              epaisseur = $3,
              largeur = $4,
              poids = $5,
              fournisseur_id = $6,
              date_reception = $7,
              created_by_user_id = $8,
              created_by_name = $9,
              updated_at = CURRENT_TIMESTAMP
            WHERE numero = $10
          `, [
            gradeId,
            nuanceId,
            bobine.epaisseur,
            bobine.largeur,
            bobine.poids,
            fournisseurId,
            bobine.date_reception,
            userId,
            bobine.created_by,
            bobine.numero
          ]);
          console.log(`🔄 Mise à jour: ${bobine.numero}`);
          updated++;
        } else {
          // Insert new bobine
          await client.query(`
            INSERT INTO bobines (numero, grade_id, nuance_id, epaisseur, largeur, poids, fournisseur_id, date_reception, statut, created_by_user_id, created_by_name, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Disponible', $9, $10, $11)
          `, [
            bobine.numero,
            gradeId,
            nuanceId,
            bobine.epaisseur,
            bobine.largeur,
            bobine.poids,
            fournisseurId,
            bobine.date_reception,
            userId,
            bobine.created_by,
            bobine.created_at
          ]);
          console.log(`✅ Insertion: ${bobine.numero}`);
          inserted++;
        }
      } catch (err) {
        console.error(`❌ Erreur pour ${bobine.numero}:`, err.message);
        errors++;
      }
    }
    
    console.log('\n═══════════════════════════════════════');
    console.log(`📊 Résumé:`);
    console.log(`   ✅ Insérées: ${inserted}`);
    console.log(`   🔄 Mises à jour: ${updated}`);
    console.log(`   ❌ Erreurs: ${errors}`);
    console.log('═══════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  } finally {
    release();
    console.log('🔌 Connexion fermée.');
    process.exit(0);
  }
}

insertBobines();
