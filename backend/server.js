const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { testConnection, getPoolMetrics, closePool } = require('./config/database');
const { initializeSocket, getSocketMetrics } = require('./config/socket');

// Import routes
const gradesRoutes = require('./routes/grades');
const nuancesRoutes = require('./routes/nuances');
const fournisseursRoutes = require('./routes/fournisseurs');
const bobinesRoutes = require('./routes/bobines');
const usersRoutes = require('./routes/users');
const lotsRoutes = require('./routes/lots');
const tubesRoutes = require('./routes/tubes');
const reparationsRoutes = require('./routes/reparations');
const supervisionRoutes = require('./routes/supervision');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// ============================================
// PERFORMANCE OPTIMIZATIONS FOR 50+ USERS
// ============================================

// Increase Node.js event listeners limit
require('events').EventEmitter.defaultMaxListeners = 100;
process.setMaxListeners(100);

// Enable keep-alive connections  
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet for security headers (relaxed for API)
app.use(helmet({
  contentSecurityPolicy: false,           // Disable CSP for API
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ============================================
// COMPRESSION MIDDLEWARE
// ============================================

// Gzip compression for responses > 1KB
app.use(compression({
  level: 6,                               // Compression level (1-9)
  threshold: 1024,                        // Only compress > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// ============================================
// RATE LIMITING (adjusted for 50+ users)
// ============================================

// General API rate limiter (generous for high concurrency)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,                    // 1 minute window
  max: (req) => {
    // Higher limit for localhost (testing/development)
    const ip = req.ip || '';
    if (ip === '127.0.0.1' || ip === '::1' || ip.includes('127.0.0.1') || ip.includes('::ffff:127.0.0.1')) {
      return 5000;                        // 5000 req/min for localhost
    }
    return 500;                           // 500 req/min for external IPs
  },
  message: { error: 'Trop de requêtes, veuillez réessayer plus tard' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and metrics
    return req.path === '/api/health' || req.path === '/api/metrics';
  },
  // Use default keyGenerator (handles IPv6 properly)
  validate: { xForwardedForHeader: false },
});

// Stricter limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,               // 15 minutes
  max: 200,                               // 200 attempts per 15 min
  message: { error: 'Trop de tentatives, veuillez réessayer plus tard' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiters
app.use('/api', apiLimiter);
app.use('/api/users/login', authLimiter);

// ============================================
// CORS & BODY PARSING
// ============================================

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-request-id'],
}));

// JSON body parser with size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================
// REQUEST LOGGING (optimized for production)
// ============================================

app.use((req, res, next) => {
  // Only log in development or for slow requests
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development' || duration > 200) {
      console.log(`📥 ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// ============================================
// HEALTH & METRICS ENDPOINTS
// ============================================

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const dbStatus = await testConnection();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus ? 'connected' : 'disconnected',
    version: '3.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// Server metrics endpoint (for monitoring 50+ users)
app.get('/api/metrics', async (req, res) => {
  const dbMetrics = getPoolMetrics();
  const socketMetrics = getSocketMetrics();
  
  res.json({
    server: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      nodeVersion: process.version,
    },
    database: {
      ...dbMetrics,
      status: dbMetrics.totalConnections > 0 ? 'healthy' : 'warning'
    },
    socket: {
      ...socketMetrics,
      status: socketMetrics.activeConnections < 100 ? 'healthy' : 'warning'
    },
    capacity: {
      maxDbConnections: parseInt(process.env.DB_POOL_MAX) || 100,
      currentDbConnections: dbMetrics.totalConnections,
      maxSocketConnections: 'unlimited',
      currentSocketConnections: socketMetrics.activeConnections,
      peakSocketConnections: socketMetrics.peakConnections,
    }
  });
});

// API Info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Api-Track Backend',
    version: '1.0.0',
    description: 'Backend API pour le suivi de production',
    endpoints: {
      health: '/api/health',
      dashboard: '/api/dashboard (coming soon)',
      workflow: '/api/workflow (coming soon)',
      products: '/api/products (coming soon)',
      teams: '/api/teams (coming soon)',
    },
  });
});

// Dashboard Stats endpoint - Real-time production data
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const { query } = require('./config/database');
    
    // Get tube counts by status
    const tubeStats = await query(`
      SELECT 
        statut,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE is_cross_welding = true) as cross_welding_count
      FROM tubes 
      GROUP BY statut
    `);
    
    // Get total tubes and today's tubes
    const totalTubes = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today
      FROM tubes
    `);
    
    // Get lots stats
    const lotStats = await query(`
      SELECT 
        statut,
        COUNT(*) as count
      FROM lots 
      GROUP BY statut
    `);
    
    // Get total lots
    const totalLots = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today
      FROM lots
    `);
    
    // Get bobines stats
    const bobineStats = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE statut = 'active') as active,
        COUNT(*) FILTER (WHERE statut = 'épuisée') as used,
        COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today
      FROM bobines
    `);
    
    // Get pipeline progress (tubes with all stages validated)
    const pipelineStats = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE formage_validee = true) as formage,
        COUNT(*) FILTER (WHERE pointage_validee = true) as pointage,
        COUNT(*) FILTER (WHERE cv_pointage_validee = true) as cv_pointage,
        COUNT(*) FILTER (WHERE saw_validee = true) as saw,
        COUNT(*) FILTER (WHERE cv_cordon_validee = true) as cv_cordon,
        COUNT(*) FILTER (WHERE macro_validee = true) as macro,
        COUNT(*) FILTER (WHERE chanfrein_validee = true) as chanfrein,
        COUNT(*) FILTER (WHERE hydrotest_validee = true) as hydrotest,
        COUNT(*) FILTER (WHERE cv_fuite_validee = true) as cv_fuite,
        COUNT(*) FILTER (WHERE ut_validee = true) as ut,
        COUNT(*) FILTER (WHERE radio_validee = true) as radio,
        COUNT(*) FILTER (WHERE controle_dim_validee = true) as controle_dim
      FROM tubes
    `);
    
    // Get recent activity (last 10 tube stage validations)
    const recentActivity = await query(`
      SELECT 
        h.id,
        h.stage,
        h.action,
        h.created_at,
        t.numero as tube_numero,
        h.validator_name as user_nom
      FROM tube_stage_history h
      JOIN tubes t ON h.tube_id = t.id
      WHERE h.deleted_at IS NULL
      ORDER BY h.created_at DESC
      LIMIT 10
    `);
    
    // Get production by day (last 7 days)
    const weeklyProduction = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM tubes
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);
    
    // Format status counts
    const statusCounts = {};
    tubeStats.rows.forEach(row => {
      statusCounts[row.statut] = {
        count: parseInt(row.count),
        crossWelding: parseInt(row.cross_welding_count)
      };
    });
    
    // Format lot status counts
    const lotStatusCounts = {};
    lotStats.rows.forEach(row => {
      lotStatusCounts[row.statut] = parseInt(row.count);
    });
    
    // Format activity
    const activities = recentActivity.rows.map(row => {
      const stageNames = {
        formage: 'Formage',
        pointage: 'Pointage',
        cv_pointage: 'CV Pointage',
        saw: 'SAW',
        cv_cordon: 'CV Cordon',
        macro: 'Macro',
        chanfrein: 'Chanfrein',
        hydrotest: 'Hydrotest',
        cv_fuite: 'CV Fuite',
        ut: 'UT',
        radio: 'Radio Scopie',
        controle_dim: 'Ctrl Dim'
      };
      
      const actionTypes = {
        validate: 'success',
        repair: 'warning',
        skip: 'info',
        interrupt: 'error',
        redo: 'info'
      };
      
      return {
        id: row.id,
        title: `Tube ${row.tube_numero} - ${stageNames[row.stage] || row.stage} (${row.action})`,
        time: row.created_at,
        type: actionTypes[row.action] || 'info',
        user: row.user_nom
      };
    });
    
    res.json({
      tubes: {
        total: parseInt(totalTubes.rows[0]?.total || 0),
        today: parseInt(totalTubes.rows[0]?.today || 0),
        byStatus: statusCounts
      },
      lots: {
        total: parseInt(totalLots.rows[0]?.total || 0),
        today: parseInt(totalLots.rows[0]?.today || 0),
        byStatus: lotStatusCounts
      },
      bobines: {
        total: parseInt(bobineStats.rows[0]?.total || 0),
        active: parseInt(bobineStats.rows[0]?.active || 0),
        used: parseInt(bobineStats.rows[0]?.used || 0),
        today: parseInt(bobineStats.rows[0]?.today || 0)
      },
      pipeline: pipelineStats.rows[0] || {},
      recentActivity: activities,
      weeklyProduction: weeklyProduction.rows.map(row => ({
        date: row.date,
        count: parseInt(row.count)
      }))
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des statistiques' });
  }
});

// API Routes
app.use('/api/grades', gradesRoutes);
app.use('/api/nuances', nuancesRoutes);
app.use('/api/fournisseurs', fournisseursRoutes);
app.use('/api/bobines', bobinesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/lots', lotsRoutes);
app.use('/api/tubes', tubesRoutes);
app.use('/api/reparations', reparationsRoutes);
app.use('/api/supervision', supervisionRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler (improved for production)
app.use((err, req, res, next) => {
  const status = err.status || 500;
  console.error(`❌ [${status}] ${req.method} ${req.path}:`, err.message);
  
  // Don't expose internal errors in production
  res.status(status).json({
    error: status < 500 ? err.message : 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ============================================
// GRACEFUL SHUTDOWN HANDLING
// ============================================

let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log(`\n⚠️  Received ${signal}. Starting graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(async () => {
    console.log('✅ HTTP server closed');
    
    try {
      // Close database pool
      await closePool();
      console.log('✅ Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    console.error('❌ Could not close connections in time, forcing shutdown');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server
const startServer = async () => {
  // Test database connection
  const dbConnected = await testConnection();
  
  if (!dbConnected) {
    console.warn('⚠️  Starting server without database connection');
  }

  // Initialize Socket.IO
  const io = initializeSocket(server);

  server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 Api-Track Backend Server v3.0.0                     ║
║   ⚡ Optimized for 50+ concurrent users                   ║
║                                                           ║
║   📡 Server:    http://localhost:${PORT}                   ║
║   🔗 API:       http://localhost:${PORT}/api               ║
║   💚 Health:    http://localhost:${PORT}/api/health        ║
║   📊 Metrics:   http://localhost:${PORT}/api/metrics       ║
║   🔌 Socket:    WebSocket enabled ✅                      ║
║   🌍 Env:       ${(process.env.NODE_ENV || 'development').padEnd(15)}                 ║
║   🗄️  Database:  ${dbConnected ? 'Connected ✅   ' : 'Disconnected ⚠️'}               ║
║   🔒 Security:  Helmet + Rate Limiting ✅                 ║
║   📦 Compress:  Gzip enabled ✅                           ║
║   🏊 DB Pool:   100 connections max                       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
  });
};

startServer();
