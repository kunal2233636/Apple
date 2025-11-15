/**
 * Test 14.3: Web Search Backward Compatibility
 * 
 * This test verifies that the /api/ai/web-search endpoint maintains
 * backward compatibility when called without new enhancement parameters.
 * 
 * Requirements: 10.5 - Web Search Engine SHALL maintain existing search 
 * functionality when new parameters are not provided
 * 
 * Run with: node test-web-search-backward-compatibility.js
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function recordTest(name, passed, details) {
  results.tests.push({ name, passed, details });
  if (passed) {
    results.passed++;
    console.log(`✅ ${name}`);
  } else {
    results.failed++;
    console.log(`❌ ${name}`);
  }
  if (details) {
    console.log(`   ${details}`);
  }
}

/**
 * Test 1: Basic web search without any new parameters
 * Should work exactly as before enhancements
 */
async function testBasicWebSearch() {
  console.log('\n📋 Test 1: Basic Web Search (No New Parameters)');
  
  try {
    const response = await fetch(`${BASE_URL}/api/ai/web-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'machine learning basics',
        limit: 5
      })
    });
    
    const data = await response.json();
    
    // Verify response structure
    if (!response.ok) {
      recordTest('Basic web search request', false, `HTTP ${response.status}: ${data.error?.message || 'Unknown error'}`);
      return false;
    }
    
    if (!data.success) {
      recordTest('Basic web search request', false, `API error: ${data.error?.message || 'Unknown error'}`);
      return false;
    }
    
    // Verify expected fields exist
    const hasResults = Array.isArray(data.data?.results);
    const hasTotalResults = typeof data.data?.totalResults === 'number';
    const hasSearchInfo = typeof data.data?.searchInfo === 'object';
    
    if (!hasResults || !hasTotalResults || !hasSearchInfo) {
      recordTest('Basic web search response structure', false, 
        `Missing fields - results: ${hasResults}, totalResults: ${hasTotalResults}, searchInfo: ${hasSearchInfo}`);
      return false;
    }
    
    recordTest('Basic web search request', true, `Found ${data.data.totalResults} results`);
    
    // Verify results have expected structure
    if (data.data.results.length > 0) {
      const firstResult = data.data.results[0];
      const hasTitle = typeof firstResult.title === 'string';
      const hasUrl = typeof firstResult.url === 'string';
      const hasSnippet = typeof firstResult.snippet === 'string';
      const hasSource = typeof firstResult.source === 'string';
      
      if (!hasTitle || !hasUrl || !hasSnippet || !hasSource) {
        recordTest('Search result structure', false, 
          `Missing fields - title: ${hasTitle}, url: ${hasUrl}, snippet: ${hasSnippet}, source: ${hasSource}`);
        return false;
      }
      
      recordTest('Search result structure', true, 'All expected fields present');
    }
    
    // Verify new enhancement fields are NOT present when not requested
    const hasArticles = data.data?.articles !== undefined;
    
    if (hasArticles) {
      recordTest('Backward compatibility (no articles field)', false, 
        'Articles field should not be present when maxArticles not specified');
      return false;
    }
    
    recordTest('Backward compatibility (no articles field)', true, 'No articles field in response');
    
    return true;
  } catch (error) {
    recordTest('Basic web search request', false, `Exception: ${error.message}`);
    return false;
  }
}

/**
 * Test 2: Web search with only traditional parameters
 * Verify limit parameter still works
 */
async function testWebSearchWithLimit() {
  console.log('\n📋 Test 2: Web Search with Limit Parameter');
  
  try {
    const response = await fetch(`${BASE_URL}/api/ai/web-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'artificial intelligence',
        limit: 3
      })
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      recordTest('Web search with limit', false, data.error?.message || 'Request failed');
      return false;
    }
    
    // Verify limit is respected
    const resultsCount = data.data?.results?.length || 0;
    if (resultsCount > 3) {
      recordTest('Limit parameter respected', false, `Got ${resultsCount} results, expected max 3`);
      return false;
    }
    
    recordTest('Web search with limit', true, `Returned ${resultsCount} results (limit: 3)`);
    return true;
  } catch (error) {
    recordTest('Web search with limit', false, `Exception: ${error.message}`);
    return false;
  }
}

/**
 * Test 3: Web search response format consistency
 * Verify the response format matches the original structure
 */
