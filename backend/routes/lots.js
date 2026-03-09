const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { emitToAll, SOCKET_EVENTS } = require('../config/socket');

// GET all lots with pagination and filters
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, statut, bobine_id } = req.query;
    const offset = (page - 1) * limit;
    
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`l.numero ILIKE $${paramIndex}`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (statut) {
      whereConditions.push(`l.statut = $${paramIndex}`);
      params.push(statut);
      paramIndex++;
    }

    if (bobine_id) {
      whereConditions.push(`l.bobine_id = $${paramIndex}`);
      params.push(bobine_id);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Count total
    const countResult = await query(
      `SELECT COUNT(*) FROM lots l ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get lots with related data
    const result = await query(
      `SELECT l.*, 
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
       ${whereClause}
       ORDER BY l.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    res.json({
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching lots:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des lots' });
  }
});

// GET next lot number
router.get('/next-number', async (req, res) => {
  try {
    const result = await query(
      `SELECT numero FROM lots ORDER BY id DESC LIMIT 1`
    );
    
    let nextNumber = 1;
    if (result.rows.length > 0) {
      const lastNumero = result.rows[0].numero;
      // Extract number (supports both "LOT-001" format and simple "1" format)
      const match = lastNumero.match(/(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }
    
    // Return simple number format (1, 2, 3, ...)
    res.json({ nextNumber: String(nextNumber), rawNumber: nextNumber });
  } catch (error) {
    console.error('Error getting next lot number:', error);
    res.status(500).json({ error: 'Erreur lors de la génération du numéro' });
  }
});

// GET available bobines (status = Disponible)
router.get('/available-bobines', async (req, res) => {
  try {
    const result = await query(
      `SELECT b.id, b.numero, b.epaisseur, b.largeur, b.poids,
              g.code as grade_code, n.code as nuance_code, f.nom as fournisseur_nom
       FROM bobines b
       LEFT JOIN grades g ON b.grade_id = g.id
       LEFT JOIN nuances n ON b.nuance_id = n.id
       LEFT JOIN fournisseurs f ON b.fournisseur_id = f.id
       WHERE LOWER(b.statut) = 'disponible'
       ORDER BY b.numero ASC`
    );
    
    res.json({ data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Error fetching available bobines:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des bobines disponibles' });
  }
});

// GET single lot by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      `SELECT l.*, 
              b.numero as bobine_numero,
              b.epaisseur as bobine_epaisseur,
              b.largeur as bobine_largeur,
              b.poids as bobine_poids,
              g.code as grade_code,
              g.description as grade_nom,
              n.code as nuance_code,
              n.description as nuance_nom,
              f.nom as fournisseur_nom
       FROM lots l
       LEFT JOIN bobines b ON l.bobine_id = b.id
       LEFT JOIN grades g ON b.grade_id = g.id
       LEFT JOIN nuances n ON b.nuance_id = n.id
       LEFT JOIN fournisseurs f ON b.fournisseur_id = f.id
       WHERE l.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lot non trouvé' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching lot:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du lot' });
  }
});

