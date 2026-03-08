const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { getIO } = require('../config/socket');

// Middleware pour vérifier si l'utilisateur est admin
const isAdmin = async (req, res, next) => {
  const userId = req.headers['x-user-id'];
  
  if (!userId) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  
  try {
    const result = await query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0 || (result.rows[0].role !== 'admin' && result.rows[0].role !== 'admin_systeme')) {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    
    next();
  } catch (error) {
    console.error('Erreur vérification admin:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// GET /api/supervision/connected-users - Liste des utilisateurs connectés
router.get('/connected-users', isAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        s.id,
        s.user_id,
        u.nom,
        u.prenom,
        u.role,
        s.socket_id,
        s.ip_address,
        s.connected_at,
        s.last_activity
      FROM active_sessions s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.connected_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur récupération utilisateurs connectés:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/supervision/connection-logs - Historique des connexions
router.get('/connection-logs', isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, userId, action, status, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;
    
    let query_str = `
      SELECT 
        cl.id,
        cl.user_id,
        u.nom,
        u.prenom,
        u.role,
        cl.action,
        cl.ip_address,
        cl.status,
        cl.failure_reason,
        cl.created_at
      FROM connection_logs cl
      LEFT JOIN users u ON cl.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (userId) {
      query_str += ` AND cl.user_id = $${paramIndex++}`;
      params.push(userId);
    }
    
    if (action) {
      query_str += ` AND cl.action = $${paramIndex++}`;
      params.push(action);
    }
    
    if (status) {
      query_str += ` AND cl.status = $${paramIndex++}`;
      params.push(status);
    }
    
    if (startDate) {
      query_str += ` AND cl.created_at >= $${paramIndex++}`;
      params.push(startDate);
    }
    
    if (endDate) {
      query_str += ` AND cl.created_at <= $${paramIndex++}`;
      params.push(endDate);
    }
    
    // Count total
    const countQuery = query_str.replace(
      /SELECT[\s\S]*?FROM/,
      'SELECT COUNT(*) as total FROM'
    );
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);
    
    // Add pagination
    query_str += ` ORDER BY cl.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await query(query_str, params);
    
    res.json({
      logs: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erreur récupération logs connexion:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/supervision/stats - Statistiques de connexion
router.get('/stats', isAdmin, async (req, res) => {
  try {
    // Nombre d'utilisateurs connectés
    const connectedResult = await query(
      'SELECT COUNT(DISTINCT user_id) as count FROM active_sessions'
    );
    
    // Connexions aujourd'hui
    const todayResult = await query(`
      SELECT COUNT(*) as count FROM connection_logs 
      WHERE action = 'login' AND status = 'success' 
      AND created_at >= CURRENT_DATE
    `);
    
    // Connexions cette semaine
    const weekResult = await query(`
      SELECT COUNT(*) as count FROM connection_logs 
      WHERE action = 'login' AND status = 'success' 
      AND created_at >= CURRENT_DATE - INTERVAL '7 days'
    `);
    
    // Tentatives échouées aujourd'hui
    const failedResult = await query(`
      SELECT COUNT(*) as count FROM connection_logs 
      WHERE status = 'failed' 
      AND created_at >= CURRENT_DATE
    `);
    
    // Connexions par heure (dernières 24h)
    const hourlyResult = await query(`
      SELECT 
        DATE_TRUNC('hour', created_at) as hour,
        COUNT(*) as count
      FROM connection_logs 
      WHERE action = 'login' AND status = 'success'
      AND created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY DATE_TRUNC('hour', created_at)
      ORDER BY hour
    `);
    
    // Utilisateurs les plus actifs (derniers 7 jours)
    const topUsersResult = await query(`
      SELECT 
        u.id,
        u.nom,
        u.prenom,
        u.role,
        COUNT(*) as login_count
      FROM connection_logs cl
      JOIN users u ON cl.user_id = u.id
      WHERE cl.action = 'login' AND cl.status = 'success'
      AND cl.created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY u.id, u.nom, u.prenom, u.role
      ORDER BY login_count DESC
      LIMIT 5
    `);
    
    res.json({
      connectedUsers: parseInt(connectedResult.rows[0].count),
      todayLogins: parseInt(todayResult.rows[0].count),
      weekLogins: parseInt(weekResult.rows[0].count),
      failedAttempts: parseInt(failedResult.rows[0].count),
      hourlyConnections: hourlyResult.rows,
      topUsers: topUsersResult.rows
    });
  } catch (error) {
    console.error('Erreur récupération stats supervision:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/supervision/force-logout/:userId - Forcer la déconnexion d'un utilisateur
router.post('/force-logout/:userId', isAdmin, async (req, res) => {
  const { userId } = req.params;
  const adminId = req.headers['x-user-id'];
  
  try {
    // Récupérer les infos utilisateur et sessions actives
    const userResult = await query(
      'SELECT nom, prenom FROM users WHERE id = $1',
      [userId]
    );
    
    const sessions = await query(
      'SELECT socket_id FROM active_sessions WHERE user_id = $1',
      [userId]
    );
    
    // Supprimer les sessions
    await query('DELETE FROM active_sessions WHERE user_id = $1', [userId]);
    
    // Enregistrer le log
    await query(`
      INSERT INTO connection_logs (user_id, action, status, failure_reason)
      VALUES ($1, 'forced_logout', 'success', $2)
    `, [userId, `Déconnexion forcée par admin #${adminId}`]);
    
    // Émettre l'événement socket pour mise à jour temps réel
    const io = getIO();
    if (io) {
      const userName = userResult.rows[0] ? `${userResult.rows[0].prenom} ${userResult.rows[0].nom}` : 'Unknown';
      io.emit('supervision:force-logout', {
        userId: parseInt(userId),
        userName,
        socketIds: sessions.rows.map(s => s.socket_id),
        forcedBy: adminId
      });
      
      // Déconnecter les sockets de l'utilisateur
      sessions.rows.forEach(({ socket_id }) => {
        const socket = io.sockets.sockets.get(socket_id);
        if (socket) {
          socket.emit('auth:force-logout', { reason: 'Déconnexion forcée par un administrateur' });
          socket.disconnect(true);
        }
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Utilisateur déconnecté',
      socketIds: sessions.rows.map(s => s.socket_id)
    });
  } catch (error) {
    console.error('Erreur déconnexion forcée:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/supervision/logs - Supprimer les logs (avec options)
router.delete('/logs', isAdmin, async (req, res) => {
  const adminId = req.headers['x-user-id'];
  const { olderThan, userId, all } = req.query;
  
  try {
    let deletedCount = 0;
    
    if (all === 'true') {
      // Supprimer tous les logs
      const result = await query('DELETE FROM connection_logs RETURNING id');
      deletedCount = result.rowCount;
    } else if (olderThan) {
      // Supprimer les logs plus anciens qu'une date
      const result = await query(
        'DELETE FROM connection_logs WHERE created_at < $1 RETURNING id',
        [olderThan]
      );
      deletedCount = result.rowCount;
    } else if (userId) {
      // Supprimer les logs d'un utilisateur spécifique
      const result = await query(
        'DELETE FROM connection_logs WHERE user_id = $1 RETURNING id',
        [userId]
      );
      deletedCount = result.rowCount;
    } else {
      return res.status(400).json({ error: 'Paramètre requis: all, olderThan ou userId' });
    }
    
    // Log interne de l'action admin
    console.log(`🗑️ [ADMIN #${adminId}] Suppression de ${deletedCount} logs de connexion`);
    
    // Enregistrer l'action dans les logs système (optionnel - log spécial admin)
    await query(`
      INSERT INTO connection_logs (user_id, action, status, failure_reason)
      VALUES ($1, 'admin_action', 'success', $2)
    `, [adminId, `Suppression de ${deletedCount} logs`]);
    
    res.json({ 
      success: true, 
      deletedCount,
      message: `${deletedCount} log(s) supprimé(s)`
    });
  } catch (error) {
    console.error('Erreur suppression logs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/supervision/logs/:logId - Supprimer un log spécifique
router.delete('/logs/:logId', isAdmin, async (req, res) => {
  const { logId } = req.params;
  const adminId = req.headers['x-user-id'];
  
  try {
    const result = await query(
      'DELETE FROM connection_logs WHERE id = $1 RETURNING id',
      [logId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Log non trouvé' });
    }
    
    console.log(`🗑️ [ADMIN #${adminId}] Suppression du log #${logId}`);
    
    res.json({ success: true, message: 'Log supprimé' });
  } catch (error) {
    console.error('Erreur suppression log:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Fonction utilitaire pour enregistrer une connexion
router.logConnection = async (userId, action, status, ipAddress, userAgent, failureReason = null) => {
  try {
    await query(`
      INSERT INTO connection_logs (user_id, action, ip_address, user_agent, status, failure_reason)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [userId, action, ipAddress, userAgent, status, failureReason]);
  } catch (error) {
    console.error('Erreur enregistrement log connexion:', error);
  }
};

// Fonction pour ajouter une session active
router.addActiveSession = async (userId, socketId, ipAddress, userAgent) => {
  try {
    await query(`
      INSERT INTO active_sessions (user_id, socket_id, ip_address, user_agent)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, socket_id) DO UPDATE SET
        last_activity = CURRENT_TIMESTAMP
    `, [userId, socketId, ipAddress, userAgent]);
  } catch (error) {
    console.error('Erreur ajout session active:', error);
  }
};

// Fonction pour supprimer une session active
router.removeActiveSession = async (socketId) => {
  try {
    const result = await query(
      'DELETE FROM active_sessions WHERE socket_id = $1 RETURNING user_id',
      [socketId]
    );
    return result.rows[0]?.user_id;
  } catch (error) {
    console.error('Erreur suppression session active:', error);
  }
};

// Fonction pour mettre à jour l'activité
router.updateActivity = async (socketId) => {
  try {
    await query(
      'UPDATE active_sessions SET last_activity = CURRENT_TIMESTAMP WHERE socket_id = $1',
      [socketId]
    );
  } catch (error) {
    console.error('Erreur mise à jour activité:', error);
  }
};

module.exports = router;
