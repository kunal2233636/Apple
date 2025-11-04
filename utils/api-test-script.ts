/**
 * BlockWise API Test Script
 * ========================
 * 
 * Foundation script to verify API connections for all providers before building anything else.
 * Tests 5 API providers: Groq, Gemini, Cerebras, Cohere, and OpenRouter.
 */

import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';

interface TestResult {
  provider: string;
  model?: string;
  success: boolean;
  responseTime: number;
  error?: string;
  details?: string;
}

// Type definitions for API responses
interface GroqResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

interface CerebrasResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface CohereResponse {
  generations: Array<{
    text: string;
  }>;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface CohereEmbeddingsResponse {
  embeddings: number[][];
}

/**
 * Load environment variables from .env.local file
 */
function loadEnvFromFile(): Record<string, string> {
  const envPath = path.join(process.cwd(), '.env.local');
  const envVars: Record<string, string> = {};

  try {
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            envVars[key.trim()] = valueParts.join('=').trim();
          }
        }
      }
    }
  } catch (error) {
    console.error('Error reading .env.local file:', error);
  }

  return envVars;
}

/**
 * Check which environment variables are missing
 */
function checkEnvironmentVariables(): { missing: string[]; present: string[] } {
  const requiredVars = [
    'GROQ_API_KEY',
    'GEMINI_API_KEY',
    'CEREBRAS_API_KEY',
    'COHERE_API_KEY',
    'OPENROUTER_API_KEY'
  ];

  const envVars = loadEnvFromFile();
  const present: string[] = [];
  const missing: string[] = [];

  for (const envVar of requiredVars) {
    if (envVars[envVar] && envVars[envVar].trim() !== '') {
      present.push(envVar);
    } else {
      missing.push(envVar);
    }
  }

  return { missing, present };
}

/**
 * Write results to log file
 */
function writeToLogFile(results: TestResult[]): void {
  try {
    const logsDir = path.join(process.cwd(), 'logs');
    
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const logFilePath = path.join(logsDir, 'ai-provider-test.log');
    const now = new Date();
    const timestamp = now.toISOString();
    
    let logContent = `${timestamp}\n`;
    logContent += `BLOCKWISE AI - API KEY TEST RESULTS\n`;
    logContent += `Date: ${now.toLocaleDateString()}\n`;
    logContent += `Time: ${now.toLocaleTimeString()}\n\n`;
    
    const providerGroups = groupResultsByProvider(results);
    let totalTests = 0;
    let totalSuccessful = 0;
    
    logContent += `Testing ${Object.keys(providerGroups).length} providers (${results.length} total models)...\n\n`;
    
    for (const [providerName, providerResults] of Object.entries(providerGroups)) {
      for (const result of providerResults) {
        totalTests++;
        const symbol = result.success ? '✓' : '✗';
        const status = result.success ? 'SUCCESS' : 'FAILED';
        
        let details = '';
        if (result.success) {
          details = result.details || '';
        } else {
          details = `Error: ${result.error}`;
        }
        
        logContent += `${symbol} ${providerName} ${result.model || ''} - ${status} (response time: ${result.responseTime}ms)`;
        if (details) {
          logContent += `\n  ${details}`;
        }
        logContent += '\n';
        
        if (result.success) totalSuccessful++;
      }
      logContent += '\n';
    }
    
    const successRate = ((totalSuccessful / totalTests) * 100).toFixed(1);
    logContent += `Total providers tested: ${Object.keys(providerGroups).length}\n`;
    logContent += `Total models tested: ${totalTests}\n`;
    logContent += `Success rate: ${successRate}% (${totalSuccessful}/${totalSuccessful + (totalTests - totalSuccessful)} successful)\n`;
    
    const failedProviders = Object.entries(providerGroups)
      .filter(([_, results]) => results.some(r => !r.success))
      .map(([provider]) => provider);
    
    if (failedProviders.length > 0) {
      logContent += `Failed: ${failedProviders.join(', ')}\n\n`;
    } else {
      logContent += '\n';
    }
    
    logContent += `Next step: Fix failed providers, then run Prompt 2 (Database Setup)\n`;
    logContent += '='.repeat(80) + '\n\n';
    
    // Append to log file
    fs.appendFileSync(logFilePath, logContent);
    
  } catch (error) {
    console.error('Error writing to log file:', error);
  }
}

/**
 * Group results by provider name
 */
function groupResultsByProvider(results: TestResult[]): Record<string, TestResult[]> {
  const groups: Record<string, TestResult[]> = {};
  
  for (const result of results) {
    if (!groups[result.provider]) {
      groups[result.provider] = [];
    }
    groups[result.provider].push(result);
  }
  
  return groups;
}

/**
 * Test Groq API connections with multiple models
 */
