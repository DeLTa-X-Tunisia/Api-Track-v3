const { Server } = require('socket.io');
const { query } = require('./database');

let io = null;
let inactivityCheckInterval = null;

// Configuration for auto-disconnect
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const INACTIVITY_CHECK_INTERVAL_MS = 30 * 1000; // Check every 30 seconds

// Track connected users in memory (for real-time updates)
const connectedUsers = new Map();

// Socket metrics
let socketMetrics = {
  totalConnections: 0,
  activeConnections: 0,
  peakConnections: 0,
  messagesPerSecond: 0,
  lastUpdated: new Date()
};

/**
 * Initialize Socket.IO server with optimized settings for 50+ concurrent users
 * @param {http.Server} httpServer - HTTP server instance
 */
const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      credentials: true,
    },
    
    // Connection settings optimized for high concurrency
    pingTimeout: 60000,                                    // 60s before considering disconnected
    pingInterval: 25000,                                   // Heartbeat every 25s
    connectTimeout: 45000,                                 // 45s to establish connection
    
    // Performance optimizations
    transports: ['websocket', 'polling'],                 // Prefer WebSocket
    allowUpgrades: true,                                   // Allow transport upgrades
    upgradeTimeout: 10000,                                 // 10s for transport upgrade
    
    // Capacity settings
    maxHttpBufferSize: 1e6,                               // 1MB max message size
    perMessageDeflate: {                                   // Enable compression
      threshold: 1024,                                     // Compress messages > 1KB
      zlibDeflateOptions: { level: 6 },                   // Compression level (1-9)
      zlibInflateOptions: { chunkSize: 10 * 1024 },
    },
    
    // Connection limits (adjust based on server capacity)
    path: '/socket.io/',
    serveClient: false,                                    // Don't serve socket.io client
    cookie: false,                                         // Disable cookies for better performance
  });
  
  // Increase max listeners to handle many connections
  io.setMaxListeners(100);

  // Connection handler
  io.on('connection', (socket) => {
    const clientId = socket.id;
    socketMetrics.totalConnections++;
    socketMetrics.activeConnections = io.engine.clientsCount;
    socketMetrics.peakConnections = Math.max(socketMetrics.peakConnections, socketMetrics.activeConnections);
    
    console.log(`🔌 Socket connected [${clientId}] (Active: ${socketMetrics.activeConnections}, Peak: ${socketMetrics.peakConnections})`);

    // Handle user authentication
    socket.on('user:authenticate', async (userData) => {
      if (userData && userData.userId) {
        let ipAddress = socket.handshake.address;
        const userAgent = socket.handshake.headers['user-agent'];
        
        // Clean up IPv6-mapped IPv4 addresses (::ffff:127.0.0.1 -> 127.0.0.1)
        if (ipAddress && ipAddress.startsWith('::ffff:')) {
          ipAddress = ipAddress.substring(7);
        }
        if (ipAddress === '::1') {
          ipAddress = '127.0.0.1';
        }
        
        // Store user info
        connectedUsers.set(clientId, {
          socketId: clientId,
          userId: userData.userId,
          userName: userData.nom || 'Unknown',
          userRole: userData.role || 'user',
          connectedAt: new Date(),
          ipAddress,
          userAgent
        });
        
        // Save to database - delete old sessions for this user first
        try {
          // Remove any existing sessions for this user (clean reconnects)
          await query('DELETE FROM active_sessions WHERE user_id = $1', [userData.userId]);
          
          // Insert new session
          await query(`
            INSERT INTO active_sessions (user_id, socket_id, ip_address, user_agent)
            VALUES ($1, $2, $3, $4)
          `, [userData.userId, clientId, ipAddress, userAgent]);
          
          console.log(`👤 User ${userData.nom} authenticated [${clientId}]`);
          
          // Notify admins of new connection
          io.emit('supervision:user-connected', {
            userId: userData.userId,
            userName: userData.nom,
            userRole: userData.role,
            socketId: clientId,
            connectedAt: new Date()
          });
        } catch (error) {
          console.error('Error saving active session:', error);
        }
      }
    });

    // Handle activity ping
    socket.on('user:activity', async () => {
      const user = connectedUsers.get(clientId);
      if (user) {
        try {
          await query(
            'UPDATE active_sessions SET last_activity = CURRENT_TIMESTAMP WHERE socket_id = $1',
            [clientId]
          );
        } catch (error) {
          // Silently fail
        }
      }
    });

    // Join a room based on user role (for future use)
    socket.on('join:room', (room) => {
      socket.join(room);
      console.log(`🚪 Socket ${clientId} joined room ${room}`);
    });

    // Leave a room
    socket.on('leave:room', (room) => {
      socket.leave(room);
      console.log(`🚪 Socket ${clientId} left room ${room}`);
    });

    // Handle disconnection
    socket.on('disconnect', async (reason) => {
      socketMetrics.activeConnections = Math.max(0, (io?.engine?.clientsCount || 0));
      console.log(`❌ Socket disconnected [${clientId}] reason: ${reason} (Active: ${socketMetrics.activeConnections})`);
      
      const user = connectedUsers.get(clientId);
      if (user) {
        try {
          // Remove from database
          await query('DELETE FROM active_sessions WHERE socket_id = $1', [clientId]);
          
          // Log the disconnection
          await query(`
            INSERT INTO connection_logs (user_id, action, status)
            VALUES ($1, 'logout', 'success')
          `, [user.userId]);
          
          // Notify admins
          io.emit('supervision:user-disconnected', {
            userId: user.userId,
            userName: user.userName,
            socketId: clientId,
            reason
          });
        } catch (error) {
          console.error('Error handling disconnect:', error);
        }
        
        connectedUsers.delete(clientId);
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`❌ Socket error for ${clientId}:`, error);
    });
  });

  console.log('🔌 Socket.IO initialized');
  
  // Start inactivity check interval
  startInactivityCheck();
  
  return io;
};

