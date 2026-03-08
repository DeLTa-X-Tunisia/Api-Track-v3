const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { emitToAll, SOCKET_EVENTS } = require('../config/socket');

// Helper: Generate 6-digit access code
const generateAccessCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper: Generate next matricule (AT-001, AT-002, etc.)
const generateMatricule = async () => {
  const result = await query(`
    SELECT matricule FROM users 
    WHERE matricule LIKE 'AT-%' 
    ORDER BY matricule DESC 
    LIMIT 1
  `);
  
  if (result.rows.length === 0) {
    return 'AT-001';
  }
  
  const lastMatricule = result.rows[0].matricule;
  const lastNumber = parseInt(lastMatricule.replace('AT-', ''));
  const nextNumber = lastNumber + 1;
  return `AT-${nextNumber.toString().padStart(3, '0')}`;
};

// GET all users with pagination and filters
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, actif } = req.query;
    const offset = (page - 1) * limit;
    
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`(
        nom ILIKE $${paramIndex} OR 
        prenom ILIKE $${paramIndex} OR 
        matricule ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (role) {
      whereConditions.push(`role = $${paramIndex}`);
      params.push(role);
      paramIndex++;
    }

    if (actif !== undefined && actif !== '') {
      whereConditions.push(`actif = $${paramIndex}`);
      params.push(actif === 'true');
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Count total
    const countResult = await query(
      `SELECT COUNT(*) FROM users ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get users
    const result = await query(`
      SELECT 
        id, matricule, nom, prenom, role, actif, created_at, updated_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
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
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
});

// GET user by ID (includes access code)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'utilisateur' });
  }
});

// GET access code for user (separate endpoint for security)
router.get('/:id/code', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT code_acces FROM users WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    res.json({ code_acces: result.rows[0].code_acces });
  } catch (error) {
    console.error('Error fetching access code:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du code d\'accès' });
  }
});

// POST regenerate access code
router.post('/:id/regenerate-code', async (req, res) => {
  try {
    const { id } = req.params;
    const newCode = generateAccessCode();
    
    const result = await query(`
      UPDATE users 
      SET code_acces = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING id, matricule, nom, prenom, code_acces
    `, [newCode, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error regenerating access code:', error);
    res.status(500).json({ error: 'Erreur lors de la régénération du code d\'accès' });
  }
});

// POST create new user
router.post('/', async (req, res) => {
  try {
    const { nom, prenom, role } = req.body;
    
    // Validation
    if (!nom || !nom.trim()) {
      return res.status(400).json({ error: 'Le nom est requis' });
    }
    if (!prenom || !prenom.trim()) {
      return res.status(400).json({ error: 'Le prénom est requis' });
    }
    
    const validRoles = ['admin_systeme', 'admin_limite', 'superviseur_limite', 'observateur_limite'];
    const userRole = role && validRoles.includes(role) ? role : 'observateur_limite';
    
    // Generate matricule and access code
    const matricule = await generateMatricule();
    const codeAcces = generateAccessCode();
    
    const result = await query(`
      INSERT INTO users (matricule, nom, prenom, role, code_acces)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [matricule, nom.trim(), prenom.trim(), userRole, codeAcces]);
    
    res.status(201).json(result.rows[0]);
    
    // Emit socket event (after response to not block)
    emitToAll(SOCKET_EVENTS.USER_CREATED, {
      user: { ...result.rows[0], code_acces: undefined },
      message: `Nouvel utilisateur créé: ${result.rows[0].prenom} ${result.rows[0].nom}`
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur' });
  }
});

// PUT update user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, prenom, role } = req.body;
    
    // Validation
    if (!nom || !nom.trim()) {
      return res.status(400).json({ error: 'Le nom est requis' });
    }
    if (!prenom || !prenom.trim()) {
      return res.status(400).json({ error: 'Le prénom est requis' });
    }
    
    const validRoles = ['admin_systeme', 'admin_limite', 'superviseur_limite', 'observateur_limite'];
    const userRole = role && validRoles.includes(role) ? role : 'observateur_limite';
    
    const result = await query(`
      UPDATE users 
      SET nom = $1, prenom = $2, role = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [nom.trim(), prenom.trim(), userRole, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    res.json(result.rows[0]);
    
    // Emit socket event
    emitToAll(SOCKET_EVENTS.USER_UPDATED, {
      user: { ...result.rows[0], code_acces: undefined },
      message: `Utilisateur modifié: ${result.rows[0].prenom} ${result.rows[0].nom}`
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'utilisateur' });
  }
});

// PATCH toggle user active status
router.patch('/:id/toggle-active', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      UPDATE users 
      SET actif = NOT actif, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    res.json(result.rows[0]);
    
    // Emit socket event
    emitToAll(SOCKET_EVENTS.USER_TOGGLED, {
      user: { ...result.rows[0], code_acces: undefined },
      message: `${result.rows[0].prenom} ${result.rows[0].nom} ${result.rows[0].actif ? 'activé' : 'désactivé'}`
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ error: 'Erreur lors du changement de statut' });
  }
});

// DELETE user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      'DELETE FROM users WHERE id = $1 RETURNING id, matricule, nom, prenom',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    res.json({ message: 'Utilisateur supprimé', user: result.rows[0] });
    
    // Emit socket event
    emitToAll(SOCKET_EVENTS.USER_DELETED, {
      user: result.rows[0],
      message: `Utilisateur supprimé: ${result.rows[0].prenom} ${result.rows[0].nom}`
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'utilisateur' });
  }
});

// POST login by access code
router.post('/login', async (req, res) => {
  try {
    const { code_acces } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    // Validation
    if (!code_acces || code_acces.length !== 6) {
      return res.status(400).json({ error: 'Code d\'accès invalide (6 chiffres requis)' });
    }
    
    // Find user by access code
    const result = await query(
      'SELECT id, matricule, nom, prenom, role, actif FROM users WHERE code_acces = $1',
      [code_acces]
    );
    
    if (result.rows.length === 0) {
      // Log failed attempt
      await query(`
        INSERT INTO connection_logs (user_id, action, ip_address, user_agent, status, failure_reason)
        VALUES (NULL, 'login', $1, $2, 'failed', 'Code d''accès incorrect')
      `, [ipAddress, userAgent]);
      
      return res.status(401).json({ error: 'Code d\'accès incorrect' });
    }
    
    const user = result.rows[0];
    
    // Check if user is active
    if (!user.actif) {
      // Log blocked attempt
      await query(`
        INSERT INTO connection_logs (user_id, action, ip_address, user_agent, status, failure_reason)
        VALUES ($1, 'login', $2, $3, 'blocked', 'Compte désactivé')
      `, [user.id, ipAddress, userAgent]);
      
      return res.status(403).json({ error: 'Ce compte est désactivé. Contactez un administrateur.' });
    }
    
    // Log successful login
    await query(`
      INSERT INTO connection_logs (user_id, action, ip_address, user_agent, status)
      VALUES ($1, 'login', $2, $3, 'success')
    `, [user.id, ipAddress, userAgent]);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        matricule: user.matricule,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

module.exports = router;
