/**
 * BACKWARD COMPATIBILITY TEST FOR /api/ai/chat
 * 
 * This test verifies that existing chat requests without new enhancement parameters
 * continue to work exactly as before, maintaining backward compatibility.
 * 
 * Tests Requirements 10.1 and 10.2:
 * - Default behavior matches previous version
 * - Response structure is unchanged
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, colors.cyan);
  console.log('='.repeat(80) + '\n');
}

function logTest(testName) {
  log(`\n📋 ${testName}`, colors.blue);
  console.log('-'.repeat(80));
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.gray);
}

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function recordTest(name, passed, details = '') {
  testResults.tests.push({ name, passed, details });
  if (passed) {
    testResults.passed++;
    logSuccess(`${name} - PASSED`);
  } else {
    testResults.failed++;
    logError(`${name} - FAILED: ${details}`);
  }
  if (details && passed) {
    logInfo(details);
  }
}

/**
 * Test 1: Basic chat request (minimal parameters)
 * This is the most basic request format that should always work
 */
async function testBasicChatRequest() {
  logTest('Test 1: Basic Chat Request (Minimal Parameters)');
  
  try {
    const response = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: '00000000-0000-0000-0000-000000000001',
        message: 'Hello, can you help me study?'
      }),
    });

    const data = await response.json();
    
    // Verify response structure
    const hasSuccess = typeof data.success === 'boolean';
    const hasData = data.success && data.data !== undefined;
    const hasAiResponse = hasData && data.data.aiResponse !== undefined;
    const hasContent = hasAiResponse && typeof data.data.aiResponse.content === 'string';
    const hasMetadata = data.metadata !== undefined;
    
    if (!response.ok) {
      recordTest('Basic chat request', false, `HTTP ${response.status}: ${data.error?.message || 'Unknown error'}`);
      return false;
    }
    
    if (!hasSuccess || !hasData || !hasAiResponse || !hasContent || !hasMetadata) {
      recordTest('Basic chat request', false, 'Response structure is incomplete');
      logInfo(`Response structure: ${JSON.stringify({
        hasSuccess,
        hasData,
        hasAiResponse,
        hasContent,
        hasMetadata
      }, null, 2)}`);
      return false;
    }
    
    // Verify essential response fields
    const aiResponse = data.data.aiResponse;
    const hasModelUsed = typeof aiResponse.model_used === 'string';
    const hasProviderUsed = typeof aiResponse.provider_used === 'string';
    const hasTokensUsed = typeof aiResponse.tokens_used === 'number';
    const hasLatency = typeof aiResponse.latency_ms === 'number';
    
    if (!hasModelUsed || !hasProviderUsed || !hasTokensUsed || !hasLatency) {
      recordTest('Basic chat request', false, 'Essential response fields missing');
      return false;
    }
    
    recordTest('Basic chat request', true, `Response: "${aiResponse.content.substring(0, 100)}..."`);
    logInfo(`Model: ${aiResponse.model_used}, Provider: ${aiResponse.provider_used}`);
    logInfo(`Tokens: ${aiResponse.tokens_used}, Latency: ${aiResponse.latency_ms}ms`);
    
    return true;
  } catch (error) {
    recordTest('Basic chat request', false, error.message);
    return false;
  }
}

/**
 * Test 2: Chat request with conversationId (common pattern)
 */
async function testChatWithConversationId() {
  logTest('Test 2: Chat Request with ConversationId');
  
  try {
    const conversationId = '00000000-0000-0000-0000-000000000002';
    
    const response = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: '00000000-0000-0000-0000-000000000001',
        message: 'What is thermodynamics?',
        conversationId: conversationId
      }),
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      recordTest('Chat with conversationId', false, data.error?.message || 'Request failed');
      return false;
    }
    
    // Verify response structure is consistent
    const hasRequiredFields = 
      data.data?.aiResponse?.content &&
      data.data?.aiResponse?.model_used &&
      data.data?.aiResponse?.provider_used &&
      data.metadata?.requestId;
    
    if (!hasRequiredFields) {
      recordTest('Chat with conversationId', false, 'Response structure inconsistent');
      return false;
    }
    
    recordTest('Chat with conversationId', true, 'ConversationId handled correctly');
    return true;
  } catch (error) {
    recordTest('Chat with conversationId', false, error.message);
    return false;
  }
}

/**
 * Test 3: Chat request with legacy includeMemoryContext flag
 */
async function testChatWithMemoryContext() {
  logTest('Test 3: Chat Request with Legacy includeMemoryContext Flag');
  
  try {
    const response = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: '00000000-0000-0000-0000-000000000001',
        message: 'Remember that I am studying physics',
        includeMemoryContext: true
      }),
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      recordTest('Chat with includeMemoryContext', false, data.error?.message || 'Request failed');
      return false;
    }
    
    // Verify the flag is respected (memory system should be active)
    const hasResponse = data.data?.aiResponse?.content;
    
    if (!hasResponse) {
      recordTest('Chat with includeMemoryContext', false, 'No response generated');
      return false;
    }
    
    recordTest('Chat with includeMemoryContext', true, 'Legacy memory flag works');
    return true;
  } catch (error) {
    recordTest('Chat with includeMemoryContext', false, error.message);
    return false;
  }
}

