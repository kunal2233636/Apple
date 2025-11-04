// BlockWise AI API Key Tester
// ==========================

import type { AIProvider, EnvironmentCheck, TestSummary, APIKeyTesterOptions } from '@/types/api-test';
import { testLogger } from './logger';

// Import provider test functions
import { testGroqAPI, groqConfig } from './providers/groq';
import { testGeminiAPI, geminiConfig } from './providers/gemini';
import { testCerebrasAPI, cerebrasConfig } from './providers/cerebras';
import { testCohereAPI, cohereConfig } from './providers/cohere';
import { testMistralAPI, mistralConfig } from './providers/mistral';
import { testOpenRouterAPI, openRouterConfig } from './providers/openrouter';

export class APIKeyTester {
  private results: TestSummary = {
    total: 6,
    successful: 0,
    failed: 0,
    successRate: 0,
    timestamp: new Date().toISOString(),
    duration: 0,
    results: [],
  };

  private options: APIKeyTesterOptions = {
    timeout: 10000,
    logResults: true,
    stopOnFailure: false,
    parallel: false,
  };

  constructor(options: Partial<APIKeyTesterOptions> = {}) {
    this.options = { ...this.options, ...options };
  }

  /**
   * Main function to test all AI providers
   */
  public async testAllProviders(): Promise<TestSummary> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    // Print header
    this.printHeader();

    // Check environment variables
    const envCheck = this.checkEnvironmentVariables();
    testLogger.logEnvironmentCheck(envCheck.allPresent, envCheck.missing);

    if (!envCheck.allPresent) {
      console.log('\n❌ Missing required environment variables:');
      envCheck.missing.forEach(envVar => {
        console.log(`   - ${envVar}`);
      });
      console.log('\nPlease check your .env.local file and restart the application.\n');

      this.results = {
        total: 6,
        successful: 0,
        failed: 6,
        successRate: 0,
        timestamp,
        duration: Date.now() - startTime,
        results: [],
      };

      if (this.options.logResults) {
        testLogger.logTestSummary(this.results);
      }

      return this.results;
    }

    console.log('\n✅ All environment variables found. Starting provider tests...\n');

    // Get all API keys
    const apiKeys = this.getAllAPIKeys();

    // Test providers
    if (this.options.parallel) {
      await this.testProvidersParallel(apiKeys);
    } else {
      await this.testProvidersSequential(apiKeys);
    }

    // Calculate final results
    this.results.duration = Date.now() - startTime;
    this.results.successRate = (this.results.successful / this.results.total) * 100;

    // Print summary
    this.printSummary();

    // Log results
    if (this.options.logResults) {
      testLogger.logTestSummary(this.results);
    }

