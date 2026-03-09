const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

// Helper function to log history
async function logHistory(tableName, recordId, action, oldValues, newValues, userId, userName) {
  try {
    await query(
      `INSERT INTO parametres_history (table_name, record_id, action, old_values, new_values, changed_by_id, changed_by_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [tableName, recordId, action, JSON.stringify(oldValues), JSON.stringify(newValues), userId, userName]
    );
  } catch (error) {
    console.error('Error logging history:', error);
  }
}

// ==================== DEFAUTS CRUD ====================

// Get all defauts
router.get('/defauts', async (req, res) => {
  try {
    const { actif } = req.query;
    let sql = 'SELECT * FROM defauts';
    const params = [];
    
    if (actif !== undefined) {
      sql += ' WHERE actif = $1';
      params.push(actif === 'true');
    }
    
    sql += ' ORDER BY code';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching defauts:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des défauts' });
  }
});

// Get single defaut
router.get('/defauts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM defauts WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Défaut non trouvé' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching defaut:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du défaut' });
  }
});

// Create defaut
router.post('/defauts', async (req, res) => {
  try {
    const { code, libelle, description, user_id, user_name } = req.body;
    const result = await query(
      `INSERT INTO defauts (code, libelle, description, created_by_id, created_by_name) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [code, libelle, description, user_id || null, user_name || null]
    );
    
    // Log history
    await logHistory('defauts', result.rows[0].id, 'CREATE', null, result.rows[0], user_id, user_name);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating defaut:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ce code existe déjà' });
    }
    res.status(500).json({ error: 'Erreur lors de la création du défaut' });
  }
});

// Update defaut
router.put('/defauts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, libelle, description, actif, user_id, user_name } = req.body;
    
    // Get old values
    const oldResult = await query('SELECT * FROM defauts WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ error: 'Défaut non trouvé' });
    }
    const oldValues = oldResult.rows[0];
    
    const result = await query(
      `UPDATE defauts SET code = $1, libelle = $2, description = $3, actif = $4, 
       updated_at = CURRENT_TIMESTAMP, updated_by_id = $5, updated_by_name = $6 
       WHERE id = $7 RETURNING *`,
      [code, libelle, description, actif !== undefined ? actif : true, user_id || null, user_name || null, id]
    );
    
    // Log history
    await logHistory('defauts', id, 'UPDATE', oldValues, result.rows[0], user_id, user_name);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating defaut:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ce code existe déjà' });
    }
    res.status(500).json({ error: 'Erreur lors de la modification du défaut' });
  }
});

// Delete defaut (soft delete by setting actif = false)
router.delete('/defauts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, user_name } = req.body || {};
    
    // Get old values
    const oldResult = await query('SELECT * FROM defauts WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ error: 'Défaut non trouvé' });
    }
    const oldValues = oldResult.rows[0];
    
    // Soft delete
    const result = await query(
      `UPDATE defauts SET actif = false, updated_at = CURRENT_TIMESTAMP, 
       updated_by_id = $1, updated_by_name = $2 WHERE id = $3 RETURNING *`,
      [user_id || null, user_name || null, id]
    );
    
    // Log history
    await logHistory('defauts', id, 'DELETE', oldValues, result.rows[0], user_id, user_name);
    
    res.json({ message: 'Défaut désactivé', item: result.rows[0] });
  } catch (error) {
    console.error('Error deleting defaut:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du défaut' });
  }
});

// ==================== CAUSES DEFAUT CRUD ====================

// Get all causes
router.get('/causes', async (req, res) => {
  try {
    const { actif } = req.query;
    let sql = 'SELECT * FROM causes_defaut';
    const params = [];
    
    if (actif !== undefined) {
      sql += ' WHERE actif = $1';
      params.push(actif === 'true');
    }
    
    sql += ' ORDER BY code';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching causes:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des causes' });
  }
});

// Get single cause
router.get('/causes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM causes_defaut WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cause non trouvée' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching cause:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la cause' });
  }
});