async function testGroq(): Promise<TestResult[]> {
  const startTime = Date.now();
  const envVars = loadEnvFromFile();
  
  const models = [
    { name: 'llama-3.3-70b-versatile', description: 'Llama 3.3 70B' },
    { name: 'llama-3.1-8b-instant', description: 'Llama 3.1 8B Instant' },
    { name: 'qwen-2.5-32b', description: 'Qwen-3 32B' }
  ];

  const results: TestResult[] = [];

  console.log('\n🤖 Groq API Tests:');
  
  for (const model of models) {
    const modelStartTime = Date.now();
    
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${envVars.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: 'Say hello in one word'
            }
          ],
          model: model.name,
          max_tokens: 50,
          temperature: 0.1,
        }),
      });

      const modelResponseTime = Date.now() - modelStartTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: GroqResponse = await response.json() as GroqResponse;
      
      if (!data.choices || data.choices.length === 0 || !data.choices[0].message.content) {
        throw new Error('Invalid response format from Groq API');
      }

      console.log(`  ✅ ${model.description}: SUCCESS (${modelResponseTime}ms)`);
      
      results.push({
        provider: 'Groq',
        model: model.description,
        success: true,
        responseTime: modelResponseTime,
        details: 'Main high-quality model'
      });

    } catch (error) {
      const modelResponseTime = Date.now() - modelStartTime;
      console.log(`  ❌ ${model.description}: FAILED - ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      results.push({
        provider: 'Groq',
        model: model.description,
        success: false,
        responseTime: modelResponseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return results;
}

/**
 * Test Gemini API connection
 */
async function testGemini(): Promise<TestResult[]> {
  const startTime = Date.now();
  const envVars = loadEnvFromFile();
  
  console.log('\n💫 Gemini API Test:');
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${envVars.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: 'Say hello in one word'
              }
            ]
          }
        ],
        generationConfig: {
          maxOutputTokens: 50,
          temperature: 0.1,
        },
      }),
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: GeminiResponse = await response.json() as GeminiResponse;
    
    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content.parts[0].text) {
      throw new Error('Invalid response format from Gemini API');
    }

    console.log(`  ✅ Gemini 2.0 Flash Lite: SUCCESS (${responseTime}ms)`);

    return [{
      provider: 'Gemini',
      model: 'Gemini 2.0 Flash Lite',
      success: true,
      responseTime,
      details: 'Time-sensitive queries with web search'
    }];
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log(`  ❌ Gemini 2.0 Flash Lite: FAILED - ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return [{
      provider: 'Gemini',
      model: 'Gemini 2.0 Flash Lite',
      success: false,
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    }];
  }
}

/**
 * Test Cerebras API connection
 */
async function testCerebras(): Promise<TestResult[]> {
  const startTime = Date.now();
  const envVars = loadEnvFromFile();
  
  console.log('\n⚡ Cerebras API Test:');
  
  try {
    const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${envVars.CEREBRAS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'Say hello in one word'
          }
        ],
        model: 'llama-3.3-70b',
        max_tokens: 50,
        temperature: 0.1,
      }),
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: CerebrasResponse = await response.json() as CerebrasResponse;
    
    if (!data.choices || data.choices.length === 0 || !data.choices[0].message.content) {
      throw new Error('Invalid response format from Cerebras API');
    }

    console.log(`  ✅ Cerebras Llama-3.3-70B: SUCCESS (${responseTime}ms)`);

    return [{
      provider: 'Cerebras',
      model: 'Cerebras Llama-3.3-70B',
      success: true,
      responseTime,
      details: 'Ultra-fast Tier 3 fallback'
    }];
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log(`  ❌ Cerebras Llama-3.3-70B: FAILED - ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return [{
      provider: 'Cerebras',
      model: 'Cerebras Llama-3.3-70B',
      success: false,
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    }];
  }
}

/**
 * Test Cohere API connection
 */
async function testCohere(): Promise<TestResult[]> {
  const startTime = Date.now();
  const envVars = loadEnvFromFile();
  
  console.log('\n🔗 Cohere API Test:');
  
  try {
    // Cohere is used for embeddings, not chat
    const response = await fetch('https://api.cohere.ai/v1/embed', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${envVars.COHERE_API_KEY}`,
        'Content-Type': 'application/json',
        'Cohere-Version': '2022-12-06',
      },
      body: JSON.stringify({
        texts: ['hello'],
        model: 'embed-english-v3.0',
      }),
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: CohereEmbeddingsResponse = await response.json() as CohereEmbeddingsResponse;
    
    if (!data.embeddings || !Array.isArray(data.embeddings) || data.embeddings.length === 0 || !Array.isArray(data.embeddings[0]) || data.embeddings[0].length !== 1536) {
      throw new Error('Invalid embedding response from Cohere API - expected array of 1536 numbers');
    }

    console.log(`  ✅ Cohere Embeddings (1536 dims): SUCCESS (${responseTime}ms)`);

    return [{
      provider: 'Cohere',
      model: 'Cohere Embeddings',
      success: true,
      responseTime,
      details: 'Embedding generated (1536 dimensions)'
    }];
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log(`  ❌ Cohere Embeddings: FAILED - ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return [{
      provider: 'Cohere',
      model: 'Cohere Embeddings',
      success: false,
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    }];
  }
}

/**
 * Test OpenRouter API connection
 */
async function testOpenRouter(): Promise<TestResult[]> {
  const startTime = Date.now();
  const envVars = loadEnvFromFile();
  
  console.log('\n🌐 OpenRouter API Test:');
  
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${envVars.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'BlockWise API Test',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'Say hello in one word'
          }
        ],
        model: 'openai/gpt-3.5-turbo',
        max_tokens: 50,
        temperature: 0.1,
      }),
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: OpenRouterResponse = await response.json() as OpenRouterResponse;
    
    if (!data.choices || data.choices.length === 0 || !data.choices[0].message.content) {
      throw new Error('Invalid response format from OpenRouter API');
    }

    console.log(`  ✅ OpenRouter GPT-3.5 Turbo: SUCCESS (${responseTime}ms)`);

    return [{
      provider: 'OpenRouter',
      model: 'OpenRouter GPT-3.5 Turbo',
      success: true,
      responseTime,
      details: 'Last fallback before graceful degradation'
    }];
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log(`  ❌ OpenRouter GPT-3.5 Turbo: FAILED - ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return [{
      provider: 'OpenRouter',
      model: 'OpenRouter GPT-3.5 Turbo',
      success: false,
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    }];
  }
}

