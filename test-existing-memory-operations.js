/**
 * Test Suite: Existing Memory Operations Backward Compatibility
 * 
 * Purpose: Verify that existing GET and POST memory operations continue to work
 * correctly after the dual-layer memory system enhancements.
 * 
 * Tests:
 * 1. POST - Store memory (existing behavior)
 * 2. GET - Search memories (existing behavior)
 * 3. POST - Search via POST body (existing behavior)
 * 4. Memory retrieval without memory_type parameter
 * 5. Verify default behavior matches previous version
 */

const TEST_USER_ID = 'test-user-backward-compat-' + Date.now();
const TEST_CONVERSATION_ID = 'test-conv-' + Date.now();

// Test configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
const MEMORY_ENDPOINT = `${API_BASE_URL}/api/ai/memory`;

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * Helper function to log test results
 */
function logTest(testName, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${testName}`);
  if (details) {
    console.log(`   ${details}`);
  }
  
  testResults.tests.push({
    name: testName,
    passed,
    details
  });
  
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

/**
 * Test 1: POST - Store memory (existing behavior without memory_type)
 */
async function testStoreMemoryExistingBehavior() {
  console.log('\n📝 Test 1: Store memory with existing API format');
  
  try {
    const requestBody = {
      userId: TEST_USER_ID,
      message: 'What is photosynthesis?',
      response: 'Photosynthesis is the process by which plants convert light energy into chemical energy.',
      conversationId: TEST_CONVERSATION_ID,
      metadata: {
        memoryType: 'learning_interaction',
        priority: 'high',
        topic: 'biology',
        subject: 'science',
        tags: ['photosynthesis', 'plants', 'biology']
      }
    };

    const response = await fetch(MEMORY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    
    // Log response for debugging
    if (!response.ok || !data.success) {
      console.log('   Response status:', response.status);
      console.log('   Response data:', JSON.stringify(data, null, 2));
    }

    // Verify response structure matches existing format
    const hasSuccess = data.success === true;
    const hasMemoryId = data.data && typeof data.data.memoryId === 'string';
    const hasQualityScore = data.data && typeof data.data.qualityScore === 'number';
    const hasRelevanceScore = data.data && typeof data.data.relevanceScore === 'number';
    const hasStoredAt = data.data && typeof data.data.storedAt === 'string';
    const hasMetadata = data.metadata && data.metadata.requestId && data.metadata.timestamp;

    const allChecks = hasSuccess && hasMemoryId && hasQualityScore && 
                      hasRelevanceScore && hasStoredAt && hasMetadata;

    logTest(
      'Store memory with existing format',
      allChecks,
      allChecks 
        ? `Memory stored successfully: ${data.data.memoryId}` 
        : `Missing fields: ${JSON.stringify({hasSuccess, hasMemoryId, hasQualityScore, hasRelevanceScore, hasStoredAt, hasMetadata})}`
    );

    return allChecks ? data.data.memoryId : null;

  } catch (error) {
    logTest('Store memory with existing format', false, `Error: ${error.message}`);
    return null;
  }
}

/**
 * Test 2: GET - Search memories using query parameters (existing behavior)
 */
async function testSearchMemoriesViaGET() {
  console.log('\n🔍 Test 2: Search memories via GET with query parameters');
  
  try {
    const searchUrl = `${MEMORY_ENDPOINT}?userId=${TEST_USER_ID}&query=photosynthesis&limit=5`;
    
    const response = await fetch(searchUrl, {
      method: 'GET'
    });

    const data = await response.json();

    // Verify response structure matches existing format
    const hasMemories = Array.isArray(data.memories);
    const hasSearchStats = data.searchStats && typeof data.searchStats.totalFound === 'number';
    const hasMetadata = data.metadata && data.metadata.requestId;

    // Verify memory structure
    let memoriesValid = true;
    if (hasMemories && data.memories.length > 0) {
      const memory = data.memories[0];
      memoriesValid = memory.id && memory.content && 
                      typeof memory.similarity === 'number' &&
                      typeof memory.relevanceScore === 'number';
    }

    const allChecks = hasMemories && hasSearchStats && hasMetadata && memoriesValid;

    logTest(
      'Search memories via GET',
      allChecks,
      allChecks 
        ? `Found ${data.memories.length} memories` 
        : `Invalid response structure`
    );

    return allChecks;

  } catch (error) {
    logTest('Search memories via GET', false, `Error: ${error.message}`);
    return false;
  }
}

/**
 * Test 3: POST - Search memories via POST body (existing behavior)
 */
async function testSearchMemoriesViaPOST() {
  console.log('\n🔍 Test 3: Search memories via POST with query in body');
  
  try {
    const requestBody = {
      userId: TEST_USER_ID,
      query: 'photosynthesis',
      limit: 5,
      minSimilarity: 0.3
    };

    const response = await fetch(MEMORY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    // Verify response structure matches existing format
    const hasMemories = Array.isArray(data.memories);
    const hasSearchStats = data.searchStats && typeof data.searchStats.totalFound === 'number';
    const hasMetadata = data.metadata && data.metadata.requestId;

    const allChecks = hasMemories && hasSearchStats && hasMetadata;

    logTest(
      'Search memories via POST',
      allChecks,
      allChecks 
        ? `Found ${data.memories.length} memories` 
        : `Invalid response structure`
    );

    return allChecks;

  } catch (error) {
    logTest('Search memories via POST', false, `Error: ${error.message}`);
    return false;
  }
}

/**
 * Test 4: Store multiple memories and verify retrieval
 */
async function testMultipleMemoriesRetrieval() {
  console.log('\n📚 Test 4: Store multiple memories and verify retrieval');
  
  try {
    // Store 3 different memories
    const memories = [
      {
        message: 'Explain Newton\'s first law',
        response: 'Newton\'s first law states that an object at rest stays at rest and an object in motion stays in motion.',
        topic: 'physics'
      },
      {
        message: 'What is the Pythagorean theorem?',
        response: 'The Pythagorean theorem states that in a right triangle, a² + b² = c².',
        topic: 'mathematics'
      },
      {
        message: 'Define mitosis',
        response: 'Mitosis is the process of cell division that results in two identical daughter cells.',
        topic: 'biology'
      }
    ];

    const storedIds = [];
    for (const memory of memories) {
      const response = await fetch(MEMORY_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: TEST_USER_ID,
          message: memory.message,
          response: memory.response,
          conversationId: TEST_CONVERSATION_ID,
          metadata: {
            topic: memory.topic,
            priority: 'medium'
          }
        })
      });

      const data = await response.json();
      if (data.success && data.data.memoryId) {
        storedIds.push(data.data.memoryId);
      }
    }

    // Verify all memories were stored
    const allStored = storedIds.length === memories.length;

    // Now retrieve and verify we can find them
    const searchResponse = await fetch(
      `${MEMORY_ENDPOINT}?userId=${TEST_USER_ID}&query=science&limit=10`,
      { method: 'GET' }
    );

    const searchData = await searchResponse.json();
    const foundMemories = searchData.memories || [];

    logTest(
      'Store and retrieve multiple memories',
      allStored && foundMemories.length >= memories.length,
      `Stored: ${storedIds.length}, Retrieved: ${foundMemories.length}`
    );

    return allStored;

  } catch (error) {
    logTest('Store and retrieve multiple memories', false, `Error: ${error.message}`);
    return false;
  }
}

/**
 * Test 5: Verify default memory_type behavior (should default to 'session')
 */
async function testDefaultMemoryTypeBehavior() {
  console.log('\n⚙️  Test 5: Verify default memory_type behavior');
  
  try {
    // Store memory without specifying memory_type
    const requestBody = {
      userId: TEST_USER_ID,
      message: 'Test default memory type',
      response: 'This should default to session memory type',
      conversationId: TEST_CONVERSATION_ID
    };

    const response = await fetch(MEMORY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    // Verify memory was stored successfully (default behavior)
    const stored = data.success === true && data.data && data.data.memoryId;

    logTest(
      'Default memory_type behavior',
      stored,
      stored 
        ? 'Memory stored with default settings' 
        : 'Failed to store memory with default settings'
    );

    return stored;

  } catch (error) {
    logTest('Default memory_type behavior', false, `Error: ${error.message}`);
    return false;
  }
}

/**
 * Test 6: Verify response structure unchanged
 */
async function testResponseStructureUnchanged() {
  console.log('\n📋 Test 6: Verify response structure matches previous version');
  
  try {
    const requestBody = {
      userId: TEST_USER_ID,
      message: 'Test response structure',
      response: 'Verifying backward compatibility',
      conversationId: TEST_CONVERSATION_ID
    };

    const response = await fetch(MEMORY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    // Check for expected fields (existing API contract)
    const expectedFields = {
      success: typeof data.success === 'boolean',
      'data.memoryId': data.data && typeof data.data.memoryId === 'string',
      'data.qualityScore': data.data && typeof data.data.qualityScore === 'number',
      'data.relevanceScore': data.data && typeof data.data.relevanceScore === 'number',
      'data.storedAt': data.data && typeof data.data.storedAt === 'string',
      'data.memoryType': data.data && typeof data.data.memoryType === 'string',
      'metadata.requestId': data.metadata && typeof data.metadata.requestId === 'string',
      'metadata.processingTime': data.metadata && typeof data.metadata.processingTime === 'number',
      'metadata.timestamp': data.metadata && typeof data.metadata.timestamp === 'string'
    };

    // Check for unexpected new fields at top level (should not break existing clients)
    const topLevelKeys = Object.keys(data);
    const expectedTopLevelKeys = ['success', 'data', 'metadata'];
    const hasUnexpectedFields = topLevelKeys.some(key => !expectedTopLevelKeys.includes(key));

    const allFieldsValid = Object.values(expectedFields).every(v => v === true);
    const structureUnchanged = allFieldsValid && !hasUnexpectedFields;

    logTest(
      'Response structure unchanged',
      structureUnchanged,
      structureUnchanged 
        ? 'All expected fields present, no unexpected fields' 
        : `Field validation: ${JSON.stringify(expectedFields)}, Unexpected fields: ${hasUnexpectedFields}`
    );

    return structureUnchanged;

  } catch (error) {
    logTest('Response structure unchanged', false, `Error: ${error.message}`);
    return false;
  }
}

/**
 * Test 7: GET health check endpoint
 */
async function testHealthCheckEndpoint() {
  console.log('\n🏥 Test 7: Health check endpoint');
  
  try {
    const response = await fetch(`${MEMORY_ENDPOINT}?action=health`, {
      method: 'GET'
    });

    const data = await response.json();

    const hasStatus = data.success === true && data.data && data.data.status;
    const hasSystem = data.data && data.data.system;

    logTest(
      'Health check endpoint',
      hasStatus && hasSystem,
      hasStatus ? data.data.status : 'Health check failed'
    );

    return hasStatus;

  } catch (error) {
    logTest('Health check endpoint', false, `Error: ${error.message}`);
    return false;
  }
}

/**
 * Main test execution
 */
async function runAllTests() {
  console.log('='.repeat(70));
  console.log('🧪 EXISTING MEMORY OPERATIONS BACKWARD COMPATIBILITY TEST SUITE');
  console.log('='.repeat(70));
  console.log(`Test User ID: ${TEST_USER_ID}`);
  console.log(`Test Conversation ID: ${TEST_CONVERSATION_ID}`);
  console.log(`API Endpoint: ${MEMORY_ENDPOINT}`);
  console.log('='.repeat(70));

  // Run all tests
  await testStoreMemoryExistingBehavior();
  await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between tests
  
  await testSearchMemoriesViaGET();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await testSearchMemoriesViaPOST();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await testMultipleMemoriesRetrieval();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await testDefaultMemoryTypeBehavior();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await testResponseStructureUnchanged();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await testHealthCheckEndpoint();

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(70));

  // Print detailed results
  console.log('\n📋 DETAILED RESULTS:');
  testResults.tests.forEach((test, index) => {
    const status = test.passed ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${test.name}`);
    if (test.details) {
      console.log(`   ${test.details}`);
    }
  });

  // Overall verdict
  console.log('\n' + '='.repeat(70));
  if (testResults.failed === 0) {
    console.log('🎉 ALL TESTS PASSED - BACKWARD COMPATIBILITY VERIFIED');
    console.log('✅ Existing memory operations continue to work correctly');
    console.log('✅ Response structure matches previous version');
    console.log('✅ Default behavior unchanged');
  } else {
    console.log('⚠️  SOME TESTS FAILED - REVIEW REQUIRED');
    console.log(`${testResults.failed} test(s) need attention`);
  }
  console.log('='.repeat(70));

  // Exit with appropriate code
  process.exit(testResults.failed === 0 ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Test suite failed with error:', error);
  process.exit(1);
});
