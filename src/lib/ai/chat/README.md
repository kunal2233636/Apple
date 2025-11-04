# Unified AI Chat Interface Architecture

## Overview

The Unified AI Chat Interface provides a standardized way to interact with multiple AI providers (Groq, Cerebras, Mistral, OpenRouter, Gemini, and Cohere) through a single, consistent API. The system includes automatic fallback, streaming support, session management, and comprehensive error handling.

## Architecture Components

### 1. Core Types (`src/types/chat.ts`)
- **ChatMessage**: Standardized message structure
- **ChatRequest/ChatResponse**: API request/response types
- **UnifiedProviderConfig**: Provider configuration schema
- **ChatServiceConfig**: Service-level configuration
- **ChatSession**: Session management structure

### 2. Unified Provider Interface (`src/lib/ai/chat/unified-provider.ts`)
- **BaseUnifiedProvider**: Abstract base class for all providers
- **IUnifiedProvider**: Interface defining provider capabilities
- Common utilities for API communication, error handling, and response parsing

### 3. Provider Registry (`src/lib/ai/chat/provider-registry.ts`)
- **UnifiedProviderRegistry**: Manages all registered providers
- Health checking and monitoring
- Automatic fallback logic
- Provider priority management

### 4. Chat Service (`src/lib/ai/chat/chat-service.ts`)
- **UnifiedChatService**: Main controller coordinating all components
- Session management
- Request routing with fallback
- Metrics and performance tracking

### 5. Configuration Manager (`src/lib/ai/chat/configuration-manager.ts`)
- **ChatConfigurationManager**: Dynamic provider configuration
- Environment variable management
- Provider enable/disable controls
- API key validation

## Supported Providers

| Provider | Streaming | Function Calling | Image Input | Rate Limit (RPM) | Priority |
|----------|-----------|------------------|-------------|------------------|----------|
| Groq     | ✅        | ❌              | ❌          | 30               | 10       |
| Cerebras | ✅        | ❌              | ❌          | 60               | 9        |
| Mistral  | ✅        | ❌              | ❌          | 60               | 8        |
| OpenRouter| ✅       | ✅              | ❌          | 100              | 7        |
| Gemini   | ✅        | ❌              | ✅          | 60               | 6        |
| Cohere   | ✅        | ❌              | ❌          | 100              | 5        |

## API Endpoints

### 1. Chat API (`POST /api/chat`)

Send a single chat message with automatic fallback.

**Request Body:**
```typescript
{
  message: string;              // Required: The message to send
  sessionId?: string;           // Optional: Existing session ID
  provider?: AIProvider;        // Optional: Preferred provider
  preferences?: {               // Optional: Request preferences
    temperature?: number;
    maxTokens?: number;
    streamResponses?: boolean;
  };
  context?: {                   // Optional: Additional context
    systemPrompt?: string;
    studyContext?: StudyContext;
    messages?: ChatMessage[];
  };
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: {
    response: ChatResponse;
    sessionId: string;
  };
  error?: {
    code: string;
    message: string;
  };
  metadata: {
    timestamp: string;
    requestId: string;
    processingTime: number;
  };
}
```

### 2. Streaming Chat API (`POST /api/chat/stream`)

Stream responses in real-time using Server-Sent Events.

**Request Body:** Same as regular chat API

**Response:** Server-Sent Events stream with chunks:
```typescript
// Start event
{
  type: 'start',
  data: {
    sessionId: string;
    provider: string;
    timestamp: string;
  }
}

// Content chunk
{
  type: 'content',
  data: "Hello! How can I help you today?",
  timestamp: "2025-11-03T14:05:49.457Z",
  id: "chunk-123"
}

// Metadata chunk
{
  type: 'metadata',
  data: {
    tokensUsed: 15,
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    responseTime: 1250,
    finishReason: "stop"
  }
}

// Error event
{
  type: 'error',
  error: {
    code: "RATE_LIMITED",
    message: "Rate limit exceeded",
    retryable: true
  }
}

// End event
{
  type: 'end',
  data: {
    message: "Stream completed successfully",
    timestamp: "2025-11-03T14:05:50.707Z"
  }
}
```

