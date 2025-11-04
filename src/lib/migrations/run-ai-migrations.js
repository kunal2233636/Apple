// ============================================================================
// AI DATABASE MIGRATION RUNNER - Node.js Script
// ============================================================================

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration in .env file');
  console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Execute SQL migration file
 */
async function executeMigration(migrationPath, migrationName) {
  try {
    console.log(`\n🔄 Executing migration: ${migrationName}`);
    
    // Read SQL file
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split into individual statements (handle semicolons not in comments/strings)
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'))
      .map(stmt => stmt + ';');
    
    let executedStatements = 0;
    let errors = [];
    
    for (const statement of statements) {
      try {
        // For safety, execute simple DDL statements one by one
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.log(`⚠️  Warning in statement: ${statement.substring(0, 100)}...`);
          console.log(`   Error: ${error.message}`);
          errors.push(error.message);
        } else {
          executedStatements++;
        }
      } catch (stmtError) {
        console.log(`⚠️  Error in statement: ${statement.substring(0, 100)}...`);
        console.log(`   Error: ${stmtError.message}`);
        errors.push(stmtError.message);
      }
    }
    
    console.log(`✅ Migration ${migrationName} completed: ${executedStatements} statements executed`);
    if (errors.length > 0) {
      console.log(`⚠️  ${errors.length} warnings/errors occurred`);
    }
    
    return { success: true, statements: executedStatements, errors };
    
  } catch (error) {
    console.error(`❌ Migration ${migrationName} failed:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test table existence and basic operations
 */
async function testTables() {
  console.log('\n🧪 Testing table operations...');
  
  const tables = [
    'chat_conversations',
    'chat_messages',
    'study_chat_memory',
    'memory_summaries',
    'student_ai_profile',
    'api_usage_logs',
    'ai_system_prompts'
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.message.includes('relation "public.' + table + '" does not exist')) {
          console.log(`❌ Table ${table} does not exist`);
        } else {
          console.log(`⚠️  Table ${table} exists but query failed: ${error.message}`);
        }
      } else {
        console.log(`✅ Table ${table} is accessible`);
      }
    } catch (error) {
      console.log(`❌ Error testing table ${table}:`, error.message);
    }
  }
}

/**
 * Test vector extension
 */
async function testVectorExtension() {
  console.log('\n🔬 Testing vector extension...');
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: "SELECT extname FROM pg_extension WHERE extname = 'vector';"
    });
    
    if (error) {
      console.log('❌ Vector extension check failed:', error.message);
    } else if (data && data.length > 0) {
      console.log('✅ Vector extension is enabled');
    } else {
      console.log('❌ Vector extension is not enabled');
    }
  } catch (error) {
    console.log('❌ Vector extension test failed:', error.message);
  }
}

/**
 * Test RLS policies
 */
async function testRLSPolicies() {
  console.log('\n🔐 Testing RLS policies...');
  
  const policies = [
    'Users can view their own conversations',
    'Users can view their own memory',
    'Users can view their own profile',
    'Users can view their own API usage logs'
  ];
  
  for (const policy of policies) {
    try {
      const { data, error } = await supabase
        .from('pg_policies')
        .select('policyname')
        .eq('policyname', policy);
      
      if (error) {
        console.log(`❌ Policy check failed for ${policy}:`, error.message);
      } else if (data && data.length > 0) {
        console.log(`✅ RLS policy ${policy} exists`);
      } else {
        console.log(`❌ RLS policy ${policy} not found`);
      }
    } catch (error) {
      console.log(`❌ Error checking policy ${policy}:`, error.message);
    }
  }
}

/**
 * Generate migration report
 */
function generateReport(results) {
  console.log('\n📊 MIGRATION REPORT');
  console.log('==================');
  
  const totalMigrations = results.length;
  const successfulMigrations = results.filter(r => r.success).length;
  const failedMigrations = totalMigrations - successfulMigrations;
  
  console.log(`Total migrations: ${totalMigrations}`);
  console.log(`Successful: ${successfulMigrations}`);
  console.log(`Failed: ${failedMigrations}`);
  
  if (failedMigrations > 0) {
    console.log('\n❌ Failed migrations:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.name}: ${r.error}`);
    });
  }
  
  console.log('\n✅ Next steps:');
  console.log('1. Run the SQL migrations manually in Supabase dashboard if needed');
  console.log('2. Test the database operations');
  console.log('3. Update TypeScript types once tables are created');
  console.log('4. Deploy to production');
}

/**
 * Main migration runner
 */
async function runMigrations() {
  console.log('🚀 Starting AI Database Migrations');
  console.log('=================================');
  
  // Migration files in order
  const migrations = [
    {
      name: 'Create AI Tables',
      path: path.join(__dirname, 'create_ai_tables.sql'),
      required: true
    },
    {
      name: 'Create RLS Policies', 
      path: path.join(__dirname, 'create_rls_policies.sql'),
      required: true
    },
    {
      name: 'Create Performance Indexes',
      path: path.join(__dirname, 'create_indexes.sql'),
      required: false
    },
    {
      name: 'Create Automation Functions',
      path: path.join(__dirname, 'create_automation_functions.sql'),
      required: false
    }
  ];
  
  const results = [];
  
  // Execute migrations in sequence
  for (const migration of migrations) {
    try {
      // Check if file exists
      if (!fs.existsSync(migration.path)) {
        console.log(`⚠️  Migration file not found: ${migration.path}`);
        results.push({
          name: migration.name,
          success: false,
          error: 'Migration file not found'
        });
        continue;
      }
      
      // Execute migration
      const result = await executeMigration(migration.path, migration.name);
      results.push({
        name: migration.name,
        ...result
      });
      
      // Add delay between migrations
      if (migration !== migrations[migrations.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } catch (error) {
      console.error(`❌ Unexpected error in migration ${migration.name}:`, error);
      results.push({
        name: migration.name,
        success: false,
        error: error.message
      });
    }
  }
  
  // Test the system
  console.log('\n🔍 Running system tests...');
  await testVectorExtension();
  await testTables();
  await testRLSPolicies();
  
  // Generate report
  generateReport(results);
  
  // Exit with appropriate code
  const failedRequired = results.some(r => r.required && !r.success);
  process.exit(failedRequired ? 1 : 0);
}

// Handle script execution
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('\n🎉 Migration process completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Migration process failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigrations };