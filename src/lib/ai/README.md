# BlockWise AI API Key Testing System

A comprehensive test system that validates all 6 AI provider API keys before any AI features are built. The system provides clear feedback, handles errors gracefully, and integrates seamlessly with the existing BlockWise app.

## Features

- ✅ **6 AI Provider Support**: Groq, Gemini, Cerebras, Cohere, Mistral, OpenRouter
- ✅ **Comprehensive Error Handling**: Network, authentication, rate limit, timeout detection
- ✅ **Real-time Logging**: Console and file logging with history tracking
- ✅ **Environment Variable Validation**: Automatic detection of missing API keys
- ✅ **Performance Monitoring**: Response time tracking for each provider
- ✅ **Dashboard Integration**: Results stored in localStorage for UI display
- ✅ **Non-blocking**: App startup continues even if tests fail

## Quick Start

### 1. Environment Setup

Add API keys to your `.env.local` file:

```bash
# AI Provider API Keys
GROQ_API_KEY=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
GEMINI_API_KEY=AIzaSyDsErrCuOAy50WFM2dax9fQ_0vlpkCQkBs
CEREBRAS_API_KEY=csk-emyx42w88c4ddy225revxrpc6vffne5286ek5nevv5np486h
COHERE_API_KEY=ct5c9Usx0I3zvy8WlAXrHWPvXyBlIL06J7rNkSy5
MISTRAL_API_KEY=OM53Fa935XW3HFMH0VHcnDTBi8DrN4nY
OPENROUTER_API_KEY=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
```

### 2. Run Tests

```bash
# Test all providers
node test-standalone.js

# Or from the app
npm run test-api-keys
```

### 3. View Results

```
BLOCKWISE AI - API KEY TEST RESULTS
===============================================
Date: 11/1/2025
Time: 2:00:05 PM

Testing 6 AI Providers...

✓ Groq: SUCCESS (response in 250ms)
✓ Gemini: SUCCESS (response in 1200ms)
✗ Cerebras: FAILED
  Error: Invalid API key or connection timeout
  Fix: Verify CEREBRAS_API_KEY in .env.local
  API endpoint: api.cerebras.ai

===============================================
5/6 providers working (83%)
Duration: 5450ms

Next step: Fix failed providers and retry
===============================================
```

## Integration Examples

### 1. App Startup Testing

```typescript
// In your app layout or main component
import { testAllAPIKeys } from '@/lib/ai/api-key-tester';

useEffect(() => {
  // Test API keys on app startup (non-blocking)
  testAllAPIKeys({
    logResults: true,
    parallel: false // Sequential testing for better error handling
  }).then((results) => {
    console.log(`API Test Results: ${results.successful}/${results.total} providers working`);
    
    // Store results for Settings Panel
    if (typeof window !== 'undefined') {
      localStorage.setItem('api-test-results', JSON.stringify(results));
    }
  }).catch((error) => {
    console.warn('API testing failed:', error);
  });
}, []);
```

### 2. Settings Panel Integration

```typescript
// In your settings page
import { getAPIKeyTester } from '@/lib/ai/api-key-tester';
import type { TestSummary } from '@/types/api-test';

const [testResults, setTestResults] = useState<TestSummary | null>(null);

const runTests = async () => {
  const tester = getAPIKeyTester({
    logResults: true,
    parallel: false
  });
  
  const results = await tester.testAllProviders();
  setTestResults(results);
  tester.storeResultsInLocalStorage();
};
```

### 3. Manual Provider Testing

```typescript
// Test individual providers
import { testGroqAPI } from '@/lib/ai/providers/groq';

const testSingleProvider = async () => {
  const result = await testGroqAPI({
    apiKey: process.env.GROQ_API_KEY!,
    timeout: 5000
  });
  
  if (result.success) {
    console.log(`Groq test passed! Response: ${result.responseTime}ms`);
  } else {
    console.error(`Groq test failed: ${result.error?.message}`);
  }
};
```

## Provider Specifications