/**
 * Check for inactive users and disconnect them
 */
const checkInactiveUsers = async () => {
  if (!io) return;
  
  try {
    // Find sessions that have been inactive for more than INACTIVITY_TIMEOUT_MS
    const result = await query(`
      SELECT as_t.socket_id, as_t.user_id, u.nom, u.prenom, as_t.ip_address, as_t.user_agent,
             EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - as_t.last_activity)) * 1000 as inactive_ms
      FROM active_sessions as_t
      JOIN users u ON u.id = as_t.user_id
      WHERE CURRENT_TIMESTAMP - as_t.last_activity > INTERVAL '${INACTIVITY_TIMEOUT_MS / 1000} seconds'
    `);
    
    for (const session of result.rows) {
      console.log(`⏰ Auto-disconnecting inactive user: ${session.prenom} ${session.nom} (inactive for ${Math.round(session.inactive_ms / 1000)}s)`);
      
      // Get socket and emit session expired event with reason
      const socket = io.sockets.sockets.get(session.socket_id);
      if (socket) {
        socket.emit('session-expired', {
          reason: 'inactivity',
          message: 'Votre session a expiré pour cause d\'inactivité (5 minutes)'
        });
        socket.disconnect(true);
      }
      
      // Remove from database
      await query('DELETE FROM active_sessions WHERE socket_id = $1', [session.socket_id]);
      
      // Log the auto-disconnect
      await query(`
        INSERT INTO connection_logs (user_id, action, ip_address, user_agent, status, failure_reason)
        VALUES ($1, 'timeout', $2, $3, 'success', 'Déconnexion automatique après 5 minutes d\'inactivité')
      `, [session.user_id, session.ip_address, session.user_agent]);
      
      // Notify admins
      io.emit('supervision:user-disconnected', {
        userId: session.user_id,
        userName: `${session.prenom} ${session.nom}`,
        socketId: session.socket_id,
        reason: 'inactivity_timeout',
        message: 'Déconnecté automatiquement (inactivité)'
      });
      
      // Remove from memory
      connectedUsers.delete(session.socket_id);
    }
    
    if (result.rows.length > 0) {
      console.log(`✅ Auto-disconnected ${result.rows.length} inactive user(s)`);
    }
  } catch (error) {
    console.error('Error checking inactive users:', error);
  }
};

/**
 * Start the inactivity check interval
 */
const startInactivityCheck = () => {
  if (inactivityCheckInterval) {
    clearInterval(inactivityCheckInterval);
  }
  
  inactivityCheckInterval = setInterval(checkInactiveUsers, INACTIVITY_CHECK_INTERVAL_MS);
  console.log(`⏰ Inactivity check started (timeout: ${INACTIVITY_TIMEOUT_MS / 1000}s, check interval: ${INACTIVITY_CHECK_INTERVAL_MS / 1000}s)`);
};

