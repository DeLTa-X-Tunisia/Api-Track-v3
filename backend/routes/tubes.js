const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { emitToAll, SOCKET_EVENTS } = require('../config/socket');

// Configure multer for validation image uploads
const uploadDir = path.join(__dirname, '..', 'uploads', 'tubes');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// Diameter options (8" to 72")
const DIAMETER_OPTIONS = [
  { pouce: 8, mm: 203.2 },
  { pouce: 10, mm: 254 },
  { pouce: 12, mm: 304.8 },
  { pouce: 14, mm: 355.6 },
  { pouce: 16, mm: 406.4 },
  { pouce: 18, mm: 457.2 },
  { pouce: 20, mm: 508 },
  { pouce: 22, mm: 558.8 },
  { pouce: 24, mm: 609.6 },
  { pouce: 26, mm: 660.4 },
  { pouce: 28, mm: 711.2 },
  { pouce: 30, mm: 762 },
  { pouce: 32, mm: 812.8 },
  { pouce: 34, mm: 863.6 },
  { pouce: 36, mm: 914.4 },
  { pouce: 38, mm: 965.2 },
  { pouce: 40, mm: 1016 },
  { pouce: 42, mm: 1066.8 },
  { pouce: 44, mm: 1117.6 },
  { pouce: 46, mm: 1168.4 },
  { pouce: 48, mm: 1219.2 },
  { pouce: 50, mm: 1270 },
  { pouce: 52, mm: 1320.8 },
  { pouce: 54, mm: 1371.6 },
  { pouce: 56, mm: 1422.4 },
  { pouce: 58, mm: 1473.2 },
  { pouce: 60, mm: 1524 },
  { pouce: 64, mm: 1625.6 },
  { pouce: 68, mm: 1727.2 },
  { pouce: 72, mm: 1828.8 },
];

// Pipeline stages definition
const PIPELINE_STAGES = [
  { key: 'formage', label: 'Formage', description: 'Formage du tube spirale' },
  { key: 'pointage', label: 'Pointage (GMAW)', description: 'Pointage par soudure GMAW' },
  { key: 'cv_pointage', label: 'CV Pointage', description: 'Contrôle visuel du pointage' },
  { key: 'saw', label: 'SAW ID/OD', description: 'Soudage à l\'arc submergé intérieur/extérieur' },
  { key: 'cv_cordon', label: 'CV Cordon', description: 'Contrôle visuel du cordon de soudure' },
  { key: 'macro', label: 'Macro', description: 'Contrôle macro du tube' },
  { key: 'chanfrein', label: 'Chanfrein', description: 'Usinage des chanfreins d\'extrémité' },
  { key: 'hydrotest', label: 'Hydrotest', description: 'Épreuve hydrostatique selon API 5L' },
  { key: 'cv_fuite', label: 'CV Fuite', description: 'Contrôle visuel des fuites' },
  { key: 'ut', label: 'UT', description: 'Contrôle ultrasonique (Ultrasonic Testing)' },
  { key: 'radio', label: 'Radio Scopie', description: 'Radiographie finale des soudures' },
  { key: 'controle_dim', label: 'Contrôle Dim.', description: 'Vérification des dimensions et tolérances' },
];

// Helper function to get tube with all history and images
async function getTubeWithHistory(tubeId) {
  // Get tube with joins
  const fullTube = await query(
    `SELECT t.*, 
            l.numero as lot_numero,
            b.numero as bobine_numero,
            b.epaisseur as bobine_epaisseur,
            b.largeur as bobine_largeur,
            g.code as grade_code,
            g.description as grade_nom,
            n.code as nuance_code,
            n.description as nuance_nom
     FROM tubes t
     LEFT JOIN lots l ON t.lot_id = l.id
     LEFT JOIN bobines b ON t.bobine_id = b.id
     LEFT JOIN grades g ON b.grade_id = g.id
     LEFT JOIN nuances n ON b.nuance_id = n.id
     WHERE t.id = $1`,
    [tubeId]
  );

  if (fullTube.rows.length === 0) {
    return null;
  }

  // Get validation images for the tube
  const imagesResult = await query(
    `SELECT * FROM tube_validation_images WHERE tube_id = $1 ORDER BY stage, uploaded_at`,
    [tubeId]
  );

  // Get stage history for the tube (excluding soft-deleted entries)
  const historyResult = await query(
    `SELECT * FROM tube_stage_history WHERE tube_id = $1 AND deleted_at IS NULL ORDER BY stage, created_at DESC`,
    [tubeId]
  );

  // Get repairs with their images
  const reparationsResult = await query(
    `SELECT r.*, 
            COALESCE(
              json_agg(
                CASE WHEN ri.id IS NOT NULL THEN
                  json_build_object(
                    'id', ri.id,
                    'image_path', ri.image_path,
                    'original_name', ri.original_name,
                    'uploaded_at', ri.uploaded_at
                  )
                ELSE NULL END
              ) FILTER (WHERE ri.id IS NOT NULL),
              '[]'
            ) as images
     FROM tube_reparations r
     LEFT JOIN tube_reparation_images ri ON r.id = ri.reparation_id
     WHERE r.tube_id = $1
     GROUP BY r.id
     ORDER BY r.stage, r.created_at DESC`,
    [tubeId]
  );

  return {
    ...fullTube.rows[0],
    validation_images: imagesResult.rows,
    stage_history: historyResult.rows,
    reparations: reparationsResult.rows
  };
}

