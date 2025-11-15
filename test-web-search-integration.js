/**
 * Test Web Search Integration in /api/ai/chat
 * 
 * This test verifies that the web search integration works correctly
 * with the new enhanced parameters.
 */

const TEST_USER_ID = '123e4567-e89b-12d3-a456-426614174000';
const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testWebSearchIntegration() {
  console.log('🧪 Testing Web Search Integration in /api/ai/chat\n');
  
  const tests = [
    {
      name: 'Test 1: Web search disabled (backward compatibility)',
      payload: {
        userId: TEST_USER_ID,
        message: 'What is the latest news about AI?',
        webSearch: {
          enabled: false
        }
      }
    },
    {
      name: 'Test 2: Web search enabled without articles',
      payload: {
        userId: TEST_USER_ID,
        message: 'What is the latest news about AI?',
        webSearch: {
          enabled: true,
          maxArticles: 0,
          explain: false
        }
      }
    },
    {
      name: 'Test 3: Web search with article extraction',
      payload: {
        userId: TEST_USER_ID,
        message: 'What is the latest news about AI?',
        webSearch: {
          enabled: true,
          maxArticles: 1,
          explain: false
        }
      }
    },
    {
      name: 'Test 4: Web search with article extraction and explanation',
      payload: {
        userId: TEST_USER_ID,
        message: 'What is the latest news about AI?',
        webSearch: {
          enabled: true,
          maxArticles: 1,
          explain: true
        }
      }
    },
    {
      name: 'Test 5: Legacy string format (backward compatibility)',
      payload: {
        userId: TEST_USER_ID,
        message: 'What is the latest news about AI?',
        webSearch: 'on'
      }
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    console.log(`\n📋 ${test.name}`);
    console.log('Request:', JSON.stringify(test.payload, null, 2));
    
    try {
      const response = await fetch(`${API_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(test.payload),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log('✅ Test passed');
        console.log('Response summary:');
        console.log('  - Content length:', data.data?.aiResponse?.content?.length || 0);
        console.log('  - Web search enabled:', data.data?.aiResponse?.web_search_enabled);
        
        if (data.data?.aiResponse?.web_search_results) {
          const wsResults = data.data.aiResponse.web_search_results;
          console.log('  - Results count:', wsResults.resultsCount);
          console.log('  - Articles processed:', wsResults.articlesProcessed);
          console.log('  - Explanations generated:', wsResults.explanationsGenerated);
        }
        
        passed++;
      } else {
        console.log('❌ Test failed');
        console.log('Error:', data.error);
        failed++;
      }
    } catch (error) {
      console.log('❌ Test failed with exception');
      console.log('Error:', error.message);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`Total tests: ${tests.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('='.repeat(60));
  
  return failed === 0;
}

// Run tests
testWebSearchIntegration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
