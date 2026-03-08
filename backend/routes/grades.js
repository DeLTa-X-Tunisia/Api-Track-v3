const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

// GET all grades
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM grades ORDER BY code');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching grades:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des grades' });
  }
});

// GET grade by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM grades WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Grade non trouvé' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching grade:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du grade' });
  }
});

// GET nuances by grade ID
router.get('/:id/nuances', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT * FROM nuances WHERE grade_id = $1 ORDER BY code',
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching nuances:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des nuances' });
  }
});

module.exports = router;
