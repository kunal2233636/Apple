// Test script for /api/ai/embedding endpoint
// Tests all three modes: embed, search, and RAG

const BASE_URL = 'http://localhost:3000';

async function testEmbedMode() {
  console.log('\n🔢 Testing EMBED mode...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/ai/embedding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'embed',
        texts: [
          'What is thermodynamics?',
          'Explain Newton\'s laws of motion',
          'How does photosynthesis work?'
        ],
        provider: 'cohere'
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ EMBED mode successful');
      console.log(`   - Generated ${data.data.count} embeddings`);
      console.log(`   - Provider: ${data.data.provider}`);
      console.log(`   - Model: ${data.data.model}`);
      console.log(`   - Dimensions: ${data.data.dimensions}`);
      console.log(`   - First embedding sample: [${data.data.embeddings[0].slice(0, 5).join(', ')}...]`);
    } else {
      console.log('❌ EMBED mode failed:', data.error);
    }
  } catch (error) {
    console.log('❌ EMBED mode error:', error.message);
  }
}

async function testSearchMode() {
  console.log('\n🔍 Testing SEARCH mode...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/ai/embedding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'search',
        query: 'thermodynamics',
        userId: '00000000-0000-0000-0000-000000000001',
        limit: 5,
        minSimilarity: 0.5
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ SEARCH mode successful');
      console.log(`   - Found ${data.data.count} memories`);
      console.log(`   - Query: "${data.data.query}"`);
      
      if (data.data.memories.length > 0) {
        console.log(`   - Top result similarity: ${data.data.memories[0].similarity.toFixed(3)}`);
        console.log(`   - Top result content: "${data.data.memories[0].content.substring(0, 50)}..."`);
      }
    } else {
      console.log('❌ SEARCH mode failed:', data.error);
    }
  } catch (error) {
    console.log('❌ SEARCH mode error:', error.message);
  }
}

async function testRAGMode() {
  console.log('\n📚 Testing RAG mode...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/ai/embedding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'rag',
        query: 'What did I learn about thermodynamics?',
        userId: '00000000-0000-0000-0000-000000000001',
        generateAnswer: true,
        limit: 3
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ RAG mode successful');
      console.log(`   - Retrieved ${data.data.context.length} context items`);
      console.log(`   - Sources: ${data.data.sources.join(', ')}`);
      
      if (data.data.answer) {
        console.log(`   - Generated answer: "${data.data.answer.substring(0, 100)}..."`);
      } else {
        console.log('   - No answer generated (generateAnswer was false or no context)');
      }
    } else {
      console.log('❌ RAG mode failed:', data.error);
    }
  } catch (error) {
    console.log('❌ RAG mode error:', error.message);
  }
}

async function testHealthCheck() {
  console.log('\n🏥 Testing HEALTH CHECK...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/ai/embedding`, {
      method: 'GET'
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Health check successful');
      console.log(`   - Status: ${data.data.status}`);
      console.log(`   - Version: ${data.data.version}`);
      console.log(`   - Modes: ${data.data.modes.join(', ')}`);
      console.log(`   - Total requests: ${data.data.usage.total.requests}`);
      console.log(`   - Total cost: $${data.data.usage.total.cost.toFixed(4)}`);
      
      console.log('   - Provider health:');
      Object.entries(data.data.providers).forEach(([provider, health]) => {
        console.log(`     • ${provider}: ${health.healthy ? '✅' : '❌'} (${health.responseTime}ms)`);
      });
    } else {
      console.log('❌ Health check failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting /api/ai/embedding endpoint tests...');
  console.log('================================================');
  
  await testHealthCheck();
  await testEmbedMode();
  await testSearchMode();
  await testRAGMode();
  
  console.log('\n================================================');
  console.log('✅ All tests completed!');
}

// Run tests
runAllTests().catch(console.error);