// GET diameter options
router.get('/diameter-options', (req, res) => {
  res.json(DIAMETER_OPTIONS);
});

// GET pipeline stages
router.get('/pipeline-stages', (req, res) => {
  res.json(PIPELINE_STAGES);
});

// GET all tubes with pagination and filters
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', statut = '', lot_id = '', bobine_id = '', saw_date_from = '', saw_date_to = '', is_cross_welding = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    // Recherche multi-champs: numéro tube, lot ou bobine
    if (search) {
      whereClause += ` AND (t.numero ILIKE $${paramIndex} OR l.numero ILIKE $${paramIndex} OR b.numero ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (statut) {
      whereClause += ` AND t.statut = $${paramIndex}`;
      params.push(statut);
      paramIndex++;
    }

    if (lot_id) {
      whereClause += ` AND t.lot_id = $${paramIndex}`;
      params.push(lot_id);
      paramIndex++;
    }

    // Filtre par bobine
    if (bobine_id) {
      whereClause += ` AND t.bobine_id = $${paramIndex}`;
      params.push(bobine_id);
      paramIndex++;
    }

    // SAW date range filter
    if (saw_date_from) {
      whereClause += ` AND t.saw_validated_at >= $${paramIndex}`;
      params.push(saw_date_from);
      paramIndex++;
    }

    if (saw_date_to) {
      whereClause += ` AND t.saw_validated_at <= $${paramIndex}::date + interval '1 day'`;
      params.push(saw_date_to);
      paramIndex++;
    }

    // Cross Welding filter
    if (is_cross_welding !== '') {
      whereClause += ` AND t.is_cross_welding = $${paramIndex}`;
      params.push(is_cross_welding === 'true');
      paramIndex++;
    }

    // Count total (with JOINs for search on lot/bobine)
    const countResult = await query(
      `SELECT COUNT(*) FROM tubes t
       LEFT JOIN lots l ON t.lot_id = l.id
       LEFT JOIN bobines b ON t.bobine_id = b.id
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get tubes with related data (including lot2)
    const result = await query(
      `SELECT t.*, 
              l.numero as lot_numero,
              l2.numero as lot2_numero,
              b.numero as bobine_numero,
              b.epaisseur as bobine_epaisseur,
              b.largeur as bobine_largeur,
              g.code as grade_code,
              g.description as grade_nom,
              n.code as nuance_code,
              n.description as nuance_nom
       FROM tubes t
       LEFT JOIN lots l ON t.lot_id = l.id
       LEFT JOIN lots l2 ON t.lot2_id = l2.id
       LEFT JOIN bobines b ON t.bobine_id = b.id
       LEFT JOIN grades g ON b.grade_id = g.id
       LEFT JOIN nuances n ON b.nuance_id = n.id
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    res.json({
      data: result.rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching tubes:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des tubes' });
  }
});

// GET next tube number
router.get('/next-number', async (req, res) => {
  try {
    const result = await query(
      `SELECT numero FROM tubes ORDER BY id DESC LIMIT 1`
    );
    
    let nextNumber = 1;
    if (result.rows.length > 0) {
      const lastNumero = result.rows[0].numero;
      const match = lastNumero.match(/(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }
    
    res.json({ nextNumber: String(nextNumber), rawNumber: nextNumber });
  } catch (error) {
    console.error('Error getting next tube number:', error);
    res.status(500).json({ error: 'Erreur lors de la génération du numéro' });
  }
});

// GET available lots (only lots in Production status - bobine installed and validated)
// Use ?all=true to get all lots regardless of status (for Cross Welding selection)
router.get('/available-lots', async (req, res) => {
  try {
    const { all } = req.query;
    const statusFilter = all === 'true' ? '' : "WHERE l.statut IN ('Production', 'En production')";
    
    const result = await query(`
      SELECT l.id, l.numero, l.bobine_id, l.statut,
             b.numero as bobine_numero,
             b.epaisseur as bobine_epaisseur,
             b.largeur as bobine_largeur,
             g.code as grade_code,
             g.description as grade_nom,
             n.code as nuance_code,
             n.description as nuance_nom
      FROM lots l
      LEFT JOIN bobines b ON l.bobine_id = b.id
      LEFT JOIN grades g ON b.grade_id = g.id
      LEFT JOIN nuances n ON b.nuance_id = n.id
      ${statusFilter}
      ORDER BY l.numero ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching available lots:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des lots' });
  }
});

// GET single tube with history and images
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const tubeData = await getTubeWithHistory(id);
    
    if (!tubeData) {
      return res.status(404).json({ error: 'Tube non trouvé' });
    }
    
    res.json(tubeData);
  } catch (error) {
    console.error('Error fetching tube:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du tube' });
  }
});