// POST create new lot
router.post('/', async (req, res) => {
  try {
    const { numero, bobine_id, date_demarrage, notes, created_by_user_id, created_by_name } = req.body;
    
    // Validation
    if (!numero) {
      return res.status(400).json({ error: 'Le numéro du lot est requis' });
    }
    if (!bobine_id) {
      return res.status(400).json({ error: 'Une bobine doit être sélectionnée' });
    }
    if (!date_demarrage) {
      return res.status(400).json({ error: 'La date de démarrage est requise' });
    }
    
    // Check if numero already exists
    const existingLot = await query('SELECT id FROM lots WHERE numero = $1', [numero]);
    if (existingLot.rows.length > 0) {
      return res.status(400).json({ error: 'Ce numéro de lot existe déjà' });
    }
    
    // Check if bobine is available
    const bobineCheck = await query('SELECT statut FROM bobines WHERE id = $1', [bobine_id]);
    if (bobineCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Bobine non trouvée' });
    }
    if (bobineCheck.rows[0].statut.toLowerCase() !== 'disponible') {
      return res.status(400).json({ error: 'Cette bobine n\'est plus disponible' });
    }
    
    // Start transaction
    await query('BEGIN');
    
    try {
      // Create the lot with status "En attente" by default
      const result = await query(
        `INSERT INTO lots (numero, bobine_id, date_demarrage, notes, created_by_user_id, created_by_name, statut)
         VALUES ($1, $2, $3, $4, $5, $6, 'En attente')
         RETURNING *`,
        [numero, bobine_id, date_demarrage, notes || null, created_by_user_id || null, created_by_name || null]
      );
      
      // Update bobine status to 'En cours'
      await query(
        `UPDATE bobines SET statut = 'En cours', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [bobine_id]
      );
      
      await query('COMMIT');
      
      // Get the complete lot data with relations
      const fullLot = await query(
        `SELECT l.*, 
                b.numero as bobine_numero,
                b.epaisseur as bobine_epaisseur,
                b.largeur as bobine_largeur,
                g.code as grade_nom,
                n.code as nuance_nom
         FROM lots l
         LEFT JOIN bobines b ON l.bobine_id = b.id
         LEFT JOIN grades g ON b.grade_id = g.id
         LEFT JOIN nuances n ON b.nuance_id = n.id
         WHERE l.id = $1`,
        [result.rows[0].id]
      );
      
      // Emit socket events
      emitToAll(SOCKET_EVENTS.LOT_CREATED, { lot: fullLot.rows[0] });
      emitToAll(SOCKET_EVENTS.BOBINE_UPDATED, { bobine: { id: bobine_id, statut: 'En cours' } });
      
      res.status(201).json(fullLot.rows[0]);
    } catch (err) {
      await query('ROLLBACK');
      throw err;
    }
  } catch (error) {
    console.error('Error creating lot:', error);
    res.status(500).json({ error: 'Erreur lors de la création du lot' });
  }
});

// PUT update lot
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { numero, date_demarrage, notes, statut } = req.body;
    
    // Check if lot exists
    const existingLot = await query('SELECT * FROM lots WHERE id = $1', [id]);
    if (existingLot.rows.length === 0) {
      return res.status(404).json({ error: 'Lot non trouvé' });
    }
    
    // Check if new numero already exists (if changing)
    if (numero && numero !== existingLot.rows[0].numero) {
      const duplicateCheck = await query('SELECT id FROM lots WHERE numero = $1 AND id != $2', [numero, id]);
      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Ce numéro de lot existe déjà' });
      }
    }
    
    const result = await query(
      `UPDATE lots 
       SET numero = COALESCE($1, numero),
           date_demarrage = COALESCE($2, date_demarrage),
           notes = COALESCE($3, notes),
           statut = COALESCE($4, statut),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [numero, date_demarrage, notes, statut, id]
    );
    
    // Get full lot data
    const fullLot = await query(
      `SELECT l.*, 
              b.numero as bobine_numero,
              b.epaisseur as bobine_epaisseur,
              b.largeur as bobine_largeur,
              g.code as grade_nom,
              n.code as nuance_nom
       FROM lots l
       LEFT JOIN bobines b ON l.bobine_id = b.id
       LEFT JOIN grades g ON b.grade_id = g.id
       LEFT JOIN nuances n ON b.nuance_id = n.id
       WHERE l.id = $1`,
      [id]
    );
    
    // Emit socket event
    emitToAll(SOCKET_EVENTS.LOT_UPDATED, { lot: fullLot.rows[0] });
    
    res.json(fullLot.rows[0]);
  } catch (error) {
    console.error('Error updating lot:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du lot' });
  }
});