// Create cause
router.post('/causes', async (req, res) => {
  try {
    const { code, libelle, description, user_id, user_name } = req.body;
    const result = await query(
      `INSERT INTO causes_defaut (code, libelle, description, created_by_id, created_by_name) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [code, libelle, description, user_id || null, user_name || null]
    );
    
    // Log history
    await logHistory('causes_defaut', result.rows[0].id, 'CREATE', null, result.rows[0], user_id, user_name);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating cause:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ce code existe déjà' });
    }
    res.status(500).json({ error: 'Erreur lors de la création de la cause' });
  }
});

// Update cause
router.put('/causes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, libelle, description, actif, user_id, user_name } = req.body;
    
    // Get old values
    const oldResult = await query('SELECT * FROM causes_defaut WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cause non trouvée' });
    }
    const oldValues = oldResult.rows[0];
    
    const result = await query(
      `UPDATE causes_defaut SET code = $1, libelle = $2, description = $3, actif = $4, 
       updated_at = CURRENT_TIMESTAMP, updated_by_id = $5, updated_by_name = $6 
       WHERE id = $7 RETURNING *`,
      [code, libelle, description, actif !== undefined ? actif : true, user_id || null, user_name || null, id]
    );
    
    // Log history
    await logHistory('causes_defaut', id, 'UPDATE', oldValues, result.rows[0], user_id, user_name);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating cause:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ce code existe déjà' });
    }
    res.status(500).json({ error: 'Erreur lors de la modification de la cause' });
  }
});

// Delete cause (soft delete)
router.delete('/causes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, user_name } = req.body || {};
    
    // Get old values
    const oldResult = await query('SELECT * FROM causes_defaut WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cause non trouvée' });
    }
    const oldValues = oldResult.rows[0];
    
    // Soft delete
    const result = await query(
      `UPDATE causes_defaut SET actif = false, updated_at = CURRENT_TIMESTAMP, 
       updated_by_id = $1, updated_by_name = $2 WHERE id = $3 RETURNING *`,
      [user_id || null, user_name || null, id]
    );
    
    // Log history
    await logHistory('causes_defaut', id, 'DELETE', oldValues, result.rows[0], user_id, user_name);
    
    res.json({ message: 'Cause désactivée', item: result.rows[0] });
  } catch (error) {
    console.error('Error deleting cause:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la cause' });
  }
});

// ==================== RESPONSABILITES CRUD ====================

// Get all responsabilites
router.get('/responsabilites', async (req, res) => {
  try {
    const { actif } = req.query;
    let sql = 'SELECT * FROM responsabilites';
    const params = [];
    
    if (actif !== undefined) {
      sql += ' WHERE actif = $1';
      params.push(actif === 'true');
    }
    
    sql += ' ORDER BY code';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching responsabilites:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des responsabilités' });
  }
});

// Get single responsabilite
router.get('/responsabilites/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM responsabilites WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Responsabilité non trouvée' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching responsabilite:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la responsabilité' });
  }
});

// Create responsabilite
router.post('/responsabilites', async (req, res) => {
  try {
    const { code, libelle, description, user_id, user_name } = req.body;
    const result = await query(
      `INSERT INTO responsabilites (code, libelle, description, created_by_id, created_by_name) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [code, libelle, description, user_id || null, user_name || null]
    );
    
    // Log history
    await logHistory('responsabilites', result.rows[0].id, 'CREATE', null, result.rows[0], user_id, user_name);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating responsabilite:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ce code existe déjà' });
    }
    res.status(500).json({ error: 'Erreur lors de la création de la responsabilité' });
  }
});

// Update responsabilite
router.put('/responsabilites/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, libelle, description, actif, user_id, user_name } = req.body;
    
    // Get old values
    const oldResult = await query('SELECT * FROM responsabilites WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ error: 'Responsabilité non trouvée' });
    }
    const oldValues = oldResult.rows[0];
    
    const result = await query(
      `UPDATE responsabilites SET code = $1, libelle = $2, description = $3, actif = $4, 
       updated_at = CURRENT_TIMESTAMP, updated_by_id = $5, updated_by_name = $6 
       WHERE id = $7 RETURNING *`,
      [code, libelle, description, actif !== undefined ? actif : true, user_id || null, user_name || null, id]
    );
    
    // Log history
    await logHistory('responsabilites', id, 'UPDATE', oldValues, result.rows[0], user_id, user_name);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating responsabilite:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ce code existe déjà' });
    }
    res.status(500).json({ error: 'Erreur lors de la modification de la responsabilité' });
  }
});