// CREATE tube
router.post('/', async (req, res) => {
  try {
    const { 
      numero,
      lot_id,
      bobine_id,
      diametre_pouce,
      diametre_mm,
      longueur,
      statut = 'En attente',
      notes,
      created_by_user_id,
      created_by_name,
      is_cross_welding = false,
      lot2_id
    } = req.body;

    // Validation
    if (!numero || !diametre_pouce || !longueur) {
      return res.status(400).json({ error: 'Numéro, diamètre et longueur sont obligatoires' });
    }

    // Cross Welding validation
    if (is_cross_welding) {
      if (!lot_id) {
        return res.status(400).json({ error: 'Le Lot 1 est obligatoire pour le Cross Welding' });
      }
      if (!lot2_id) {
        return res.status(400).json({ error: 'Le Lot 2 est obligatoire pour le Cross Welding' });
      }
      if (lot_id === lot2_id) {
        return res.status(400).json({ error: 'Le Lot 2 doit être différent du Lot 1' });
      }
      
      // Check if Lot2 is in production
      const lot2 = await query('SELECT id, statut FROM lots WHERE id = $1', [lot2_id]);
      if (lot2.rows.length === 0) {
        return res.status(400).json({ error: 'Le Lot 2 n\'existe pas' });
      }
      if (lot2.rows[0].statut !== 'En production' && lot2.rows[0].statut !== 'Production') {
        return res.status(400).json({ error: 'Impossible de reprendre la production car le Lot2 n\'est pas prêt. Le lot doit être "En production".' });
      }
    }

    // Check if numero already exists
    const existing = await query('SELECT id FROM tubes WHERE numero = $1', [numero]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Ce numéro de tube existe déjà' });
    }

    const result = await query(
      `INSERT INTO tubes (
        numero, lot_id, bobine_id, diametre_pouce, diametre_mm, 
        longueur, statut, notes, created_by_user_id, created_by_name,
        is_cross_welding, lot2_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
      RETURNING *`,
      [numero, lot_id || null, bobine_id || null, diametre_pouce, diametre_mm, 
       longueur, statut, notes || null, created_by_user_id || null, created_by_name || null,
       is_cross_welding || false, is_cross_welding ? lot2_id : null]
    );

    // If Cross Welding, update lot statuses
    if (is_cross_welding && lot_id && lot2_id) {
      // Update Lot 1 status to "Terminé"
      await query(
        'UPDATE lots SET statut = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['Terminé', lot_id]
      );
      
      // Emit socket event for Lot 1 update
      emitToAll(SOCKET_EVENTS.LOT_UPDATED, { lot: { id: parseInt(lot_id), statut: 'Terminé' } });
    }

    // Get full tube data with relations
    const fullTube = await query(
      `SELECT t.*, 
              l.numero as lot_numero,
              l2.numero as lot2_numero,
              b.numero as bobine_numero,
              b.epaisseur as bobine_epaisseur,
              b.largeur as bobine_largeur,
              g.code as grade_code,
              g.description as grade_nom,
              n.code as nuance_code,
              n.description as nuance_nom
       FROM tubes t
       LEFT JOIN lots l ON t.lot_id = l.id
       LEFT JOIN lots l2 ON t.lot2_id = l2.id
       LEFT JOIN bobines b ON t.bobine_id = b.id
       LEFT JOIN grades g ON b.grade_id = g.id
       LEFT JOIN nuances n ON b.nuance_id = n.id
       WHERE t.id = $1`,
      [result.rows[0].id]
    );

    // Emit socket event
    emitToAll(SOCKET_EVENTS.TUBE_CREATED, { tube: fullTube.rows[0] });

    res.status(201).json(fullTube.rows[0]);
  } catch (error) {
    console.error('Error creating tube:', error);
    res.status(500).json({ error: 'Erreur lors de la création du tube' });
  }
});

// UPDATE tube
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      numero,
      lot_id,
      bobine_id,
      diametre_pouce,
      diametre_mm,
      longueur,
      statut,
      notes
    } = req.body;

    // Check if numero already exists for another tube
    const existing = await query('SELECT id FROM tubes WHERE numero = $1 AND id != $2', [numero, id]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Ce numéro de tube existe déjà' });
    }

    const result = await query(
      `UPDATE tubes SET 
        numero = COALESCE($1, numero),
        lot_id = $2,
        bobine_id = $3,
        diametre_pouce = COALESCE($4, diametre_pouce),
        diametre_mm = COALESCE($5, diametre_mm),
        longueur = COALESCE($6, longueur),
        statut = COALESCE($7, statut),
        notes = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *`,
      [numero, lot_id || null, bobine_id || null, diametre_pouce, diametre_mm, 
       longueur, statut, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tube non trouvé' });
    }

    // Get full tube data with history
    const tubeData = await getTubeWithHistory(id);

    // Emit socket event
    emitToAll(SOCKET_EVENTS.TUBE_UPDATED, { tube: tubeData });

    res.json(tubeData);
  } catch (error) {
    console.error('Error updating tube:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du tube' });
  }
});

// DELETE tube
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query('DELETE FROM tubes WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tube non trouvé' });
    }

    // Emit socket event
    emitToAll(SOCKET_EVENTS.TUBE_DELETED, { tubeId: parseInt(id) });

    res.json({ message: 'Tube supprimé avec succès', tube: result.rows[0] });
  } catch (error) {
    console.error('Error deleting tube:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du tube' });
  }
});

