# AI Service Manager - Integration Guide
## The Brain of BlockWise AI System

### 📋 Overview

The AI Service Manager is the central intelligence hub for BlockWise that intelligently routes queries to different AI providers, handles fallbacks, enforces rate limits, and manages caching. This system ensures users always receive responses, even when some AI providers are unavailable.

### 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Service Manager                       │
│                    (The Brain)                              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Query Type      │  │ Rate Limit      │  │ Response     │ │
│  │ Detector        │  │ Tracker         │  │ Cache        │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ 6-Tier Fallback │  │ API Usage       │  │ Provider     │ │
│  │ Chain System    │  │ Logger          │  │ Registry     │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    6 AI Provider Clients                    │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    │
│  │ Groq   │ │Gemini  │ │Cerebras│ │Mistral │ │OpenRtr │    │
│  │ Client │ │Client  │ │Client  │ │Client  │ │Client  │    │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘    │
│  ┌────────┐                                                  │
│  │Cohere  │                                                  │
│  │Client  │                                                  │
│  └────────┘                                                  │
└─────────────────────────────────────────────────────────────┘
```

### 🚀 Quick Start

#### 1. Basic Usage

```typescript
import { processQuery } from '@/lib/ai/ai-service-manager';

const response = await processQuery({
  userId: 'user-123',
  message: 'When is my exam date?',
  conversationId: 'conv-456',
  chatType: 'general',
  includeAppData: false
});

console.log(response.content);
console.log(`Provider: ${response.provider}`);
console.log(`Model: ${response.model_used}`);
console.log(`Cached: ${response.cached}`);
```

#### 2. Advanced Usage with Full Control

```typescript
import { AIServiceManager, aiServiceManager } from '@/lib/ai/ai-service-manager';

const manager = new AIServiceManager();

// Process query
const result = await manager.processQuery({
  userId: 'user-123',
  message: 'Mera performance kaise chal raha?',
  conversationId: 'conv-456',
  chatType: 'study_assistant',
  includeAppData: true
});

// Get system statistics
const stats = await manager.getStatistics();
console.log('Rate limit status:', stats.rateLimits);
console.log('Cache hit rate:', stats.cache.hitRate);

// Health check all providers
const health = await manager.healthCheck();
console.log('Provider health:', health);
```

### 📊 Core Components

#### 1. Query Type Detection System

**Purpose**: Automatically classifies queries into three types for intelligent routing.

```typescript
// Example: Time-sensitive query detection
const detection = queryTypeDetector.detectQueryType('When is my exam date?');
// Returns: { type: 'time_sensitive', confidence: 0.9, keywords: ['when', 'exam date'] }
```

**Query Types**:
- **Time-Sensitive**: Exam dates, forms, announcements (`Gemini 2.0 Flash-Lite + web search`)
- **App-Data**: Performance, progress, personal data (`Groq Llama 3.3 70B`)
- **General**: Everything else (`Groq GPT-OSS 20B`)

#### 2. Rate Limit Tracking System

**Purpose**: Monitors usage across all providers with sliding windows and warnings.

```typescript
// Check rate limit status
const status = rateLimitTracker.checkRateLimit('groq');
console.log(`${status.remaining}/${status.limit} requests remaining`);

// Get available providers (not rate limited)
const available = rateLimitTracker.getAvailableProviders(['groq']);
```

**Rate Limits**:
- **Groq**: 500 requests/minute
- **Gemini**: 60/minute, 1500/day
- **Cerebras**: 500/minute
- **Mistral**: 500/monthly
- **OpenRouter**: 100/hourly
- **Cohere**: 1000/monthly

#### 3. Response Caching System

**Purpose**: Reduces API costs and improves response times.

```typescript
// Cache configuration
const cacheConfig = {
  ttl: {
    general: 6 * 60 * 60 * 1000,      // 6 hours
    study_assistant: 60 * 60 * 1000,  // 1 hour
  },
  maxSize: 1000
};

// Check if response is cached
const isCached = responseCache.has(request);
const cachedResponse = responseCache.get(request);

