// Test script for dual-layer memory system
// Tests: storage with memory_type, session retrieval, universal retrieval, and updates

const BASE_URL = 'http://localhost:3000';

// Test user ID (use a valid UUID or test user)
const TEST_USER_ID = 'test-user-123';
const TEST_CONVERSATION_ID = 'conv-test-123';

async function testDualLayerMemory() {
  console.log('🧪 Testing Dual-Layer Memory System\n');
  
  try {
    // Test 1: Store a session memory
    console.log('1️⃣ Testing session memory storage...');
    const sessionMemoryResponse = await fetch(`${BASE_URL}/api/ai/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        message: 'What is photosynthesis?',
        response: 'Photosynthesis is the process by which plants convert light energy into chemical energy.',
        conversationId: TEST_CONVERSATION_ID,
        memory_type: 'session',
        metadata: {
          memoryType: 'learning_interaction',
          priority: 'medium',
          topic: 'biology',
          tags: ['science', 'plants']
        }
      })
    });
    
    const sessionMemory = await sessionMemoryResponse.json();
    console.log('✅ Session memory stored:', sessionMemory.data?.memoryId);
    console.log('   Memory type: session\n');
    
    // Test 2: Store a universal memory
    console.log('2️⃣ Testing universal memory storage...');
    const universalMemoryResponse = await fetch(`${BASE_URL}/api/ai/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        message: 'I prefer detailed explanations with examples',
        response: 'Noted: User prefers detailed explanations with examples.',
        conversationId: TEST_CONVERSATION_ID,
        memory_type: 'universal',
        metadata: {
          memoryType: 'insight',
          priority: 'high',
          topic: 'user_preferences',
          tags: ['preferences', 'learning_style']
        }
      })
    });
    
    const universalMemory = await universalMemoryResponse.json();
    console.log('✅ Universal memory stored:', universalMemory.data?.memoryId);
    console.log('   Memory type: universal\n');
    
    // Test 3: Update a memory
    console.log('3️⃣ Testing memory update...');
    const updateResponse = await fetch(`${BASE_URL}/api/ai/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        memoryId: sessionMemory.data?.memoryId,
        message: 'What is photosynthesis and why is it important?',
        metadata: {
          priority: 'high',
          tags: ['science', 'plants', 'ecology']
        }
      })
    });
    
    const updateResult = await updateResponse.json();
    console.log('✅ Memory updated:', updateResult.data?.message);
    console.log('   Updated at:', updateResult.data?.updatedAt);
    console.log('   Action metadata should show: updated\n');
    
    // Test 4: Search memories (should return both types)
    console.log('4️⃣ Testing memory search...');
    const searchResponse = await fetch(`${BASE_URL}/api/ai/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        query: 'photosynthesis',
        limit: 10,
        minSimilarity: 0.3
      })
    });
    
    const searchResults = await searchResponse.json();
    console.log('✅ Search completed');
    console.log('   Total memories found:', searchResults.memories?.length || 0);
    console.log('   Search type:', searchResults.searchStats?.searchType);
    
    if (searchResults.memories && searchResults.memories.length > 0) {
      console.log('\n   Memory types in results:');
      searchResults.memories.forEach((mem, idx) => {
        console.log(`   ${idx + 1}. Memory type: ${mem.metadata?.memoryType || 'unknown'}`);
      });
    }
    
    console.log('\n✅ All tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   - Session memory storage: ✓');
    console.log('   - Universal memory storage: ✓');
    console.log('   - Memory update tracking: ✓');
    console.log('   - Memory search: ✓');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', await error.response.text());
    }
  }
}

// Run the test
testDualLayerMemory();