// VALIDATE pipeline stage (supports both JSON and FormData with images)
router.post('/:id/validate/:stage', upload.array('images', 5), async (req, res) => {
  try {
    const { id, stage } = req.params;
    const { validator_id, validator_name, comment } = req.body;
    const uploadedFiles = req.files || [];

    // Validate stage exists
    const validStage = PIPELINE_STAGES.find(s => s.key === stage);
    if (!validStage) {
      return res.status(400).json({ error: 'Étape de pipeline invalide' });
    }

    // Get current tube state
    const currentTube = await query('SELECT * FROM tubes WHERE id = $1', [id]);
    if (currentTube.rows.length === 0) {
      return res.status(404).json({ error: 'Tube non trouvé' });
    }

    const tube = currentTube.rows[0];

    // Check if stage is already validated
    if (tube[`${stage}_validee`]) {
      return res.status(400).json({ error: 'Cette étape est déjà validée' });
    }

    // Check if previous stages are validated (sequential validation)
    const stageIndex = PIPELINE_STAGES.findIndex(s => s.key === stage);
    for (let i = 0; i < stageIndex; i++) {
      const prevStage = PIPELINE_STAGES[i];
      if (!tube[`${prevStage.key}_validee`]) {
        return res.status(400).json({ 
          error: `L'étape "${prevStage.label}" doit être validée avant` 
        });
      }
    }

    // Determine new status
    let newStatus = 'En cours';
    if (stage === 'controle_dim') {
      newStatus = 'Terminé';
    }

    // Update the stage
    await query(
      `UPDATE tubes SET 
        ${stage}_validee = TRUE,
        ${stage}_validator_id = $1,
        ${stage}_validator_name = $2,
        ${stage}_validated_at = CURRENT_TIMESTAMP,
        statut = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4`,
      [validator_id, validator_name, newStatus, id]
    );

    // Save validation images if any
    if (uploadedFiles.length > 0) {
      for (const file of uploadedFiles) {
        await query(
          `INSERT INTO tube_validation_images 
           (tube_id, stage, image_path, original_name, uploaded_by_id, uploaded_by_name)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, stage, `/uploads/tubes/${file.filename}`, file.originalname, validator_id, validator_name]
        );
      }
    }

    // Save history entry
    await query(
      `INSERT INTO tube_stage_history 
       (tube_id, stage, action, comment, validator_id, validator_name)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, stage, 'validate', comment || null, validator_id, validator_name]
    );

    // Get updated tube with history
    const tubeData = await getTubeWithHistory(id);

    // Emit socket event
    emitToAll(SOCKET_EVENTS.TUBE_UPDATED, { tube: tubeData });

    res.json(tubeData);
  } catch (error) {
    console.error('Error validating pipeline stage:', error);
    res.status(500).json({ error: 'Erreur lors de la validation de l\'étape' });
  }
});

// PERFORM ACTION on pipeline stage (repair, skip, NC, interrupt, downgrade, rebut)
router.post('/:id/action/:stage', async (req, res) => {
  try {
    const { id, stage } = req.params;
    const { 
      action, 
      comment, 
      validator_id, 
      validator_name,
      // Repair details
      defaut,
      cause,
      responsabilite,
      action_future,
      // Skip details
      skip_cause_id,
      skip_cause_code,
      skip_cause_libelle,
      skip_decision_id,
      skip_decision_code,
      skip_decision_libelle,
      skip_reporte,
      skip_reporte_commentaire,
      // Interrupt details
      interrupt_causes,
      interrupt_responsabilite_id,
      interrupt_responsabilite_libelle,
      interrupt_commentaire
    } = req.body;

    const validActions = ['repair', 'skip', 'nc', 'interrupt', 'downgrade', 'rebut'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: 'Action invalide' });
    }

    // Validate stage exists
    const validStage = PIPELINE_STAGES.find(s => s.key === stage);
    if (!validStage) {
      return res.status(400).json({ error: 'Étape de pipeline invalide' });
    }

    // Get current tube state
    const currentTube = await query('SELECT * FROM tubes WHERE id = $1', [id]);
    if (currentTube.rows.length === 0) {
      return res.status(404).json({ error: 'Tube non trouvé' });
    }

    // Save history entry with repair details if applicable
    const historyResult = await query(
      `INSERT INTO tube_stage_history 
       (tube_id, stage, action, comment, defaut, cause, responsabilite, action_future, validator_id, validator_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [id, stage, action, comment || null, defaut || null, cause || null, responsabilite || null, action_future || null, validator_id, validator_name]
    );
    const historyId = historyResult.rows[0].id;

    // If skip action, save skip details and mark stage as validated
    if (action === 'skip') {
      await query(
        `INSERT INTO tube_skip_details 
         (tube_id, stage, history_id, cause_id, cause_code, cause_libelle, decision_id, decision_code, decision_libelle, reporte, reporte_commentaire, validator_id, validator_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [id, stage, historyId, skip_cause_id || null, skip_cause_code || null, skip_cause_libelle || null, 
         skip_decision_id || null, skip_decision_code || null, skip_decision_libelle || null, 
         skip_reporte || false, skip_reporte_commentaire || null, validator_id, validator_name]
      );
      
      // Mark the stage as validated so the pipeline can progress to the next stage
      await query(
        `UPDATE tubes SET 
          ${stage}_validee = TRUE,
          ${stage}_validator_id = $1,
          ${stage}_validator_name = $2,
          ${stage}_validated_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3`,
        [validator_id, validator_name, id]
      );
    }

    // Update tube status based on action
    let newStatus = null;
    if (action === 'rebut') {
      newStatus = 'Rebuté';
    } else if (action === 'nc') {
      newStatus = 'Non conforme';
    } else if (action === 'interrupt') {
      newStatus = 'Interrompu';
      
      // Save interrupt tracking data to tubes table
      await query(
        `UPDATE tubes SET 
          interrupt_stage = $1,
          interrupt_history_id = $2,
          interrupted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3`,
        [stage, historyId, id]
      );

      // Save interrupt details
      const interruptDetailResult = await query(
        `INSERT INTO tube_interrupt_details 
         (history_id, tube_id, stage_key, responsabilite_id, responsabilite_libelle, autre_cause, commentaire, interrupted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
         RETURNING id`,
        [historyId, id, stage, interrupt_responsabilite_id || null, interrupt_responsabilite_libelle || null, 
         interrupt_causes?.find(c => c.is_autre)?.cause_libelle || null, interrupt_commentaire || null]
      );
      const interruptDetailId = interruptDetailResult.rows[0].id;

      // Save interrupt causes
      if (interrupt_causes && interrupt_causes.length > 0) {
        for (const cause of interrupt_causes) {
          await query(
            `INSERT INTO tube_interrupt_causes 
             (interrupt_detail_id, cause_id, cause_libelle)
             VALUES ($1, $2, $3)`,
            [interruptDetailId, cause.cause_id || null, cause.cause_libelle || null]
          );
        }
      }
    } else if (action === 'downgrade') {
      newStatus = 'Déclassé';
    }

    if (newStatus) {
      await query(
        `UPDATE tubes SET statut = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [newStatus, id]
      );
    }

    // Get updated tube with history
    const tubeData = await getTubeWithHistory(id);

    // Emit socket event
    emitToAll(SOCKET_EVENTS.TUBE_UPDATED, { tube: tubeData });

    res.json(tubeData);
  } catch (error) {
    console.error('Error performing action on pipeline stage:', error);
    res.status(500).json({ error: 'Erreur lors de l\'action sur l\'étape' });
  }
});

// CANCEL pipeline stage validation
router.post('/:id/cancel-validation/:stage', async (req, res) => {
  try {
    const { id, stage } = req.params;
    const { validator_id, validator_name } = req.body || {};

    // Validate stage exists
    const validStage = PIPELINE_STAGES.find(s => s.key === stage);
    if (!validStage) {
      return res.status(400).json({ error: 'Étape de pipeline invalide' });
    }

    // Get current tube state
    const currentTube = await query('SELECT * FROM tubes WHERE id = $1', [id]);
    if (currentTube.rows.length === 0) {
      return res.status(404).json({ error: 'Tube non trouvé' });
    }

    const tube = currentTube.rows[0];

    // Check if stage is validated
    if (!tube[`${stage}_validee`]) {
      return res.status(400).json({ error: 'Cette étape n\'est pas validée' });
    }

    // Check if subsequent stages are validated (can't cancel if later stages are done)
    const stageIndex = PIPELINE_STAGES.findIndex(s => s.key === stage);
    for (let i = stageIndex + 1; i < PIPELINE_STAGES.length; i++) {
      const nextStage = PIPELINE_STAGES[i];
      if (tube[`${nextStage.key}_validee`]) {
        return res.status(400).json({ 
          error: `Impossible d'annuler: l'étape "${nextStage.label}" est déjà validée` 
        });
      }
    }

    // Determine new status
    let newStatus = 'En cours';
    if (stageIndex === 0) {
      newStatus = 'En attente';
    }

    // Cancel the validation
    await query(
      `UPDATE tubes SET 
        ${stage}_validee = FALSE,
        ${stage}_validator_id = NULL,
        ${stage}_validator_name = NULL,
        ${stage}_validated_at = NULL,
        statut = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2`,
      [newStatus, id]
    );

    // Save history entry for cancellation
    await query(
      `INSERT INTO tube_stage_history 
       (tube_id, stage, action, validator_id, validator_name)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, stage, 'cancel', validator_id || null, validator_name || 'Utilisateur']
    );

    // Get updated tube with history
    const tubeData = await getTubeWithHistory(id);

    // Emit socket event
    emitToAll(SOCKET_EVENTS.TUBE_UPDATED, { tube: tubeData });

    res.json(tubeData);
  } catch (error) {
    console.error('Error canceling pipeline validation:', error);
    res.status(500).json({ error: 'Erreur lors de l\'annulation de la validation' });
  }
});

