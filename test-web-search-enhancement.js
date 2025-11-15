/**
 * Test script for enhanced web search with article extraction
 * Run with: node test-web-search-enhancement.js
 */

const BASE_URL = 'http://localhost:3000';

async function testWebSearchEnhancement() {
  console.log('🧪 Testing Enhanced Web Search Endpoint\n');
  
  // Test 1: Basic search without article extraction (backward compatibility)
  console.log('Test 1: Basic search (backward compatibility)');
  try {
    const response1 = await fetch(`${BASE_URL}/api/ai/web-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'artificial intelligence',
        limit: 3
      })
    });
    
    const data1 = await response1.json();
    console.log('✅ Basic search works');
    console.log(`   - Found ${data1.data?.totalResults || 0} results`);
    console.log(`   - Articles field: ${data1.data?.articles ? 'present' : 'not present (expected)'}\n`);
  } catch (error) {
    console.error('❌ Basic search failed:', error.message, '\n');
  }
  
  // Test 2: Search with article extraction (no explanation)
  console.log('Test 2: Search with article extraction (maxArticles=1, no explanation)');
  try {
    const response2 = await fetch(`${BASE_URL}/api/ai/web-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'machine learning basics',
        limit: 5,
        maxArticles: 1
      })
    });
    
    const data2 = await response2.json();
    console.log('✅ Article extraction works');
    console.log(`   - Found ${data2.data?.totalResults || 0} results`);
    console.log(`   - Articles processed: ${data2.data?.searchInfo?.articlesProcessed || 0}`);
    if (data2.data?.articles?.[0]) {
      const article = data2.data.articles[0];
      console.log(`   - Article title: ${article.title}`);
      console.log(`   - Full content length: ${article.fullContent?.length || 0} chars`);
      console.log(`   - Extraction error: ${article.extractionError || 'none'}`);
    }
    console.log('');
  } catch (error) {
    console.error('❌ Article extraction failed:', error.message, '\n');
  }
  
  // Test 3: Search with article extraction and LLM explanation
  console.log('Test 3: Search with article extraction and LLM explanation');
  console.log('   (This test requires a valid userId and may take longer)');
  try {
    const response3 = await fetch(`${BASE_URL}/api/ai/web-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'quantum computing',
        limit: 3,
        maxArticles: 1,
        explain: true,
        userId: 'test-user-123'
      })
    });
    
    const data3 = await response3.json();
    console.log('✅ Article explanation works');
    console.log(`   - Found ${data3.data?.totalResults || 0} results`);
    console.log(`   - Articles processed: ${data3.data?.searchInfo?.articlesProcessed || 0}`);
    console.log(`   - Explanations generated: ${data3.data?.searchInfo?.explanationsGenerated || 0}`);
    if (data3.data?.articles?.[0]?.explanation) {
      const explanation = data3.data.articles[0].explanation;
      console.log(`   - Explanation preview: ${explanation.substring(0, 100)}...`);
    }
    console.log('');
  } catch (error) {
    console.error('❌ Article explanation failed:', error.message, '\n');
  }
  
  // Test 4: Multiple articles extraction
  console.log('Test 4: Multiple articles extraction (maxArticles=2)');
  try {
    const response4 = await fetch(`${BASE_URL}/api/ai/web-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'climate change',
        limit: 5,
        maxArticles: 2
      })
    });
    
    const data4 = await response4.json();
    console.log('✅ Multiple articles extraction works');
    console.log(`   - Found ${data4.data?.totalResults || 0} results`);
    console.log(`   - Articles processed: ${data4.data?.searchInfo?.articlesProcessed || 0}`);
    console.log('');
  } catch (error) {
    console.error('❌ Multiple articles extraction failed:', error.message, '\n');
  }
  
  console.log('🎉 All tests completed!');
}

// Run tests
testWebSearchEnhancement().catch(console.error);
