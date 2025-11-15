#!/usr/bin/env node

/**
 * BlockWise AI - API Key Testing Script
 * ===================================
 * 
 * Comprehensive testing script for all 6 AI providers:
 * - Groq (groq.com)
 * - Gemini (Google AI Studio) 
 * - Cerebras (api.cerebras.ai)
 * - Cohere (cohere.com)
 * - Mistral (mistral.ai)
 * - OpenRouter (openrouter.ai)
 * 
 * Tests each provider with simple API calls and reports results.
 * 
 * Usage: node test-api-keys.js
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// Load environment variables
const envFile = existsSync('.env.local') ? '.env.local' : 
               existsSync('.env') ? '.env' : null;

if (envFile) {
  try {
    const envContent = readFileSync(envFile, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    });
    console.log(`✅ Loaded environment from ${envFile}`);
  } catch (error) {
    console.log(`⚠️ Could not load ${envFile}:`, error.message);
  }
} else {
  console.log('⚠️ No .env.local or .env file found');
}

// Test results storage
const testResults = {
  timestamp: new Date().toISOString(),
  totalTests: 0,
  passed: 0,
  failed: 0,
  providers: {}
};

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatTime(ms) {
  return `${ms}ms`;
}

function logResult(provider, success, message, latency, details = {}) {
  testResults.providers[provider] = {
    success,
    message,
    latency,
    timestamp: new Date().toISOString(),
    ...details
  };
  
  testResults.totalTests++;
  if (success) {
    testResults.passed++;
    log(`✓ ${provider}: SUCCESS (${message})`, 'green');
  } else {
    testResults.failed++;
    log(`✗ ${provider}: FAILED (${message})`, 'red');
  }
  
  if (latency) {
    log(`  Response time: ${formatTime(latency)}`, 'cyan');
  }
  
  if (details.model) {
    log(`  Model: ${details.model}`, 'blue');
  }
  
  if (details.error) {
    log(`  Error: ${details.error}`, 'yellow');
  }
  
  console.log();
}

// Groq API Test
async function testGroq() {
  const startTime = Date.now();
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    logResult('Groq', false, 'API key not found', 0, { error: 'GROQ_API_KEY missing' });
    return;
  }
  
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'user',
            content: 'Say hello in exactly one word.'
          }
        ],
        max_tokens: 10,
        temperature: 0
      })
    });
    
    const latency = Date.now() - startTime;
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logResult('Groq', false, `HTTP ${response.status}: ${errorData.error?.message || 'Unknown error'}`, latency, {
        error: errorData.error?.message || 'HTTP error',
        status: response.status
      });
      return;
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    if (content) {
      logResult('Groq', true, `Response received: "${content}"`, latency, {
        model: 'llama-3.3-70b-versatile',
        tokens_used: data.usage
      });
    } else {
      logResult('Groq', false, 'No content in response', latency, {
        error: 'Empty response content',
        full_response: data
      });
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    logResult('Groq', false, `Network error: ${error.message}`, latency, {
      error: error.message
    });
  }
}

// Gemini API Test
async function testGemini() {
  const startTime = Date.now();
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    logResult('Gemini', false, 'API key not found', 0, { error: 'GEMINI_API_KEY missing' });
    return;
  }
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: 'Say hello in exactly one word.'
          }]
        }]
      })
    });
    
    const latency = Date.now() - startTime;
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logResult('Gemini', false, `HTTP ${response.status}: ${errorData.error?.message || 'Unknown error'}`, latency, {
        error: errorData.error?.message || 'HTTP error',
        status: response.status
      });
      return;
    }
    
    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    
    if (content) {
      logResult('Gemini', true, `Response received: "${content}"`, latency, {
        model: 'gemini-2.0-flash-lite'
      });
    } else {
      logResult('Gemini', false, 'No content in response', latency, {
        error: 'Empty response content',
        full_response: data
      });
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    logResult('Gemini', false, `Network error: ${error.message}`, latency, {
      error: error.message
    });
  }
}

// Cerebras API Test
async function testCerebras() {
  const startTime = Date.now();
  const apiKey = process.env.CEREBRAS_API_KEY;
  
  if (!apiKey) {
    logResult('Cerebras', false, 'API key not found', 0, { error: 'CEREBRAS_API_KEY missing' });
    return;
  }
  
  try {
    const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b',
        messages: [
          {
            role: 'user',
            content: 'Say hello in exactly one word.'
          }
        ],
        max_tokens: 10,
        temperature: 0
      })
    });
    
    const latency = Date.now() - startTime;
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logResult('Cerebras', false, `HTTP ${response.status}: ${errorData.error?.message || 'Unknown error'}`, latency, {
        error: errorData.error?.message || 'HTTP error',
        status: response.status
      });
      return;
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    if (content) {
      logResult('Cerebras', true, `Response received: "${content}"`, latency, {
        model: 'llama-3.3-70b',
        tokens_used: data.usage
      });
    } else {
      logResult('Cerebras', false, 'No content in response', latency, {
        error: 'Empty response content',
        full_response: data
      });
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    logResult('Cerebras', false, `Network error: ${error.message}`, latency, {
      error: error.message
    });
  }
}

// Cohere API Test (Embeddings)
async function testCohere() {
  const startTime = Date.now();
  const apiKey = process.env.COHERE_API_KEY;
  
  if (!apiKey) {
    logResult('Cohere', false, 'API key not found', 0, { error: 'COHERE_API_KEY missing' });
    return;
  }
  
  try {
    const response = await fetch('https://api.cohere.ai/v1/embed', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'embed-multilingual-v3.0',
        texts: ['hello'],
        input_type: 'search_document'
      })
    });
    
    const latency = Date.now() - startTime;
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logResult('Cohere', false, `HTTP ${response.status}: ${errorData.error?.message || 'Unknown error'}`, latency, {
        error: errorData.error?.message || 'HTTP error',
        status: response.status
      });
      return;
    }
    
    const data = await response.json();
    const embeddings = data.embeddings?.[0];
    
    if (embeddings && Array.isArray(embeddings) && embeddings.length > 0) {
      logResult('Cohere', true, `Embedding generated (${embeddings.length} dimensions)`, latency, {
        model: 'embed-multilingual-v3.0',
        dimensions: embeddings.length
      });
    } else {
      logResult('Cohere', false, 'No embeddings in response', latency, {
        error: 'Empty embedding response',
        full_response: data
      });
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    logResult('Cohere', false, `Network error: ${error.message}`, latency, {
      error: error.message
    });
  }
}

// Mistral API Test
async function testMistral() {
  const startTime = Date.now();
  const apiKey = process.env.MISTRAL_API_KEY;
  
  if (!apiKey) {
    logResult('Mistral', false, 'API key not found', 0, { error: 'MISTRAL_API_KEY missing' });
    return;
  }
  
  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [
          {
            role: 'user',
            content: 'Say hello in exactly one word.'
          }
        ],
        max_tokens: 10,
        temperature: 0
      })
    });
    
    const latency = Date.now() - startTime;
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logResult('Mistral', false, `HTTP ${response.status}: ${errorData.error?.message || 'Unknown error'}`, latency, {
        error: errorData.error?.message || 'HTTP error',
        status: response.status
      });
      return;
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    if (content) {
      logResult('Mistral', true, `Response received: "${content}"`, latency, {
        model: 'mistral-small-latest',
        tokens_used: data.usage
      });
    } else {
      logResult('Mistral', false, 'No content in response', latency, {
        error: 'Empty response content',
        full_response: data
      });
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    logResult('Mistral', false, `Network error: ${error.message}`, latency, {
      error: error.message
    });
  }
}

// OpenRouter API Test
async function testOpenRouter() {
  const startTime = Date.now();
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    logResult('OpenRouter', false, 'API key not found', 0, { error: 'OPENROUTER_API_KEY missing' });
    return;
  }
  
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'BlockWise AI Testing'
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: 'Say hello in exactly one word.'
          }
        ],
        max_tokens: 10,
        temperature: 0
      })
    });
    
    const latency = Date.now() - startTime;
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logResult('OpenRouter', false, `HTTP ${response.status}: ${errorData.error?.message || 'Unknown error'}`, latency, {
        error: errorData.error?.message || 'HTTP error',
        status: response.status
      });
      return;
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    if (content) {
      logResult('OpenRouter', true, `Response received: "${content}"`, latency, {
        model: 'openai/gpt-3.5-turbo',
        tokens_used: data.usage
      });
    } else {
      logResult('OpenRouter', false, 'No content in response', latency, {
        error: 'Empty response content',
        full_response: data
      });
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    logResult('OpenRouter', false, `Network error: ${error.message}`, latency, {
      error: error.message
    });
  }
}

// Main test execution
async function runAllTests() {
  console.clear();
  log('=====================================', 'blue');
  log('BLOCKWISE AI - API KEY TEST RESULTS', 'white');
  log('=====================================', 'blue');
  console.log();
  
  const now = new Date();
  log(`Date: ${now.toLocaleDateString()}`, 'cyan');
  log(`Time: ${now.toLocaleTimeString()}`, 'cyan');
  console.log();
  
  // Check for missing environment variables
  const requiredKeys = [
    'GROQ_API_KEY',
    'GEMINI_API_KEY', 
    'CEREBRAS_API_KEY',
    'COHERE_API_KEY',
    'MISTRAL_API_KEY',
    'OPENROUTER_API_KEY'
  ];
  
  const missingKeys = requiredKeys.filter(key => !process.env[key]);
  
  if (missingKeys.length > 0) {
    log('⚠️ Missing API Keys:', 'yellow');
    missingKeys.forEach(key => log(`  - ${key}`, 'yellow'));
    console.log();
    log('Please add these to your .env.local file', 'yellow');
    console.log();
  }
  
  // Run all tests
  log('Testing AI Providers...', 'white');
  console.log();
  
  const tests = [
    testGroq(),
    testGemini(),
    testCerebras(),
    testCohere(),
    testMistral(),
    testOpenRouter()
  ];
  
  await Promise.all(tests);
  
  // Summary
  console.log();
  log('=====================================', 'blue');
  log('SUMMARY', 'white');
  log('=====================================', 'blue');
  
  const successRate = Math.round((testResults.passed / testResults.totalTests) * 100);
  
  log(`Total providers tested: ${testResults.totalTests}`, 'white');
  log(`Successful: ${testResults.passed}`, 'green');
  log(`Failed: ${testResults.failed}`, 'red');
  log(`Success rate: ${successRate}%`, successRate >= 90 ? 'green' : successRate >= 70 ? 'yellow' : 'red');
  
  if (testResults.failed === 0) {
    log('', 'green');
    log('🎉 All providers working!', 'green');
    log('Next step: Run Prompt 2 (Database Setup)', 'blue');
  } else {
    log('', 'yellow');
    log('⚠️ Some providers failed. Check the errors above.', 'yellow');
  }
  
  // Save results to log file
  try {
    const logDir = 'logs';
    const fs = await import('fs').catch(() => null);
    
    if (fs && !fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
    }
    
    const logFileName = `logs/ai-provider-test-${now.toISOString().split('T')[0]}.log`;
    
    let summaryText = `BLOCKWISE AI - API KEY TEST RESULTS
====================================
Date: ${now.toLocaleDateString()}
Time: ${now.toLocaleTimeString()}

`;
    
    Object.entries(testResults.providers).forEach(([provider, result]) => {
      summaryText += `${result.success ? '✓' : '✗'} ${provider}: ${result.success ? 'SUCCESS' : 'FAILED'} (${result.message})
`;
      if (result.latency) {
        summaryText += `  Response time: ${formatTime(result.latency)}
`;
      }
      if (result.error) {
        summaryText += `  Error: ${result.error}
`;
      }
      summaryText += '\n';
    });
    
    summaryText += `\nAll providers working! ✓
Total providers tested: ${testResults.totalTests}
Success rate: ${successRate}%

`;
    
    writeFileSync(logFileName, summaryText);
    log(`Results logged to: ${logFileName}`, 'cyan');
  } catch (error) {
    log(`Could not save log file: ${error.message}`, 'yellow');
  }
  
  console.log();
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n\nTest interrupted by user');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.log('\nUnhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Execute tests
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runAllTests };