async function testResponseFormatConsistency() {
  console.log('\n📋 Test 3: Response Format Consistency');
  
  try {
    const response = await fetch(`${BASE_URL}/api/ai/web-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'quantum computing'
      })
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      recordTest('Response format consistency', false, data.error?.message || 'Request failed');
      return false;
    }
    
    // Verify top-level structure
    const hasSuccess = typeof data.success === 'boolean';
    const hasData = typeof data.data === 'object';
    
    if (!hasSuccess || !hasData) {
      recordTest('Top-level response structure', false, 
        `Missing fields - success: ${hasSuccess}, data: ${hasData}`);
      return false;
    }
    
    recordTest('Top-level response structure', true, 'Standard format maintained');
    
    // Verify data structure
    const expectedFields = ['results', 'totalResults', 'searchInfo'];
    const missingFields = expectedFields.filter(field => !(field in data.data));
    
    if (missingFields.length > 0) {
      recordTest('Data object structure', false, `Missing fields: ${missingFields.join(', ')}`);
      return false;
    }
    
    recordTest('Data object structure', true, 'All expected fields present');
    
    return true;
  } catch (error) {
    recordTest('Response format consistency', false, `Exception: ${error.message}`);
    return false;
  }
}

/**
 * Test 4: Error handling consistency
 * Verify errors are handled the same way as before
 */
async function testErrorHandling() {
  console.log('\n📋 Test 4: Error Handling Consistency');
  
  try {
    // Test with missing query parameter
    const response = await fetch(`${BASE_URL}/api/ai/web-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        limit: 5
        // Missing query parameter
      })
    });
    
    const data = await response.json();
    
    // Should return error response
    if (response.ok && data.success) {
      recordTest('Error handling for missing query', false, 'Should have returned error');
      return false;
    }
    
    // Verify error structure
    const hasSuccess = data.success === false;
    const hasError = typeof data.error === 'object';
    const hasErrorMessage = typeof data.error?.message === 'string';
    
    if (!hasSuccess || !hasError || !hasErrorMessage) {
      recordTest('Error response structure', false, 
        `Invalid error format - success: ${hasSuccess}, error: ${hasError}, message: ${hasErrorMessage}`);
      return false;
    }
    
    recordTest('Error handling for missing query', true, `Error message: ${data.error.message}`);
    return true;
  } catch (error) {
    recordTest('Error handling for missing query', false, `Exception: ${error.message}`);
    return false;
  }
}

/**
 * Test 5: GET request for endpoint info
 * Verify GET endpoint still works
 */
async function testGetEndpoint() {
  console.log('\n📋 Test 5: GET Endpoint Info');
  
  try {
    const response = await fetch(`${BASE_URL}/api/ai/web-search`, {
      method: 'GET'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      recordTest('GET endpoint', false, `HTTP ${response.status}`);
      return false;
    }
    
    // Verify response structure
    const hasSuccess = data.success === true;
    const hasData = typeof data.data === 'object';
    const hasEndpoint = typeof data.data?.endpoint === 'string';
    
    if (!hasSuccess || !hasData || !hasEndpoint) {
      recordTest('GET endpoint response', false, 
        `Missing fields - success: ${hasSuccess}, data: ${hasData}, endpoint: ${hasEndpoint}`);
      return false;
    }
    
    recordTest('GET endpoint', true, `Endpoint: ${data.data.endpoint}`);
    return true;
  } catch (error) {
    recordTest('GET endpoint', false, `Exception: ${error.message}`);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🧪 Web Search Backward Compatibility Tests');
  console.log('='.repeat(60));
  console.log('Testing /api/ai/web-search endpoint without new parameters');
  console.log('Requirement 10.5: Maintain existing functionality\n');
  
  // Run all tests
  await testBasicWebSearch();
  await testWebSearchWithLimit();
  await testResponseFormatConsistency();
  await testErrorHandling();
  await testGetEndpoint();
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`Total tests: ${results.tests.length}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log('='.repeat(60));
  
  if (results.failed > 0) {
    console.log('\n❌ Failed tests:');
    results.tests
      .filter(t => !t.passed)
      .forEach(t => console.log(`   - ${t.name}: ${t.details}`));
  }
  
  // Return success status
  return results.failed === 0;
}

// Run tests
if (require.main === module) {
  runTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 Test suite crashed:', error);
      process.exit(1);
    });
}

module.exports = { runTests };
