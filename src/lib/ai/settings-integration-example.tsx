// Settings Panel Integration Example
// =================================

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { getAPIKeyTester } from '@/lib/ai/api-key-tester';
import type { TestSummary, AIProvider } from '@/types/api-test';

interface ProviderStatus {
  provider: AIProvider;
  status: 'success' | 'failed' | 'testing' | 'unknown';
  responseTime?: number;
  error?: string;
}

export function AISettingsPanel() {
  const [testResults, setTestResults] = useState<TestSummary | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [providerStatuses, setProviderStatuses] = useState<Record<AIProvider, ProviderStatus>>({
    groq: { provider: 'groq', status: 'unknown' },
    gemini: { provider: 'gemini', status: 'unknown' },
    cerebras: { provider: 'cerebras', status: 'unknown' },
    cohere: { provider: 'cohere', status: 'unknown' },
    mistral: { provider: 'mistral', status: 'unknown' },
    openrouter: { provider: 'openrouter', status: 'unknown' },
  });

  // Load previous test results on component mount
  useEffect(() => {
    loadPreviousResults();
  }, []);

  const loadPreviousResults = () => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('blockwise-api-test-results');
        if (stored) {
          const data = JSON.parse(stored);
          setTestResults(data.summary);
          updateProviderStatuses(data.summary);
        }
      } catch (error) {
        console.warn('Failed to load previous test results:', error);
      }
    }
  };

  const updateProviderStatuses = (results: TestSummary) => {
    const newStatuses: Record<AIProvider, ProviderStatus> = { ...providerStatuses };
    
    results.results.forEach(result => {
      newStatuses[result.provider] = {
        provider: result.provider,
        status: result.success ? 'success' : 'failed',
        responseTime: result.responseTime,
        error: result.error?.message,
      };
    });

    setProviderStatuses(newStatuses);
  };

  const runAPITests = async () => {
    setIsTesting(true);
    
    // Reset statuses to testing
    const testingStatuses: Record<AIProvider, ProviderStatus> = {} as any;
    Object.keys(providerStatuses).forEach(key => {
      testingStatuses[key as AIProvider] = {
        provider: key as AIProvider,
        status: 'testing',
      };
    });
    setProviderStatuses(testingStatuses);

    try {
      const tester = getAPIKeyTester({
        logResults: true,
        parallel: true, // Faster testing in parallel
        timeout: 10000,
      });

      const results = await tester.testAllProviders();
      setTestResults(results);
      
      // Update provider statuses
      const newStatuses: Record<AIProvider, ProviderStatus> = {} as any;
      results.results.forEach(result => {
        newStatuses[result.provider] = {
          provider: result.provider,
          status: result.success ? 'success' : 'failed',
          responseTime: result.responseTime,
          error: result.error?.message,
        };
      });
      setProviderStatuses(newStatuses);

      // Store results
      tester.storeResultsInLocalStorage();

    } catch (error) {
      console.error('API testing failed:', error);
      // Reset to unknown status on error
      const errorStatuses: Record<AIProvider, ProviderStatus> = {} as any;
      Object.keys(providerStatuses).forEach(key => {
        errorStatuses[key as AIProvider] = {
          provider: key as AIProvider,
          status: 'unknown',
        };
      });
      setProviderStatuses(errorStatuses);
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusIcon = (status: ProviderStatus['status']) => {
    switch (status) {
      case 'success':
        return '✅';
      case 'failed':
        return '❌';
      case 'testing':
        return '⏳';
      default:
        return '❓';
    }
  };

  const getStatusColor = (status: ProviderStatus['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'testing':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const successRate = testResults ? (testResults.successful / testResults.total) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">AI Provider Settings</h2>
        <p className="text-muted-foreground">
          Test and configure your AI provider API keys for optimal performance.
        </p>
      </div>

      {/* Test Results Summary */}
      {testResults && (
        <Card>
          <CardHeader>
            <CardTitle>Last Test Results</CardTitle>
            <CardDescription>
              {new Date(testResults.timestamp).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Success Rate</span>
                <span className="font-medium">{successRate.toFixed(1)}%</span>
              </div>
              <Progress value={successRate} className="w-full" />
              <div className="text-sm text-muted-foreground">
                {testResults.successful} of {testResults.total} providers working
                {testResults.duration && ` • ${testResults.duration}ms total`}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Provider Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.values(providerStatuses).map((status) => (
          <Card key={status.provider}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg capitalize">
                  {status.provider}
                </CardTitle>
                <Badge className={getStatusColor(status.status)}>
                  {getStatusIcon(status.status)} {status.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {status.responseTime && (
                  <div className="text-sm">
                    Response: {status.responseTime}ms
                  </div>
                )}
                {status.error && (
                  <Alert>
                    <AlertDescription className="text-xs">
                      {status.error}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Test AI Providers</CardTitle>
          <CardDescription>
            Run comprehensive tests to verify all API keys are working correctly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button 
              onClick={runAPITests} 
              disabled={isTesting}
              className="w-full"
            >
              {isTesting ? 'Testing...' : 'Run API Tests'}
            </Button>
            
            {isTesting && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  Testing providers sequentially...
                </div>
                <Progress value={undefined} className="w-full" />
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Tests will check authentication, connectivity, and response time for each provider.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Environment Variables Info */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
          <CardDescription>
            Required API keys for AI functionality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm font-mono">
            <div>GROQ_API_KEY=gsk_...</div>
            <div>GEMINI_API_KEY=AIza...</div>
            <div>CEREBRAS_API_KEY=csk-...</div>
            <div>COHERE_API_KEY=ct5c9...</div>
            <div>MISTRAL_API_KEY=OM53F...</div>
            <div>OPENROUTER_API_KEY=sk-or-...</div>
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            Add these to your .env.local file and restart the application.
          </div>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <strong>Authentication Failed (401/403):</strong>
              <br />Verify your API key is correct and active.
            </div>
            <div>
              <strong>Rate Limited (429):</strong>
              <br />Wait a few minutes and try again, or check your API quotas.
            </div>
            <div>
              <strong>Timeout Errors:</strong>
              <br />Check your internet connection and the provider's status.
            </div>
            <div>
              <strong>Network Errors:</strong>
              <br />Verify the API endpoint URLs are accessible from your network.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Export for use in settings page
export default AISettingsPanel;