### 3. Health Check (`GET /api/chat`)

Get service status and provider health information.

**Response:**
```typescript
{
  success: true;
  data: {
    service: {
      healthy: true;
      version: "1.0.0";
      config: ChatServiceConfig;
    };
    providers: ProviderPerformanceMetrics[];
    capabilities: {
      streaming: true;
      fallback: true;
      sessionManagement: true;
      studyContext: true;
    };
  };
}
```

## Usage Examples

### Basic Chat Usage

```typescript
import { getChatService } from '@/lib/ai/chat/chat-service';

// Send a message
const chatService = getChatService();

const response = await chatService.sendMessage({
  message: "Explain photosynthesis",
  preferences: {
    temperature: 0.7,
    maxTokens: 1000
  }
});

console.log(response.content);
console.log(`Provider: ${response.provider}`);
console.log(`Tokens used: ${response.tokensUsed}`);
```

### Streaming Chat

```typescript
// Using the service directly
const stream = chatService.streamMessage({
  message: "Tell me a story",
  preferences: {
    streamResponses: true
  }
});

for await (const chunk of stream) {
  if (chunk.type === 'content') {
    process.stdout.write(chunk.data as string);
  }
}

// Using the API endpoint
const response = await fetch('/api/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Explain quantum physics",
    stream: true
  })
});

const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      console.log(data);
    }
  }
}
```

### Session Management

```typescript
// Create a new session
const sessionId = chatService.createSession(undefined, {
  preferredProvider: 'groq',
  temperature: 0.5,
  maxContextLength: 20
});

// Use the session for multiple messages
const response1 = await chatService.sendMessage({
  message: "I need help with calculus",
  sessionId
});

const response2 = await chatService.sendMessage({
  message: "Can you explain derivatives?",
  sessionId  // Same session, maintains context
});

// Get session information
const session = chatService.getSession(sessionId);
console.log(session.context.messages.length); // 4 messages (2 user, 2 assistant)

// Clean up
chatService.deleteSession(sessionId);
```

### Study Context Integration

```typescript
const response = await chatService.sendMessage({
  message: "What's the capital of France?",
  context: {
    systemPrompt: "You are a helpful study assistant",
    studyContext: {
      currentSubject: "Geography",
      topic: "European Countries",
      difficulty: "beginner",
      learningGoals: ["Learn European capitals", "Practice geography facts"],
      previousPerformance: {
        accuracy: 85,
        totalQuestions: 20,
        topics: ["World Capitals", "European Geography"]
      }
    }
  }
});
```

### Provider Selection and Fallback

```typescript
// Request specific provider (with automatic fallback)
const response = await chatService.sendMessage({
  message: "Explain machine learning",
  provider: 'gemini'  // Will use Gemini if available, fallback to others if not
});

// Get provider statistics
const providerMetrics = chatService.getProviderMetrics();
console.log('Provider performance:', providerMetrics);

// Get service statistics
const stats = chatService.getMetrics();
console.log('Total requests:', stats.length);
```

### Configuration Management

```typescript
import { getConfigurationManager } from '@/lib/ai/chat/configuration-manager';

const configManager = getConfigurationManager();

// Update service configuration
configManager.updateServiceConfig({
  defaultProvider: 'cerebras',
  fallbackProviders: ['groq', 'mistral', 'openrouter'],
  timeout: 45000,
  maxRetries: 5
});

// Configure specific provider
configManager.setProviderConfig('groq', {
  name: 'Groq',
  provider: 'groq',
  apiKeyEnv: 'GROQ_API_KEY',
  baseUrl: 'https://api.groq.com',
  models: { chat: 'llama-3.3-70b-versatile' },
  capabilities: {
    supportsStreaming: true,
    supportsSystemMessage: true,
    // ... other capabilities
  },
  timeout: 30000,
  priority: 10,
  enabled: true
});

// Enable/disable providers
configManager.setProviderEnabled('gemini', false);
configManager.setProviderPriority('groq', 15); // Higher priority

// Check API key availability
const envStatus = await configManager.getEnvironmentStatus();
console.log('Available API keys:', envStatus.availableKeys);
console.log('Missing API keys:', envStatus.missingKeys);
```

