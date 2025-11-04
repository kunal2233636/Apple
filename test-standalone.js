require('dotenv').config();

// Standalone API Test Script
// =========================

const fs = require('fs');
const path = require('path');

// Simple test to verify our API testing logic
async function testAPIKeyTester() {
  console.log('🧪 Testing API Key Tester Implementation...\n');

  // Test 1: Check if environment variables are loaded
  console.log('1. Checking environment variables...');
  const requiredVars = [
    'GROQ_API_KEY',
    'GEMINI_API_KEY', 
    'CEREBRAS_API_KEY',
    'COHERE_API_KEY',
    'MISTRAL_API_KEY',
    'OPENROUTER_API_KEY'
  ];

  let allPresent = true;
  const missing = [];
  
  requiredVars.forEach(envVar => {
    if (!process.env[envVar]) {
      allPresent = false;
      missing.push(envVar);
    }
  });

  if (allPresent) {
    console.log('✅ All environment variables found');
  } else {
    console.log('❌ Missing environment variables:', missing);
  }

  // Test 2: Test each provider configuration
  console.log('\n2. Testing provider configurations...');
  const providerTests = [
    { name: 'Groq', key: 'GROQ_API_KEY', type: 'completion' },
    { name: 'Gemini', key: 'GEMINI_API_KEY', type: 'completion' },
    { name: 'Cerebras', key: 'CEREBRAS_API_KEY', type: 'completion' },
    { name: 'Cohere', key: 'COHERE_API_KEY', type: 'embedding' },
    { name: 'Mistral', key: 'MISTRAL_API_KEY', type: 'completion' },
    { name: 'OpenRouter', key: 'OPENROUTER_API_KEY', type: 'completion' },
  ];

  for (const provider of providerTests) {
    const apiKey = process.env[provider.key];
    if (apiKey) {
      // Test key format
      const isValidFormat = validateAPIKey(provider.key, apiKey);
      console.log(`   ${provider.name}: ${isValidFormat ? '✅ Valid format' : '⚠️  Check format'} (${provider.type})`);
    } else {
      console.log(`   ${provider.name}: ❌ No API key`);
    }
  }

  console.log('\n✅ API Key Tester implementation check completed!');
  console.log('\nNext steps:');
  console.log('- Run: npm run test-api-keys (for full testing)');
  console.log('- Integration with Settings Panel available');
  console.log('- Logs will be stored in localStorage');
  
  return allPresent;
}

function validateAPIKey(envVar, apiKey) {
  if (!apiKey || typeof apiKey !== 'string') return false;
  
  // Basic format validation for different provider types
  switch (envVar) {
    case 'GROQ_API_KEY':
      return apiKey.startsWith('gsk_');
    case 'GEMINI_API_KEY':
      return apiKey.length > 30 && apiKey.includes('AIza');
    case 'CEREBRAS_API_KEY':
      return apiKey.startsWith('csk-');
    case 'COHERE_API_KEY':
      return apiKey.length > 20;
    case 'MISTRAL_API_KEY':
      return apiKey.length > 20;
    case 'OPENROUTER_API_KEY':
      return apiKey.startsWith('sk-or-');
    default:
      return false;
  }
}

// Run the test
testAPIKeyTester().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});