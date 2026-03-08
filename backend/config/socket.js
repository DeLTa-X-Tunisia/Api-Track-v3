const { Server } = require('socket.io');

let io = null;

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
    socket.on('disconnect', (reason) => {
      console.log(`❌ Socket disconnected [${clientId}] reason: ${reason}`);
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
  SOCKET_EVENTS,
};
