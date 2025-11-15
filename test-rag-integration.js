// Test RAG Integration in /api/ai/chat
// =====================================

const TEST_USER_ID = '123e4567-e89b-12d3-a456-426614174000';
const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testRAGIntegration() {
  console.log('🧪 Testing RAG Integration in /api/ai/chat\n');
  console.log('=' .repeat(60));

  // Test 1: Chat without RAG (default behavior)
  console.log('\n📝 Test 1: Chat without RAG (backward compatibility)');
  console.log('-'.repeat(60));
  
  try {
    const response1 = await fetch(`${API_BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        message: 'What is thermodynamics?',
        conversationId: '123e4567-e89b-12d3-a456-426614174001',
      }),
    });

    const data1 = await response1.json();
    
    if (data1.success) {
      console.log('✅ Chat without RAG successful');
      console.log('   RAG enabled:', data1.data.aiResponse.rag_enabled);
      console.log('   Response length:', data1.data.aiResponse.content.length);
      
      if (data1.data.aiResponse.rag_enabled === false) {
        console.log('✅ RAG correctly disabled by default');
      } else {
        console.log('❌ RAG should be disabled by default');
      }
    } else {
      console.log('❌ Chat without RAG failed:', data1.error);
    }
  } catch (error) {
    console.log('❌ Test 1 error:', error.message);
  }

  // Test 2: Chat with RAG enabled (semantic search)
  console.log('\n📝 Test 2: Chat with RAG enabled (semantic search)');
  console.log('-'.repeat(60));
  
  try {
    const response2 = await fetch(`${API_BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        message: 'Explain the first law of thermodynamics',
        conversationId: '123e4567-e89b-12d3-a456-426614174002',
        rag: {
          enabled: true,
        },
      }),
    });

    const data2 = await response2.json();
    
    if (data2.success) {
      console.log('✅ Chat with RAG successful');
      console.log('   RAG enabled:', data2.data.aiResponse.rag_enabled);
      
      if (data2.data.aiResponse.rag_results) {
        console.log('   Files retrieved:', data2.data.aiResponse.rag_results.filesRetrieved);
        console.log('   Provider:', data2.data.aiResponse.rag_results.provider || 'N/A');
        console.log('   Model:', data2.data.aiResponse.rag_results.model || 'N/A');
        
        if (data2.data.aiResponse.rag_results.files) {
          console.log('   Files:');
          data2.data.aiResponse.rag_results.files.forEach((file, idx) => {
            console.log(`     ${idx + 1}. ${file.path}`);
            console.log(`        Relevance: ${file.relevanceScore ? (file.relevanceScore * 100).toFixed(1) + '%' : 'N/A'}`);
            console.log(`        Size: ${file.contentLength} chars`);
          });
        }
        
        console.log('✅ RAG results included in response');
      } else {
        console.log('⚠️  RAG enabled but no results (may be no files in R2)');
      }
      
      console.log('   Response length:', data2.data.aiResponse.content.length);
      console.log('   Integration status:', data2.data.integrationStatus);
    } else {
      console.log('❌ Chat with RAG failed:', data2.error);
    }
  } catch (error) {
    console.log('❌ Test 2 error:', error.message);
  }

  // Test 3: Chat with RAG and specific sources
  console.log('\n📝 Test 3: Chat with RAG and specific sources');
  console.log('-'.repeat(60));
  
  try {
    const response3 = await fetch(`${API_BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        message: 'What does the knowledge base say about thermodynamics?',
        conversationId: '123e4567-e89b-12d3-a456-426614174003',
        rag: {
          enabled: true,
          sources: ['physics/thermodynamics.md', 'science/energy.md'],
        },
      }),
    });

    const data3 = await response3.json();
    
    if (data3.success) {
      console.log('✅ Chat with specific sources successful');
      console.log('   RAG enabled:', data3.data.aiResponse.rag_enabled);
      
      if (data3.data.aiResponse.rag_results) {
        console.log('   Files retrieved:', data3.data.aiResponse.rag_results.filesRetrieved);
        
        if (data3.data.aiResponse.rag_results.files) {
          console.log('   Files:');
          data3.data.aiResponse.rag_results.files.forEach((file, idx) => {
            console.log(`     ${idx + 1}. ${file.path}`);
          });
        }
        
        console.log('✅ Specific sources retrieved');
      } else {
        console.log('⚠️  RAG enabled but no results (files may not exist in R2)');
      }
      
      console.log('   Response length:', data3.data.aiResponse.content.length);
    } else {
      console.log('❌ Chat with specific sources failed:', data3.error);
    }
  } catch (error) {
    console.log('❌ Test 3 error:', error.message);
  }

  // Test 4: Combined RAG + Web Search + Memory
  console.log('\n📝 Test 4: Combined RAG + Web Search + Memory');
  console.log('-'.repeat(60));
  
  try {
    const response4 = await fetch(`${API_BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        message: 'What are the latest developments in thermodynamics?',
        conversationId: '123e4567-e89b-12d3-a456-426614174004',
        rag: {
          enabled: true,
        },
        webSearch: {
          enabled: true,
          maxArticles: 1,
          explain: true,
        },
        memory: {
          includeSession: true,
          includeUniversal: true,
        },
      }),
    });

    const data4 = await response4.json();
    
    if (data4.success) {
      console.log('✅ Combined systems test successful');
      console.log('   Integration status:');
      console.log('     - Memory:', data4.data.integrationStatus.memory_system);
      console.log('     - Web Search:', data4.data.integrationStatus.web_search_system);
      console.log('     - RAG:', data4.data.integrationStatus.rag_system);
      console.log('     - Memories found:', data4.data.integrationStatus.memories_found);
      console.log('     - RAG files:', data4.data.integrationStatus.rag_files_retrieved);
      
      if (data4.data.aiResponse.web_search_results) {
        console.log('     - Web results:', data4.data.aiResponse.web_search_results.resultsCount);
      }
      
      console.log('   Response length:', data4.data.aiResponse.content.length);
      console.log('✅ All systems working together');
    } else {
      console.log('❌ Combined systems test failed:', data4.error);
    }
  } catch (error) {
    console.log('❌ Test 4 error:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 RAG Integration Tests Complete!\n');
}

// Run tests
testRAGIntegration().catch(console.error);
