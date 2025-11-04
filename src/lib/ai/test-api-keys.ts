// Test API Key Implementation
// ==========================

import { testAllAPIKeys } from './api-key-tester';
import type { APIKeyTesterOptions } from '@/types/api-test';

async function runAPITests() {
  console.log('🚀 Starting BlockWise AI API Key Tests...\n');

  // Test options - you can modify these as needed
  const testOptions: Partial<APIKeyTesterOptions> = {
    timeout: 10000,
    logResults: true,
    stopOnFailure: false,
    parallel: false,
  };

  try {
    // Run the tests
    const results = await testAllAPIKeys(testOptions);
    
    console.log('\n📊 Test Results Summary:');
    console.log(`Total Providers: ${results.total}`);
    console.log(`Successful: ${results.successful}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Success Rate: ${results.successRate.toFixed(1)}%`);
    console.log(`Duration: ${results.duration}ms`);

    // Return results for further processing if needed
    return results;

  } catch (error) {
    console.error('❌ Error running API tests:', error);
    throw error;
  }
}

// If this file is run directly (not imported), execute the tests
if (require.main === module) {
  runAPITests()
    .then((results) => {
      console.log('\n✅ API test execution completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ API test execution failed:', error);
      process.exit(1);
    });
}

export { runAPITests };