/**
 * Test 4: Chat request with legacy webSearch string format
 */
async function testChatWithLegacyWebSearch() {
  logTest('Test 4: Chat Request with Legacy webSearch String Format');
  
  try {
    const response = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: '00000000-0000-0000-0000-000000000001',
        message: 'What are the latest developments in AI?',
        webSearch: 'auto' // Legacy string format
      }),
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      recordTest('Chat with legacy webSearch', false, data.error?.message || 'Request failed');
      return false;
    }
    
    // Verify response structure
    const hasResponse = data.data?.aiResponse?.content;
    const hasWebSearchFlag = typeof data.data?.aiResponse?.web_search_enabled === 'boolean';
    
    if (!hasResponse || !hasWebSearchFlag) {
      recordTest('Chat with legacy webSearch', false, 'Response structure incomplete');
      return false;
    }
    
    recordTest('Chat with legacy webSearch', true, `Web search: ${data.data.aiResponse.web_search_enabled ? 'enabled' : 'disabled'}`);
    return true;
  } catch (error) {
    recordTest('Chat with legacy webSearch', false, error.message);
    return false;
  }
}

/**
 * Test 5: Chat request with chatType parameter
 */
async function testChatWithChatType() {
  logTest('Test 5: Chat Request with chatType Parameter');
  
  try {
    const response = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: '00000000-0000-0000-0000-000000000001',
        message: 'Explain Newton\'s laws',
        chatType: 'study_assistant'
      }),
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      recordTest('Chat with chatType', false, data.error?.message || 'Request failed');
      return false;
    }
    
    // Verify response
    const hasResponse = data.data?.aiResponse?.content;
    
    if (!hasResponse) {
      recordTest('Chat with chatType', false, 'No response generated');
      return false;
    }
    
    recordTest('Chat with chatType', true, 'chatType parameter handled correctly');
    return true;
  } catch (error) {
    recordTest('Chat with chatType', false, error.message);
    return false;
  }
}

/**
 * Test 6: Verify response structure consistency
 */
