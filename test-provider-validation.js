// Test Provider Validation for /api/ai/chat
// ==========================================

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testProviderValidation() {
  console.log('🧪 Testing Provider Validation\n');
  console.log('='.repeat(50));

  const testCases = [
    {
      name: 'Valid provider - groq',
      provider: 'groq',
      expectedStatus: 200,
      shouldSucceed: true
    },
    {
      name: 'Valid provider - gemini',
      provider: 'gemini',
      expectedStatus: 200,
      shouldSucceed: true
    },
    {
      name: 'Valid provider - cerebras',
      provider: 'cerebras',
      expectedStatus: 200,
      shouldSucceed: true
    },
    {
      name: 'Invalid provider - openai',
      provider: 'openai',
      expectedStatus: 400,
      shouldSucceed: false
    },
    {
      name: 'Invalid provider - anthropic',
      provider: 'anthropic',
      expectedStatus: 400,
      shouldSucceed: false
    },
    {
      name: 'Invalid provider - random',
      provider: 'invalid-provider-123',
      expectedStatus: 400,
      shouldSucceed: false
    },
    {
      name: 'No provider specified (should use default)',
      provider: undefined,
      expectedStatus: 200,
      shouldSucceed: true
    }
  ];

  const results = [];

  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`);
    console.log('-'.repeat(50));

    try {
      const requestBody = {
        userId: '00000000-0000-0000-0000-000000000001',
        message: 'Hello, this is a test message for provider validation.',
        conversationId: '00000000-0000-0000-0000-000000000002'
      };

      if (testCase.provider !== undefined) {
        requestBody.provider = testCase.provider;
      }

      const response = await fetch(`${BASE_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      const passed = response.status === testCase.expectedStatus;

      console.log(`Status: ${response.status} (expected: ${testCase.expectedStatus})`);
      
      if (!testCase.shouldSucceed) {
        console.log(`Error Code: ${data.error?.code}`);
        console.log(`Error Message: ${data.error?.message}`);
        console.log(`Available Providers: ${data.metadata?.availableProviders?.join(', ')}`);
      } else {
        console.log(`Success: ${data.success}`);
        if (data.data?.aiResponse) {
          console.log(`Provider Used: ${data.data.aiResponse.provider_used}`);
          console.log(`Model Used: ${data.data.aiResponse.model_used}`);
        }
      }

      results.push({
        test: testCase.name,
        passed,
        status: response.status,
        expectedStatus: testCase.expectedStatus
      });

      console.log(`Result: ${passed ? '✅ PASSED' : '❌ FAILED'}`);

    } catch (error) {
      console.error(`❌ Test failed with error:`, error.message);
      results.push({
        test: testCase.name,
        passed: false,
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary');
  console.log('='.repeat(50));

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  console.log(`\nTotal Tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${total - passed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  console.log('\n📋 Detailed Results:');
  results.forEach((result, index) => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${index + 1}. ${result.test}`);
    if (!result.passed && result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log('\n' + '='.repeat(50));
  
  if (passed === total) {
    console.log('🎉 All provider validation tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Please review the results above.');
  }

  return { passed, total, results };
}

// Run the tests
testProviderValidation()
  .then(({ passed, total }) => {
    process.exit(passed === total ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