// DELETE (soft) history entry
router.delete('/:tubeId/history/:historyId', async (req, res) => {
  try {
    const { tubeId, historyId } = req.params;
    const { deleted_by_id, deleted_by_name } = req.body || {};

    // Check if history entry exists and belongs to this tube
    const existing = await query(
      'SELECT * FROM tube_stage_history WHERE id = $1 AND tube_id = $2 AND deleted_at IS NULL',
      [historyId, tubeId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Entrée d\'historique non trouvée' });
    }

    // Soft delete - keep for audit but mark as deleted
    await query(
      `UPDATE tube_stage_history 
       SET deleted_at = CURRENT_TIMESTAMP,
           deleted_by_id = $1,
           deleted_by_name = $2
       WHERE id = $3`,
      [deleted_by_id || null, deleted_by_name || 'Utilisateur', historyId]
    );

    // Get updated tube with history
    const tubeData = await getTubeWithHistory(tubeId);

    // Emit socket event
    emitToAll(SOCKET_EVENTS.TUBE_UPDATED, { tube: tubeData });

    res.json(tubeData);
  } catch (error) {
    console.error('Error deleting history entry:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'entrée' });
  }
});

// SUBMIT REPAIRS with images for a pipeline stage
// images field format: images[0], images[1], etc. corresponding to repairs[0], repairs[1], etc.
router.post('/:id/repairs/:stage', upload.array('images', 25), async (req, res) => {
  try {
    const { id, stage } = req.params;
    const { 
      repairs, // JSON string of repairs array
      validator_id, 
      validator_name 
    } = req.body;
    const uploadedFiles = req.files || [];

    // Validate stage exists
    const validStage = PIPELINE_STAGES.find(s => s.key === stage);
    if (!validStage) {
      return res.status(400).json({ error: 'Étape de pipeline invalide' });
    }

    // Parse repairs array
    let repairsData = [];
    try {
      repairsData = JSON.parse(repairs);
    } catch (e) {
      return res.status(400).json({ error: 'Format des réparations invalide' });
    }

    if (!Array.isArray(repairsData) || repairsData.length === 0) {
      return res.status(400).json({ error: 'Au moins une réparation est requise' });
    }

    // Get current tube
    const currentTube = await query('SELECT * FROM tubes WHERE id = $1', [id]);
    if (currentTube.rows.length === 0) {
      return res.status(404).json({ error: 'Tube non trouvé' });
    }

    // Create history entry for repair action
    const historyResult = await query(
      `INSERT INTO tube_stage_history 
       (tube_id, stage, action, comment, validator_id, validator_name)
       VALUES ($1, $2, 'repair', $3, $4, $5) RETURNING id`,
      [id, stage, `${repairsData.length} réparation(s) enregistrée(s)`, validator_id, validator_name]
    );
    const historyId = historyResult.rows[0].id;

    // Process each repair
    const savedRepairs = [];
    let imageFileIndex = 0;

    for (let i = 0; i < repairsData.length; i++) {
      const repair = repairsData[i];
      
      // Insert repair record
      const repairResult = await query(
        `INSERT INTO tube_reparations 
         (tube_id, stage, history_id, defaut_id, defaut_code, defaut_libelle, 
          cause_id, cause_code, cause_libelle, 
          responsabilite_id, responsabilite_code, responsabilite_libelle,
          reparation_a_faire, action_future, commentaire, validator_id, validator_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         RETURNING id`,
        [
          id, 
          stage, 
          historyId,
          repair.defaut_id || null,
          repair.defaut_code || null,
          repair.defaut_libelle || null,
          repair.cause_id || null,
          repair.cause_code || null,
          repair.cause_libelle || null,
          repair.responsabilite_id || null,
          repair.responsabilite_code || null,
          repair.responsabilite_libelle || null,
          repair.reparation_a_faire || null,
          repair.action_future || null,
          repair.commentaire || null,
          validator_id,
          validator_name
        ]
      );
      const reparationId = repairResult.rows[0].id;

      // Save images for this repair (up to 5 per repair)
      const repairImageCount = repair.image_count || 0;
      for (let j = 0; j < repairImageCount && imageFileIndex < uploadedFiles.length; j++) {
        const file = uploadedFiles[imageFileIndex];
        await query(
          `INSERT INTO tube_reparation_images 
           (reparation_id, tube_id, stage, image_path, original_name, uploaded_by_id, uploaded_by_name)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [reparationId, id, stage, `/uploads/tubes/${file.filename}`, file.originalname, validator_id, validator_name]
        );
        imageFileIndex++;
      }

      savedRepairs.push(reparationId);
    }

    // Update tube status to "En réparation" and track the repair stage
    await query(
      `UPDATE tubes SET 
        statut = 'En réparation',
        repair_stage = $1,
        repair_history_id = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3`,
      [stage, historyId, id]
    );

    // Get updated tube with history and repairs
    const tubeData = await getTubeWithHistory(id);

    // Emit socket event
    emitToAll(SOCKET_EVENTS.TUBE_UPDATED, { tube: tubeData });

    res.json(tubeData);
  } catch (error) {
    console.error('Error submitting repairs:', error);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement des réparations' });
  }
});

// RESOLVE REPAIR - Handle repair completion with different outcomes
// Actions: repair_validated, repair_derogation, rebut, downgrade
router.post('/:id/resolve-repair', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      action, // repair_validated, repair_derogation, rebut, downgrade
      comment,
      validator_id, 
      validator_name 
    } = req.body;

    const validActions = ['repair_validated', 'repair_derogation', 'rebut', 'downgrade'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: 'Action invalide' });
    }

    // Get current tube state
    const currentTube = await query('SELECT * FROM tubes WHERE id = $1', [id]);
    if (currentTube.rows.length === 0) {
      return res.status(404).json({ error: 'Tube non trouvé' });
    }

    const tube = currentTube.rows[0];

    // Check if tube is actually in repair mode
    if (tube.statut !== 'En réparation' || !tube.repair_stage) {
      return res.status(400).json({ error: 'Ce tube n\'est pas en réparation' });
    }

    const stage = tube.repair_stage;

    // Validate stage exists
    const validStage = PIPELINE_STAGES.find(s => s.key === stage);
    if (!validStage) {
      return res.status(400).json({ error: 'Étape de réparation invalide' });
    }

    // Create history entry for the resolution action
    const actionLabels = {
      repair_validated: 'Réparation validée',
      repair_derogation: 'Dérogation acceptée',
      rebut: 'Tube rebuté',
      downgrade: 'Tube déclassé'
    };

    await query(
      `INSERT INTO tube_stage_history 
       (tube_id, stage, action, comment, validator_id, validator_name)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, stage, action, comment || actionLabels[action], validator_id, validator_name]
    );

    // Handle different outcomes
    if (action === 'repair_validated' || action === 'repair_derogation') {
      // Tube goes to next stage - validate current stage and clear repair status
      const stageIndex = PIPELINE_STAGES.findIndex(s => s.key === stage);
      const isLastStage = stageIndex === PIPELINE_STAGES.length - 1;
      const newStatus = isLastStage ? 'Terminé' : 'En cours';

      await query(
        `UPDATE tubes SET 
          ${stage}_validee = TRUE,
          ${stage}_validator_id = $1,
          ${stage}_validator_name = $2,
          ${stage}_validated_at = CURRENT_TIMESTAMP,
          statut = $3,
          repair_stage = NULL,
          repair_history_id = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4`,
        [validator_id, validator_name, newStatus, id]
      );
    } else if (action === 'rebut') {
      // Pipeline ends - tube is rejected
      await query(
        `UPDATE tubes SET 
          statut = 'Rebuté',
          repair_stage = NULL,
          repair_history_id = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1`,
        [id]
      );
    } else if (action === 'downgrade') {
      // Pipeline ends - tube is downgraded
      await query(
        `UPDATE tubes SET 
          statut = 'Déclassé',
          repair_stage = NULL,
          repair_history_id = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1`,
        [id]
      );
    }

    // Get updated tube with history
    const tubeData = await getTubeWithHistory(id);

    // Emit socket event
    emitToAll(SOCKET_EVENTS.TUBE_UPDATED, { tube: tubeData });

    res.json(tubeData);
  } catch (error) {
    console.error('Error resolving repair:', error);
    res.status(500).json({ error: 'Erreur lors de la résolution de la réparation' });
  }
});

// RESUME from interruption - Records resume time and calculates duration
router.post('/:id/resume', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      validator_id, 
      validator_name,
      comment 
    } = req.body;

    // Get current tube state
    const currentTube = await query('SELECT * FROM tubes WHERE id = $1', [id]);
    if (currentTube.rows.length === 0) {
      return res.status(404).json({ error: 'Tube non trouvé' });
    }

    const tube = currentTube.rows[0];

    // Check if tube is actually interrupted
    if (tube.statut !== 'Interrompu' || !tube.interrupt_stage) {
      return res.status(400).json({ error: 'Ce tube n\'est pas interrompu' });
    }

    const stage = tube.interrupt_stage;
    const interruptedAt = tube.interrupted_at;

    // Validate stage exists
    const validStage = PIPELINE_STAGES.find(s => s.key === stage);
    if (!validStage) {
      return res.status(400).json({ error: 'Étape d\'interruption invalide' });
    }

    // Calculate interruption duration in seconds
    const resumedAt = new Date();
    const interruptStart = new Date(interruptedAt);
    const durationSeconds = Math.round((resumedAt - interruptStart) / 1000);

    // Format duration for display (e.g., "2h 15m 30s" or "45m 20s" or "30s")
    const formatDuration = (seconds) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      
      let parts = [];
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0) parts.push(`${minutes}m`);
      if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
      
      return parts.join(' ');
    };

    const durationFormatted = formatDuration(durationSeconds);

    // Create history entry for the resume action with duration info
    const resumeComment = comment 
      ? `Repris après ${durationFormatted} – ${comment}`
      : `Repris après ${durationFormatted}`;

    await query(
      `INSERT INTO tube_stage_history 
       (tube_id, stage, action, comment, validator_id, validator_name)
       VALUES ($1, $2, 'resume', $3, $4, $5)`,
      [id, stage, resumeComment, validator_id, validator_name]
    );

    // Update tube_interrupt_details with resume info (if exists)
    if (tube.interrupt_history_id) {
      await query(
        `UPDATE tube_interrupt_details SET 
          resumed_at = $1,
          duration_seconds = $2,
          resumed_by_id = $3,
          resumed_by_name = $4
        WHERE history_id = $5`,
        [resumedAt, durationSeconds, validator_id, validator_name, tube.interrupt_history_id]
      );
    }

    // Determine new status based on current stage
    const stageIndex = PIPELINE_STAGES.findIndex(s => s.key === stage);
    const newStatus = stageIndex === 0 ? 'En attente' : 'En cours';

    // Clear interrupt tracking from tube
    await query(
      `UPDATE tubes SET 
        statut = $1,
        interrupt_stage = NULL,
        interrupt_history_id = NULL,
        interrupted_at = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2`,
      [newStatus, id]
    );

    // Get updated tube with history
    const tubeData = await getTubeWithHistory(id);

    // Emit socket event
    emitToAll(SOCKET_EVENTS.TUBE_UPDATED, { tube: tubeData });

    res.json(tubeData);
  } catch (error) {
    console.error('Error resuming from interruption:', error);
    res.status(500).json({ error: 'Erreur lors de la reprise' });
  }
});

