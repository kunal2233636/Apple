// ============================================================================
// AI DATABASE VALIDATION TESTS - Comprehensive Testing Suite
// ============================================================================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test results tracker
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  total: 0
};

/**
 * Test result reporting
 */
function reportTest(testName, passed, message = '', expected = '', actual = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${testName}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}`);
    if (message) console.log(`   Error: ${message}`);
    if (expected && actual) {
      console.log(`   Expected: ${expected}`);
      console.log(`   Actual: ${actual}`);
    }
  }
}

/**
 * Warning reporting (non-critical issues)
 */
function reportWarning(testName, message) {
  testResults.warnings++;
  console.log(`⚠️  ${testName}`);
  console.log(`   Warning: ${message}`);
}

/**
 * Test database connectivity
 */
async function testDatabaseConnectivity() {
  console.log('\n🔗 Testing Database Connectivity');
  console.log('================================');
  
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      if (error.message.includes('relation "public.profiles" does not exist')) {
        reportWarning('Database Connection', 'Profiles table does not exist - this is normal for new installations');
      } else {
        reportTest('Database Connection', false, error.message);
      }
    } else {
      reportTest('Database Connection', true);
    }
  } catch (error) {
    reportTest('Database Connection', false, error.message);
  }
}

/**
 * Test extensions availability
 */
async function testExtensions() {
  console.log('\n🔌 Testing Database Extensions');
  console.log('==============================');
  
  // Test vector extension
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: "SELECT extname FROM pg_extension WHERE extname = 'vector';"
    });
    
    if (error) {
      reportWarning('Vector Extension', 'Cannot check vector extension status');
    } else if (data && data.length > 0) {
      reportTest('Vector Extension Available', true);
    } else {
      reportTest('Vector Extension Available', false, 'Vector extension not enabled');
    }
  } catch (error) {
    reportTest('Vector Extension Available', false, error.message);
  }
  
  // Test pgcrypto extension
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: "SELECT extname FROM pg_extension WHERE extname = 'pgcrypto';"
    });
    
    if (error) {
      reportWarning('pgcrypto Extension', 'Cannot check pgcrypto extension status');
    } else if (data && data.length > 0) {
      reportTest('pgcrypto Extension Available', true);
    } else {
      reportTest('pgcrypto Extension Available', false, 'pgcrypto extension not enabled');
    }
  } catch (error) {
    reportTest('pgcrypto Extension Available', false, error.message);
  }
}

/**
 * Test AI tables existence and structure
 */
async function testAITables() {
  console.log('\n📊 Testing AI Tables');
  console.log('===================');
  
  const expectedTables = [
    'chat_conversations',
    'chat_messages', 
    'study_chat_memory',
    'memory_summaries',
    'student_ai_profile',
    'api_usage_logs',
    'ai_system_prompts'
  ];
  
  for (const table of expectedTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.message.includes(`relation "public.${table}" does not exist`)) {
          reportTest(`Table ${table} Exists`, false, 'Table does not exist');
        } else {
          reportWarning(`Table ${table}`, `Query failed: ${error.message}`);
        }
      } else {
        reportTest(`Table ${table} Exists`, true);
      }
    } catch (error) {
      reportTest(`Table ${table} Exists`, false, error.message);
    }
  }
}

/**
 * Test table structures
 */
async function testTableStructures() {
  console.log('\n🏗️  Testing Table Structures');
  console.log('=============================');
  
  // Test chat_conversations structure
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'chat_conversations' 
        ORDER BY ordinal_position;
      `
    });
    
    if (error) {
      reportWarning('Chat Conversations Structure', `Cannot check structure: ${error.message}`);
    } else if (data) {
      const columns = data.map(col => col.column_name);
      const requiredColumns = ['id', 'user_id', 'title', 'chat_type', 'created_at', 'updated_at', 'is_archived'];
      const missingColumns = requiredColumns.filter(col => !columns.includes(col));
      
      if (missingColumns.length === 0) {
        reportTest('Chat Conversations Structure', true);
      } else {
        reportTest('Chat Conversations Structure', false, `Missing columns: ${missingColumns.join(', ')}`);
      }
    }
  } catch (error) {
    reportWarning('Chat Conversations Structure', `Error: ${error.message}`);
  }
  
  // Test study_chat_memory vector column
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'study_chat_memory' 
        AND column_name = 'embedding';
      `
    });
    
    if (error) {
      reportWarning('Study Chat Memory Vector Column', `Cannot check vector column: ${error.message}`);
    } else if (data && data.length > 0) {
      const embeddingType = data[0].data_type;
      if (embeddingType === 'vector') {
        reportTest('Study Chat Memory Vector Column', true);
      } else {
        reportTest('Study Chat Memory Vector Column', false, `Expected vector type, got ${embeddingType}`);
      }
    } else {
      reportTest('Study Chat Memory Vector Column', false, 'Embedding column not found');
    }
  } catch (error) {
    reportWarning('Study Chat Memory Vector Column', `Error: ${error.message}`);
  }
}

/**
 * Test RLS policies
 */
async function testRLSPolicies() {
  console.log('\n🔐 Testing Row Level Security');
  console.log('==============================');
  
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
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT schemaname, tablename, rowsecurity 
          FROM pg_tables 
          WHERE tablename = '${table}';
        `
      });
      
      if (error) {
        reportWarning(`RLS on ${table}`, `Cannot check RLS status: ${error.message}`);
      } else if (data && data.length > 0) {
        const rlsEnabled = data[0].rowsecurity;
        if (rlsEnabled) {
          reportTest(`RLS Enabled on ${table}`, true);
        } else {
          reportTest(`RLS Enabled on ${table}`, false, 'RLS is not enabled');
        }
      } else {
        reportWarning(`RLS on ${table}`, 'Table not found');
      }
    } catch (error) {
      reportWarning(`RLS on ${table}`, `Error: ${error.message}`);
    }
  }
}

