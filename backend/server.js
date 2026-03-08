const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
require('dotenv').config();

const { testConnection } = require('./config/database');
const { initializeSocket } = require('./config/socket');

// Import routes
const gradesRoutes = require('./routes/grades');
const nuancesRoutes = require('./routes/nuances');
const fournisseursRoutes = require('./routes/fournisseurs');
const bobinesRoutes = require('./routes/bobines');
const usersRoutes = require('./routes/users');
const lotsRoutes = require('./routes/lots');
const tubesRoutes = require('./routes/tubes');
const reparationsRoutes = require('./routes/reparations');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`📥 [${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const dbStatus = await testConnection();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus ? 'connected' : 'disconnected',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.message);
  res.status(err.status || 500).json({
    error: 'Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
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
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🚀 Api-Track Backend Server                        ║
║                                                       ║
║   📡 Server:    http://localhost:${PORT}               ║
║   🔗 API:       http://localhost:${PORT}/api           ║
║   💚 Health:    http://localhost:${PORT}/api/health    ║
║   🔌 Socket:    WebSocket enabled ✅                  ║
║   🌍 Env:       ${(process.env.NODE_ENV || 'development').padEnd(12)}                    ║
║   🗄️  Database:  ${dbConnected ? 'Connected ✅' : 'Disconnected ⚠️'}                ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
    `);
  });
};

startServer();
