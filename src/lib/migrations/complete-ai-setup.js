// ============================================================================
// MASTER AI DATABASE MIGRATION SCRIPT - Complete Setup
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
 * Complete AI Database Setup
 */
class AIMigrationManager {
  constructor() {
    this.results = {
      migrations: [],
      tests: [],
      errors: [],
      warnings: []
    };
  }

  /**
   * Execute a SQL migration file
   */
  async executeSQLFile(filePath, description) {
    try {
      console.log(`\n🔄 Executing: ${description}`);
      console.log(`📄 File: ${filePath}`);
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`Migration file not found: ${filePath}`);
      }

      const sql = fs.readFileSync(filePath, 'utf8');
      
      // Split SQL into statements, handling comments and strings
      const statements = this.splitSQLStatements(sql);
      
      console.log(`📊 Found ${statements.length} SQL statements`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i].trim();
        
        if (!statement || statement.startsWith('--') || statement.startsWith('/*')) {
          continue;
        }

        try {
          const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
          
          if (error) {
            console.log(`⚠️  Statement ${i + 1} warning: ${error.message.substring(0, 100)}...`);
            errorCount++;
            this.results.warnings.push(`${description} - Statement ${i + 1}: ${error.message}`);
          } else {
            successCount++;
          }
        } catch (stmtError) {
          console.log(`❌ Statement ${i + 1} error: ${stmtError.message.substring(0, 100)}...`);
          errorCount++;
          this.results.errors.push(`${description} - Statement ${i + 1}: ${stmtError.message}`);
        }
      }
      
      console.log(`✅ ${description} completed: ${successCount} successful, ${errorCount} warnings/errors`);
      
      this.results.migrations.push({
        name: description,
        success: errorCount === 0,
        statements: statements.length,
        successCount,
        errorCount
      });
      
      return { success: errorCount === 0, statements: statements.length, successCount, errorCount };
      
    } catch (error) {
      console.error(`❌ ${description} failed:`, error.message);
      this.results.errors.push(`${description}: ${error.message}`);
      this.results.migrations.push({
        name: description,
        success: false,
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Split SQL into individual statements
   */
  splitSQLStatements(sql) {
    // Simple splitting by semicolon, ignoring those in strings/comments
    const statements = [];
    let current = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inComment = false;
    
    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      const nextChar = sql[i + 1];
      
      // Handle comments
      if (!inSingleQuote && !inDoubleQuote) {
        if (char === '-' && nextChar === '-') {
          inComment = true;
          current += char;
          continue;
        }
        if (char === '/' && nextChar === '*') {
          inComment = true;
          current += char;
          continue;
        }
        if (char === '*' && nextChar === '/') {
          inComment = false;
          current += char;
          continue;
        }
      }
      
      if (inComment) {
        if (char === '\n') {
          inComment = false;
        }
        current += char;
        continue;
      }
      
      // Handle quotes
      if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote;
      } else if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
      }
      
      // Handle semicolons
      if (char === ';' && !inSingleQuote && !inDoubleQuote) {
        if (current.trim()) {
          statements.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current.trim()) {
      statements.push(current.trim());
    }
    
    return statements;
  }

  /**
   * Test database functionality
   */
  async runTests() {
    console.log('\n🧪 Running Database Tests');
    console.log('==========================');
    
    // Test table existence
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
        const { data, error } = await supabase.from(table).select('count').limit(1);
        
        if (error) {
          if (error.message.includes(`relation "public.${table}" does not exist`)) {
            console.log(`❌ Table ${table} does not exist`);
            this.results.tests.push({ table, status: 'missing', error: 'Table not found' });
          } else {
            console.log(`⚠️  Table ${table} exists but query failed: ${error.message}`);
            this.results.tests.push({ table, status: 'warning', error: error.message });
          }
        } else {
          console.log(`✅ Table ${table} is accessible`);
          this.results.tests.push({ table, status: 'success' });
        }
      } catch (error) {
        console.log(`❌ Error testing table ${table}:`, error.message);
        this.results.tests.push({ table, status: 'error', error: error.message });
      }
    }

    // Test vector extension
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: "SELECT extname FROM pg_extension WHERE extname = 'vector';"
      });
      
      if (error || !data || data.length === 0) {
        console.log('❌ Vector extension not enabled');
        this.results.tests.push({ test: 'vector_extension', status: 'failed', error: 'Extension not found' });
      } else {
        console.log('✅ Vector extension is enabled');
        this.results.tests.push({ test: 'vector_extension', status: 'success' });
      }
    } catch (error) {
      console.log('❌ Error testing vector extension:', error.message);
      this.results.tests.push({ test: 'vector_extension', status: 'error', error: error.message });
    }

    // Test system prompts
    try {
      const { data, error } = await supabase
        .from('ai_system_prompts')
        .select('name, is_active');
      
      if (error) {
        console.log('❌ Cannot query system prompts:', error.message);
        this.results.tests.push({ test: 'system_prompts', status: 'error', error: error.message });
      } else {
        const requiredPrompts = ['hinglish_chat_general', 'hinglish_chat_with_data'];
        const existingPrompts = data.map(p => p.name);
        const missing = requiredPrompts.filter(p => !existingPrompts.includes(p));
        
        if (missing.length === 0) {
          console.log('✅ Required system prompts exist');
          this.results.tests.push({ test: 'system_prompts', status: 'success' });
        } else {
          console.log(`❌ Missing system prompts: ${missing.join(', ')}`);
          this.results.tests.push({ test: 'system_prompts', status: 'failed', error: `Missing: ${missing.join(', ')}` });
        }
      }
    } catch (error) {
      console.log('❌ Error testing system prompts:', error.message);
      this.results.tests.push({ test: 'system_prompts', status: 'error', error: error.message });
    }
  }

  /**
   * Generate comprehensive report
   */
  generateReport() {
    console.log('\n📊 MIGRATION EXECUTION REPORT');
    console.log('=================================');
    
    // Migration summary
    console.log('\n🔄 MIGRATIONS:');
    this.results.migrations.forEach(migration => {
      const status = migration.success ? '✅' : '❌';
      console.log(`${status} ${migration.name}`);
      if (migration.statements) {
        console.log(`   ${migration.successCount}/${migration.statements} statements successful`);
      }
      if (migration.error) {
        console.log(`   Error: ${migration.error}`);
      }
    });
    
    // Test summary
    console.log('\n🧪 TESTS:');
    const testCounts = this.results.tests.reduce((acc, test) => {
      acc[test.status] = (acc[test.status] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(testCounts).forEach(([status, count]) => {
      const icon = status === 'success' ? '✅' : status === 'warning' ? '⚠️' : '❌';
      console.log(`${icon} ${status}: ${count}`);
    });
    
    // Issues summary
    console.log('\n⚠️  ISSUES:');
    if (this.results.errors.length === 0 && this.results.warnings.length === 0) {
      console.log('🎉 No issues detected!');
    } else {
      if (this.results.errors.length > 0) {
        console.log(`❌ ${this.results.errors.length} errors:`);
        this.results.errors.slice(0, 5).forEach(error => {
          console.log(`   • ${error}`);
        });
        if (this.results.errors.length > 5) {
          console.log(`   ... and ${this.results.errors.length - 5} more errors`);
        }
      }
      
      if (this.results.warnings.length > 0) {
        console.log(`⚠️  ${this.results.warnings.length} warnings:`);
        this.results.warnings.slice(0, 3).forEach(warning => {
          console.log(`   • ${warning}`);
        });
        if (this.results.warnings.length > 3) {
          console.log(`   ... and ${this.results.warnings.length - 3} more warnings`);
        }
      }
    }
    
    // Success rate
    const totalMigrations = this.results.migrations.length;
    const successfulMigrations = this.results.migrations.filter(m => m.success).length;
    const successRate = totalMigrations > 0 ? (successfulMigrations / totalMigrations * 100).toFixed(1) : 0;
    
    console.log('\n📈 SUMMARY:');
    console.log(`Success Rate: ${successRate}%`);
    console.log(`Total Migrations: ${totalMigrations}`);
    console.log(`Successful: ${successfulMigrations}`);
    console.log(`Failed: ${totalMigrations - successfulMigrations}`);
    console.log(`Tests Run: ${this.results.tests.length}`);
    
    // Recommendations
    console.log('\n🎯 RECOMMENDATIONS:');
    if (successfulMigrations === totalMigrations) {
      console.log('✅ All migrations successful! System is ready for use.');
      console.log('📋 Next steps:');
      console.log('   1. Update TypeScript types if needed');
      console.log('   2. Run integration tests');
      console.log('   3. Deploy to production');
    } else {
      console.log('⚠️  Some migrations failed. Review and fix issues:');
      console.log('   1. Check error messages above');
      console.log('   2. Fix any database permission issues');
      console.log('   3. Ensure required extensions are enabled');
      console.log('   4. Retry failed migrations');
    }
    
    if (testCounts.failed > 0 || testCounts.error > 0) {
      console.log('⚠️  Some tests failed. Review table creation and RLS policies.');
    }
  }

  /**
   * Main execution method
   */
  async run() {
    console.log('🚀 Starting Complete AI Database Migration');
    console.log('===========================================');
    
    const startTime = Date.now();
    
    // Migration files in order
    const migrations = [
      {
        file: path.join(__dirname, 'create_ai_tables.sql'),
        description: 'Create AI Tables and Extensions'
      },
      {
        file: path.join(__dirname, 'create_rls_policies.sql'),
        description: 'Setup Row Level Security Policies'
      },
      {
        file: path.join(__dirname, 'create_indexes.sql'),
        description: 'Create Performance Indexes'
      },
      {
        file: path.join(__dirname, 'create_automation_functions.sql'),
        description: 'Setup Automation Functions and Triggers'
      }
    ];
    
    // Execute migrations sequentially
    for (const migration of migrations) {
      await this.executeSQLFile(migration.file, migration.description);
      
      // Small delay between migrations
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Run tests
    await this.runTests();
    
    // Generate report
    this.generateReport();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n⏱️  Total execution time: ${duration} seconds`);
    
    // Return success status
    const hasErrors = this.results.errors.length > 0;
    const criticalMigrationsFailed = this.results.migrations.some(m => !m.success);
    
    return {
      success: !hasErrors && !criticalMigrationsFailed,
      results: this.results,
      duration: parseFloat(duration)
    };
  }
}

/**
 * Rollback function (for emergency use)
 */
async function rollback() {
  console.log('🚨 EMERGENCY ROLLBACK INITIATED');
  console.log('=================================');
  
  const rollbackSQL = `
    -- Drop AI tables in reverse dependency order
    DROP TABLE IF EXISTS study_chat_memory CASCADE;
    DROP TABLE IF EXISTS memory_summaries CASCADE;
    DROP TABLE IF EXISTS chat_messages CASCADE;
    DROP TABLE IF EXISTS chat_conversations CASCADE;
    DROP TABLE IF EXISTS api_usage_logs CASCADE;
    DROP TABLE IF EXISTS student_ai_profile CASCADE;
    DROP TABLE IF EXISTS ai_system_prompts CASCADE;
    
    -- Drop functions
    DROP FUNCTION IF EXISTS clean_expired_memory();
    DROP FUNCTION IF EXISTS generate_memory_summaries();
    DROP FUNCTION IF EXISTS log_api_usage(UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, BOOLEAN, TEXT);
    DROP FUNCTION IF EXISTS create_chat_conversation(UUID, TEXT, TEXT);
    DROP FUNCTION IF EXISTS add_chat_message(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, BOOLEAN);
    DROP FUNCTION IF EXISTS add_study_memory(UUID, TEXT, vector, INTEGER, TEXT[], UUID);
    DROP FUNCTION IF EXISTS find_similar_memories(UUID, vector, INTEGER, FLOAT);
    DROP FUNCTION IF EXISTS run_maintenance_tasks();
    DROP FUNCTION IF EXISTS update_updated_at_column();
    DROP FUNCTION IF EXISTS update_conversation_timestamp();
    
    -- Drop indexes (if any remain)
    DROP INDEX IF EXISTS idx_chat_conversations_user_id;
    DROP INDEX IF EXISTS idx_chat_conversations_updated_at;
    DROP INDEX IF EXISTS idx_chat_messages_conversation_id;
    DROP INDEX IF EXISTS idx_study_chat_memory_user_id;
    DROP INDEX IF EXISTS idx_study_chat_memory_embedding;
  `;
  
  try {
    const statements = rollbackSQL.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      const { error } = await supabase.rpc('exec_sql', { sql: statement.trim() });
      if (error) {
        console.log(`⚠️  Rollback warning: ${error.message}`);
      }
    }
    
    console.log('✅ Emergency rollback completed');
    return true;
  } catch (error) {
    console.error('❌ Emergency rollback failed:', error.message);
    return false;
  }
}

/**
 * Main CLI handler
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--rollback')) {
    const success = await rollback();
    process.exit(success ? 0 : 1);
  }
  
  const migrator = new AIMigrationManager();
  const result = await migrator.run();
  
  // Save results to file
  const resultsFile = path.join(__dirname, 'migration-results.json');
  fs.writeFileSync(resultsFile, JSON.stringify(result, null, 2));
  console.log(`\n💾 Results saved to: ${resultsFile}`);
  
  process.exit(result.success ? 0 : 1);
}

// Handle execution
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { AIMigrationManager, rollback };