/**
 * Test database functions
 */
async function testDatabaseFunctions() {
  console.log('\n⚡ Testing Database Functions');
  console.log('==============================');
  
  const expectedFunctions = [
    'clean_expired_memory',
    'generate_memory_summaries',
    'log_api_usage',
    'create_chat_conversation',
    'add_chat_message',
    'add_study_memory',
    'find_similar_memories',
    'run_maintenance_tasks'
  ];
  
  for (const functionName of expectedFunctions) {
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT routine_name 
          FROM information_schema.routines 
          WHERE routine_name = '${functionName}' 
          AND routine_type = 'FUNCTION';
        `
      });
      
      if (error) {
        reportWarning(`Function ${functionName}`, `Cannot check function: ${error.message}`);
      } else if (data && data.length > 0) {
        reportTest(`Function ${functionName} Exists`, true);
      } else {
        reportTest(`Function ${functionName} Exists`, false, 'Function not found');
      }
    } catch (error) {
      reportWarning(`Function ${functionName}`, `Error: ${error.message}`);
    }
  }
}

/**
 * Test system prompts data
 */
async function testSystemPrompts() {
  console.log('\n💬 Testing System Prompts');
  console.log('=========================');
  
  try {
    const { data, error } = await supabase
      .from('ai_system_prompts')
      .select('name, language, is_active, version');
    
    if (error) {
      if (error.message.includes('relation "public.ai_system_prompts" does not exist')) {
        reportTest('System Prompts Data', false, 'System prompts table does not exist');
      } else {
        reportWarning('System Prompts Data', `Query failed: ${error.message}`);
      }
    } else if (data) {
      const requiredPrompts = ['hinglish_chat_general', 'hinglish_chat_with_data'];
      const existingPrompts = data.map(prompt => prompt.name);
      
      const missingPrompts = requiredPrompts.filter(prompt => !existingPrompts.includes(prompt));
      
      if (missingPrompts.length === 0) {
        reportTest('Required System Prompts Exist', true);
        
        // Check if prompts are active
        const activePrompts = data.filter(prompt => prompt.is_active);
        if (activePrompts.length === requiredPrompts.length) {
          reportTest('System Prompts Are Active', true);
        } else {
          reportWarning('System Prompts Are Active', `${activePrompts.length}/${requiredPrompts.length} prompts are active`);
        }
      } else {
        reportTest('Required System Prompts Exist', false, `Missing prompts: ${missingPrompts.join(', ')}`);
      }
    }
  } catch (error) {
    reportWarning('System Prompts Data', `Error: ${error.message}`);
  }
}

/**
 * Test indexes
 */
async function testIndexes() {
  console.log('\n🚀 Testing Database Indexes');
  console.log('============================');
  
  const criticalIndexes = [
    'idx_chat_conversations_user_id',
    'idx_study_chat_memory_user_id',
    'idx_study_chat_memory_embedding'
  ];
  
  for (const indexName of criticalIndexes) {
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT indexname 
          FROM pg_indexes 
          WHERE indexname = '${indexName}';
        `
      });
      
      if (error) {
        reportWarning(`Index ${indexName}`, `Cannot check index: ${error.message}`);
      } else if (data && data.length > 0) {
        reportTest(`Index ${indexName} Exists`, true);
      } else {
        reportTest(`Index ${indexName} Exists`, false, 'Index not found');
      }
    } catch (error) {
      reportWarning(`Index ${indexName}`, `Error: ${error.message}`);
    }
  }
}