// Delete responsabilite (soft delete)
router.delete('/responsabilites/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, user_name } = req.body || {};
    
    // Get old values
    const oldResult = await query('SELECT * FROM responsabilites WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ error: 'Responsabilité non trouvée' });
    }
    const oldValues = oldResult.rows[0];
    
    // Soft delete
    const result = await query(
      `UPDATE responsabilites SET actif = false, updated_at = CURRENT_TIMESTAMP, 
       updated_by_id = $1, updated_by_name = $2 WHERE id = $3 RETURNING *`,
      [user_id || null, user_name || null, id]
    );
    
    // Log history
    await logHistory('responsabilites', id, 'DELETE', oldValues, result.rows[0], user_id, user_name);
    
    res.json({ message: 'Responsabilité désactivée', item: result.rows[0] });
  } catch (error) {
    console.error('Error deleting responsabilite:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la responsabilité' });
  }
});

// ==================== HISTORY ====================

// ==================== CAUSES PASSER (SKIP) CRUD ====================

// Get all causes_passer
router.get('/causes-passer', async (req, res) => {
  try {
    const { actif } = req.query;
    let sql = 'SELECT * FROM causes_passer';
    const params = [];
    
    if (actif !== undefined && actif !== 'all') {
      sql += ' WHERE actif = $1';
      params.push(actif === 'true');
    }
    
    sql += ' ORDER BY code';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching causes_passer:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des causes' });
  }
});

// Create cause_passer
router.post('/causes-passer', async (req, res) => {
  try {
    const { code, libelle, description, user_id, user_name } = req.body;
    const result = await query(
      `INSERT INTO causes_passer (code, libelle, description, created_by_id, created_by_name) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [code, libelle, description, user_id || null, user_name || null]
    );
    
    await logHistory('causes_passer', result.rows[0].id, 'CREATE', null, result.rows[0], user_id, user_name);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating cause_passer:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ce code existe déjà' });
    }
    res.status(500).json({ error: 'Erreur lors de la création de la cause' });
  }
});

// Update cause_passer
router.put('/causes-passer/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, libelle, description, actif, user_id, user_name } = req.body;
    
    const oldResult = await query('SELECT * FROM causes_passer WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cause non trouvée' });
    }
    const oldValues = oldResult.rows[0];
    
    const result = await query(
      `UPDATE causes_passer SET code = $1, libelle = $2, description = $3, actif = $4, 
       updated_at = CURRENT_TIMESTAMP, updated_by_id = $5, updated_by_name = $6 
       WHERE id = $7 RETURNING *`,
      [code, libelle, description, actif !== undefined ? actif : true, user_id || null, user_name || null, id]
    );
    
    await logHistory('causes_passer', id, 'UPDATE', oldValues, result.rows[0], user_id, user_name);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating cause_passer:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ce code existe déjà' });
    }
    res.status(500).json({ error: 'Erreur lors de la modification de la cause' });
  }
});

// Delete cause_passer (soft delete)
router.delete('/causes-passer/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, user_name } = req.body || {};
    
    const oldResult = await query('SELECT * FROM causes_passer WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cause non trouvée' });
    }
    const oldValues = oldResult.rows[0];
    
    const result = await query(
      `UPDATE causes_passer SET actif = false, updated_at = CURRENT_TIMESTAMP, 
       updated_by_id = $1, updated_by_name = $2 WHERE id = $3 RETURNING *`,
      [user_id || null, user_name || null, id]
    );
    
    await logHistory('causes_passer', id, 'DELETE', oldValues, result.rows[0], user_id, user_name);
    res.json({ message: 'Cause désactivée', item: result.rows[0] });
  } catch (error) {
    console.error('Error deleting cause_passer:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la cause' });
  }
});

// ==================== DECISIONS PASSER (SKIP) CRUD ====================

// Get all decisions_passer
router.get('/decisions-passer', async (req, res) => {
  try {
    const { actif } = req.query;
    let sql = 'SELECT * FROM decisions_passer';
    const params = [];
    
    if (actif !== undefined && actif !== 'all') {
      sql += ' WHERE actif = $1';
      params.push(actif === 'true');
    }
    
    sql += ' ORDER BY code';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching decisions_passer:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des décisions' });
  }
});

// Create decision_passer
router.post('/decisions-passer', async (req, res) => {
  try {
    const { code, libelle, description, user_id, user_name } = req.body;
    const result = await query(
      `INSERT INTO decisions_passer (code, libelle, description, created_by_id, created_by_name) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [code, libelle, description, user_id || null, user_name || null]
    );
    
    await logHistory('decisions_passer', result.rows[0].id, 'CREATE', null, result.rows[0], user_id, user_name);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating decision_passer:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ce code existe déjà' });
    }
    res.status(500).json({ error: 'Erreur lors de la création de la décision' });
  }
});

