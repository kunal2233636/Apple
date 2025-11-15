# API Quick Reference

Quick reference guide for the Study Buddy AI API endpoints.

## Endpoints Overview

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ai/chat` | POST | Main chat with model selection, web search, memory, RAG |
| `/api/ai/embedding` | POST | Generate embeddings, semantic search, RAG |
| `/api/ai/web-search` | POST | Web search with article extraction |
| `/api/ai/files` | POST | Retrieve files from Cloudflare R2 |
| `/api/ai/memory` | GET/POST/PUT | Manage dual-layer memory |

---

## /api/ai/chat

**Main conversational AI endpoint**

### Minimal Request
```json
{
  "message": "Your question here",
  "userId": "user123"
}
```

### Full Request
```json
{
  "message": "Your question here",
  "userId": "user123",
  "conversationId": "conv456",
  "provider": "gemini",
  "model": "gemini-2.0-flash-exp",
  "webSearch": {
    "enabled": true,
    "maxArticles": 2,
    "explain": true
  },
  "memory": {
    "includeSession": true,
    "includeUniversal": true
  },
  "rag": {
    "enabled": true,
    "sources": ["path/to/file.md"]
  }
}
```

### Response
```json
{
  "response": "AI generated response",
  "conversationId": "conv456",
  "metadata": {
    "providerUsed": "gemini",
    "modelUsed": "gemini-2.0-flash-exp",
    "webSearchResults": [...],
    "memoriesUsed": { "session": 5, "universal": 2 },
    "ragSources": [...]
  }
}
```

---

## /api/ai/embedding

**Generate embeddings and perform semantic operations**

### Embed Mode
```json
{
  "mode": "embed",
  "userId": "user123",
  "texts": ["text1", "text2"],
  "provider": "voyage"
}
```

### Search Mode
```json
{
  "mode": "search",
  "userId": "user123",
  "query": "search query",
  "conversationId": "conv456",
  "limit": 10
}
```

### RAG Mode
```json
{
  "mode": "rag",
  "userId": "user123",
  "query": "question",
  "generateAnswer": true
}
```

---

## /api/ai/web-search

**Search the web with article extraction**

### Request
```json
{
  "query": "search query",
  "userId": "user123",
  "maxArticles": 2,
  "explain": true,
  "provider": "gemini"
}
```

### Response
```json
{
  "results": [
    {
      "title": "Article Title",
      "url": "https://...",
      "snippet": "Preview text",
      "fullContent": "Full article text",
      "explanation": "LLM explanation",
      "extractionStatus": "success"
    }
  ],
  "metadata": {
    "query": "search query",
    "articlesProcessed": 2,
    "provider": "gemini"
  }
}
```

---

## /api/ai/files

**Retrieve files from Cloudflare R2**

### Search Files
```json
{
  "mode": "search",
  "userId": "user123",
  "query": "search query",
  "limit": 5
}
```

### Get Specific Files
```json
{
  "mode": "get",
  "userId": "user123",
  "paths": ["path/to/file1.md", "path/to/file2.md"]
}
```

### List Files
```json
{
  "mode": "list",
  "userId": "user123",
  "prefix": "folder/"
}
```

---

## /api/ai/memory

**Manage dual-layer memory system**

### Store Memory (POST)
```json
{
  "userId": "user123",
  "conversationId": "conv456",
  "memoryType": "session",
  "content": "Memory content",
  "response": "AI response",
  "metadata": {
    "importance": 7,
    "tags": ["tag1", "tag2"]
  }
}
```

### Retrieve Memories (GET)
```
GET /api/ai/memory?userId=user123&conversationId=conv456&memoryType=session&limit=10
```

### Update Memory (PUT)
```json
{
  "userId": "user123",
  "memoryId": "mem789",
  "content": "Updated content",
  "metadata": {
    "action": "updated",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

## Providers

### AI Chat Providers
- `groq` - Fast (llama-3.3-70b-versatile)
- `gemini` - Balanced (gemini-2.0-flash-exp)
- `cerebras` - Ultra-fast (llama-3.3-70b)
- `cohere` - Strong reasoning (command-r-plus)
- `mistral` - European AI (mistral-large-latest)
- `openrouter` - Multiple models (anthropic/claude-3.5-sonnet)

### Embedding Providers
- `voyage` - voyage-multilingual-2 (1024 dim)
- `google` - gemini-embedding-001 (768 dim)
- `cohere` - embed-multilingual-v3.0 (1024 dim)

---

## Memory Types

### Session Memory
- Conversation-specific
- Filtered by `conversationId`
- Use for: "What did we discuss earlier?"

### Universal Memory
- Cross-conversation
- Semantic search
- Use for: Long-term preferences and knowledge

---

## Common Patterns

### Simple Chat
```javascript
fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Hello",
    userId: "user123"
  })
})
```

### Chat with Everything
```javascript
fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Research quantum computing",
    userId: "user123",
    conversationId: "conv456",
    provider: "gemini",
    webSearch: { enabled: true, maxArticles: 2 },
    rag: { enabled: true },
    memory: { includeSession: true, includeUniversal: true }
  })
})
```

### Store Important Memory
```javascript
fetch('/api/ai/memory', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: "user123",
    memoryType: "universal",
    content: "User prefers visual learning",
    metadata: { importance: 9 }
  })
})
```

### Search Knowledge Base
```javascript
fetch('/api/ai/files', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: "search",
    userId: "user123",
    query: "exam preparation",
    limit: 3
  })
})
```

---

## Environment Variables

### Required
```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# At least one AI provider
GROQ_API_KEY=
GEMINI_API_KEY=
CEREBRAS_API_KEY=
COHERE_API_KEY=
MISTRAL_API_KEY=
OPENROUTER_API_KEY=

# At least one embedding provider
VOYAGE_API_KEY=
GOOGLE_API_KEY=
```

### Optional
```bash
# Web search
SERPER_API_KEY=

# RAG with R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Invalid request (bad provider/model) |
| 401 | Unauthorized (missing userId) |
| 429 | Rate limited |
| 500 | Server error (provider failure) |

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| /api/ai/chat | 60/min per user |
| /api/ai/embedding | 100/min per user |
| /api/ai/files | 200/min per user |
| /api/ai/web-search | 30/min per user |
| /api/ai/memory | 200/min per user |

---

## Best Practices

1. **Always include userId** - Required for all endpoints
2. **Use conversationId** - For maintaining context
3. **Choose right provider** - Groq for speed, Claude for reasoning
4. **Limit web search** - 1-2 articles for faster responses
5. **Set memory importance** - 1-10 scale, higher for universal
6. **Handle errors gracefully** - Implement fallback logic
7. **Cache when possible** - Reduce API calls

---

For detailed documentation, see:
- [Full API Documentation](./API_DOCUMENTATION.md)
- [Usage Examples](./API_USAGE_EXAMPLES.md)
- [R2 Setup Guide](./CLOUDFLARE_R2_SETUP_GUIDE.md)
