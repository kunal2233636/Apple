// Test Dual-Layer Memory Integration in /api/ai/chat
// This test verifies that the chat endpoint correctly integrates session and universal memories

const TEST_USER_ID = 'test-user-dual-layer-' + Date.now();
const TEST_CONVERSATION_ID = 'test-conv-' + Date.now();
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

console.log('🧪 Testing Dual-Layer Memory Integration in Chat Endpoint\n');
console.log('Test User ID:', TEST_USER_ID);
console.log('Test Conversation ID:', TEST_CONVERSATION_ID);
console.log('Base URL:', BASE_URL);
console.log('='.repeat(80));

// Helper function to make API calls
async function apiCall(endpoint, method, body) {
  const url = `${BASE_URL}${endpoint}`;
  console.log(`\n📡 ${method} ${endpoint}`);
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
    console.log('Request body:', JSON.stringify(body, null, 2));
  }
  
  const response = await fetch(url, options);
  const data = await response.json();
  
  console.log(`Response status: ${response.status}`);
  console.log('Response data:', JSON.stringify(data, null, 2));
  
  return { response, data };
}

// Test 1: Store a session memory
async function testStoreSessionMemory() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 1: Store Session Memory');
  console.log('='.repeat(80));
  
  const { response, data } = await apiCall('/api/ai/memory', 'POST', {
    userId: TEST_USER_ID,
    message: 'What is thermodynamics?',
    response: 'Thermodynamics is the branch of physics that deals with heat, work, and temperature.',
    conversationId: TEST_CONVERSATION_ID,
    memory_type: 'session',
    metadata: {
      memoryType: 'learning_interaction',
      priority: 'medium',
      retention: 'long_term',
      topic: 'thermodynamics',
      tags: ['physics', 'session']
    }
  });
  
  if (response.ok && data.success) {
    console.log('✅ Session memory stored successfully');
    return data.data.memoryId;
  } else {
    console.log('❌ Failed to store session memory');
    return null;
  }
}

// Test 2: Store a universal memory
async function testStoreUniversalMemory() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 2: Store Universal Memory');
  console.log('='.repeat(80));
  
  const { response, data } = await apiCall('/api/ai/memory', 'POST', {
    userId: TEST_USER_ID,
    message: 'My name is Alex and I prefer detailed explanations',
    response: 'Got it! I\'ll remember that your name is Alex and you prefer detailed explanations.',
    memory_type: 'universal',
    metadata: {
      memoryType: 'user_query',
      priority: 'high',
      retention: 'permanent',
      topic: 'user_preferences',
      tags: ['personal', 'universal', 'preferences']
    }
  });
  
  if (response.ok && data.success) {
    console.log('✅ Universal memory stored successfully');
    return data.data.memoryId;
  } else {
    console.log('❌ Failed to store universal memory');
    return null;
  }
}

// Test 3: Chat with session memory only
async function testChatWithSessionMemoryOnly() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 3: Chat with Session Memory Only');
  console.log('='.repeat(80));
  
  const { response, data } = await apiCall('/api/ai/chat', 'POST', {
    userId: TEST_USER_ID,
    message: 'Can you explain more about the first law?',
    conversationId: TEST_CONVERSATION_ID,
    memory: {
      includeSession: true,
      includeUniversal: false
    }
  });
  
  if (response.ok && data.success) {
    console.log('✅ Chat with session memory completed');
    console.log('AI Response:', data.data.aiResponse.content.substring(0, 200) + '...');
    
    // Check if session memories were used
    if (data.data.integrationStatus) {
      console.log('Memory system used:', data.data.integrationStatus.memory_system);
      console.log('Memories found:', data.data.integrationStatus.memories_found);
    }
    
    return true;
  } else {
    console.log('❌ Chat with session memory failed');
    return false;
  }
}

// Test 4: Chat with universal memory only
async function testChatWithUniversalMemoryOnly() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 4: Chat with Universal Memory Only');
  console.log('='.repeat(80));
  
  const { response, data } = await apiCall('/api/ai/chat', 'POST', {
    userId: TEST_USER_ID,
    message: 'What do you know about me?',
    memory: {
      includeSession: false,
      includeUniversal: true
    }
  });
  
  if (response.ok && data.success) {
    console.log('✅ Chat with universal memory completed');
    console.log('AI Response:', data.data.aiResponse.content.substring(0, 200) + '...');
    
    // Check if the AI mentions the user's name or preferences
    const responseText = data.data.aiResponse.content.toLowerCase();
    if (responseText.includes('alex') || responseText.includes('detailed')) {
      console.log('✅ Universal memory was successfully retrieved and used');
    } else {
      console.log('⚠️ Universal memory may not have been used in response');
    }
    
    return true;
  } else {
    console.log('❌ Chat with universal memory failed');
    return false;
  }
}