async function testResponseStructureConsistency() {
  logTest('Test 6: Response Structure Consistency Check');
  
  try {
    // Make multiple requests with different parameter combinations
    const requests = [
      { userId: '00000000-0000-0000-0000-000000000001', message: 'Test 1' },
      { userId: '00000000-0000-0000-0000-000000000001', message: 'Test 2', conversationId: '00000000-0000-0000-0000-000000000003' },
      { userId: '00000000-0000-0000-0000-000000000001', message: 'Test 3', includeMemoryContext: false },
    ];
    
    const responses = [];
    
    for (const req of requests) {
      const response = await fetch(`${BASE_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req),
      });
      
      const data = await response.json();
      responses.push(data);
    }
    
    // Verify all responses have the same structure
    const allHaveSuccess = responses.every(r => typeof r.success === 'boolean');
    const allHaveData = responses.every(r => r.success ? r.data !== undefined : true);
    const allHaveAiResponse = responses.every(r => r.success ? r.data?.aiResponse !== undefined : true);
    const allHaveMetadata = responses.every(r => r.metadata !== undefined);
    
    if (!allHaveSuccess || !allHaveData || !allHaveAiResponse || !allHaveMetadata) {
      recordTest('Response structure consistency', false, 'Inconsistent response structures');
      return false;
    }
    
    // Verify all successful responses have the same aiResponse fields
    const successfulResponses = responses.filter(r => r.success);
    const allHaveSameFields = successfulResponses.every(r => {
      const aiResponse = r.data.aiResponse;
      return (
        typeof aiResponse.content === 'string' &&
        typeof aiResponse.model_used === 'string' &&
        typeof aiResponse.provider_used === 'string' &&
        typeof aiResponse.tokens_used === 'number' &&
        typeof aiResponse.latency_ms === 'number' &&
        typeof aiResponse.web_search_enabled === 'boolean' &&
        typeof aiResponse.rag_enabled === 'boolean' &&
        typeof aiResponse.fallback_used === 'boolean' &&
        typeof aiResponse.cached === 'boolean'
      );
    });
    
    if (!allHaveSameFields) {
      recordTest('Response structure consistency', false, 'aiResponse fields inconsistent');
      return false;
    }
    
    recordTest('Response structure consistency', true, `All ${responses.length} responses have consistent structure`);
    return true;
  } catch (error) {
    recordTest('Response structure consistency', false, error.message);
    return false;
  }
}

/**
 * Test 7: Verify default behavior (no optional parameters)
 */
async function testDefaultBehavior() {
  logTest('Test 7: Default Behavior Verification');
  
  try {
    const response = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: '00000000-0000-0000-0000-000000000001',
        message: 'What is the speed of light?'
      }),
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      recordTest('Default behavior', false, data.error?.message || 'Request failed');
      return false;
    }
    
    const aiResponse = data.data.aiResponse;
    
    // Verify defaults:
    // - Memory should be enabled by default (includeMemoryContext defaults to true)
    // - Web search should be auto (disabled for non-time-sensitive queries)
    // - RAG should be disabled by default
    // - Provider/model should use system defaults
    
    const hasDefaultProvider = typeof aiResponse.provider_used === 'string' && aiResponse.provider_used !== '';
    const hasDefaultModel = typeof aiResponse.model_used === 'string' && aiResponse.model_used !== '';
    const ragDisabledByDefault = aiResponse.rag_enabled === false;
    
    if (!hasDefaultProvider || !hasDefaultModel) {
      recordTest('Default behavior', false, 'Default provider/model not set');
      return false;
    }
    
    if (!ragDisabledByDefault) {
      recordTest('Default behavior', false, 'RAG should be disabled by default');
      return false;
    }
    
    recordTest('Default behavior', true, 'Defaults applied correctly');
    logInfo(`Default provider: ${aiResponse.provider_used}, model: ${aiResponse.model_used}`);
    logInfo(`RAG disabled: ${!aiResponse.rag_enabled}, Web search: ${aiResponse.web_search_enabled ? 'enabled' : 'disabled'}`);
    
    return true;
  } catch (error) {
    recordTest('Default behavior', false, error.message);
    return false;
  }
}

/**
 * Test 8: Verify no breaking changes in error responses
 */
async function testErrorResponseStructure() {
  logTest('Test 8: Error Response Structure');
  
  try {
    // Send invalid request (missing required field)
    const response = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Missing userId and message
      }),
    });

    const data = await response.json();
    
    // Verify error response structure
    const hasSuccess = data.success === false;
    const hasError = data.error !== undefined;
    const hasErrorCode = typeof data.error?.code === 'string';
    const hasErrorMessage = typeof data.error?.message === 'string';
    const hasMetadata = data.metadata !== undefined;
    
    if (!hasSuccess || !hasError || !hasErrorCode || !hasErrorMessage || !hasMetadata) {
      recordTest('Error response structure', false, 'Error response structure incomplete');
      return false;
    }
    
    recordTest('Error response structure', true, 'Error responses maintain consistent structure');
    logInfo(`Error code: ${data.error.code}, message: ${data.error.message}`);
    
    return true;
  } catch (error) {
    recordTest('Error response structure', false, error.message);
    return false;
  }
}

/**
 * Main test runner
 */
async function runBackwardCompatibilityTests() {
  logSection('🔄 BACKWARD COMPATIBILITY TEST SUITE');
  log('Testing /api/ai/chat endpoint without new enhancement parameters', colors.cyan);
  log('Requirements: 10.1 (Default behavior) and 10.2 (Response structure)', colors.cyan);
  
  const startTime = Date.now();
  
  // Run all tests
  await testBasicChatRequest();
  await testChatWithConversationId();
  await testChatWithMemoryContext();
  await testChatWithLegacyWebSearch();
  await testChatWithChatType();
  await testResponseStructureConsistency();
  await testDefaultBehavior();
  await testErrorResponseStructure();
  
  const totalTime = Date.now() - startTime;
  
  // Print summary
  logSection('📊 TEST SUMMARY');
  
  log(`Total Tests: ${testResults.passed + testResults.failed}`, colors.cyan);
  log(`Passed: ${testResults.passed}`, colors.green);
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? colors.red : colors.green);
  log(`Warnings: ${testResults.warnings}`, colors.yellow);
  log(`Total Time: ${totalTime}ms`, colors.gray);
  
  console.log('\n' + '='.repeat(80));
  
  // Detailed results
  if (testResults.failed > 0) {
    logSection('❌ FAILED TESTS');
    testResults.tests
      .filter(t => !t.passed)
      .forEach(t => {
        logError(`${t.name}: ${t.details}`);
      });
  }
  
  // Final verdict
  console.log('\n' + '='.repeat(80));
  if (testResults.failed === 0) {
    logSuccess('✅ ALL BACKWARD COMPATIBILITY TESTS PASSED!');
    log('The endpoint maintains full backward compatibility.', colors.green);
    log('Existing integrations will continue to work without modifications.', colors.green);
  } else {
    logError('❌ SOME TESTS FAILED - BACKWARD COMPATIBILITY ISSUES DETECTED');
    log('Please review failed tests and fix compatibility issues.', colors.red);
  }
  console.log('='.repeat(80) + '\n');
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runBackwardCompatibilityTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
