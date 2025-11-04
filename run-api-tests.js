// Node.js script to test API keys
// ===============================

require('dotenv').config();
const { testAllAPIKeys } = require('./src/lib/ai/api-key-tester');

async function main() {
  console.log('🧪 Testing BlockWise AI API Keys...\n');

  try {
    const results = await testAllAPIKeys({
      timeout: 10000,
      logResults: true,
      stopOnFailure: false,
      parallel: false,
    });

    console.log('\n✅ Test completed successfully!');
    console.log(`Results: ${results.successful}/${results.total} providers working`);
    
    if (results.failed > 0) {
      console.log('\n❌ Failed providers:');
      results.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`- ${r.provider}: ${r.error?.message || 'Unknown error'}`);
        });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

main();