    return this.results;
  }

  /**
   * Check if all required environment variables are present
   */
  private checkEnvironmentVariables(): EnvironmentCheck {
    const requiredVars = [
      'GROQ_API_KEY',
      'GEMINI_API_KEY',
      'CEREBRAS_API_KEY',
      'COHERE_API_KEY',
      'MISTRAL_API_KEY',
      'OPENROUTER_API_KEY',
    ];

    const present: string[] = [];
    const missing: string[] = [];

    for (const envVar of requiredVars) {
      if (typeof process !== 'undefined' && process.env && process.env[envVar]) {
        present.push(envVar);
      } else if (typeof window !== 'undefined' && window.localStorage) {
        // Try to get from localStorage (for client-side testing)
        const value = window.localStorage.getItem(envVar);
        if (value) {
          present.push(envVar);
        } else {
          missing.push(envVar);
        }
      } else {
        missing.push(envVar);
      }
    }

    return {
      allPresent: missing.length === 0,
      missing,
      present,
    };
  }

  /**
   * Get all API keys from environment/localStorage
   */
  private getAllAPIKeys(): Record<AIProvider, string> {
    const apiKeys: Record<AIProvider, string> = {
      groq: '',
      gemini: '',
      cerebras: '',
      cohere: '',
      mistral: '',
      openrouter: '',
    };

    // Try to get from environment first (server-side), then localStorage (client-side)
    const getKey = (envVar: string): string => {
      if (typeof process !== 'undefined' && process.env && process.env[envVar]) {
        return process.env[envVar]!;
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(envVar) || '';
      }
      return '';
    };

    apiKeys.groq = getKey('GROQ_API_KEY');
    apiKeys.gemini = getKey('GEMINI_API_KEY');
    apiKeys.cerebras = getKey('CEREBRAS_API_KEY');
    apiKeys.cohere = getKey('COHERE_API_KEY');
    apiKeys.mistral = getKey('MISTRAL_API_KEY');
    apiKeys.openrouter = getKey('OPENROUTER_API_KEY');

    return apiKeys;
  }

  /**
   * Test providers sequentially
   */
  private async testProvidersSequential(apiKeys: Record<AIProvider, string>): Promise<void> {
    const providers: Array<{ name: AIProvider; config: any; testFunction: any }> = [
      { name: 'groq', config: groqConfig, testFunction: testGroqAPI },
      { name: 'gemini', config: geminiConfig, testFunction: testGeminiAPI },
      { name: 'cerebras', config: cerebrasConfig, testFunction: testCerebrasAPI },
      { name: 'cohere', config: cohereConfig, testFunction: testCohereAPI },
      { name: 'mistral', config: mistralConfig, testFunction: testMistralAPI },
      { name: 'openrouter', config: openRouterConfig, testFunction: testOpenRouterAPI },
    ];

    for (const provider of providers) {
      await this.testSingleProvider(
        provider.name,
        provider.config,
        provider.testFunction,
        apiKeys[provider.name]
      );

      // Small delay between tests to avoid rate limiting
      if (this.results.failed > 0 && this.options.stopOnFailure) {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Test providers in parallel
   */
  private async testProvidersParallel(apiKeys: Record<AIProvider, string>): Promise<void> {
    const providers: Array<{ name: AIProvider; config: any; testFunction: any }> = [
      { name: 'groq', config: groqConfig, testFunction: testGroqAPI },
      { name: 'gemini', config: geminiConfig, testFunction: testGeminiAPI },
      { name: 'cerebras', config: cerebrasConfig, testFunction: testCerebrasAPI },
      { name: 'cohere', config: cohereConfig, testFunction: testCohereAPI },
      { name: 'mistral', config: mistralConfig, testFunction: testMistralAPI },
      { name: 'openrouter', config: openRouterConfig, testFunction: testOpenRouterAPI },
    ];

    const testPromises = providers.map(provider => 
      this.testSingleProvider(
        provider.name,
        provider.config,
        provider.testFunction,
        apiKeys[provider.name]
      )
    );

    await Promise.all(testPromises);
  }

  /**
   * Test a single provider
   */
  private async testSingleProvider(
    provider: AIProvider,
    config: any,
    testFunction: any,
    apiKey: string
  ): Promise<void> {
    try {
      console.log(`🔄 Testing ${config.name}...`);
      
      const result = await testFunction({
        apiKey,
        timeout: config.timeout,
      });

      // Store result
      this.results.results.push(result);

      if (result.success) {
        this.results.successful++;
        console.log(`✅ ${config.name}: SUCCESS (${result.responseTime}ms)`);
      } else {
        this.results.failed++;
        console.log(`❌ ${config.name}: FAILED`);
        if (result.error) {
          console.log(`   Error: ${result.error.message}`);
          if (result.error.details) {
            console.log(`   Details: ${result.error.details}`);
          }
        }
      }

      // Log individual result
      if (this.options.logResults) {
        testLogger.logTestResult(config.name, result.success, result.responseTime, result.error);
      }

    } catch (error: any) {
      this.results.failed++;
      const errorResult = {
        provider,
        success: false,
        responseTime: 0,
        error: {
          type: 'unknown' as const,
          message: 'Unexpected error during testing',
          details: error.message,
        },
      };

      this.results.results.push(errorResult);
      console.log(`❌ ${config.name}: FAILED`);
      console.log(`   Error: ${error.message}`);

      if (this.options.logResults) {
        testLogger.logTestResult(config.name, false, 0, error);
      }
    }
  }

  /**
   * Print test header
   */
  private printHeader(): void {
    const now = new Date();
    const header = '\n' + '='.repeat(47);

    console.log(`${header}`);
    console.log(`BLOCKWISE AI - API KEY TEST RESULTS`);
    console.log(header);
    console.log(`Date: ${now.toLocaleDateString()}`);
    console.log(`Time: ${now.toLocaleTimeString()}`);
  }

  /**
   * Print test summary
   */
  private printSummary(): void {
    const { total, successful, failed, successRate, duration } = this.results;
    const footer = '='.repeat(47);

    console.log(`\n${footer}`);
    console.log(`${successful}/${total} providers working (${successRate.toFixed(1)}%)`);
    console.log(`Duration: ${duration}ms`);
    console.log();

    if (failed > 0) {
      console.log('❌ Failed providers:');
      this.results.results
        .filter(result => !result.success)
        .forEach(result => {
          const config = this.getProviderConfig(result.provider);
          console.log(`   - ${result.provider.toUpperCase()}: ${result.error?.message || 'Unknown error'}`);
          console.log(`     Fix: Verify ${config.apiKeyEnv} in your environment`);
          console.log(`     API endpoint: ${config.endpoint}`);
        });
      console.log('\nNext step: Fix failed providers and retry');
    } else {
      console.log('🎉 All providers working correctly!');
    }

    console.log(footer);
  }

  /**
   * Get provider configuration
   */
  private getProviderConfig(provider: AIProvider): any {
    const configs = {
      groq: groqConfig,
      gemini: geminiConfig,
      cerebras: cerebrasConfig,
      cohere: cohereConfig,
      mistral: mistralConfig,
      openrouter: openRouterConfig,
    };

    return configs[provider];
  }

  /**
   * Get test results
   */
  public getResults(): TestSummary {
    return this.results;
  }

  /**
   * Check network connectivity
   */
  public async checkConnectivity(): Promise<boolean> {
    try {
      const response = await fetch('https://httpbin.org/status/200', {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Store test results in local storage (for dashboard integration)
   */
  public storeResultsInLocalStorage(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const key = 'blockwise-api-test-results';
        const data = {
          timestamp: new Date().toISOString(),
          summary: this.results,
        };
        localStorage.setItem(key, JSON.stringify(data));
      } catch (error) {
        console.warn('Failed to store test results in localStorage:', error);
      }
    }
  }

  /**
   * Get test history from local storage
   */
  public getStoredResults(): any[] {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const key = 'blockwise-api-test-results';
        const data = localStorage.getItem(key);
        return data ? [JSON.parse(data)] : [];
      } catch {
        return [];
      }
    }
    return [];
  }
}

// Export convenience functions
export async function testAllAPIKeys(options?: Partial<APIKeyTesterOptions>): Promise<TestSummary> {
  const tester = new APIKeyTester(options);
  return await tester.testAllProviders();
}

export function getAPIKeyTester(options?: Partial<APIKeyTesterOptions>): APIKeyTester {
  return new APIKeyTester(options);
}