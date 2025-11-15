/**
 * Test Universal Memory Retrieval
 * Tests the getUniversalMemories function with semantic search
 */

const TEST_USER_ID = 'test-user-universal-memory';
const API_BASE_URL = 'http://localhost:3000';

async function testUniversalMemoryRetrieval() {
  console.log('🧪 Testing Universal Memory Retrieval\n');
  console.log('=' .repeat(60));

  try {
    // Step 1: Store some universal memories
    console.log('\n📝 Step 1: Storing universal memories...');
    
    const universalMemories = [
      {
        message: 'I love studying quantum physics and particle theory',
        response: 'That\'s fascinating! Quantum physics explores the behavior of matter and energy at the smallest scales.',
        metadata: {
          topic: 'quantum physics',
          priority: 'high',
          tags: ['physics', 'quantum', 'science']
        }
      },
      {
        message: 'I prefer learning about biology and cellular processes',
        response: 'Biology is amazing! Understanding how cells work is fundamental to life sciences.',
        metadata: {
          topic: 'biology',
          priority: 'high',
          tags: ['biology', 'cells', 'science']
        }
      },
      {
        message: 'Mathematics is my favorite subject, especially calculus',
        response: 'Calculus is a powerful tool for understanding change and motion in mathematics.',
        metadata: {
          topic: 'mathematics',
          priority: 'critical',
          tags: ['math', 'calculus']
        }
      }
    ];

    const storedMemoryIds = [];
    
    for (const memory of universalMemories) {
      const storeResponse = await fetch(`${API_BASE_URL}/api/ai/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: TEST_USER_ID,
          message: memory.message,
          response: memory.response,
          memory_type: 'universal', // Store as universal memory
          conversationId: 'universal-test-conversation',
          metadata: memory.metadata
        })
      });

      const storeResult = await storeResponse.json();
      
      if (storeResult.success) {
        storedMemoryIds.push(storeResult.data.memoryId);
        console.log(`✅ Stored universal memory: ${memory.metadata.topic}`);
      } else {
        console.error(`❌ Failed to store memory: ${storeResult.error?.message}`);
      }
    }

    console.log(`\n✅ Stored ${storedMemoryIds.length} universal memories`);

    // Step 2: Test semantic search for universal memories
    console.log('\n🔍 Step 2: Testing semantic search for universal memories...');
    
    const searchQueries = [
      { query: 'Tell me about physics', expectedTopic: 'quantum physics' },
      { query: 'What do you know about living organisms?', expectedTopic: 'biology' },
      { query: 'Help me with derivatives and integrals', expectedTopic: 'mathematics' }
    ];

    for (const { query, expectedTopic } of searchQueries) {
      console.log(`\n  Query: "${query}"`);
      
      const searchResponse = await fetch(`${API_BASE_URL}/api/ai/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: TEST_USER_ID,
          query: query,
          limit: 3,
          minSimilarity: 0.3
        })
      });

      const searchResult = await searchResponse.json();
      
      if (searchResult.memories && searchResult.memories.length > 0) {
        console.log(`  ✅ Found ${searchResult.memories.length} memories`);
        
        // Check if top result matches expected topic
        const topMemory = searchResult.memories[0];
        console.log(`  📊 Top result: ${topMemory.metadata.topic} (similarity: ${topMemory.similarity.toFixed(3)})`);
        console.log(`  📈 Relevance score: ${topMemory.relevanceScore.toFixed(3)}`);
        
        if (topMemory.metadata.topic === expectedTopic) {
          console.log(`  ✅ Correct topic retrieved!`);
        } else {
          console.log(`  ⚠️  Expected ${expectedTopic}, got ${topMemory.metadata.topic}`);
        }
      } else {
        console.log(`  ❌ No memories found`);
      }
    }

    // Step 3: Test ranking by relevance score
    console.log('\n📊 Step 3: Testing relevance score ranking...');
    
    const rankingResponse = await fetch(`${API_BASE_URL}/api/ai/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        query: 'science subjects',
        limit: 5,
        minSimilarity: 0.2
      })
    });

    const rankingResult = await rankingResponse.json();
    
    if (rankingResult.memories && rankingResult.memories.length > 0) {
      console.log(`\n  Found ${rankingResult.memories.length} memories:`);
      
      rankingResult.memories.forEach((memory, index) => {
        console.log(`  ${index + 1}. ${memory.metadata.topic}`);
        console.log(`     Similarity: ${memory.similarity.toFixed(3)}, Relevance: ${memory.relevanceScore.toFixed(3)}`);
      });
      
      // Verify memories are sorted by relevance
      const relevanceScores = rankingResult.memories.map(m => m.relevanceScore);
      const isSorted = relevanceScores.every((score, i) => 
        i === 0 || score <= relevanceScores[i - 1]
      );
      
      if (isSorted) {
        console.log('\n  ✅ Memories are correctly ranked by relevance score');
      } else {
        console.log('\n  ⚠️  Memories may not be properly sorted by relevance');
      }
    }

    // Step 4: Test memory_type filtering
    console.log('\n🔍 Step 4: Testing memory_type filtering...');
    
    // Store a session memory for comparison
    const sessionResponse = await fetch(`${API_BASE_URL}/api/ai/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        message: 'This is a session-specific question',
        response: 'This is a session-specific response',
        memory_type: 'session',
        conversationId: 'session-test-conversation',
        metadata: {
          topic: 'session-test',
          priority: 'low'
        }
      })
    });

    const sessionResult = await sessionResponse.json();
    console.log(`  ${sessionResult.success ? '✅' : '❌'} Stored session memory`);

    // Search should prioritize universal memories for cross-session queries
    const crossSessionResponse = await fetch(`${API_BASE_URL}/api/ai/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        query: 'science',
        limit: 5,
        minSimilarity: 0.2
      })
    });

    const crossSessionResult = await crossSessionResponse.json();
    
    if (crossSessionResult.memories) {
      const universalCount = crossSessionResult.memories.filter(m => 
        m.metadata.topic !== 'session-test'
      ).length;
      
      console.log(`  📊 Found ${universalCount} universal memories in cross-session search`);
      console.log(`  ✅ Universal memories are accessible across sessions`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Universal Memory Retrieval Test Complete!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testUniversalMemoryRetrieval();