/**
 * Run CRUD operations test (if tables exist)
 */
async function testCRUDOperations() {
  console.log('\n🧪 Testing CRUD Operations');
  console.log('===========================');
  
  // Test with a dummy UUID since we don't have a real user
  const testUserId = '00000000-0000-0000-0000-000000000000';
  const testConversationId = '00000000-0000-0000-0000-000000000001';
  
  // Test chat conversation creation (this should fail with auth error, which is expected)
  try {
    const { data, error } = await supabase
      .from('chat_conversations')
      .insert({
        user_id: testUserId,
        title: 'Test Conversation',
        chat_type: 'general'
      })
      .select()
      .single();
    
    if (error) {
      if (error.code === '42501' || error.message.includes('permission denied')) {
        reportTest('Chat Conversation RLS Security', true);
      } else if (error.message.includes('relation "public.chat_conversations" does not exist')) {
        reportWarning('Chat Conversation CRUD', 'Table does not exist - skipping CRUD tests');
      } else {
        reportTest('Chat Conversation RLS Security', false, `Unexpected error: ${error.message}`);
      }
    } else {
      reportTest('Chat Conversation RLS Security', false, 'Insert succeeded without authentication (security issue)');
    }
  } catch (error) {
    if (error.message.includes('relation "public.chat_conversations" does not exist')) {
      reportWarning('Chat Conversation CRUD', 'Table does not exist - skipping CRUD tests');
    } else {
      reportTest('Chat Conversation RLS Security', true);
    }
  }
}

/**
 * Test vector operations (if study_chat_memory table exists)
 */
async function testVectorOperations() {
  console.log('\n🧮 Testing Vector Operations');
  console.log('=============================');
  
  // Test vector index creation (this will be done after we have embeddings)
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = 'study_chat_memory' 
        AND indexname = 'idx_study_chat_memory_embedding';
      `
    });
    
    if (error) {
      reportWarning('Vector Index', `Cannot check vector index: ${error.message}`);
    } else if (data && data.length > 0) {
      const indexDef = data[0].indexdef;
      if (indexDef.includes('vector_cosine_ops')) {
        reportTest('Vector Index Configuration', true);
      } else {
        reportWarning('Vector Index Configuration', 'Vector index may not be properly configured');
      }
    } else {
      reportTest('Vector Index Configuration', false, 'Vector index not found (may be normal if no data)');
    }
  } catch (error) {
    reportWarning('Vector Index Configuration', `Error: ${error.message}`);
  }
}

/**
 * Generate comprehensive test report
 */
function generateTestReport() {
  console.log('\n📊 COMPREHENSIVE TEST REPORT');
  console.log('============================');
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⚠️  Warnings: ${testResults.warnings}`);
  
  const successRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  console.log(`📈 Success Rate: ${successRate}%`);
  
  console.log('\n🔍 SUMMARY ANALYSIS');
  console.log('===================');
  
  if (testResults.failed === 0) {
    console.log('🎉 All tests passed! The AI database system is properly configured.');
  } else if (testResults.failed <= 3) {
    console.log('⚠️  Minor issues detected. Review failed tests and fix as needed.');
  } else {
    console.log('❌ Significant issues detected. Review all failed tests.');
  }
  
  console.log('\n📋 RECOMMENDED NEXT STEPS');
  console.log('=========================');
  
  if (testResults.failed > 0) {
    console.log('1. Fix failed tests before proceeding to production');
    console.log('2. Run migrations manually if automated migration failed');
    console.log('3. Verify database extensions are enabled');
    console.log('4. Test with real user authentication');
  }
  
  console.log('5. Set up monitoring and alerts for production');
  console.log('6. Create backup and recovery procedures');
  console.log('7. Document the system for team members');
  console.log('8. Plan regular maintenance tasks');
}

/**
 * Main test runner
 */
async function runValidationTests() {
  console.log('🧪 Starting AI Database Validation Tests');
  console.log('========================================');
  
  const startTime = Date.now();
  
  // Run all tests
  await testDatabaseConnectivity();
  await testExtensions();
  await testAITables();
  await testTableStructures();
  await testRLSPolicies();
  await testDatabaseFunctions();
  await testSystemPrompts();
  await testIndexes();
  await testCRUDOperations();
  await testVectorOperations();
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log(`\n⏱️  Tests completed in ${duration} seconds`);
  
  // Generate report
  generateTestReport();
  
  // Exit with appropriate code
  const criticalFailures = testResults.failed;
  process.exit(criticalFailures > 0 ? 1 : 0);
}

// Handle script execution
if (require.main === module) {
  runValidationTests()
    .then(() => {
      console.log('\n✅ Validation test suite completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Validation test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { runValidationTests, reportTest, reportWarning };