// DELETE lot
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get lot info before deletion
    const lot = await query('SELECT * FROM lots WHERE id = $1', [id]);
    if (lot.rows.length === 0) {
      return res.status(404).json({ error: 'Lot non trouvé' });
    }
    
    const lotData = lot.rows[0];
    
    // RULE: Check if lot has any linked tubes - CANNOT DELETE IF TUBES EXIST
    // A lot can only be deleted if it has NO tubes linked (regardless of status)
    const linkedTubes = await query('SELECT COUNT(*) as count FROM tubes WHERE lot_id = $1', [id]);
    const tubeCount = parseInt(linkedTubes.rows[0].count);
    
    if (tubeCount > 0) {
      const statusInfo = lotData.statut ? ` (statut: ${lotData.statut})` : '';
      return res.status(400).json({ 
        error: `Impossible de supprimer ce lot${statusInfo} : ${tubeCount} tube(s) y sont liés en production. Un lot ne peut être supprimé que s'il n'a aucun tube lié.`,
        code: 'LOT_HAS_TUBES',
        tubeCount: tubeCount,
        statut: lotData.statut
      });
    }
    
    // If no tubes are linked, deletion is allowed (even if lot is engaged)
    const bobineId = lotData.bobine_id;
    
    // Start transaction
    await query('BEGIN');
    
    try {
      // Delete the lot
      await query('DELETE FROM lots WHERE id = $1', [id]);
      
      // Optionally: Reset bobine status back to 'Disponible'
      if (bobineId) {
        // Check if bobine is not used by other lots
        const otherLots = await query('SELECT id FROM lots WHERE bobine_id = $1', [bobineId]);
        if (otherLots.rows.length === 0) {
          await query(
            `UPDATE bobines SET statut = 'Disponible', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [bobineId]
          );
          emitToAll(SOCKET_EVENTS.BOBINE_UPDATED, { bobine: { id: bobineId, statut: 'Disponible' } });
        }
      }
      
      await query('COMMIT');
      
      // Emit socket event
      emitToAll(SOCKET_EVENTS.LOT_DELETED, { lotId: id });
      
      res.json({ message: 'Lot supprimé avec succès' });
    } catch (err) {
      await query('ROLLBACK');
      throw err;
    }
  } catch (error) {
    console.error('Error deleting lot:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du lot' });
  }
});

// POST validate pipeline stage
router.post('/:id/validate/:stage', async (req, res) => {
  try {
    const { id, stage } = req.params;
    const { validator_id, validator_name } = req.body;
    
    // Validate stage name
    const validStages = ['demandee', 'recue', 'installee'];
    if (!validStages.includes(stage)) {
      return res.status(400).json({ error: 'Étape invalide' });
    }
    
    // Check if lot exists
    const existingLot = await query('SELECT * FROM lots WHERE id = $1', [id]);
    if (existingLot.rows.length === 0) {
      return res.status(404).json({ error: 'Lot non trouvé' });
    }
    
    const lot = existingLot.rows[0];
    
    // Validate stage order
    if (stage === 'recue' && !lot.demandee_validee) {
      return res.status(400).json({ error: 'L\'étape "Bobine demandée" doit être validée en premier' });
    }
    if (stage === 'installee' && !lot.recue_validee) {
      return res.status(400).json({ error: 'L\'étape "Bobine reçue" doit être validée en premier' });
    }
    
    // Check if already validated
    if (lot[`${stage}_validee`]) {
      return res.status(400).json({ error: 'Cette étape est déjà validée' });
    }
    
    // Update the stage
    const updateQuery = `
      UPDATE lots 
      SET ${stage}_validee = TRUE,
          ${stage}_validator_id = $1,
          ${stage}_validator_name = $2,
          ${stage}_validated_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    
    await query(updateQuery, [validator_id || null, validator_name || null, id]);
    
    // Update lot status based on pipeline progress
    let newStatus = 'En cours';
    if (stage === 'installee') {
      newStatus = 'Production';
    }
    
    await query(
      'UPDATE lots SET statut = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newStatus, id]
    );
    
    // Update bobine status if all stages completed
    if (stage === 'installee' && lot.bobine_id) {
      await query(
        `UPDATE bobines SET statut = 'Installée', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [lot.bobine_id]
      );
      emitToAll(SOCKET_EVENTS.BOBINE_UPDATED, { bobine: { id: lot.bobine_id, statut: 'Installée' } });
    }
    
    // Get updated lot with all data AFTER all updates
    const fullLot = await query(
      `SELECT l.*, 
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
       WHERE l.id = $1`,
      [id]
    );
    
    // Emit socket event
    emitToAll(SOCKET_EVENTS.LOT_UPDATED, { lot: fullLot.rows[0] });
    
    res.json(fullLot.rows[0]);
  } catch (error) {
    console.error('Error validating pipeline stage:', error);
    res.status(500).json({ error: 'Erreur lors de la validation de l\'étape' });
  }
});

// POST cancel/revert pipeline stage validation
router.post('/:id/cancel-validation/:stage', async (req, res) => {
  try {
    const { id, stage } = req.params;
    
    // Validate stage name
    const validStages = ['demandee', 'recue', 'installee'];
    if (!validStages.includes(stage)) {
      return res.status(400).json({ error: 'Étape invalide' });
    }
    
    // Check if lot exists
    const existingLot = await query('SELECT * FROM lots WHERE id = $1', [id]);
    if (existingLot.rows.length === 0) {
      return res.status(404).json({ error: 'Lot non trouvé' });
    }
    
    const lot = existingLot.rows[0];
    
    // Cannot cancel if subsequent stages are validated
    if (stage === 'demandee' && lot.recue_validee) {
      return res.status(400).json({ error: 'Impossible d\'annuler: l\'étape suivante est déjà validée' });
    }
    if (stage === 'recue' && lot.installee_validee) {
      return res.status(400).json({ error: 'Impossible d\'annuler: l\'étape suivante est déjà validée' });
    }
    
    // Reset the stage
    const updateQuery = `
      UPDATE lots 
      SET ${stage}_validee = FALSE,
          ${stage}_validator_id = NULL,
          ${stage}_validator_name = NULL,
          ${stage}_validated_at = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    await query(updateQuery, [id]);
    
    // Update lot status based on remaining validations
    let newStatus = 'En attente';
    if (stage === 'installee' && lot.recue_validee) {
      newStatus = 'En cours';
    } else if (stage === 'recue' && lot.demandee_validee) {
      newStatus = 'En cours';
    } else if (stage === 'demandee') {
      newStatus = 'En attente';
    }
    
    await query(
      'UPDATE lots SET statut = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newStatus, id]
    );
    
    // Get updated lot with all data
    const fullLot = await query(
      `SELECT l.*, 
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
       WHERE l.id = $1`,
      [id]
    );
    
    // Emit socket event
    emitToAll(SOCKET_EVENTS.LOT_UPDATED, { lot: fullLot.rows[0] });
    
    res.json(fullLot.rows[0]);
  } catch (error) {
    console.error('Error canceling pipeline validation:', error);
    res.status(500).json({ error: 'Erreur lors de l\'annulation de la validation' });
  }
});

module.exports = router;
