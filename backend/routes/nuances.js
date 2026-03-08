const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

// GET all nuances
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT n.*, g.code as grade_code 
      FROM nuances n 
      LEFT JOIN grades g ON n.grade_id = g.id 
      ORDER BY g.code, n.code
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching nuances:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des nuances' });
  }
});

// GET nuance by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT n.*, g.code as grade_code 
      FROM nuances n 
      LEFT JOIN grades g ON n.grade_id = g.id 
      WHERE n.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nuance non trouvée' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching nuance:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la nuance' });
  }
});

module.exports = router;
