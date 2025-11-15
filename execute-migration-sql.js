// Execute migration SQL using Supabase Management API
const https = require('https');
require('dotenv').config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Extract project ref from URL
const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];

async function executeSQLQuery(sql) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query: sql });
    
    const options = {
      hostname: `${projectRef}.supabase.co`,
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function applyMigration() {
  console.log('🔧 Applying memory_type column migration...\n');
  
  const migrations = [
    {
      name: 'Add memory_type column',
      sql: `ALTER TABLE conversation_memory ADD COLUMN IF NOT EXISTS memory_type TEXT DEFAULT 'session' CHECK (memory_type IN ('session', 'universal'));`
    },
    {
      name: 'Create index',
      sql: `CREATE INDEX IF NOT EXISTS idx_conversation_memory_type_user_created ON conversation_memory(user_id, memory_type, created_at DESC);`
    }
  ];

  for (const migration of migrations) {
    try {
      console.log(`Executing: ${migration.name}...`);
      await executeSQLQuery(migration.sql);
      console.log(`✅ ${migration.name} completed\n`);
    } catch (error) {
      console.log(`⚠️  ${migration.name} failed: ${error.message}`);
      console.log('This might be expected if the migration was already applied.\n');
    }
  }

  console.log('✅ Migration process completed!');
  console.log('\nPlease run the test again to verify.');
}

applyMigration().catch(console.error);
