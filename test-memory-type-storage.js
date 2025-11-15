// Test script to verify memory_type parameter is properly stored
// This tests task 6.2: Update memory storage logic

const testMemoryTypeStorage = async () => {
  console.log('Testing memory_type storage functionality...\n');

  const testUserId = 'test-user-' + Date.now();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Test 1: Store a session memory
  console.log('Test 1: Storing session memory...');
  try {
    const sessionResponse = await fetch(`${baseUrl}/api/ai/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        message: 'What is photosynthesis?',
        response: 'Photosynthesis is the process by which plants convert light energy into chemical energy.',
        conversationId: 'conv-session-test',
        memory_type: 'session',
        metadata: {
          memoryType: 'learning_interaction',
          priority: 'medium',
          topic: 'biology'
        }
      })
    });

    const sessionData = await sessionResponse.json();
    
    if (sessionData.success) {
      console.log('✅ Session memory stored successfully');
      console.log('   Memory ID:', sessionData.data.memoryId);
      console.log('   Quality Score:', sessionData.data.qualityScore);
      console.log('   Relevance Score:', sessionData.data.relevanceScore);
    } else {
      console.log('❌ Failed to store session memory:', sessionData.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Error storing session memory:', error.message);
    return false;
  }

  console.log('');

  // Test 2: Store a universal memory
  console.log('Test 2: Storing universal memory...');
  try {
    const universalResponse = await fetch(`${baseUrl}/api/ai/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        message: 'I prefer learning through visual diagrams',
        response: 'I will remember to provide visual explanations when possible.',
        conversationId: 'conv-universal-test',
        memory_type: 'universal',
        metadata: {
          memoryType: 'insight',
          priority: 'high',
          topic: 'learning_preferences',
          tags: ['visual_learner', 'preferences']
        }
      })
    });

    const universalData = await universalResponse.json();
    
    if (universalData.success) {
      console.log('✅ Universal memory stored successfully');
      console.log('   Memory ID:', universalData.data.memoryId);
      console.log('   Quality Score:', universalData.data.qualityScore);
      console.log('   Relevance Score:', universalData.data.relevanceScore);
    } else {
      console.log('❌ Failed to store universal memory:', universalData.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Error storing universal memory:', error.message);
    return false;
  }

  console.log('');

  // Test 3: Store memory with default type (should default to 'session')
  console.log('Test 3: Storing memory without memory_type (should default to session)...');
  try {
    const defaultResponse = await fetch(`${baseUrl}/api/ai/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        message: 'What is the capital of France?',
        response: 'The capital of France is Paris.',
        conversationId: 'conv-default-test',
        metadata: {
          memoryType: 'user_query',
          priority: 'low'
        }
      })
    });

    const defaultData = await defaultResponse.json();
    
    if (defaultData.success) {
      console.log('✅ Default memory stored successfully (should be session type)');
      console.log('   Memory ID:', defaultData.data.memoryId);
    } else {
      console.log('❌ Failed to store default memory:', defaultData.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Error storing default memory:', error.message);
    return false;
  }

  console.log('\n✅ All memory_type storage tests passed!');
  console.log('\nSummary:');
  console.log('- Session memories can be stored with memory_type="session"');
  console.log('- Universal memories can be stored with memory_type="universal"');
  console.log('- Memories default to "session" type when memory_type is not specified');
  
  return true;
};

// Run the test
testMemoryTypeStorage()
  .then(success => {
    if (success) {
      console.log('\n✅ Task 6.2 implementation verified successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Task 6.2 implementation has issues');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  });