## Error Handling

The system provides comprehensive error handling with automatic fallback:

### Error Types

| Error Code | Description | Retryable | Action |
|------------|-------------|-----------|--------|
| `NO_PROVIDERS_AVAILABLE` | No healthy providers | Yes | Wait and retry |
| `INVALID_API_KEY` | API key invalid/missing | No | Check configuration |
| `RATE_LIMITED` | Rate limit exceeded | Yes | Wait for reset |
| `REQUEST_TIMEOUT` | Request timed out | Yes | Retry with longer timeout |
| `PROVIDER_DISABLED` | Provider disabled | No | Enable provider |
| `STREAMING_ERROR` | Streaming failed | Yes | Retry or fallback |
| `INVALID_REQUEST` | Malformed request | No | Fix request format |

### Error Response Format

```typescript
{
  success: false,
  error: {
    code: "RATE_LIMITED",
    message: "Rate limit exceeded for provider groq",
    retryable: true,
    metadata: {
      provider: "groq",
      resetTime: "2025-11-03T14:06:00.000Z",
      retryAfter: 30
    }
  }
}
```

## Environment Configuration

### Required Environment Variables

```bash
# Groq
GROQ_API_KEY=your_groq_api_key

# Cerebras
CEREBRAS_API_KEY=your_cerebras_api_key

# Mistral
MISTRAL_API_KEY=your_mistral_api_key

# OpenRouter
OPENROUTER_API_KEY=your_openrouter_api_key

# Google Gemini
GEMINI_API_KEY=your_gemini_api_key

# Cohere
COHERE_API_KEY=your_cohere_api_key
```

### Optional Configuration

```bash
# Service Configuration (defaults applied if not set)
CHAT_DEFAULT_PROVIDER=groq
CHAT_TIMEOUT=30000
CHAT_MAX_RETRIES=3
CHAT_HEALTH_CHECK_INTERVAL=30000
CHAT_MAX_CONCURRENT_REQUESTS=10
```

## Performance Considerations

### 1. Connection Pooling
- Providers are cached and reused across requests
- Health checks run in background to maintain fresh status
- Connection validation prevents stale connections

### 2. Rate Limiting
- Each provider has configurable rate limits
- Automatic retry with exponential backoff
- Rate limit status tracked and reported

### 3. Caching
- Session context cached to reduce API calls
- Provider health status cached for 30 seconds
- Metrics stored for performance monitoring

### 4. Streaming Optimization
- Chunk-based streaming for real-time responses
- Configurable chunk sizes (default: 1024 bytes)
- Memory-efficient processing

## Security Features

### 1. API Key Management
- Keys stored in environment variables only
- No logging of sensitive data
- Validation before provider usage

### 2. Request Validation
- Input sanitization and validation
- Rate limiting to prevent abuse
- CORS headers for cross-origin requests

### 3. Error Information
- No sensitive data in error messages
- Standardized error responses
- Detailed logging for debugging (without sensitive data)

## Testing

### Health Check Testing

```typescript
import { getChatService } from '@/lib/ai/chat/chat-service';

const chatService = getChatService();

// Check provider health
const healthStatus = await chatService.registry.checkAllProvidersHealth();
console.log('Healthy providers:', Array.from(healthStatus.values()).filter(p => p.healthy));

// Test specific provider
const groqHealth = await chatService.registry.checkProviderHealth('groq');
console.log('Groq status:', groqHealth);
```