// Cache statistics
const stats = responseCache.getStatistics();
console.log(`Hit rate: ${stats.hitRate.toFixed(2)}`);
```

#### 4. 6-Tier Fallback Chain System

**Purpose**: Ensures users always get responses, even when providers fail.

**Fallback Order by Query Type**:

**Time-Sensitive**:
1. Gemini 2.0 Flash-Lite (web search)
2. Groq Llama 3.3 70B
3. Cerebras Llama 3.3 70B
4. Mistral Large
5. OpenRouter
6. Cohere (graceful degradation)

**App-Data**:
1. Groq Llama 3.3 70B
2. Cerebras Llama 3.3 70B
3. Mistral Large
4. Gemini 1.5 Flash
5. OpenRouter
6. Cohere (graceful degradation)

**General**:
1. Groq GPT-OSS 20B (fastest)
2. OpenRouter GPT-3.5
3. Cerebras Llama 3.3 70B
4. Mistral Small
5. Gemini 1.5 Flash
6. Cohere (graceful degradation)

#### 5. API Usage Logging System

**Purpose**: Tracks all API usage for monitoring, billing, and analytics.

```typescript
// Log successful request
await apiUsageLogger.logSuccess({
  userId: 'user-123',
  featureName: 'ai_chat',
  provider: 'groq',
  modelUsed: 'llama-3.3-70b',
  tokensInput: 100,
  tokensOutput: 200,
  latencyMs: 1500,
  cached: false,
  queryType: 'general',
  tierUsed: 1
});

// Get user statistics
const userStats = await apiUsageLogger.getUserStats('user-123', 'week');
console.log(`Total requests: ${userStats.totalRequests}`);
console.log(`Success rate: ${(userStats.successfulRequests/userStats.totalRequests*100).toFixed(1)}%`);
```

### 🔧 Configuration

#### Environment Variables

```env
# API Keys (required)
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
CEREBRAS_API_KEY=your_cerebras_api_key
COHERE_API_KEY=your_cohere_api_key
MISTRAL_API_KEY=your_mistral_api_key
OPENROUTER_API_KEY=your_openrouter_api_key

# Optional: Supabase (for logging)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Custom Configuration

```typescript
// Custom rate limits
rateLimitTracker.updateConfig('gemini', {
  requestsPerMinute: 100,  // Override default
  requestsPerDay: 2000
});

// Custom cache settings
responseCache.updateConfig({
  ttl: {
    general: 12 * 60 * 60 * 1000,    // 12 hours
    study_assistant: 2 * 60 * 60 * 1000  // 2 hours
  },
  maxSize: 2000  // Increase cache size
});

// Logging configuration
apiUsageLogger.updateConfig({
  batchSize: 20,       // Larger batches
  flushInterval: 60000  // 1 minute flushes
});
```

### 📈 Provider Clients

Each provider client implements a standardized interface:

```typescript
interface AIProviderClient {
  chat(params: {
    messages: ChatMessage[];
    model?: string;
    temperature?: number;
    maxTokens?: number;
    webSearchEnabled?: boolean;
    timeout?: number;
  }): Promise<AIServiceManagerResponse>;

  healthCheck(): Promise<{
    healthy: boolean;
    responseTime: number;
    error?: string;
  }>;

  getAvailableModels(): string[];
  getRateLimitInfo(): RateLimitInfo;
  getModelCapabilities(model: string): ModelCapabilities;
}
```

**Supported Providers**:

1. **Groq** - Ultra-fast inference, Llama models
2. **Gemini** - Google's latest models, web search support
3. **Cerebras** - Fast inference, Llama models
4. **Cohere** - Command models, embeddings
5. **Mistral** - European models, good performance
6. **OpenRouter** - Access to multiple models via one API

### 🧪 Testing

Run the comprehensive test suite:

```typescript
import { runAITests } from '@/lib/ai/tests/ai-service-manager.test';

// Run all tests
await runAITests();
```

**Test Coverage**:
- ✅ Query type detection accuracy
- ✅ Cache functionality and TTL
- ✅ Rate limit tracking
- ✅ Fallback chain logic
- ✅ Response format standardization
- ✅ Process query integration
- ✅ Graceful degradation
- ✅ System statistics
- ✅ Health checks
- ✅ Provider selection logic

### 🔄 Response Format

All AI responses follow this standardized format:

```typescript
interface AIServiceManagerResponse {
  content: string;                    // The actual response text
  model_used: string;                 // Which model was used
  provider: string;                   // Which provider was used
  query_type: string;                 // Detected query type
  tier_used: number;                  // Which fallback tier (1-6)
  cached: boolean;                    // Whether from cache
  tokens_used: {
    input: number;                    // Input tokens consumed
    output: number;                   // Output tokens generated
  };
  latency_ms: number;                 // Response time in milliseconds
  web_search_enabled: boolean;        // Whether web search was used
  fallback_used: boolean;             // Whether fallback was needed
  limit_approaching: boolean;         // Approaching rate limits
}
```

### 🛡️ Error Handling & Graceful Degradation