// Update decision_passer
router.put('/decisions-passer/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, libelle, description, actif, user_id, user_name } = req.body;
    
    const oldResult = await query('SELECT * FROM decisions_passer WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ error: 'Décision non trouvée' });
    }
    const oldValues = oldResult.rows[0];
    
    const result = await query(
      `UPDATE decisions_passer SET code = $1, libelle = $2, description = $3, actif = $4, 
       updated_at = CURRENT_TIMESTAMP, updated_by_id = $5, updated_by_name = $6 
       WHERE id = $7 RETURNING *`,
      [code, libelle, description, actif !== undefined ? actif : true, user_id || null, user_name || null, id]
    );
    
    await logHistory('decisions_passer', id, 'UPDATE', oldValues, result.rows[0], user_id, user_name);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating decision_passer:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ce code existe déjà' });
    }
    res.status(500).json({ error: 'Erreur lors de la modification de la décision' });
  }
});

// Delete decision_passer (soft delete)
router.delete('/decisions-passer/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, user_name } = req.body || {};
    
    const oldResult = await query('SELECT * FROM decisions_passer WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ error: 'Décision non trouvée' });
    }
    const oldValues = oldResult.rows[0];
    
    const result = await query(
      `UPDATE decisions_passer SET actif = false, updated_at = CURRENT_TIMESTAMP, 
       updated_by_id = $1, updated_by_name = $2 WHERE id = $3 RETURNING *`,
      [user_id || null, user_name || null, id]
    );
    
    await logHistory('decisions_passer', id, 'DELETE', oldValues, result.rows[0], user_id, user_name);
    res.json({ message: 'Décision désactivée', item: result.rows[0] });
  } catch (error) {
    console.error('Error deleting decision_passer:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la décision' });
  }
});

// ==================== CAUSES INTERRUPTION CRUD ====================

// Get all causes_interruption
router.get('/causes-interruption', async (req, res) => {
  try {
    const { active } = req.query;
    let sql = 'SELECT * FROM causes_interruption';
    const params = [];
    
    if (active !== undefined && active !== 'all') {
      sql += ' WHERE active = $1';
      params.push(active === 'true');
    }
    
    sql += ' ORDER BY code';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching causes_interruption:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des causes d\'interruption' });
  }
});

