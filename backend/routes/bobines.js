const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { emitToAll, SOCKET_EVENTS } = require('../config/socket');

// Configure multer for image uploads
const uploadDir = path.join(__dirname, '..', 'uploads', 'bobines');
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

// GET all bobines with pagination and filters
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, grade_id, fournisseur_id, statut } = req.query;
    const offset = (page - 1) * limit;
    
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`b.numero ILIKE $${paramIndex}`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (grade_id) {
      whereConditions.push(`b.grade_id = $${paramIndex}`);
      params.push(grade_id);
      paramIndex++;
    }

    if (fournisseur_id) {
      whereConditions.push(`b.fournisseur_id = $${paramIndex}`);
      params.push(fournisseur_id);
      paramIndex++;
    }

    if (statut) {
      whereConditions.push(`b.statut = $${paramIndex}`);
      params.push(statut);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Count total
    const countResult = await query(
      `SELECT COUNT(*) FROM bobines b ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get bobines with relations
    const result = await query(`
      SELECT 
        b.*,
        g.code as grade_code,
        g.description as grade_description,
        n.code as nuance_code,
        n.description as nuance_description,
        f.nom as fournisseur_nom,
        (SELECT COUNT(*) FROM bobine_photos WHERE bobine_id = b.id) as photo_count
      FROM bobines b
      LEFT JOIN grades g ON b.grade_id = g.id
      LEFT JOIN nuances n ON b.nuance_id = n.id
      LEFT JOIN fournisseurs f ON b.fournisseur_id = f.id
      ${whereClause}
      ORDER BY b.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

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
    console.error('Error fetching bobines:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des bobines' });
  }
});

// GET bobine by ID with photos
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const bobineResult = await query(`
      SELECT 
        b.*,
        g.code as grade_code,
        g.description as grade_description,
        n.code as nuance_code,
        n.description as nuance_description,
        f.nom as fournisseur_nom,
        f.contact as fournisseur_contact
      FROM bobines b
      LEFT JOIN grades g ON b.grade_id = g.id
      LEFT JOIN nuances n ON b.nuance_id = n.id
      LEFT JOIN fournisseurs f ON b.fournisseur_id = f.id
      WHERE b.id = $1
    `, [id]);

    if (bobineResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bobine non trouvée' });
    }

    const photosResult = await query(
      'SELECT * FROM bobine_photos WHERE bobine_id = $1 ORDER BY created_at',
      [id]
    );

    const bobine = bobineResult.rows[0];
    bobine.photos = photosResult.rows;

    res.json(bobine);
  } catch (error) {
    console.error('Error fetching bobine:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la bobine' });
  }
});

