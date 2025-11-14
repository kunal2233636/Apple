// Advanced Personalization System Test Execution
// ==============================================
// Main execution script for testing all AI system integrations

import { runAdvancedPersonalizationIntegrationTest } from '@/test/advanced-personalization-integration-test';
import { logError, logInfo, logWarning } from '@/lib/error-logger-server-safe';

export const runIntegrationTest = async (): Promise<any> => {
  const startTime = Date.now();
  
  try {
    logInfo('Starting advanced personalization integration test', {
      componentName: 'IntegrationTestExecution'
    });

    console.log('🚀 Advanced Personalization System Integration Test');
    console.log('=' .repeat(80));
    console.log('Testing complete AI system integration including:');
    console.log('✅ Advanced Personalization Engine with web search');
    console.log('✅ Smart Query Classification (personalized vs general)');
    console.log('✅ 5-Layer Hallucination Prevention with UI');
    console.log('✅ Adaptive Teaching System (thermodynamics focus)');
    console.log('✅ Centralized Service Integration Layer');
    console.log('✅ Web Search Decision Engine');
    console.log('✅ Real-time Layer Status Visualization');
    console.log('✅ Personalization vs General Detection Logic');
    console.log('=' .repeat(80));
    console.log('');

    // Run the comprehensive test
    const testResults = await runAdvancedPersonalizationIntegrationTest(
      'integration_test_user',
      'integration_test_session'
    );

    console.log('\n📊 Test Results Summary:');
    console.log(`Total Tests: ${testResults.results.summary.totalTests}`);
    console.log(`Passed: ${testResults.results.summary.passedTests}`);
    console.log(`Failed: ${testResults.results.summary.failedTests}`);
    console.log(`Success Rate: ${(testResults.results.summary.successRate * 100).toFixed(1)}%`);
    console.log(`Average Response Time: ${testResults.results.summary.averageResponseTime.toFixed(0)}ms`);
    console.log(`Average Confidence: ${(testResults.results.summary.averageConfidence * 100).toFixed(1)}%`);
    console.log(`Total Test Duration: ${Date.now() - startTime}ms`);

    // System Integration Results
    console.log('\n🔧 System Integration Results:');
    for (const [system, result] of Object.entries(testResults.systemIntegration)) {
      const statusIcon = result.status === 'passed' ? '✅' : 
                        result.status === 'partial' ? '⚠️' : '❌';
      console.log(`${statusIcon} ${system}: ${result.status.toUpperCase()} (${(result.score * 100).toFixed(1)}%)`);
    }

    // Display issues and recommendations
    if (testResults.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      testResults.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    // Test scenario details
    console.log('\n📋 Test Scenario Results:');
    testResults.results.scenarios.forEach((scenario, index) => {
      const statusIcon = scenario.passed ? '✅' : '❌';
      console.log(`${index + 1}. ${statusIcon} ${scenario.scenarioId}: ${scenario.passed ? 'PASSED' : 'FAILED'}`);
      if (scenario.issues.length > 0) {
        scenario.issues.forEach(issue => console.log(`   - ${issue}`));
      }
    });

    const successRate = testResults.results.summary.successRate;
    const isSuccess = successRate >= 0.8; // 80% success rate threshold

    console.log('\n' + '='.repeat(80));
    if (isSuccess) {
      console.log('🎉 INTEGRATION TEST PASSED!');
      console.log('The advanced personalization system is working correctly.');
    } else {
      console.log('⚠️ INTEGRATION TEST PARTIAL SUCCESS');
      console.log('The system is functional but needs optimization.');
    }
    console.log('='.repeat(80));

    logInfo('Integration test completed', {
      componentName: 'IntegrationTestExecution',
      successRate,
      totalDuration: Date.now() - startTime
    });

    return {
      success: isSuccess,
      results: testResults,
      summary: {
        successRate,
        totalTests: testResults.results.summary.totalTests,
        passedTests: testResults.results.summary.passedTests,
        failedTests: testResults.results.summary.failedTests,
        averageResponseTime: testResults.results.summary.averageResponseTime,
        totalDuration: Date.now() - startTime
      }
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Integration test failed:', errorMessage);
    
    logError(error instanceof Error ? error : new Error(errorMessage), {
      componentName: 'IntegrationTestExecution',
      operation: 'runIntegrationTest'
    });

    return {
      success: false,
      error: errorMessage,
      summary: {
        successRate: 0,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        totalDuration: Date.now() - startTime
      }
    };
  }
};

// Export for API endpoint use
export default runIntegrationTest;