The system handles errors at multiple levels:

1. **Provider Level**: Retry with exponential backoff (2s, 4s, 8s)
2. **Service Level**: Automatic fallback to next provider
3. **System Level**: Graceful degradation with helpful messages
4. **User Level**: Never show raw errors to users

```typescript
// Graceful degradation messages
const messages = {
  time_sensitive: "I apologize, but I'm unable to access current information right now. Please try again later or check official sources.",
  app_data: "I'm having trouble accessing your study data right now. Please try again in a moment.",
  general: "I'm experiencing high demand right now. Please try again in a few moments!"
};
```

### 📊 Monitoring & Analytics

#### System Health Dashboard

```typescript
// Get comprehensive system status
const systemStats = await aiServiceManager.getStatistics();

console.log('System Health:', {
  healthyProviders: systemStats.providers.filter(p => p.healthy).length,
  totalProviders: Object.keys(systemStats.providers).length,
  cacheHitRate: systemStats.cache.hitRate,
  rateLimitedProviders: Object.values(systemStats.rateLimits).filter(s => s.status === 'blocked').length
});
```

#### Usage Analytics

```typescript
// Get user usage patterns
const userAnalytics = await apiUsageLogger.getUserStats('user-123', 'month');
const systemAnalytics = await apiUsageLogger.getSystemStats('week');

console.log('Top Providers:', Object.entries(systemAnalytics.byProvider)
  .sort(([,a], [,b]) => b.requests - a.requests)
  .slice(0, 3));
```

### 🚀 Performance Optimizations

1. **Cache-First Strategy**: Check cache before making API calls
2. **Smart Routing**: Send queries to most appropriate provider first
3. **Rate Limit Awareness**: Avoid providers approaching limits
4. **Concurrent Processing**: Multiple providers can be checked in parallel
5. **Efficient Fallbacks**: Stop at first successful provider
6. **Request Batching**: Batch log entries for database efficiency

### 🔒 Security Considerations

1. **API Key Protection**: All keys loaded from environment variables
2. **Rate Limiting**: Prevents abuse and protects provider quotas
3. **Input Sanitization**: All user inputs are sanitized before processing
4. **Timeout Handling**: Prevents hanging requests (25s timeout)
5. **Error Masking**: Sensitive error details never exposed to users
6. **Request Logging**: All requests logged for security audit trails

### 📋 Integration Checklist

- [ ] Install dependencies and configure API keys
- [ ] Set up Supabase database for logging (optional)
- [ ] Run test suite to validate configuration
- [ ] Configure custom rate limits and cache settings
- [ ] Implement monitoring and alerting
- [ ] Test graceful degradation scenarios
- [ ] Set up performance monitoring
- [ ] Train team on error handling and troubleshooting

### 🎯 Best Practices

1. **Always handle the cached response**: Check `response.cached` for cost optimization
2. **Monitor rate limits**: Use `limit_approaching` to proactively switch providers
3. **Log failures**: Use the logging system for debugging and optimization
4. **Test fallback scenarios**: Ensure graceful degradation works
5. **Monitor performance**: Track `latency_ms` for optimization opportunities
6. **Cache common queries**: Reduce API costs with strategic caching
7. **Use appropriate models**: Let the system choose based on query type
8. **Handle timeouts**: All requests timeout after 25 seconds

### 🔧 Troubleshooting

#### Common Issues

**1. "API key not configured"**
```bash
# Check environment variables
echo $GROQ_API_KEY
echo $GEMINI_API_KEY
```

**2. "All providers failed - graceful degradation"**
- Check internet connectivity
- Verify API keys are valid
- Check provider status pages
- Monitor rate limit usage

**3. "Rate limit exceeded"**
- Check rate limit dashboard
- Implement request queuing
- Consider upgrading provider plans

**4. "Cache not working"**
- Verify cache configuration
- Check TTL settings
- Monitor cache hit rates

### 📞 Support

For technical support or questions:
- Check the test suite for implementation examples
- Review provider documentation for API-specific issues
- Monitor system logs for detailed error information
- Use the health check endpoints for diagnosis

### 🎉 Conclusion

The AI Service Manager provides a robust, scalable, and fault-tolerant AI routing system for BlockWise. With intelligent query detection, comprehensive fallback chains, rate limit management, and efficient caching, it ensures users always receive helpful responses while optimizing costs and performance.

The system is production-ready with comprehensive error handling, monitoring capabilities, and graceful degradation. It seamlessly integrates with existing BlockWise infrastructure while providing the flexibility to add new providers and features in the future.