/**
 * Main function to run all API tests
 */
async function runAllAPITests(): Promise<TestResult[]> {
  const startTime = Date.now();
  const now = new Date();
  
  console.log('🚀 Starting BlockWise API Connection Tests\n');
  
  // Print header in specified format
  console.log('BLOCKWISE AI - API KEY TEST RESULTS');
  console.log(`Date: ${now.toLocaleDateString()}`);
  console.log(`Time: ${now.toLocaleTimeString()}\n`);
  
  // Check environment variables first
  const { missing, present } = checkEnvironmentVariables();
  
  if (missing.length > 0) {
    console.log('❌ Missing API keys:', missing.join(', '));
    console.log('Please add these to your .env.local file\n');
    
    // Still run tests for the ones that are present
    console.log(`📝 Found ${present.length} API keys. Testing available providers...\n`);
  } else {
    console.log('✅ All API keys found. Testing all providers...\n');
  }

  // Test all providers - each returns array of results
  const testResults = await Promise.all([
    testGroq(),
    testGemini(),
    testCerebras(),
    testCohere(),
    testOpenRouter(),
  ]);

  // Flatten results from all providers
  const allResults = testResults.flat();
  
  // Print results in the specified format
  const providerGroups = groupResultsByProvider(allResults);
  console.log(`Testing ${Object.keys(providerGroups).length} providers (${allResults.length} total models)...\n`);
  
  for (const [providerName, providerResults] of Object.entries(providerGroups)) {
    for (const result of providerResults) {
      const symbol = result.success ? '✓' : '✗';
      const status = result.success ? 'SUCCESS' : 'FAILED';
      
      console.log(`${symbol} ${result.model} - ${status} (response time: ${result.responseTime}ms)`);
      if (!result.success && result.error) {
        console.log(`  Error: ${result.error}`);
      } else if (result.success && result.details) {
        console.log(`  ${result.details}`);
      }
      console.log('');
    }
  }
  
  // Calculate summary statistics
  const totalModels = allResults.length;
  const successfulModels = allResults.filter(r => r.success).length;
  const successRate = ((successfulModels / totalModels) * 100).toFixed(1);
  const failedProviders = Object.entries(providerGroups)
    .filter(([_, results]) => results.some(r => !r.success))
    .map(([provider]) => provider);
  
  // Print summary
  console.log(`Total providers tested: ${Object.keys(providerGroups).length}`);
  console.log(`Total models tested: ${totalModels}`);
  console.log(`Success rate: ${successRate}% (${successfulModels}/${successfulModels + (totalModels - successfulModels)} successful)`);
  
  if (failedProviders.length > 0) {
    console.log(`Failed: ${failedProviders.join(', ')}\n`);
  } else {
    console.log('\n');
  }
  
  console.log(`Next step: Fix failed providers, then run Prompt 2 (Database Setup)`);
  console.log('='.repeat(80));
  
  // Write to log file
  writeToLogFile(allResults);
  
  return allResults;
}

// Export functions for use in other modules
export {
  testGroq,
  testGemini,
  testCerebras,
  testCohere,
  testOpenRouter,
  runAllAPITests,
  type TestResult,
  type GroqResponse,
  type GeminiResponse,
  type CerebrasResponse,
  type CohereResponse,
  type OpenRouterResponse,
  type CohereEmbeddingsResponse,
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAllAPITests()
    .then(() => {
      console.log('\n✅ API test execution completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ API test execution failed:', error);
      process.exit(1);
    });
}