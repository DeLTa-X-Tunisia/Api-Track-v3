const { Pool } = require('pg');
require('dotenv').config();

// ============================================
// OPTIMIZED DATABASE POOL CONFIGURATION
// Supports 50+ concurrent connections
// ============================================

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'apitrack',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '2012704',
  
  // Pool sizing for high concurrency (50+ users)
  max: parseInt(process.env.DB_POOL_MAX) || 100,           // Maximum connections in pool
  min: parseInt(process.env.DB_POOL_MIN) || 10,            // Minimum connections to maintain
  
  // Timeout configuration
  idleTimeoutMillis: 30000,                                 // Close idle clients after 30s
  connectionTimeoutMillis: 5000,                            // Connection timeout 5s (increased)
  
  // Query timeout to prevent hanging connections
  statement_timeout: 30000,                                 // Kill queries after 30s
  query_timeout: 30000,                                     // Additional query timeout
  
  // Allow exit even if pool has active connections
  allowExitOnIdle: true,
});

// Connection pool metrics
let poolMetrics = {
  totalConnections: 0,
  idleConnections: 0,
  waitingClients: 0,
  lastUpdated: new Date()
};

// Update metrics periodically
const updatePoolMetrics = () => {
  poolMetrics = {
    totalConnections: pool.totalCount,
    idleConnections: pool.idleCount,
    waitingClients: pool.waitingCount,
    lastUpdated: new Date()
  };
};

// Log pool events
pool.on('connect', (client) => {
  updatePoolMetrics();
  console.log(`✅ DB Pool: New connection (Total: ${pool.totalCount}, Idle: ${pool.idleCount})`);
});

pool.on('acquire', (client) => {
  updatePoolMetrics();
});

pool.on('release', (client) => {
  updatePoolMetrics();
});

pool.on('remove', (client) => {
  updatePoolMetrics();
  console.log(`🔄 DB Pool: Connection removed (Total: ${pool.totalCount})`);
});

pool.on('error', (err, client) => {
  console.error('❌ Unexpected error on idle client:', err.message);
  // Don't exit on error - let the pool handle recovery
});

// Optimized query helper with timeout
const query = async (text, params, timeout = 30000) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Only log slow queries (>100ms) to reduce console noise
    if (duration > 100) {
      console.log(`📊 Slow query (${duration}ms): ${text.substring(0, 50)}...`);
    }
    
    return res;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`❌ Query error after ${duration}ms:`, error.message);
    throw error;
  }
};

// Get a client from the pool (for transactions)
const getClient = async () => {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = () => {
    client.release();
  };
  return { client, query, release };
};

// Test connection
const testConnection = async () => {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Database connection test successful:', res.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    return false;
  }
};

// Get current pool metrics
const getPoolMetrics = () => {
  updatePoolMetrics();
  return poolMetrics;
};

// Graceful shutdown
const closePool = async () => {
  console.log('🔌 Closing database pool...');
  await pool.end();
  console.log('✅ Database pool closed');
};

module.exports = {
  pool,
  query,
  getClient,
  testConnection,
  getPoolMetrics,
  closePool,
};