// POST create bobine
router.post('/', async (req, res) => {
  try {
    const {
      numero,
      grade_id,
      nuance_id,
      epaisseur,
      largeur,
      poids,
      fournisseur_id,
      date_reception,
      statut,
      notes,
      created_by_user_id,
      created_by_name
    } = req.body;

    // Validation
    if (!numero || numero.trim() === '') {
      return res.status(400).json({ error: 'Le numéro de bobine est requis' });
    }
    if (!epaisseur || epaisseur <= 0) {
      return res.status(400).json({ error: 'L\'épaisseur est requise et doit être positive' });
    }
    if (!largeur || largeur <= 0) {
      return res.status(400).json({ error: 'La largeur est requise et doit être positive' });
    }
    if (!poids || poids <= 0) {
      return res.status(400).json({ error: 'Le poids est requis et doit être positif' });
    }
    if (!date_reception) {
      return res.status(400).json({ error: 'La date de réception est requise' });
    }

    const result = await query(`
      INSERT INTO bobines (numero, grade_id, nuance_id, epaisseur, largeur, poids, fournisseur_id, date_reception, statut, notes, created_by_user_id, created_by_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      numero.trim(),
      grade_id || null,
      nuance_id || null,
      epaisseur,
      largeur,
      poids,
      fournisseur_id || null,
      date_reception,
      statut || 'disponible',
      notes || null,
      created_by_user_id || null,
      created_by_name || null
    ]);

    // Emit socket event
    emitToAll(SOCKET_EVENTS.BOBINE_CREATED, {
      bobine: result.rows[0],
      message: `Nouvelle bobine créée: ${result.rows[0].numero}`
    });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating bobine:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Une bobine avec ce numéro existe déjà' });
    }
    res.status(500).json({ error: 'Erreur lors de la création de la bobine' });
  }
});

// PUT update bobine
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      numero,
      grade_id,
      nuance_id,
      epaisseur,
      largeur,
      poids,
      fournisseur_id,
      date_reception,
      statut,
      notes
    } = req.body;

    // Validation
    if (!numero || numero.trim() === '') {
      return res.status(400).json({ error: 'Le numéro de bobine est requis' });
    }

    const result = await query(`
      UPDATE bobines 
      SET numero = $1, grade_id = $2, nuance_id = $3, epaisseur = $4, largeur = $5, 
          poids = $6, fournisseur_id = $7, date_reception = $8, statut = $9, notes = $10
      WHERE id = $11
      RETURNING *
    `, [
      numero.trim(),
      grade_id || null,
      nuance_id || null,
      epaisseur,
      largeur,
      poids,
      fournisseur_id || null,
      date_reception,
      statut || 'disponible',
      notes || null,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bobine non trouvée' });
    }

    // Emit socket event
    emitToAll(SOCKET_EVENTS.BOBINE_UPDATED, {
      bobine: result.rows[0],
      message: `Bobine mise à jour: ${result.rows[0].numero}`
    });

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating bobine:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Une bobine avec ce numéro existe déjà' });
    }
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la bobine' });
  }
});

// DELETE bobine
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // RULE: A bobine can only be deleted if all its linked lots are cancelled ('annulé')
    // Check if bobine is linked to any lot that is NOT cancelled
    const linkedLots = await query(
      `SELECT id, numero, statut FROM lots WHERE bobine_id = $1 AND LOWER(statut) NOT IN ('annulé', 'annule', 'cancelled')`,
      [id]
    );
    
    if (linkedLots.rows.length > 0) {
      const lotDetails = linkedLots.rows.map(l => `${l.numero} (${l.statut})`).join(', ');
      
      // Check specifically for engaged lots  
      const engagedStatuses = ['production', 'en production', 'en cours', 'engagé', 'en_cours'];
      const engagedLots = linkedLots.rows.filter(l => 
        engagedStatuses.includes(l.statut?.toLowerCase())
      );
      
      let errorMessage = `Impossible de supprimer cette bobine : elle est liée au(x) lot(s) actif(s) : ${lotDetails}.`;
      
      if (engagedLots.length > 0) {
        errorMessage = `Impossible de supprimer cette bobine : elle est liée à des lots engagés en production (${lotDetails}).`;
      }
      errorMessage += ` Une bobine ne peut être supprimée que si tous ses lots sont annulés.`;
      
      return res.status(400).json({
        error: errorMessage,
        code: 'BOBINE_HAS_ACTIVE_LOTS',
        linkedLots: linkedLots.rows
      });
    }

    // Get photos to delete files
    const photosResult = await query(
      'SELECT * FROM bobine_photos WHERE bobine_id = $1',
      [id]
    );

    // Delete physical files
    for (const photo of photosResult.rows) {
      const filePath = path.join(uploadDir, photo.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete bobine (photos will be deleted by CASCADE)
    const result = await query(
      'DELETE FROM bobines WHERE id = $1 RETURNING id, numero',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bobine non trouvée' });
    }

    // Emit socket event
    emitToAll(SOCKET_EVENTS.BOBINE_DELETED, {
      id: result.rows[0].id,
      numero: result.rows[0].numero,
      message: `Bobine supprimée: ${result.rows[0].numero}`
    });

    res.json({ message: 'Bobine supprimée avec succès' });
  } catch (error) {
    console.error('Error deleting bobine:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la bobine' });
  }
});

// POST upload photos for a bobine
router.post('/:id/photos', upload.array('photos', 5), async (req, res) => {
  try {
    const { id } = req.params;

    // Check bobine exists
    const bobineCheck = await query('SELECT id FROM bobines WHERE id = $1', [id]);
    if (bobineCheck.rows.length === 0) {
      // Delete uploaded files if bobine doesn't exist
      if (req.files) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      return res.status(404).json({ error: 'Bobine non trouvée' });
    }

    // Check current photo count
    const photoCountResult = await query(
      'SELECT COUNT(*) FROM bobine_photos WHERE bobine_id = $1',
      [id]
    );
    const currentCount = parseInt(photoCountResult.rows[0].count);
    
    if (currentCount >= 5) {
      // Delete uploaded files
      if (req.files) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      return res.status(400).json({ error: 'Maximum 5 photos par bobine' });
    }

    const maxAllowed = 5 - currentCount;
    const filesToSave = req.files.slice(0, maxAllowed);

    // Delete extra files if any
    req.files.slice(maxAllowed).forEach(file => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });

    // Save photo records to database
    const savedPhotos = [];
    for (const file of filesToSave) {
      const result = await query(`
        INSERT INTO bobine_photos (bobine_id, filename, original_name, mime_type, size, path)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [id, file.filename, file.originalname, file.mimetype, file.size, `/uploads/bobines/${file.filename}`]);
      savedPhotos.push(result.rows[0]);
    }

    res.status(201).json(savedPhotos);
  } catch (error) {
    console.error('Error uploading photos:', error);
    // Cleanup on error
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    res.status(500).json({ error: 'Erreur lors de l\'upload des photos' });
  }
});

// DELETE a specific photo
router.delete('/:id/photos/:photoId', async (req, res) => {
  try {
    const { id, photoId } = req.params;

    const photoResult = await query(
      'SELECT * FROM bobine_photos WHERE id = $1 AND bobine_id = $2',
      [photoId, id]
    );

    if (photoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Photo non trouvée' });
    }

    const photo = photoResult.rows[0];

    // Delete physical file
    const filePath = path.join(uploadDir, photo.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete database record
    await query('DELETE FROM bobine_photos WHERE id = $1', [photoId]);

    res.json({ message: 'Photo supprimée avec succès' });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la photo' });
  }
});

// GET photos for a bobine
router.get('/:id/photos', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT * FROM bobine_photos WHERE bobine_id = $1 ORDER BY created_at',
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching photos:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des photos' });
  }
});

module.exports = router;