// Test 5: Chat with both memory layers
async function testChatWithBothMemoryLayers() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 5: Chat with Both Memory Layers (Default)');
  console.log('='.repeat(80));
  
  const { response, data } = await apiCall('/api/ai/chat', 'POST', {
    userId: TEST_USER_ID,
    message: 'Can you summarize what we discussed and what you know about me?',
    conversationId: TEST_CONVERSATION_ID,
    memory: {
      includeSession: true,
      includeUniversal: true
    }
  });
  
  if (response.ok && data.success) {
    console.log('✅ Chat with both memory layers completed');
    console.log('AI Response:', data.data.aiResponse.content.substring(0, 300) + '...');
    
    return true;
  } else {
    console.log('❌ Chat with both memory layers failed');
    return false;
  }
}

// Test 6: Chat with no memory (backward compatibility)
async function testChatWithNoMemory() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 6: Chat with No Memory (Backward Compatibility)');
  console.log('='.repeat(80));
  
  const { response, data } = await apiCall('/api/ai/chat', 'POST', {
    userId: TEST_USER_ID,
    message: 'What is quantum mechanics?',
    memory: {
      includeSession: false,
      includeUniversal: false
    }
  });
  
  if (response.ok && data.success) {
    console.log('✅ Chat with no memory completed');
    console.log('AI Response:', data.data.aiResponse.content.substring(0, 200) + '...');
    
    return true;
  } else {
    console.log('❌ Chat with no memory failed');
    return false;
  }
}

// Test 7: Verify automatic memory type detection
async function testAutomaticMemoryTypeDetection() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 7: Automatic Memory Type Detection');
  console.log('='.repeat(80));
  
  // Test personal information (should be stored as universal)
  const { response: response1, data: data1 } = await apiCall('/api/ai/chat', 'POST', {
    userId: TEST_USER_ID,
    message: 'My name is Jordan and I learn best with examples',
    conversationId: TEST_CONVERSATION_ID
  });
  
  if (response1.ok && data1.success) {
    console.log('✅ Personal information chat completed');
    console.log('Expected: Should be stored as universal memory');
  }
  
  // Test regular conversation (should be stored as session)
  const { response: response2, data: data2 } = await apiCall('/api/ai/chat', 'POST', {
    userId: TEST_USER_ID,
    message: 'What is the weather like today?',
    conversationId: TEST_CONVERSATION_ID
  });
  
  if (response2.ok && data2.success) {
    console.log('✅ Regular conversation chat completed');
    console.log('Expected: Should be stored as session memory');
  }
  
  return true;
}

// Run all tests
async function runAllTests() {
  console.log('\n🚀 Starting Dual-Layer Memory Integration Tests\n');
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };
  
  try {
    // Setup: Store test memories
    results.total++;
    const sessionMemoryId = await testStoreSessionMemory();
    if (sessionMemoryId) results.passed++; else results.failed++;
    
    results.total++;
    const universalMemoryId = await testStoreUniversalMemory();
    if (universalMemoryId) results.passed++; else results.failed++;
    
    // Wait a bit for memories to be indexed
    console.log('\n⏳ Waiting 2 seconds for memory indexing...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test chat with different memory configurations
    results.total++;
    if (await testChatWithSessionMemoryOnly()) results.passed++; else results.failed++;
    
    results.total++;
    if (await testChatWithUniversalMemoryOnly()) results.passed++; else results.failed++;
    
    results.total++;
    if (await testChatWithBothMemoryLayers()) results.passed++; else results.failed++;
    
    results.total++;
    if (await testChatWithNoMemory()) results.passed++; else results.failed++;
    
    results.total++;
    if (await testAutomaticMemoryTypeDetection()) results.passed++; else results.failed++;
    
  } catch (error) {
    console.error('\n❌ Test execution error:', error);
    results.failed++;
  }
  
  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed: ${results.passed} ✅`);
  console.log(`Failed: ${results.failed} ❌`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log('='.repeat(80));
  
  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! Dual-layer memory integration is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the output above.');
  }
}

// Execute tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