// POST certify tube (Hydraulique or API 5L) - ends the pipeline
router.post('/:id/certify', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      certification_type, // 'hydraulique' or 'api5l'
      stage_key,
      validator_id, 
      validator_name 
    } = req.body;

    // Validate certification type
    const certifications = {
      hydraulique: { status: 'Certifié Hydraulique', label: 'Hydraulique' },
      api5l: { status: 'Certifié API 5L', label: 'API 5L' },
    };

    const cert = certifications[certification_type];
    if (!cert) {
      return res.status(400).json({ error: 'Type de certification invalide' });
    }

    // Get current tube state
    const currentTube = await query('SELECT * FROM tubes WHERE id = $1', [id]);
    if (currentTube.rows.length === 0) {
      return res.status(404).json({ error: 'Tube non trouvé' });
    }

    const tube = currentTube.rows[0];

    // Check if tube can be certified (must be in "En cours" status)
    if (tube.statut !== 'En cours' && tube.statut !== 'En attente') {
      return res.status(400).json({ 
        error: `Ce tube ne peut pas être certifié (statut actuel: ${tube.statut})` 
      });
    }

    // Validate stage exists and is one of the last 2 stages
    const validStage = PIPELINE_STAGES.find(s => s.key === stage_key);
    if (!validStage) {
      return res.status(400).json({ error: 'Étape invalide' });
    }

    const certificationStages = ['radio', 'controle_dim'];
    if (!certificationStages.includes(stage_key)) {
      return res.status(400).json({ 
        error: 'La certification n\'est disponible que pour les deux derniers stages' 
      });
    }

    // Create history entry for the certification
    const certComment = `Certifié ${cert.label}`;
    const actionType = certification_type === 'hydraulique' ? 'cert_hydraulique' : 'cert_api5l';

    await query(
      `INSERT INTO tube_stage_history 
       (tube_id, stage, action, comment, validator_id, validator_name)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, stage_key, actionType, certComment, validator_id, validator_name]
    );

    // Update tube status to certified and mark all remaining stages as validated
    // This ends the pipeline
    await query(
      `UPDATE tubes SET 
        statut = $1,
        pipeline_completee = TRUE,
        ${stage_key}_validee = TRUE,
        ${stage_key}_validee_at = CURRENT_TIMESTAMP,
        ${stage_key}_validee_par = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3`,
      [cert.status, validator_name, id]
    );

    // Get updated tube with history
    const tubeData = await getTubeWithHistory(id);

    // Emit socket event
    emitToAll(SOCKET_EVENTS.TUBE_UPDATED, { tube: tubeData });

    res.json(tubeData);
  } catch (error) {
    console.error('Error certifying tube:', error);
    res.status(500).json({ error: 'Erreur lors de la certification' });
  }
});

// GET repairs for a tube (optionally filtered by stage)
router.get('/:id/repairs', async (req, res) => {
  try {
    const { id } = req.params;
    const { stage } = req.query;

    let sql = `
      SELECT r.*, 
             COALESCE(
               json_agg(
                 CASE WHEN ri.id IS NOT NULL THEN
                   json_build_object(
                     'id', ri.id,
                     'image_path', ri.image_path,
                     'original_name', ri.original_name,
                     'uploaded_at', ri.uploaded_at
                   )
                 ELSE NULL END
               ) FILTER (WHERE ri.id IS NOT NULL),
               '[]'
             ) as images
      FROM tube_reparations r
      LEFT JOIN tube_reparation_images ri ON r.id = ri.reparation_id
      WHERE r.tube_id = $1
    `;
    const params = [id];

    if (stage) {
      sql += ' AND r.stage = $2';
      params.push(stage);
    }

    sql += ' GROUP BY r.id ORDER BY r.stage, r.created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching repairs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des réparations' });
  }
});

// DELETE a repair entry
router.delete('/:tubeId/repairs/:repairId', async (req, res) => {
  try {
    const { tubeId, repairId } = req.params;
    const { deleted_by_id, deleted_by_name } = req.body || {};

    // Check if repair exists and belongs to this tube
    const existing = await query(
      'SELECT * FROM tube_reparations WHERE id = $1 AND tube_id = $2',
      [repairId, tubeId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Réparation non trouvée' });
    }

    // Delete repair (images will CASCADE delete)
    await query('DELETE FROM tube_reparations WHERE id = $1', [repairId]);

    console.log(`Repair ${repairId} deleted by ${deleted_by_name || 'Unknown'} (ID: ${deleted_by_id})`);

    // Get updated tube with history
    const tubeData = await getTubeWithHistory(tubeId);

    // Emit socket event
    emitToAll(SOCKET_EVENTS.TUBE_UPDATED, { tube: tubeData });

    res.json(tubeData);
  } catch (error) {
    console.error('Error deleting repair:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la réparation' });
  }
});

module.exports = router;