/**
 * Stop the inactivity check interval
 */
const stopInactivityCheck = () => {
  if (inactivityCheckInterval) {
    clearInterval(inactivityCheckInterval);
    inactivityCheckInterval = null;
    console.log('⏹ Inactivity check stopped');
  }
};

/**
 * Get the Socket.IO instance
 * @returns {Server|null}
 */
const getIO = () => {
  if (!io) {
    console.warn('⚠️ Socket.IO not initialized');
  }
  return io;
};

/**
 * Get list of connected users
 * @returns {Array}
 */
const getConnectedUsers = () => {
  return Array.from(connectedUsers.values());
};

/**
 * Force disconnect a user
 * @param {string} socketId - Socket ID to disconnect
 * @param {string} reason - Reason for disconnect
 */
const forceDisconnect = async (socketId, reason = 'forced_logout') => {
  if (io) {
    const socket = io.sockets.sockets.get(socketId);
    const user = connectedUsers.get(socketId);
    
    if (socket) {
      // Emit session expired with reason
      socket.emit('session-expired', {
        reason: reason,
        message: reason === 'forced_logout' 
          ? 'Vous avez été déconnecté par un administrateur'
          : 'Votre session a expiré'
      });
      socket.disconnect(true);
      
      // Log forced disconnect
      if (user) {
        try {
          await query(`
            INSERT INTO connection_logs (user_id, action, status, failure_reason)
            VALUES ($1, 'forced_logout', 'success', $2)
          `, [user.userId, `Déconnexion forcée par administrateur`]);
        } catch (error) {
          console.error('Error logging forced disconnect:', error);
        }
      }
      
      return true;
    }
  }
  return false;
};

/**
 * Emit event to all connected clients
 * @param {string} event - Event name
 * @param {object} data - Data to send
 */
const emitToAll = (event, data) => {
  if (io) {
    io.emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Emit event to specific room
 * @param {string} room - Room name
 * @param {string} event - Event name
 * @param {object} data - Data to send
 */
const emitToRoom = (room, event, data) => {
  if (io) {
    io.to(room).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }
};

// Event types constants
const SOCKET_EVENTS = {
  // Bobines events
  BOBINE_CREATED: 'bobine:created',
  BOBINE_UPDATED: 'bobine:updated',
  BOBINE_DELETED: 'bobine:deleted',
  
  // Users events
  USER_CREATED: 'user:created',
  USER_UPDATED: 'user:updated',
  USER_DELETED: 'user:deleted',
  USER_TOGGLED: 'user:toggled',
  
  // Fournisseurs events
  FOURNISSEUR_CREATED: 'fournisseur:created',
  FOURNISSEUR_UPDATED: 'fournisseur:updated',
  FOURNISSEUR_DELETED: 'fournisseur:deleted',
  
  // Grades events
  GRADE_CREATED: 'grade:created',
  GRADE_UPDATED: 'grade:updated',
  GRADE_DELETED: 'grade:deleted',
  
  // Nuances events
  NUANCE_CREATED: 'nuance:created',
  NUANCE_UPDATED: 'nuance:updated',
  NUANCE_DELETED: 'nuance:deleted',
  
  // Lots events
  LOT_CREATED: 'lot:created',
  LOT_UPDATED: 'lot:updated',
  LOT_DELETED: 'lot:deleted',
  
  // Tubes events
  TUBE_CREATED: 'tube:created',
  TUBE_UPDATED: 'tube:updated',
  TUBE_DELETED: 'tube:deleted',
  
  // General events
  DATA_REFRESH: 'data:refresh',
};

/**
 * Get current socket metrics
 * @returns {Object} Socket metrics
 */
const getSocketMetrics = () => {
  if (io) {
    socketMetrics.activeConnections = io.engine.clientsCount;
    socketMetrics.lastUpdated = new Date();
  }
  return {
    ...socketMetrics,
    connectedUsers: connectedUsers.size
  };
};

module.exports = {
  initializeSocket,
  getIO,
  emitToAll,
  emitToRoom,
  getConnectedUsers,
  forceDisconnect,
  getSocketMetrics,
  stopInactivityCheck,
  SOCKET_EVENTS,
};
