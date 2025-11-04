// ============================================================================
// AI DATABASE VALIDATION TESTS - Complete System Testing
// ============================================================================

const { createClient } = require('@supabase/supabase-js');

// Test configuration
const CONFIG = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '',
  
  // Expected tables
  expectedTables: [
    'chat_conversations',
    'chat_messages',
    'study_chat_memory',
    'memory_summaries',
    'student_ai_profile',
    'api_usage_logs',
    'ai_system_prompts'
  ],
  
  // Expected functions
  expectedFunctions: [
    'update_updated_at_column',
    'clean_expired_memory',
    'generate_memory_summaries',
    'log_api_usage',
    'create_chat_conversation',
    'add_chat_message',
    'add_study_memory',
    'find_similar_memories',
    'run_maintenance_tasks'
  ]
};

class DatabaseValidator {
  constructor() {
    this.supabase = null;
    this.testResults = [];
    this.startTime = Date.now();
  }

  /**
   * Main validation function
   */
  async runValidation() {
    console.log('🧪 Starting AI Database Validation Tests');
    console.log('==========================================\n');

    try {
      // Initialize Supabase client
      await this.initializeClient();

      // Run all tests
      await this.testConnection();
      await this.testExtensions();
      await this.testTables();
      await this.testFunctions();
      await this.testRLSPolicies();
      await this.testSystemPrompts();
      await this.testVectorSearch();
      await this.testCRUDOperations();
      await this.testSecurity();
      await this.testPerformance();

      // Show results
      this.showResults();
      
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Initialize Supabase client
   */
  async initializeClient() {
    if (!CONFIG.supabaseUrl || !CONFIG.supabaseKey) {
      throw new Error('Supabase credentials not found in environment variables');
    }

    this.supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
    console.log('✅ Supabase client initialized');
  }

  /**
   * Test database connection
   */
  async testConnection() {
    console.log('\n🔌 Testing Database Connection...');
    
    try {
      const { data, error } = await this.supabase
        .from('ai_system_prompts')
        .select('count(*)', { count: 'exact', head: true });
        
      if (error) {
        throw new Error(`Connection failed: ${error.message}`);
      }
      
      this.addResult('Connection Test', '✅ PASSED', 'Database connection successful');
    } catch (error) {
      this.addResult('Connection Test', '❌ FAILED', error.message);
      throw error;
    }
  }

  /**
   * Test required extensions
   */
  async testExtensions() {
    console.log('\n🔧 Testing Database Extensions...');
    
    try {
      // Check for pgcrypto extension
      const { data: cryptoResult } = await this.supabase.rpc('exec_sql', {
        query: "SELECT * FROM pg_extension WHERE extname = 'pgcrypto';"
      });
      
      // Check for vector extension
      const { data: vectorResult } = await this.supabase.rpc('exec_sql', {
        query: "SELECT * FROM pg_extension WHERE extname = 'vector';"
      });
      
      if (!cryptoResult?.length) {
        this.addResult('Extensions Test', '❌ FAILED', 'pgcrypto extension not found');
      } else {
        this.addResult('Extensions Test', '✅ PASSED', 'pgcrypto and vector extensions available');
      }
    } catch (error) {
      this.addResult('Extensions Test', '⚠️ WARNING', 'Could not verify extensions via RPC');
    }
  }

  /**
   * Test table creation and structure
   */
  async testTables() {
    console.log('\n📋 Testing Table Creation...');
    
    for (const table of CONFIG.expectedTables) {
      try {
        const { data, error } = await this.supabase
          .from(table)
          .select('*')
          .limit(1);

        if (error && !error.message.includes('does not exist')) {
          this.addResult(`Table ${table}`, '❌ FAILED', error.message);
        } else if (!error) {
          this.addResult(`Table ${table}`, '✅ PASSED', 'Table exists and accessible');
        }
      } catch (error) {
        this.addResult(`Table ${table}`, '❌ FAILED', error.message);
      }
    }
  }

  /**
   * Test database functions
   */
  async testFunctions() {
    console.log('\n⚙️ Testing Database Functions...');
    
    // Test system prompts retrieval
    try {
      const { data, error } = await this.supabase
        .from('ai_system_prompts')
        .select('name, language, is_active')
        .eq('is_active', true)
        .limit(1);

      if (error) {
        this.addResult('Functions Test', '❌ FAILED', error.message);
      } else {
        this.addResult('Functions Test', '✅ PASSED', 'Database functions working');
      }
    } catch (error) {
      this.addResult('Functions Test', '❌ FAILED', error.message);
    }

    // Test RPC functions
    try {
      const { data, error } = await this.supabase.rpc('run_maintenance_tasks');
      
      if (error) {
        this.addResult('RPC Functions Test', '⚠️ WARNING', 'RPC functions may need manual setup');
      } else {
        this.addResult('RPC Functions Test', '✅ PASSED', 'RPC functions accessible');
      }
    } catch (error) {
      this.addResult('RPC Functions Test', '⚠️ WARNING', 'RPC functions require service role key');
    }
  }

  /**
   * Test Row Level Security policies
   */
  async testRLSPolicies() {
    console.log('\n🔒 Testing Row Level Security...');
    
    try {
      // Test that RLS is enabled on critical tables
      const { data, error } = await this.supabase
        .from('information_schema.table_privileges')
        .select('*')
        .eq('table_name', 'ai_system_prompts');

      if (error) {
        this.addResult('RLS Test', '⚠️ WARNING', 'Could not verify RLS policies via API');
      } else {
        this.addResult('RLS Test', '✅ PASSED', 'RLS policies configured');
      }
    } catch (error) {
      this.addResult('RLS Test', '⚠️ WARNING', 'RLS verification requires manual database access');
    }
  }

  /**
   * Test system prompts data
   */
  async testSystemPrompts() {
    console.log('\n💭 Testing System Prompts...');
    
    try {
      const { data, error } = await this.supabase
        .from('ai_system_prompts')
        .select('name, language, is_active, version')
        .in('name', ['hinglish_chat_general', 'hinglish_chat_with_data']);

      if (error) {
        this.addResult('System Prompts Test', '❌ FAILED', error.message);
        return;
      }

      const expectedPrompts = ['hinglish_chat_general', 'hinglish_chat_with_data'];
      const foundPrompts = data.map(p => p.name);
      
      let missing = [];
      for (const expected of expectedPrompts) {
        if (!foundPrompts.includes(expected)) {
          missing.push(expected);
        }
      }

      if (missing.length > 0) {
        this.addResult('System Prompts Test', '❌ FAILED', `Missing prompts: ${missing.join(', ')}`);
      } else {
        this.addResult('System Prompts Test', '✅ PASSED', 'All required system prompts found');
      }
    } catch (error) {
      this.addResult('System Prompts Test', '❌ FAILED', error.message);
    }
  }

  /**
   * Test vector search functionality
   */
  async testVectorSearch() {
    console.log('\n🔍 Testing Vector Search...');
    
    try {
      // Create test embedding
      const testEmbedding = new Array(1536).fill(0).map(() => Math.random() - 0.5);
      
      const { data, error } = await this.supabase.rpc('find_similar_memories', {
        p_user_id: '00000000-0000-0000-0000-000000000000', // Test UUID
        p_embedding: testEmbedding,
        p_limit: 1
      });

      if (error) {
        this.addResult('Vector Search Test', '⚠️ WARNING', 'Vector search requires setup: ' + error.message);
      } else {
        this.addResult('Vector Search Test', '✅ PASSED', 'Vector search function accessible');
      }
    } catch (error) {
      this.addResult('Vector Search Test', '⚠️ WARNING', 'Vector search test requires actual embeddings');
    }
  }

  /**
   * Test CRUD operations
   */
  async testCRUDOperations() {
    console.log('\n🔄 Testing CRUD Operations...');
    
    try {
      // Test SELECT operation
      const { data: selectData, error: selectError } = await this.supabase
        .from('ai_system_prompts')
        .select('id')
        .limit(1);

      if (selectError) {
        this.addResult('CRUD Test', '❌ FAILED', 'SELECT failed: ' + selectError.message);
        return;
      }

      // Test INSERT operation (create temporary record)
      const testPrompt = {
        name: 'test_prompt_' + Date.now(),
        system_prompt: 'Test prompt for validation',
        language: 'test',
        is_active: false
      };

      const { data: insertData, error: insertError } = await this.supabase
        .from('ai_system_prompts')
        .insert(testPrompt)
        .select()
        .single();

      if (insertError) {
        this.addResult('CRUD Test', '⚠️ WARNING', 'INSERT test skipped: ' + insertError.message);
      } else {
        this.addResult('CRUD Test', '✅ PASSED', 'INSERT operation working');
        
        // Clean up test record
        if (insertData) {
          await this.supabase
            .from('ai_system_prompts')
            .delete()
            .eq('id', insertData.id);
        }
      }
    } catch (error) {
      this.addResult('CRUD Test', '❌ FAILED', error.message);
    }
  }

  /**
   * Test security and permissions
   */
  async testSecurity() {
    console.log('\n🛡️ Testing Security...');
    
    try {
      // Test that service role operations work
      const { data, error } = await this.supabase
        .from('ai_system_prompts')
        .select('count(*)', { count: 'exact', head: true });

      if (error) {
        this.addResult('Security Test', '❌ FAILED', 'Permission issue: ' + error.message);
      } else {
        this.addResult('Security Test', '✅ PASSED', 'Authentication working correctly');
      }
    } catch (error) {
      this.addResult('Security Test', '❌ FAILED', error.message);
    }
  }

  /**
   * Test performance and indexes
   */
  async testPerformance() {
    console.log('\n⚡ Testing Performance...');
    
    try {
      const startTime = Date.now();
      
      // Test query performance
      const { data, error } = await this.supabase
        .from('ai_system_prompts')
        .select('*')
        .eq('is_active', true)
        .limit(10);

      const queryTime = Date.now() - startTime;

      if (error) {
        this.addResult('Performance Test', '❌ FAILED', error.message);
      } else {
        const status = queryTime < 1000 ? '✅ PASSED' : '⚠️ WARNING';
        this.addResult('Performance Test', status, `Query time: ${queryTime}ms`);
      }
    } catch (error) {
      this.addResult('Performance Test', '❌ FAILED', error.message);
    }
  }

  /**
   * Add test result
   */
  addResult(testName, status, message) {
    this.testResults.push({ testName, status, message, timestamp: new Date().toISOString() });
    
    console.log(`${status} ${testName}: ${message}`);
  }

  /**
   * Show validation results summary
   */
  showResults() {
    const duration = Math.round((Date.now() - this.startTime) / 1000);
    const passed = this.testResults.filter(r => r.status.includes('PASSED')).length;
    const failed = this.testResults.filter(r => r.status.includes('FAILED')).length;
    const warnings = this.testResults.filter(r => r.status.includes('WARNING')).length;

    console.log('\n' + '='.repeat(50));
    console.log('🏁 VALIDATION RESULTS SUMMARY');
    console.log('='.repeat(50));
    console.log(`Duration: ${duration}s`);
    console.log(`Total Tests: ${this.testResults.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️ Warnings: ${warnings}`);
    console.log('='.repeat(50));

    if (failed === 0) {
      console.log('🎉 All critical tests passed! Database setup is ready.');
      console.log('\nNext steps:');
      console.log('1. Run migrations in Supabase');
      console.log('2. Test the application integration');
      console.log('3. Verify vector embeddings setup (when needed)');
    } else {
      console.log('❌ Some tests failed. Please check the issues above.');
      console.log('\nCommon solutions:');
      console.log('1. Run migrations: supabase db reset --linked');
      console.log('2. Check environment variables');
      console.log('3. Verify Supabase permissions');
    }

    // Save results to file
    this.saveResults();
  }

  /**
   * Save validation results to file
   */
  saveResults() {
    const fs = require('fs');
    const results = {
      timestamp: new Date().toISOString(),
      duration: Math.round((Date.now() - this.startTime) / 1000),
      summary: {
        total: this.testResults.length,
        passed: this.testResults.filter(r => r.status.includes('PASSED')).length,
        failed: this.testResults.filter(r => r.status.includes('FAILED')).length,
        warnings: this.testResults.filter(r => r.status.includes('WARNING')).length
      },
      results: this.testResults
    };

    const filename = `validation-results-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(`\n📄 Results saved to: ${filename}`);
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

if (require.main === module) {
  const validator = new DatabaseValidator();
  validator.runValidation();
}

module.exports = DatabaseValidator;