| Provider | Model | Test Type | Timeout | Endpoint |
|----------|-------|-----------|---------|----------|
| Groq | llm-3.3-70b | Completion | 5s | api.groq.com |
| Gemini | gemini-2.0-flash-lite | Completion | 5s | generativelanguage.googleapis.com |
| Cerebras | llm-3.3-70b | Completion | 3s | api.cerebras.ai |
| Cohere | embed-english-v3.0 | Embedding | 10s | api.cohere.ai |
| Mistral | mistral-small | Completion | 5s | api.mistral.ai |
| OpenRouter | gpt-3.5-turbo | Completion | 5s | openrouter.ai |

## Error Handling

### Common Error Types

1. **Authentication (401/403)**
   - Invalid API key
   - Missing permissions
   - **Fix**: Verify API key in environment variables

2. **Rate Limit (429)**
   - Too many requests
   - **Fix**: Wait and retry or check provider limits

3. **Timeout**
   - Request took too long
   - **Fix**: Check network connectivity or increase timeout

4. **Network Error**
   - DNS resolution failed
   - Connection refused
   - **Fix**: Check internet connection and firewall settings

### Error Recovery

```typescript
// Automatic retry with exponential backoff
const testWithRetry = async (provider: string, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await testProvider(provider);
      if (result.success) return result;
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
};
```

## Logging System

### Console Output
- Real-time test results
- Color-coded status indicators
- Response time tracking

### File Logging
- JSON-formatted log entries
- Daily log files: `logs/ai-provider-test-YYYY-MM-DD.log`
- Automatic log rotation (keeps last 10 files)

### localStorage (Client-side)
- Test history for dashboard display
- Persists across browser sessions
- Maximum 100 entries

```typescript
// Access test history
import { testLogger } from '@/lib/ai/logger';

const history = testLogger.getTestHistory();
console.log('Recent tests:', history);
```

## API Reference

### Main Functions

#### `testAllAPIKeys(options?)`
Test all 6 AI providers with specified options.

```typescript
const results = await testAllAPIKeys({
  timeout: 10000,        // Max timeout per provider
  logResults: true,       // Enable logging
  stopOnFailure: false,   // Continue testing on failure
  parallel: false         // Sequential testing
});
```

#### `getAPIKeyTester(options)`
Get a tester instance for advanced usage.

```typescript
const tester = getAPIKeyTester({ parallel: true });
await tester.testAllProviders();
const results = tester.getResults();
```

### Individual Provider Tests

Each provider has its own test function:

```typescript
import { testGroqAPI, testGeminiAPI, testCerebrasAPI } from '@/lib/ai/providers/';

const groqResult = await testGroqAPI({
  apiKey: 'your-api-key',
  timeout: 5000
});
```

## Troubleshooting

### Environment Variables Not Found
1. Check `.env.local` file exists
2. Restart your development server
3. Verify variable names match exactly

### Tests Running Slowly
1. Use parallel testing: `parallel: true`
2. Check network connectivity
3. Verify API provider status pages

### High Failure Rate
1. Check API key validity on provider dashboards
2. Verify API quotas aren't exceeded
3. Test with different timeout values

### Integration Issues
1. Ensure TypeScript types are imported correctly
2. Check browser console for errors
3. Verify localStorage is available

## Files Structure

```
src/lib/ai/
├── api-key-tester.ts          # Main testing orchestration
├── logger.ts                  # Logging system
├── test-api-keys.ts          # Convenience testing script
├── providers/
│   ├── groq.ts              # Groq API testing
│   ├── gemini.ts            # Gemini API testing
│   ├── cerebras.ts          # Cerebras API testing
│   ├── cohere.ts            # Cohere API testing
│   ├── mistral.ts           # Mistral API testing
│   └── openrouter.ts        # OpenRouter API testing
└── types/
    └── api-test.ts          # TypeScript type definitions
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review test logs in browser console
3. Verify API key status on provider dashboards
4. Check network connectivity and firewall settings

The system is designed to be robust and provide clear feedback for any issues encountered during API testing.