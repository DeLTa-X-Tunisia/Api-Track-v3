const { getClient } = require('../config/database');

async function createConnectionLogsTable() {
  const { client, release } = await getClient();
  
  try {
    console.log('🔄 Création de la table connection_logs...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS connection_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(20) NOT NULL CHECK (action IN ('login', 'logout', 'timeout', 'forced_logout')),
        ip_address VARCHAR(45),
        user_agent TEXT,
        status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failed', 'blocked')),
        failure_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Index pour les recherches par utilisateur
      CREATE INDEX IF NOT EXISTS idx_connection_logs_user_id ON connection_logs(user_id);
      
      -- Index pour les recherches par date
      CREATE INDEX IF NOT EXISTS idx_connection_logs_created_at ON connection_logs(created_at DESC);
      
      -- Index pour les recherches par action
      CREATE INDEX IF NOT EXISTS idx_connection_logs_action ON connection_logs(action);
    `);
    
    console.log('✅ Table connection_logs créée avec succès');
    
    // Créer aussi une table pour suivre les sessions actives
    console.log('🔄 Création de la table active_sessions...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS active_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        socket_id VARCHAR(100),
        ip_address VARCHAR(45),
        user_agent TEXT,
        connected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, socket_id)
      );
      
      -- Index pour les recherches par utilisateur
      CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON active_sessions(user_id);
    `);
    
    console.log('✅ Table active_sessions créée avec succès');
    
  } catch (error) {
    console.error('❌ Erreur lors de la création des tables:', error.message);
    throw error;
  } finally {
    release();
  }
}

createConnectionLogsTable()
  .then(() => {
    console.log('✅ Migration terminée');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration échouée:', error);
    process.exit(1);
  });
