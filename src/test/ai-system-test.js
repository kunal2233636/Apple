// Comprehensive AI System Test
// ===========================

const testAISystem = async () => {
  console.log('🚀 Starting Comprehensive AI System Test...\n');

  // Test configuration
  const baseUrl = 'http://localhost:3000';
  const testUserId = '123e4567-e89b-12d3-a456-426614174000'; // Sample UUID
  const testConversationId = '987fcdeb-51a2-43d1-9c4e-123456789abc'; // Sample UUID

  let testsPassed = 0;
  let testsTotal = 0;

  // Test 1: Profile API
  console.log('📋 Test 1: Student Profile API');
  testsTotal++;
  try {
    const profileResponse = await fetch(`${baseUrl}/api/student/profile?userId=${testUserId}`);
    const profileResult = await profileResponse.json();
    
    console.log(`  Status: ${profileResponse.status}`);
    console.log(`  Response:`, JSON.stringify(profileResult, null, 2));
    
    if (profileResult.success || profileResult.data) {
      console.log('  ✅ PASSED\n');
      testsPassed++;
    } else {
      console.log('  ❌ FAILED\n');
    }
  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}\n`);
  }

  // Test 2: Create Conversation
  console.log('💬 Test 2: Create Conversation');
  testsTotal++;
  try {
    const conversationResponse = await fetch(`${baseUrl}/api/chat/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        chatType: 'general',
        title: 'Test Conversation'
      })
    });
    
    const conversationResult = await conversationResponse.json();
    
    console.log(`  Status: ${conversationResponse.status}`);
    console.log(`  Response:`, JSON.stringify(conversationResult, null, 2));
    
    if (conversationResult.conversation) {
      console.log('  ✅ PASSED\n');
      testsPassed++;
    } else {
      console.log('  ❌ FAILED\n');
    }
  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}\n`);
  }

  // Test 3: Send Message to AI
  console.log('🤖 Test 3: Send Message to AI (General Chat)');
  testsTotal++;
  try {
    const messageResponse = await fetch(`${baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        conversationId: testConversationId,
        message: 'Hello, can you tell me about physics?',
        chatType: 'general'
      })
    });
    
    const messageResult = await messageResponse.json();
    
    console.log(`  Status: ${messageResponse.status}`);
    console.log(`  Response:`, JSON.stringify(messageResult, null, 2));
    
    if (messageResult.success && messageResult.data && messageResult.data.response) {
      console.log('  ✅ PASSED - AI responded successfully!\n');
      testsPassed++;
    } else {
      console.log('  ❌ FAILED - No AI response\n');
    }
  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}\n`);
  }

  // Test 4: Send Message to Study Assistant
  console.log('📚 Test 4: Send Message to AI (Study Assistant)');
  testsTotal++;
  try {
    const studyResponse = await fetch(`${baseUrl}/api/chat/study-assistant/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        conversationId: testConversationId,
        message: 'Mera physics kaisa chal raha hai?',
        chatType: 'study_assistant',
        isPersonalQuery: true
      })
    });
    
    const studyResult = await studyResponse.json();
    
    console.log(`  Status: ${studyResponse.status}`);
    console.log(`  Response:`, JSON.stringify(studyResult, null, 2));
    
    if (studyResult.success && studyResult.data && studyResult.data.response) {
      console.log('  ✅ PASSED - Study Assistant responded!\n');
      testsPassed++;
    } else {
      console.log('  ❌ FAILED - No Study Assistant response\n');
    }
  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}\n`);
  }

  // Test 5: AI Suggestions
  console.log('💡 Test 5: AI Suggestions API');
  testsTotal++;
  try {
    const suggestionsResponse = await fetch(`${baseUrl}/api/suggestions`);
    const suggestionsResult = await suggestionsResponse.json();
    
    console.log(`  Status: ${suggestionsResponse.status}`);
    console.log(`  Response:`, JSON.stringify(suggestionsResult, null, 2));
    
    if (suggestionsResult.success !== false) { // Allow empty responses
      console.log('  ✅ PASSED - Suggestions API working\n');
      testsPassed++;
    } else {
      console.log('  ❌ FAILED - Suggestions API error\n');
    }
  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}\n`);
  }

  // Final Results
  console.log('='.repeat(50));
  console.log(`📊 TEST RESULTS: ${testsPassed}/${testsTotal} tests passed`);
  
  if (testsPassed === testsTotal) {
    console.log('🎉 ALL TESTS PASSED! AI system is working correctly.');
  } else if (testsPassed >= testsTotal * 0.7) {
    console.log('⚠️  MOSTLY WORKING: Some issues detected but core functionality works.');
  } else {
    console.log('❌ MAJOR ISSUES: AI system has significant problems.');
  }
  
  console.log('='.repeat(50));
  
  return testsPassed === testsTotal;
};

// Check if server is running
const checkServerStatus = async () => {
  try {
    const response = await fetch('http://localhost:3000');
    return response.ok;
  } catch (error) {
    return false;
  }
};

// Main execution
const main = async () => {
  console.log('🔍 Checking if Next.js server is running...');
  
  const serverRunning = await checkServerStatus();
  if (!serverRunning) {
    console.log('❌ Next.js server is not running!');
    console.log('💡 Please start the server with: npm run dev');
    return;
  }
  
  console.log('✅ Next.js server is running!\n');
  
  // Run the comprehensive test
  await testAISystem();
};

// Execute the test
main().catch(console.error);
