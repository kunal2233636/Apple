# Study Buddy AI Chat System

A comprehensive AI-powered study assistant with multi-provider support, advanced web search, semantic memory, and RAG capabilities.

## Features

- **Multi-Provider AI Support**: Flexible model selection across Groq, Gemini, Cerebras, Cohere, Mistral, and OpenRouter
- **Enhanced Web Search**: Article extraction and LLM-based explanations using Serper.dev
- **Multi-Provider Embeddings**: Voyage AI, Google, and Cohere embedding services
- **Dual-Layer Memory**: Session-specific and universal semantic memory
- **RAG with Cloudflare R2**: Knowledge retrieval from markdown files stored in R2
- **Backward Compatible**: All enhancements integrate seamlessly with existing Study Buddy interface

## Environment Variables

### Required - Supabase Configuration
```bash
NEXT_PUBLIC_SUPABASE_URL=          # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Supabase anonymous key
SUPABASE_SERVICE_ROLE_KEY=         # Supabase service role key (server-side only)
```

### Required - Authentication
```bash
NEXTAUTH_SECRET=                    # NextAuth secret for session encryption
NEXTAUTH_URL=                       # Application URL (e.g., http://localhost:3001)
PROVIDER_KEYS__ENCRYPTION_KEY=      # Encryption key for storing provider API keys
```

### Optional - Google OAuth
```bash
GOOGLE_CLIENT_ID=                   # Google OAuth client ID
GOOGLE_CLIENT_SECRET=               # Google OAuth client secret
```

### Required - AI Provider API Keys
At least one AI provider key is required for chat functionality:

```bash
GROQ_API_KEY=                       # Groq API key (fast inference)
GEMINI_API_KEY=                     # Google Gemini API key
CEREBRAS_API_KEY=                   # Cerebras API key (ultra-fast inference)
COHERE_API_KEY=                     # Cohere API key
MISTRAL_API_KEY=                    # Mistral AI API key
OPENROUTER_API_KEY=                 # OpenRouter API key (access to multiple models)
```

### Required - Embedding Services
At least one embedding provider is required for semantic search and RAG:

```bash
GOOGLE_API_KEY=                     # Google API key for embeddings (gemini-embedding-001)
GOOGLE_CLOUD_LOCATION=              # Google Cloud region (e.g., asia-south1)
VOYAGE_API_KEY=                     # Voyage AI API key (voyage-multilingual-2)
# Note: COHERE_API_KEY above also provides embedding capabilities (embed-multilingual-v3.0)
```

### Optional - Web Search
```bash
SERPER_API_KEY=                     # Serper.dev API key for web search with article extraction
```

### Optional - Cloudflare R2 Storage (for RAG)
```bash
R2_ACCOUNT_ID=                      # Cloudflare account ID
R2_ACCESS_KEY_ID=                   # R2 access key ID
R2_SECRET_ACCESS_KEY=               # R2 secret access key
R2_BUCKET_NAME=                     # R2 bucket name (default: study-buddy-knowledge)
```

## Setup Instructions

### 1. Clone and Install
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your API keys:
```bash
cp .env.example .env
```

### 3. Set Up Supabase Database
Run the database migrations to set up the dual-layer memory system:
```bash
node apply-memory-type-migration.js
```

### 4. (Optional) Set Up Cloudflare R2
If you want to use RAG with file retrieval, follow the comprehensive setup guide:

**See: [Cloudflare R2 Setup Guide](docs/CLOUDFLARE_R2_SETUP_GUIDE.md)**

Quick steps:
1. Create a Cloudflare R2 bucket (recommended name: `study-buddy-knowledge`)
2. Generate API tokens with read/write permissions
3. Add credentials to `.env`
4. Upload markdown files to your bucket for knowledge retrieval
5. Use example files from `examples/r2-knowledge-files/` for testing

### 5. Run Development Server
```bash
npm run dev
```

Visit `http://localhost:3001` to access the Study Buddy interface.

## API Endpoints

### Main Chat Endpoint
- **POST** `/api/ai/chat` - Enhanced Study Buddy chat with model selection, web search, memory, and RAG

### Supporting Endpoints
- **POST** `/api/ai/embedding` - Generate embeddings, semantic search, and RAG operations
- **POST** `/api/ai/web-search` - Web search with article extraction and LLM explanations
- **POST** `/api/ai/files` - Retrieve markdown files from Cloudflare R2
- **GET/POST** `/api/ai/memory` - Dual-layer memory management (session and universal)

## Usage Examples

### Basic Chat Request
```typescript
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Explain quantum computing',
    userId: 'user-123',
    conversationId: 'conv-456'
  })
});
```

### Chat with Model Selection
```typescript
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  body: JSON.stringify({
    message: 'Explain quantum computing',
    userId: 'user-123',
    conversationId: 'conv-456',
    provider: 'gemini',
    model: 'gemini-2.0-flash-exp'
  })
});
```

### Chat with Web Search
```typescript
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  body: JSON.stringify({
    message: 'What are the latest developments in AI?',
    userId: 'user-123',
    conversationId: 'conv-456',
    webSearch: {
      enabled: true,
      maxArticles: 2,
      explain: true
    }
  })
});
```

### Chat with RAG
```typescript
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  body: JSON.stringify({
    message: 'Tell me about our company policies',
    userId: 'user-123',
    conversationId: 'conv-456',
    rag: {
      enabled: true,
      sources: ['policies/*.md']
    }
  })
});
```

## Provider Configuration

### Supported AI Providers
- **Groq**: Fast inference with Llama models
- **Gemini**: Google's multimodal AI (gemini-2.0-flash-exp, gemini-1.5-pro)
- **Cerebras**: Ultra-fast inference with Llama models
- **Cohere**: Command models with strong reasoning
- **Mistral**: European AI with various model sizes
- **OpenRouter**: Access to multiple providers through one API

### Supported Embedding Providers
- **Voyage AI**: voyage-multilingual-2 (1024 dimensions)
- **Google**: gemini-embedding-001 (768 dimensions)
- **Cohere**: embed-multilingual-v3.0 (1024 dimensions)

## Memory System

The dual-layer memory system provides:

- **Session Memory**: Conversation-specific context tied to `conversationId`
- **Universal Memory**: Cross-session semantic memory for long-term knowledge retention

Memories are automatically stored and retrieved based on relevance and context.

## Security Notes

- Never commit `.env` file to version control
- Store API keys securely using environment variables
- Use `PROVIDER_KEYS__ENCRYPTION_KEY` for encrypting stored provider keys
- Maintain Supabase Row Level Security (RLS) policies for user data protection

## Documentation

### API Documentation
- **[API Documentation](docs/API_DOCUMENTATION.md)** - Complete API reference for all endpoints
- **[API Usage Examples](docs/API_USAGE_EXAMPLES.md)** - Practical examples and integration patterns

### Setup Guides
- [Cloudflare R2 Setup Guide](docs/CLOUDFLARE_R2_SETUP_GUIDE.md) - Complete guide for setting up R2 storage for RAG

### Memory System
- [Dual-Layer Memory Implementation](DUAL_LAYER_MEMORY_IMPLEMENTATION.md) - Technical details of the memory system
- [Dual-Layer Memory Usage Guide](DUAL_LAYER_MEMORY_USAGE_GUIDE.md) - How to use session and universal memory

### Quick Links
- [Example R2 Knowledge Files](examples/r2-knowledge-files/) - Sample markdown files for RAG testing
- [Task Implementation Reports](task-10-implementation-summary.md) - Detailed implementation summaries

## License

MIT
