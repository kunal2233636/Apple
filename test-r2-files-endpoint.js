// Test R2 Files Endpoint
// ======================

const testR2FilesEndpoint = async () => {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Testing R2 Files Endpoint\n');
  console.log('=' .repeat(50));

  // Test 1: Health Check
  console.log('\n📋 Test 1: Health Check (GET)');
  try {
    const response = await fetch(`${baseUrl}/api/ai/files`);
    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('✅ Health check passed');
    } else {
      console.log('⚠️  Health check returned non-200 status');
    }
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }

  // Test 2: List Files
  console.log('\n📋 Test 2: List Files');
  try {
    const response = await fetch(`${baseUrl}/api/ai/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'list',
        maxResults: 10
      })
    });
    
    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Files found:', data.count || 0);
    
    if (data.files && data.files.length > 0) {
      console.log('Sample files:');
      data.files.slice(0, 3).forEach(file => {
        console.log(`  - ${file.path} (${file.metadata?.size || 0} bytes)`);
      });
      console.log('✅ List files passed');
    } else {
      console.log('⚠️  No files found (this is OK if bucket is empty)');
    }
  } catch (error) {
    console.error('❌ List files failed:', error.message);
  }

  // Test 3: Get Specific File (only if we have files)
  console.log('\n📋 Test 3: Get Specific File');
  try {
    // First get the list to find a file
    const listResponse = await fetch(`${baseUrl}/api/ai/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'list', maxResults: 1 })
    });
    
    const listData = await listResponse.json();
    
    if (listData.files && listData.files.length > 0) {
      const testFilePath = listData.files[0].path;
      
      const response = await fetch(`${baseUrl}/api/ai/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'get',
          path: testFilePath
        })
      });
      
      const data = await response.json();
      
      console.log('Status:', response.status);
      console.log('File path:', data.path);
      console.log('Content length:', data.content?.length || 0, 'characters');
      console.log('Content preview:', data.content?.substring(0, 100) + '...');
      console.log('✅ Get file passed');
    } else {
      console.log('⚠️  Skipped - no files available to test');
    }
  } catch (error) {
    console.error('❌ Get file failed:', error.message);
  }

  // Test 4: Semantic Search
  console.log('\n📋 Test 4: Semantic Search');
  try {
    const response = await fetch(`${baseUrl}/api/ai/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'search',
        query: 'machine learning algorithms',
        maxResults: 3,
        provider: 'cohere'
      })
    });
    
    const data = await response.json();
    
    console.log('Status:', response.status);
    
    if (data.files && data.files.length > 0) {
      console.log('Results found:', data.files.length);
      console.log('Provider used:', data.provider);
      console.log('Model used:', data.model);
      console.log('\nTop results:');
      data.files.forEach((file, idx) => {
        console.log(`  ${idx + 1}. ${file.path}`);
        console.log(`     Relevance: ${(file.relevanceScore * 100).toFixed(2)}%`);
        console.log(`     Preview: ${file.content.substring(0, 80)}...`);
      });
      console.log('✅ Semantic search passed');
    } else {
      console.log('⚠️  No results found (this is OK if bucket is empty)');
    }
  } catch (error) {
    console.error('❌ Semantic search failed:', error.message);
  }

  // Test 5: Error Handling - Invalid Mode
  console.log('\n📋 Test 5: Error Handling - Invalid Mode');
  try {
    const response = await fetch(`${baseUrl}/api/ai/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'invalid_mode'
      })
    });
    
    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Error message:', data.error);
    
    if (response.status === 400 && data.error) {
      console.log('✅ Error handling passed');
    } else {
      console.log('⚠️  Expected 400 error with error message');
    }
  } catch (error) {
    console.error('❌ Error handling test failed:', error.message);
  }

  // Test 6: Error Handling - Missing Query for Search
  console.log('\n📋 Test 6: Error Handling - Missing Query');
  try {
    const response = await fetch(`${baseUrl}/api/ai/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'search'
        // Missing query parameter
      })
    });
    
    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Error message:', data.error);
    
    if (response.status === 400 && data.error) {
      console.log('✅ Error handling passed');
    } else {
      console.log('⚠️  Expected 400 error with error message');
    }
  } catch (error) {
    console.error('❌ Error handling test failed:', error.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎉 R2 Files Endpoint Testing Complete!\n');
  console.log('Note: Some tests may show warnings if R2 bucket is empty.');
  console.log('This is expected for a new setup.\n');
};

// Run tests
testR2FilesEndpoint().catch(console.error);