### Integration Testing

```typescript
// Test basic functionality
const response = await chatService.sendMessage({
  message: "Hello, test message"
});
console.assert(response.content.length > 0, 'Response should have content');

// Test session management
const sessionId = chatService.createSession();
const response1 = await chatService.sendMessage({ message: "First", sessionId });
const response2 = await chatService.sendMessage({ message: "Second", sessionId });

const session = chatService.getSession(sessionId);
console.assert(session.context.messages.length === 4, 'Should have 4 messages in session');
```

## Migration Guide

### From Direct Provider Usage

**Before:**
```typescript
// Direct Groq usage
const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
  body: JSON.stringify({ model: 'llama-3.3-70b', messages: [...] })
});
```

**After:**
```typescript
// Unified interface
const chatService = getChatService();
const response = await chatService.sendMessage({
  message: "Your message here",
  provider: 'groq'  // Optional: will use default if not specified
});
```

### Adding New Providers

1. Create provider implementation:
```typescript
// src/lib/ai/providers/new-provider-unified.ts
export class NewProviderUnifiedProvider extends BaseUnifiedProvider {
  // Implement required abstract methods
}
```

2. Register in configuration manager:
```typescript
configManager.setProviderConfig('new-provider', {
  name: 'New Provider',
  provider: 'new-provider',
  // ... configuration
});
```

3. Add to fallback chain:
```typescript
configManager.updateServiceConfig({
  fallbackProviders: [...existingProviders, 'new-provider']
});
```

## Troubleshooting

### Common Issues

1. **"No healthy providers available"**
   - Check API keys are set correctly
   - Verify providers are enabled in configuration
   - Check network connectivity

2. **"Provider not registered"**
   - Ensure provider is configured in configuration manager
   - Check provider factory is properly registered

3. **Streaming connections dropping**
   - Check timeout settings
   - Verify network stability
   - Consider reducing chunk size

4. **High latency responses**
   - Check provider health status
   - Consider adjusting timeout settings
   - Monitor rate limiting

### Debug Mode

Enable detailed logging:
```typescript
process.env.NODE_ENV = 'development';
// Logs will show provider selection, fallback decisions, and performance metrics
```

## Future Enhancements

### Planned Features

1. **Function Calling Support**
   - OpenAI-compatible function calling
   - Dynamic tool selection
   - Structured output handling

2. **Enhanced Streaming**
   - Partial response streaming
   - Progress indicators
   - Response editing/correction

3. **Advanced Context Management**
   - Vector database integration
   - Semantic search in chat history
   - Context-aware responses

4. **Provider-Specific Features**
   - Gemini vision capabilities
   - OpenRouter model routing
   - Custom model fine-tuning

### Roadmap

- [ ] Function calling implementation
- [ ] Enhanced error recovery strategies
- [ ] Provider cost optimization
- [ ] Real-time provider switching
- [ ] Advanced analytics dashboard
- [ ] Plugin system for custom providers

## Contributing

### Development Setup

1. Install dependencies: `npm install`
2. Set up environment variables
3. Run tests: `npm test`
4. Start development server: `npm run dev`

### Code Structure

```
src/lib/ai/chat/
├── unified-provider.ts      # Base provider interface
├── provider-registry.ts     # Provider management
├── chat-service.ts          # Main service controller
├── configuration-manager.ts # Configuration handling
└── providers/
    ├── groq-unified.ts      # Groq implementation
    ├── cohere-unified.ts    # Cohere implementation
    └── ...
```

### Adding New Providers

1. Implement `BaseUnifiedProvider`
2. Add provider configuration
3. Register in configuration manager
4. Add tests
5. Update documentation

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review provider-specific documentation
3. Open an issue with detailed error information
4. Include environment details and reproduction steps

---

*This documentation covers the unified chat interface architecture as of version 1.0.0. For the latest updates and additional examples, refer to the source code and inline documentation.*