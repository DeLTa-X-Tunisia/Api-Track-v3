const { Server } = require('socket.io');
const { query } = require('./database');

let io = null;

// Track connected users in memory (for real-time updates)
const connectedUsers = new Map();

/**
 * Initialize Socket.IO server
 * @param {http.Server} httpServer - HTTP server instance
 */
const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Connection handler
  io.on('connection', (socket) => {
    const clientId = socket.id;
    console.log(`🔌 Socket connected [${clientId}]`);

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
      console.log(`❌ Socket disconnected [${clientId}] reason: ${reason}`);
      
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
  return io;
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
 */
const forceDisconnect = (socketId) => {
  if (io) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit('force-logout');
      socket.disconnect(true);
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

module.exports = {
  initializeSocket,
  getIO,
  emitToAll,
  emitToRoom,
  getConnectedUsers,
  forceDisconnect,
  SOCKET_EVENTS,
};
