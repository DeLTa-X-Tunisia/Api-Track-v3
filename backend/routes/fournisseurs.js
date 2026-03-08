const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { emitToAll, SOCKET_EVENTS } = require('../config/socket');

// GET all fournisseurs
router.get('/', async (req, res) => {
  try {
    const { actif } = req.query;
    let sql = 'SELECT * FROM fournisseurs';
    const params = [];
    
    if (actif !== undefined) {
      sql += ' WHERE actif = $1';
      params.push(actif === 'true');
    }
    
    sql += ' ORDER BY nom';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching fournisseurs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des fournisseurs' });
  }
});

// GET fournisseur by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM fournisseurs WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Fournisseur non trouvé' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching fournisseur:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du fournisseur' });
  }
});

// POST create fournisseur
router.post('/', async (req, res) => {
  try {
    const { nom, contact, telephone, email, adresse } = req.body;
    
    if (!nom || nom.trim() === '') {
      return res.status(400).json({ error: 'Le nom du fournisseur est requis' });
    }

    const result = await query(
      `INSERT INTO fournisseurs (nom, contact, telephone, email, adresse) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [nom.trim(), contact, telephone, email, adresse]
    );
    
    res.status(201).json(result.rows[0]);
    
    // Emit socket event
    emitToAll(SOCKET_EVENTS.FOURNISSEUR_CREATED, {
      fournisseur: result.rows[0],
      message: `Nouveau fournisseur: ${result.rows[0].nom}`
    });
  } catch (error) {
    console.error('Error creating fournisseur:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Un fournisseur avec ce nom existe déjà' });
    }
    res.status(500).json({ error: 'Erreur lors de la création du fournisseur' });
  }
});

// PUT update fournisseur
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, contact, telephone, email, adresse, actif } = req.body;
    
    if (!nom || nom.trim() === '') {
      return res.status(400).json({ error: 'Le nom du fournisseur est requis' });
    }

    const result = await query(
      `UPDATE fournisseurs 
       SET nom = $1, contact = $2, telephone = $3, email = $4, adresse = $5, actif = $6
       WHERE id = $7 
       RETURNING *`,
      [nom.trim(), contact, telephone, email, adresse, actif !== false, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Fournisseur non trouvé' });
    }
    
    res.json(result.rows[0]);
    
    // Emit socket event
    emitToAll(SOCKET_EVENTS.FOURNISSEUR_UPDATED, {
      fournisseur: result.rows[0],
      message: `Fournisseur modifié: ${result.rows[0].nom}`
    });
  } catch (error) {
    console.error('Error updating fournisseur:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Un fournisseur avec ce nom existe déjà' });
    }
    res.status(500).json({ error: 'Erreur lors de la mise à jour du fournisseur' });
  }
});

// DELETE fournisseur (soft delete - set actif to false)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;
    
    if (permanent === 'true') {
      // Check if fournisseur is used by any bobine
      const checkResult = await query(
        'SELECT COUNT(*) FROM bobines WHERE fournisseur_id = $1',
        [id]
      );
      
      if (parseInt(checkResult.rows[0].count) > 0) {
        return res.status(409).json({ 
          error: 'Ce fournisseur est utilisé par des bobines et ne peut pas être supprimé définitivement' 
        });
      }
      
      await query('DELETE FROM fournisseurs WHERE id = $1', [id]);
    } else {
      // Soft delete
      const result = await query(
        'UPDATE fournisseurs SET actif = false WHERE id = $1 RETURNING *',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Fournisseur non trouvé' });
      }
    }
    
    res.json({ message: 'Fournisseur supprimé avec succès' });
    
    // Emit socket event
    emitToAll(SOCKET_EVENTS.FOURNISSEUR_DELETED, {
      id,
      message: `Fournisseur supprimé`
    });
  } catch (error) {
    console.error('Error deleting fournisseur:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du fournisseur' });
  }
});

module.exports = router;