// Create cause_interruption
router.post('/causes-interruption', async (req, res) => {
  try {
    const { code, libelle, note, icon, is_autre, user_id, user_name } = req.body;
    const result = await query(
      `INSERT INTO causes_interruption (code, libelle, note, icon, is_autre) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [code, libelle, note || null, icon || null, is_autre || false]
    );
    
    await logHistory('causes_interruption', result.rows[0].id, 'CREATE', null, result.rows[0], user_id, user_name);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating cause_interruption:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ce code existe déjà' });
    }
    res.status(500).json({ error: 'Erreur lors de la création de la cause' });
  }
});

// Update cause_interruption
router.put('/causes-interruption/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, libelle, note, icon, is_autre, active, user_id, user_name } = req.body;
    
    const oldResult = await query('SELECT * FROM causes_interruption WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cause non trouvée' });
    }
    const oldValues = oldResult.rows[0];
    
    const result = await query(
      `UPDATE causes_interruption SET code = $1, libelle = $2, note = $3, icon = $4, 
       is_autre = $5, active = $6, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $7 RETURNING *`,
      [code, libelle, note || null, icon || null, is_autre || false, 
       active !== undefined ? active : true, id]
    );
    
    await logHistory('causes_interruption', id, 'UPDATE', oldValues, result.rows[0], user_id, user_name);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating cause_interruption:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ce code existe déjà' });
    }
    res.status(500).json({ error: 'Erreur lors de la modification de la cause' });
  }
});

// Delete cause_interruption (soft delete)
router.delete('/causes-interruption/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, user_name } = req.body || {};
    
    const oldResult = await query('SELECT * FROM causes_interruption WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cause non trouvée' });
    }
    const oldValues = oldResult.rows[0];
    
    const result = await query(
      `UPDATE causes_interruption SET active = false, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 RETURNING *`,
      [id]
    );
    
    await logHistory('causes_interruption', id, 'DELETE', oldValues, result.rows[0], user_id, user_name);
    res.json({ message: 'Cause désactivée', item: result.rows[0] });
  } catch (error) {
    console.error('Error deleting cause_interruption:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la cause' });
  }
});

// ==================== ACTIONS FUTURES CRUD ====================

// Get all actions_futures
router.get('/actions-futures', async (req, res) => {
  try {
    const { actif } = req.query;
    let sql = 'SELECT * FROM actions_futures';
    const params = [];
    
    if (actif !== undefined && actif !== 'all') {
      sql += ' WHERE actif = $1';
      params.push(actif === 'true');
    }
    
    sql += ' ORDER BY code';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching actions_futures:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des actions futures' });
  }
});

// Get single action_future
router.get('/actions-futures/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM actions_futures WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Action future non trouvée' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching action_future:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'action future' });
  }
});

// Create action_future
router.post('/actions-futures', async (req, res) => {
  try {
    const { code, libelle, description, user_id, user_name } = req.body;
    const result = await query(
      `INSERT INTO actions_futures (code, libelle, description, created_by_id, created_by_name) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [code, libelle, description, user_id || null, user_name || null]
    );
    
    // Log history
    await logHistory('actions_futures', result.rows[0].id, 'CREATE', null, result.rows[0], user_id, user_name);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating action_future:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ce code existe déjà' });
    }
    res.status(500).json({ error: 'Erreur lors de la création de l\'action future' });
  }
});

// Update action_future
router.put('/actions-futures/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, libelle, description, actif, user_id, user_name } = req.body;
    
    // Get old values
    const oldResult = await query('SELECT * FROM actions_futures WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ error: 'Action future non trouvée' });
    }
    const oldValues = oldResult.rows[0];
    
    const result = await query(
      `UPDATE actions_futures SET code = $1, libelle = $2, description = $3, actif = $4, 
       updated_at = CURRENT_TIMESTAMP, updated_by_id = $5, updated_by_name = $6 
       WHERE id = $7 RETURNING *`,
      [code, libelle, description, actif !== undefined ? actif : true, user_id || null, user_name || null, id]
    );
    
    // Log history
    await logHistory('actions_futures', id, 'UPDATE', oldValues, result.rows[0], user_id, user_name);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating action_future:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ce code existe déjà' });
    }
    res.status(500).json({ error: 'Erreur lors de la modification de l\'action future' });
  }
});

// Delete action_future (soft delete)
router.delete('/actions-futures/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, user_name } = req.body || {};
    
    // Get old values
    const oldResult = await query('SELECT * FROM actions_futures WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) {
      return res.status(404).json({ error: 'Action future non trouvée' });
    }
    const oldValues = oldResult.rows[0];
    
    // Soft delete
    const result = await query(
      `UPDATE actions_futures SET actif = false, updated_at = CURRENT_TIMESTAMP, 
       updated_by_id = $1, updated_by_name = $2 WHERE id = $3 RETURNING *`,
      [user_id || null, user_name || null, id]
    );
    
    // Log history
    await logHistory('actions_futures', id, 'DELETE', oldValues, result.rows[0], user_id, user_name);
    
    res.json({ message: 'Action future désactivée', item: result.rows[0] });
  } catch (error) {
    console.error('Error deleting action_future:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'action future' });
  }
});

// ==================== HISTORY ====================

// Get history for a specific table/record
router.get('/history/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const { record_id } = req.query;
    
    let sql = 'SELECT * FROM parametres_history WHERE table_name = $1';
    const params = [tableName];
    
    if (record_id) {
      sql += ' AND record_id = $2';
      params.push(record_id);
    }
    
    sql += ' ORDER BY changed_at DESC LIMIT 100';
    
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique' });
  }
});

module.exports = router;
