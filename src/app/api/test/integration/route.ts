// Integration Test API Endpoint
// ==============================
// API route to execute and monitor the advanced personalization system integration test

import { NextRequest, NextResponse } from 'next/server';
import { runIntegrationTest } from '@/test/run-integration-test';
import { logError, logInfo } from '@/lib/error-logger-server-safe';

export const POST = async (request: NextRequest) => {
  const startTime = Date.now();
  
  try {
    logInfo('Integration test API called', {
      componentName: 'IntegrationTestAPI',
      method: 'POST',
      url: request.url
    });

    // Parse request body for test parameters
    const body = await request.json().catch(() => ({}));
    const { 
      userId = 'api_test_user',
      sessionId = 'api_test_session',
      testType = 'complete',
      timeout = 60000
    } = body;

    console.log('🔧 Integration Test API Endpoint');
    console.log(`User ID: ${userId}`);
    console.log(`Session ID: ${sessionId}`);
    console.log(`Test Type: ${testType}`);
    console.log(`Timeout: ${timeout}ms`);
    console.log('=' .repeat(50));

    // Set up timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Test timeout')), timeout);
    });

    // Run the integration test
    const testPromise = runIntegrationTest();
    
    const result = await Promise.race([testPromise, timeoutPromise]) as any;

    const processingTime = Date.now() - startTime;

    console.log('\n📊 Integration Test API Results:');
    console.log(`Success: ${result.success}`);
    console.log(`Processing Time: ${processingTime}ms`);
    console.log(`Total Tests: ${result.summary?.totalTests || 0}`);
    console.log(`Success Rate: ${(result.summary?.successRate * 100).toFixed(1) || 0}%`);

    // Return comprehensive results
    return NextResponse.json({
      success: result.success,
      timestamp: new Date().toISOString(),
      processingTime,
      summary: result.summary,
      results: result.results || null,
      error: result.error || null,
      recommendations: result.recommendations || []
    }, {
      status: result.success ? 200 : 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Processing-Time': processingTime.toString()
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const processingTime = Date.now() - startTime;

    console.error('❌ Integration Test API Error:', errorMessage);

    logError(error instanceof Error ? error : new Error(errorMessage), {
      componentName: 'IntegrationTestAPI',
      operation: 'POST',
      processingTime
    });

    return NextResponse.json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
      processingTime,
      summary: {
        successRate: 0,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        totalDuration: processingTime
      }
    }, {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Processing-Time': processingTime.toString()
      }
    });
  }
};

export const GET = async (request: NextRequest) => {
  try {
    // Return test status and available test types
    return NextResponse.json({
      status: 'ready',
      message: 'Advanced Personalization System Integration Test API',
      availableTests: [
        {
          name: 'complete',
          description: 'Run complete integration test suite',
          estimatedDuration: '60-90 seconds'
        },
        {
          name: 'components',
          description: 'Test individual components only',
          estimatedDuration: '30-45 seconds'
        },
        {
          name: 'scenarios',
          description: 'Test integration scenarios only',
          estimatedDuration: '45-60 seconds'
        },
        {
          name: 'performance',
          description: 'Test system performance only',
          estimatedDuration: '20-30 seconds'
        }
      ],
      systems: [
        'Advanced Personalization Engine',
        'Smart Query Classification System',
        '5-Layer Hallucination Prevention',
        'Adaptive Teaching System',
        'Centralized Service Integration Layer',
        'Web Search Decision Engine',
        'Personalization vs General Detection',
        'Real-time Layer Status Visualization'
      ],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get test status',
      timestamp: new Date().toISOString()
    }, {
      status: 500
    });
  }
};