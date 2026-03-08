const { query } = require('../config/database');

async function updateDefautsComplete() {
  try {
    console.log('🔄 Mise à jour complète des défauts...\n');

    // ==========================================
    // DÉFAUTS CONTRÔLE VISUEL (CV)
    // ==========================================
    const defautsCV = [
      // Défauts de soudure - Contrôle Visuel
      { code: 'CV001', libelle: 'Caniveaux', description: 'Gorge en bordure du cordon de soudure par fusion du métal de base' },
      { code: 'CV002', libelle: 'Morsure', description: 'Entaille en bordure de soudure causée par un mauvais réglage' },
      { code: 'CV003', libelle: 'Manque de fusion', description: 'Absence de liaison entre le métal déposé et le métal de base' },
      { code: 'CV004', libelle: 'Manque de pénétration', description: 'Défaut de pénétration à la racine de la soudure' },
      { code: 'CV005', libelle: 'Cratère', description: 'Dépression en fin de cordon due à un arrêt brusque' },
      { code: 'CV006', libelle: 'Projections', description: 'Gouttelettes de métal fondu projetées sur le métal de base' },
      { code: 'CV007', libelle: 'Coup d\'arc', description: 'Amorçage accidentel de l\'arc sur le métal de base' },
      { code: 'CV008', libelle: 'Brûlure (Burn through)', description: 'Perforation du métal de base par excès de chaleur' },
      { code: 'CV009', libelle: 'Surépaisseur excessive', description: 'Bourrelet de soudure dépassant les tolérances' },
      { code: 'CV010', libelle: 'Affaissement', description: 'Effondrement du métal fondu par gravité' },
      { code: 'CV011', libelle: 'Collage (Cold lap)', description: 'Recouvrement sans fusion du métal d\'apport' },
      { code: 'CV012', libelle: 'Désalignement', description: 'Décalage entre les bords des pièces assemblées' },
      { code: 'CV013', libelle: 'Déformation angulaire', description: 'Distorsion angulaire après soudage' },
      { code: 'CV014', libelle: 'Retrait', description: 'Diminution de volume lors du refroidissement' },
      { code: 'CV015', libelle: 'Aspérité de surface', description: 'Rugosité excessive de la surface du cordon' },
      { code: 'CV016', libelle: 'Irrégularité du cordon', description: 'Largeur ou hauteur non uniforme du cordon' },
      { code: 'CV017', libelle: 'Rochage', description: 'Oxydation superficielle avec aspect rugueux' },
      { code: 'CV018', libelle: 'Soufflure débouchante', description: 'Cavité gazeuse visible en surface' },
      { code: 'CV019', libelle: 'Excès de convexité', description: 'Convexité du cordon dépassant les normes' },
      { code: 'CV020', libelle: 'Excès de concavité', description: 'Concavité du cordon dépassant les normes' },

      // Défauts de surface - Contrôle Visuel
      { code: 'CV021', libelle: 'Rayure', description: 'Marque linéaire sur la surface du tube' },
      { code: 'CV022', libelle: 'Coup', description: 'Marque d\'impact sur la surface' },
      { code: 'CV023', libelle: 'Pliure', description: 'Déformation plastique localisée' },
      { code: 'CV024', libelle: 'Laminage défectueux', description: 'Défaut issu du processus de laminage' },
      { code: 'CV025', libelle: 'Calamine', description: 'Couche d\'oxydes adhérente à la surface' },
      { code: 'CV026', libelle: 'Corrosion superficielle', description: 'Oxydation visible en surface' },
      { code: 'CV027', libelle: 'Bavure', description: 'Excès de métal sur les bords' },
      { code: 'CV028', libelle: 'Écaille', description: 'Décollement superficiel du métal' },
      { code: 'CV029', libelle: 'Piqûre', description: 'Petite cavité de corrosion localisée' },
      { code: 'CV030', libelle: 'Marque de rouleau', description: 'Empreinte des rouleaux de formage' },

      // Défauts géométriques - Contrôle Visuel
      { code: 'CV031', libelle: 'Ovalisation', description: 'Section non parfaitement circulaire' },
      { code: 'CV032', libelle: 'Flambage', description: 'Déformation par instabilité élastique' },
      { code: 'CV033', libelle: 'Cintrage défectueux', description: 'Rayon de courbure non conforme' },
      { code: 'CV034', libelle: 'Vrillage', description: 'Torsion longitudinale du tube' },
      { code: 'CV035', libelle: 'Défaut de rectitude', description: 'Écart par rapport à l\'axe théorique' },
    ];

    // ==========================================
    // DÉFAUTS NDT (Contrôle Non Destructif)
    // ==========================================
    const defautsNDT = [
      // Défauts internes - Radiographie/Ultrasons
      { code: 'NDT001', libelle: 'Porosité dispersée', description: 'Multiples petites cavités gazeuses réparties' },
      { code: 'NDT002', libelle: 'Porosité alignée', description: 'Cavités gazeuses alignées le long du cordon' },
      { code: 'NDT003', libelle: 'Porosité vermiculaire', description: 'Porosités en forme de vers' },
      { code: 'NDT004', libelle: 'Nid de porosité', description: 'Concentration localisée de porosités' },
      { code: 'NDT005', libelle: 'Soufflure sphérique', description: 'Grande cavité gazeuse sphérique isolée' },
      { code: 'NDT006', libelle: 'Soufflure allongée', description: 'Cavité gazeuse de forme allongée' },
      { code: 'NDT007', libelle: 'Inclusion de laitier', description: 'Résidus de flux emprisonnés dans la soudure' },
      { code: 'NDT008', libelle: 'Inclusion de tungstène', description: 'Fragment d\'électrode tungstène dans la soudure' },
      { code: 'NDT009', libelle: 'Inclusion d\'oxyde', description: 'Oxydes métalliques emprisonnés' },
      { code: 'NDT010', libelle: 'Inclusion métallique', description: 'Corps métallique étranger dans la soudure' },

      // Fissures - Radiographie/Ultrasons
      { code: 'NDT011', libelle: 'Fissure longitudinale', description: 'Fissure parallèle à l\'axe de la soudure' },
      { code: 'NDT012', libelle: 'Fissure transversale', description: 'Fissure perpendiculaire à l\'axe de la soudure' },
      { code: 'NDT013', libelle: 'Fissure de cratère', description: 'Fissure rayonnante dans le cratère final' },
      { code: 'NDT014', libelle: 'Fissure à chaud', description: 'Fissure de solidification à haute température' },
      { code: 'NDT015', libelle: 'Fissure à froid', description: 'Fissure due à l\'hydrogène ou contraintes résiduelles' },
      { code: 'NDT016', libelle: 'Fissure de racine', description: 'Fissure à la racine de la soudure' },
      { code: 'NDT017', libelle: 'Fissure de ZAT', description: 'Fissure dans la Zone Affectée Thermiquement' },
      { code: 'NDT018', libelle: 'Microfissure', description: 'Fissure de très petite dimension' },

      // Manques de fusion/pénétration - Radiographie/Ultrasons
      { code: 'NDT019', libelle: 'Manque de fusion latéral', description: 'Défaut de liaison sur les flancs du chanfrein' },
      { code: 'NDT020', libelle: 'Manque de fusion inter-passes', description: 'Absence de fusion entre passes successives' },
      { code: 'NDT021', libelle: 'Manque de pénétration total', description: 'Absence complète de pénétration en racine' },
      { code: 'NDT022', libelle: 'Manque de pénétration partiel', description: 'Pénétration insuffisante en racine' },
      { code: 'NDT023', libelle: 'Effondrement de racine', description: 'Excès de pénétration avec effondrement' },
      { code: 'NDT024', libelle: 'Racine concave', description: 'Défaut de remplissage en racine' },

      // Défauts géométriques internes - Ultrasons
      { code: 'NDT025', libelle: 'Collure (Lamination)', description: 'Défaut de laminage dans le métal de base' },
      { code: 'NDT026', libelle: 'Dédoublure', description: 'Séparation interne du métal en couches' },
      { code: 'NDT027', libelle: 'Décohésion', description: 'Perte de continuité métallurgique' },
      { code: 'NDT028', libelle: 'Ségrégation', description: 'Répartition non uniforme des constituants' },

      // Défauts spécifiques soudure SAW
      { code: 'NDT029', libelle: 'Morsure interne', description: 'Caniveau côté intérieur du tube' },
      { code: 'NDT030', libelle: 'Défaut de chevauchement', description: 'Mauvais raccordement ID/OD SAW' },
      { code: 'NDT031', libelle: 'Excès de pénétration interne', description: 'Pénétration excessive côté ID' },
      { code: 'NDT032', libelle: 'Retassure', description: 'Cavité de solidification par retrait' },
      { code: 'NDT033', libelle: 'Tapure', description: 'Fissure de liquation' },
      { code: 'NDT034', libelle: 'Défaut de reprise', description: 'Discontinuité à la zone de reprise' },
      { code: 'NDT035', libelle: 'Inclusion de cuivre', description: 'Contamination par le support cuivre' },

      // Défauts détectés par contrôle dimensionnel
      { code: 'NDT036', libelle: 'Épaisseur insuffisante', description: 'Épaisseur de paroi inférieure à la tolérance' },
      { code: 'NDT037', libelle: 'Épaisseur excessive', description: 'Épaisseur de paroi supérieure à la tolérance' },
      { code: 'NDT038', libelle: 'Excentricité', description: 'Décalage du centre de la paroi' },
      { code: 'NDT039', libelle: 'Diamètre hors tolérance', description: 'Diamètre extérieur ou intérieur non conforme' },
      { code: 'NDT040', libelle: 'Longueur hors tolérance', description: 'Longueur du tube non conforme' },
    ];

    // ==========================================
    // DÉFAUTS ADDITIONNELS SPÉCIFIQUES
    // ==========================================
    const defautsAdditionnels = [
      // Défauts hydrotest
      { code: 'HYD001', libelle: 'Fuite détectée', description: 'Fuite constatée lors de l\'épreuve hydraulique' },
      { code: 'HYD002', libelle: 'Déformation plastique', description: 'Déformation permanente sous pression' },
      { code: 'HYD003', libelle: 'Éclatement', description: 'Rupture sous pression d\'épreuve' },

      // Défauts chanfrein
      { code: 'CHF001', libelle: 'Angle chanfrein incorrect', description: 'Angle du chanfrein hors tolérance' },
      { code: 'CHF002', libelle: 'Talon insuffisant', description: 'Hauteur du talon trop faible' },
      { code: 'CHF003', libelle: 'Bavure chanfrein', description: 'Bavure sur le bord chanfreiné' },
      { code: 'CHF004', libelle: 'Ovalisation extrémité', description: 'Déformation de l\'extrémité lors du chanfreinage' },

      // Défauts macro
      { code: 'MAC001', libelle: 'Structure non conforme', description: 'Structure métallurgique anormale' },
      { code: 'MAC002', libelle: 'Pénétration insuffisante macro', description: 'Pénétration insuffisante visible sur éprouvette' },
      { code: 'MAC003', libelle: 'Porosité macro', description: 'Porosité visible sur coupe macro' },
      { code: 'MAC004', libelle: 'Fissure macro', description: 'Fissure détectée sur examen macro' },
      { code: 'MAC005', libelle: 'Inclusion macro', description: 'Inclusion visible sur coupe macro' },
    ];

    // Combiner tous les défauts
    const tousDefauts = [...defautsCV, ...defautsNDT, ...defautsAdditionnels];

    console.log(`📋 Insertion de ${tousDefauts.length} défauts...\n`);

    let inserted = 0;
    let updated = 0;
    let errors = 0;

    for (const defaut of tousDefauts) {
      try {
        // Vérifier si le défaut existe déjà
        const existing = await query('SELECT id FROM defauts WHERE code = $1', [defaut.code]);
        
        if (existing.rows.length > 0) {
          // Mettre à jour le défaut existant
          await query(
            `UPDATE defauts SET libelle = $1, description = $2, actif = TRUE, updated_at = CURRENT_TIMESTAMP WHERE code = $3`,
            [defaut.libelle, defaut.description, defaut.code]
          );
          updated++;
        } else {
          // Insérer le nouveau défaut
          await query(
            `INSERT INTO defauts (code, libelle, description, actif) VALUES ($1, $2, $3, TRUE)`,
            [defaut.code, defaut.libelle, defaut.description]
          );
          inserted++;
        }
      } catch (err) {
        console.error(`❌ Erreur pour ${defaut.code}: ${err.message}`);
        errors++;
      }
    }

    // Désactiver les anciens défauts qui ne sont plus dans la liste
    const oldDefaults = ['DEF001', 'DEF002', 'DEF003', 'DEF004', 'DEF005', 'DEF006', 'DEF007', 'DEF008'];
    const newCodes = tousDefauts.map(d => d.code);
    
    for (const oldCode of oldDefaults) {
      if (!newCodes.includes(oldCode)) {
        await query('UPDATE defauts SET actif = FALSE WHERE code = $1', [oldCode]);
        console.log(`🔄 Ancien défaut ${oldCode} désactivé`);
      }
    }

    console.log('\n========================================');
    console.log(`✅ Nouveaux défauts insérés: ${inserted}`);
    console.log(`🔄 Défauts mis à jour: ${updated}`);
    if (errors > 0) console.log(`❌ Erreurs: ${errors}`);
    console.log('========================================\n');

    // Afficher un résumé par catégorie
    console.log('📊 Résumé par catégorie:');
    console.log(`   - Contrôle Visuel (CV): ${defautsCV.length} défauts`);
    console.log(`   - NDT (NDT): ${defautsNDT.length} défauts`);
    console.log(`   - Additionnels (HYD/CHF/MAC): ${defautsAdditionnels.length} défauts`);
    console.log(`   - Total: ${tousDefauts.length} défauts\n`);

    console.log('✅ Migration des défauts terminée avec succès!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration échouée:', error);
    process.exit(1);
  }
}

updateDefautsComplete();
