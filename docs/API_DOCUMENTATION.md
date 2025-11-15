# Study Buddy AI API Documentation

## Overview

This document provides comprehensive documentation for the Study Buddy AI API endpoints, including the enhanced chat system with flexible model selection, web search with article extraction, multi-provider embedding services, file-based RAG from Cloudflare R2, and dual-layer memory management.

## Table of Contents

1. [Enhanced /api/ai/chat](#enhanced-apiaichat)
2. [New /api/ai/embedding](#new-apiaiembedding)
3. [New /api/ai/files](#new-apiaifiles)
4. [Enhanced /api/ai/web-search](#enhanced-apiaiweb-search)
5. [Enhanced /api/ai/memory](#enhanced-apiaimmemory)
6. [Usage Examples](#usage-examples)

---

## Enhanced /api/ai/chat

The main conversational AI endpoint that processes user queries and generates responses within the Study Buddy interface.

### Endpoint

```
POST /api/ai/chat
```

### Request Body

```typescript
interface EnhancedChatRequest {
  // Core parameters (existing)
  message: string;
  conversationId?: string;
  userId: string;
  
  // New: Model selection
  provider?: 'groq' | 'gemini' | 'cerebras' | 'cohere' | 'mistral' | 'openrouter';
  model?: string;
  
  // New: Web search configuration
  webSearch?: {
    enabled: boolean;
    maxArticles?: number;  // Default: 1
    explain?: boolean;     // Default: true
  };
  
  // New: Memory configuration
  memory?: {
    includeSession?: boolean;    // Default: true
    includeUniversal?: boolean;  // Default: true
  };
  
  // New: RAG configuration
  rag?: {
    enabled?: boolean;     // Default: false
    sources?: string[];    // Specific file paths to include
  };
}
```

### Response

```typescript
interface ChatResponse {
  response: string;
  conversationId: string;
  metadata: {
    providerUsed: string;
    modelUsed: string;
    webSearchResults?: Array<{
      title: string;
      url: string;
      snippet: string;
      fullContent?: string;
      explanation?: string;
    }>;
    memoriesUsed?: {
      session: number;
      universal: number;
    };
    ragSources?: Array<{
      file: string;
      relevance: number;
    }>;
  };
}
```

### Supported Providers and Models

| Provider | Default Model | Available Models |
|----------|--------------|------------------|
| groq | llama-3.3-70b-versatile | llama-3.3-70b-versatile, llama-3.1-70b-versatile, mixtral-8x7b-32768 |
| gemini | gemini-2.0-flash-exp | gemini-2.0-flash-exp, gemini-1.5-pro, gemini-1.5-flash |
| cerebras | llama-3.3-70b | llama-3.3-70b, llama-3.1-70b |
| cohere | command-r-plus | command-r-plus, command-r |
| mistral | mistral-large-latest | mistral-large-latest, mistral-medium-latest |
| openrouter | anthropic/claude-3.5-sonnet | Various models available |

### Example Requests

#### Basic Chat (Backward Compatible)
```json
{
  "message": "Explain photosynthesis",
  "userId": "user123",
  "conversationId": "conv456"
}
```

#### Chat with Specific Model
```json
{
  "message": "Explain photosynthesis",
  "userId": "user123",
  "conversationId": "conv456",
  "provider": "gemini",
  "model": "gemini-2.0-flash-exp"
}
```

#### Chat with Web Search
```json
{
  "message": "What are the latest developments in quantum computing?",
  "userId": "user123",
  "conversationId": "conv456",
  "webSearch": {
    "enabled": true,
    "maxArticles": 2,
    "explain": true
  }
}
```

#### Chat with RAG from R2 Files
```json
{
  "message": "How should I prepare for my physics exam?",
  "userId": "user123",
  "conversationId": "conv456",
  "rag": {
    "enabled": true,
    "sources": ["study-guides/exam-prep-tips.md", "subjects/science/physics-laws.md"]
  }
}
```

#### Chat with Session Memory Only
```json
{
  "message": "What did we discuss earlier?",
  "userId": "user123",
  "conversationId": "conv456",
  "memory": {
    "includeSession": true,
    "includeUniversal": false
  }
}
```

### Error Responses

```typescript
interface ErrorResponse {
  error: string;
  details?: {
    availableProviders?: string[];
    availableModels?: string[];
  };
}
```

**Common Error Codes:**
- `400`: Invalid provider or model
- `401`: Unauthorized (missing or invalid userId)
- `500`: Internal server error (provider failure, all fallbacks exhausted)

---

## New /api/ai/embedding

Unified endpoint for generating embeddings, performing semantic search, and RAG operations.

### Endpoint

```
POST /api/ai/embedding
GET /api/ai/embedding (health check)
```

### Request Body

```typescript
interface EmbeddingRequest {
  mode: 'embed' | 'search' | 'rag';
  userId: string;
  
  // For 'embed' mode
  texts?: string[];
  
  // For 'search' mode
  query?: string;
  conversationId?: string;
  limit?: number;  // Default: 10
  
  // For 'rag' mode
  query?: string;
  generateAnswer?: boolean;  // Default: false
  
  // Optional provider override
  provider?: 'voyage' | 'google' | 'cohere';
  model?: string;
}
```

### Response

#### Embed Mode
```typescript
interface EmbedResponse {
  embeddings: number[][];
  provider: string;
  model: string;
  dimensions: number;
}
```

#### Search Mode
```typescript
interface SearchResponse {
  results: Array<{
    id: string;
    content: string;
    similarity: number;
    metadata: {
      conversationId?: string;
      memoryType: 'session' | 'universal';
      createdAt: string;
    };
  }>;
  provider: string;
  model: string;
}
```

#### RAG Mode
```typescript
interface RAGResponse {
  context: Array<{
    content: string;
    source: string;
    relevance: number;
  }>;
  answer?: string;  // Only if generateAnswer is true
  provider: string;
  model: string;
}
```

### Supported Embedding Providers

| Provider | Model | Dimensions | Languages |
|----------|-------|------------|-----------|
| voyage | voyage-multilingual-2 | 1024 | Multilingual (100+ languages) |
| google | gemini-embedding-001 | 768 | Multilingual |
| cohere | embed-multilingual-v3.0 | 1024 | Multilingual (100+ languages) |

### Example Requests

#### Generate Embeddings
```json
{
  "mode": "embed",
  "userId": "user123",
  "texts": [
    "Photosynthesis is the process by which plants convert light into energy",
    "The mitochondria is the powerhouse of the cell"
  ],
  "provider": "voyage"
}
```

#### Semantic Search
```json
{
  "mode": "search",
  "userId": "user123",
  "query": "How do plants make energy?",
  "conversationId": "conv456",
  "limit": 5
}
```

#### RAG with Answer Generation
```json
{
  "mode": "rag",
  "userId": "user123",
  "query": "Explain cellular respiration",
  "generateAnswer": true
}
```

---

## New /api/ai/files

Endpoint for retrieving markdown files from Cloudflare R2 for RAG operations.

### Endpoint

```
POST /api/ai/files
GET /api/ai/files (health check)
```

### Request Body

```typescript
interface FilesRequest {
  mode: 'search' | 'get' | 'list';
  userId: string;
  
  // For 'search' mode
  query?: string;
  limit?: number;  // Default: 5
  
  // For 'get' mode
  paths?: string[];
  
  // For 'list' mode
  prefix?: string;  // Filter by folder prefix
}
```

### Response

#### Search Mode
```typescript
interface FileSearchResponse {
  results: Array<{
    path: string;
    content: string;
    relevance: number;
    metadata: {
      size: number;
      lastModified: string;
    };
  }>;
}
```

#### Get Mode
```typescript
interface FileGetResponse {
  files: Array<{
    path: string;
    content: string;
    metadata: {
      size: number;
      lastModified: string;
    };
  }>;
}
```

#### List Mode
```typescript
interface FileListResponse {
  files: Array<{
    path: string;
    size: number;
    lastModified: string;
  }>;
}
```

### Example Requests

#### Search Files by Query
```json
{
  "mode": "search",
  "userId": "user123",
  "query": "exam preparation strategies",
  "limit": 3
}
```

#### Get Specific Files
```json
{
  "mode": "get",
  "userId": "user123",
  "paths": [
    "study-guides/exam-prep-tips.md",
    "subjects/science/physics-laws.md"
  ]
}
```

#### List Files in Folder
```json
{
  "mode": "list",
  "userId": "user123",
  "prefix": "study-guides/"
}
```

### R2 File Organization

Files should be organized in the R2 bucket with the following structure:

```
study-buddy-knowledge/
├── study-guides/
│   ├── note-taking-strategies.md
│   ├── exam-prep-tips.md
│   └── time-management.md
├── subjects/
│   ├── mathematics/
│   │   ├── algebra-basics.md
│   │   └── calculus-intro.md
│   └── science/
│       ├── physics-laws.md
│       └── chemistry-basics.md
└── resources/
    ├── learning-techniques.md
    └── study-tools.md
```

---

## Enhanced /api/ai/web-search

Enhanced web search endpoint with article extraction and LLM-based explanations.

### Endpoint

```
POST /api/ai/web-search
```

### Request Body

```typescript
interface WebSearchRequest {
  query: string;
  userId: string;
  maxArticles?: number;  // Default: 1, max: 5
  explain?: boolean;     // Default: true
  provider?: string;     // LLM provider for explanations
}
```

### Response

```typescript
interface WebSearchResponse {
  results: Array<{
    title: string;
    url: string;
    snippet: string;
    fullContent?: string;      // Extracted article text
    explanation?: string;      // LLM-generated explanation
    extractionStatus: 'success' | 'failed' | 'skipped';
  }>;
  metadata: {
    query: string;
    articlesProcessed: number;
    provider?: string;  // LLM provider used for explanations
  };
}
```

### Example Requests

#### Basic Search (No Extraction)
```json
{
  "query": "quantum computing breakthroughs 2024",
  "userId": "user123",
  "explain": false
}
```

#### Search with Article Extraction and Explanation
```json
{
  "query": "how does CRISPR gene editing work",
  "userId": "user123",
  "maxArticles": 2,
  "explain": true,
  "provider": "gemini"
}
```

### Article Extraction Process

1. **HTML Fetching**: Retrieves the full HTML content from the article URL
2. **Content Extraction**: Uses Cheerio to parse and extract main content (paragraphs, headings, lists)
3. **LLM Explanation**: Generates a student-friendly explanation of the article content
4. **Error Handling**: Gracefully handles extraction failures, returns partial results

---

## Enhanced /api/ai/memory

Enhanced memory endpoint with dual-layer memory system (session and universal).

### Endpoint

```
POST /api/ai/memory (store memory)
GET /api/ai/memory (retrieve memories)
PUT /api/ai/memory (update memory)
```

### Store Memory (POST)

#### Request Body
```typescript
interface StoreMemoryRequest {
  userId: string;
  conversationId?: string;  // Required for session memory
  memoryType: 'session' | 'universal';
  content: string;
  response?: string;
  metadata?: {
    importance?: number;  // 1-10, higher for universal memory
    tags?: string[];
    [key: string]: any;
  };
}
```

#### Response
```typescript
interface StoreMemoryResponse {
  success: boolean;
  memoryId: string;
  memoryType: 'session' | 'universal';
  message: string;
}
```

### Retrieve Memories (GET)

#### Query Parameters
```
?userId=user123
&conversationId=conv456  // Optional, for session memory
&memoryType=session|universal|all  // Default: all
&limit=10  // Default: 10
```

#### Response
```typescript
interface RetrieveMemoriesResponse {
  memories: Array<{
    id: string;
    content: string;
    response?: string;
    memoryType: 'session' | 'universal';
    conversationId?: string;
    createdAt: string;
    updatedAt?: string;
    metadata?: any;
  }>;
  total: number;
}
```

### Update Memory (PUT)

#### Request Body
```typescript
interface UpdateMemoryRequest {
  userId: string;
  memoryId: string;
  content?: string;
  response?: string;
  metadata?: {
    action: 'updated';
    updatedAt: string;
    [key: string]: any;
  };
}
```

#### Response
```typescript
interface UpdateMemoryResponse {
  success: boolean;
  memoryId: string;
  message: string;
  updatedAt: string;
}
```

### Memory Types

#### Session Memory
- **Purpose**: Conversation-specific context
- **Scope**: Limited to a single conversation
- **Retrieval**: Filtered by `conversationId`
- **Use Case**: "What did we discuss earlier in this chat?"

#### Universal Memory
- **Purpose**: Long-term, cross-conversation knowledge
- **Scope**: Available across all conversations
- **Retrieval**: Semantic search with relevance ranking
- **Use Case**: "Remember that I prefer visual learning methods"

### Example Requests

#### Store Session Memory
```json
{
  "userId": "user123",
  "conversationId": "conv456",
  "memoryType": "session",
  "content": "User asked about photosynthesis",
  "response": "Explained the process of converting light to energy",
  "metadata": {
    "importance": 5,
    "tags": ["biology", "photosynthesis"]
  }
}
```

#### Store Universal Memory
```json
{
  "userId": "user123",
  "memoryType": "universal",
  "content": "User prefers visual learning with diagrams and charts",
  "metadata": {
    "importance": 9,
    "tags": ["learning-style", "preferences"]
  }
}
```

#### Retrieve Session Memories
```
GET /api/ai/memory?userId=user123&conversationId=conv456&memoryType=session&limit=10
```

#### Retrieve Universal Memories
```
GET /api/ai/memory?userId=user123&memoryType=universal&limit=5
```

#### Update Memory
```json
{
  "userId": "user123",
  "memoryId": "mem789",
  "content": "User prefers visual learning with diagrams, charts, and video explanations",
  "metadata": {
    "action": "updated",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

## Usage Examples

### Complete Study Session Flow

```javascript
// 1. Start a new conversation with RAG and web search
const chatResponse = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "I need to study for my physics exam on Newton's laws. Can you help?",
    userId: "student123",
    conversationId: "study-session-001",
    provider: "gemini",
    webSearch: {
      enabled: true,
      maxArticles: 2,
      explain: true
    },
    rag: {
      enabled: true,
      sources: ["subjects/science/physics-laws.md", "study-guides/exam-prep-tips.md"]
    },
    memory: {
      includeSession: true,
      includeUniversal: true
    }
  })
});

const chat = await chatResponse.json();
console.log('AI Response:', chat.response);
console.log('Provider Used:', chat.metadata.providerUsed);
console.log('Web Search Results:', chat.metadata.webSearchResults);
console.log('RAG Sources:', chat.metadata.ragSources);

// 2. Store important information as universal memory
await fetch('/api/ai/memory', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: "student123",
    memoryType: "universal",
    content: "Student is preparing for physics exam on Newton's laws",
    metadata: {
      importance: 8,
      tags: ["exam-prep", "physics", "newtons-laws"]
    }
  })
});

// 3. Continue conversation with context
const followUp = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Can you quiz me on the second law?",
    userId: "student123",
    conversationId: "study-session-001",
    memory: {
      includeSession: true,
      includeUniversal: true
    }
  })
});

// 4. Search for related study materials
const filesResponse = await fetch('/api/ai/files', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: "search",
    userId: "student123",
    query: "physics exam preparation strategies",
    limit: 3
  })
});

const files = await filesResponse.json();
console.log('Relevant Study Materials:', files.results);

// 5. Generate embeddings for custom content
const embeddingResponse = await fetch('/api/ai/embedding', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: "embed",
    userId: "student123",
    texts: [
      "Newton's First Law: An object at rest stays at rest",
      "Newton's Second Law: F = ma",
      "Newton's Third Law: For every action, there is an equal and opposite reaction"
    ],
    provider: "voyage"
  })
});

const embeddings = await embeddingResponse.json();
console.log('Generated Embeddings:', embeddings.embeddings);
```

### Advanced RAG Query

```javascript
// Perform semantic search and generate answer
const ragResponse = await fetch('/api/ai/embedding', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: "rag",
    userId: "student123",
    query: "What are the best note-taking strategies for visual learners?",
    generateAnswer: true
  })
});

const rag = await ragResponse.json();
console.log('Context Sources:', rag.context);
console.log('Generated Answer:', rag.answer);
```

### Memory Management

```javascript
// Retrieve all memories for analysis
const sessionMemories = await fetch(
  '/api/ai/memory?userId=student123&conversationId=study-session-001&memoryType=session&limit=20'
);

const universalMemories = await fetch(
  '/api/ai/memory?userId=student123&memoryType=universal&limit=10'
);

const session = await sessionMemories.json();
const universal = await universalMemories.json();

console.log('Session Context:', session.memories);
console.log('Universal Knowledge:', universal.memories);

// Update a memory with new information
await fetch('/api/ai/memory', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: "student123",
    memoryId: "mem-456",
    content: "Student prefers visual learning with diagrams, videos, and interactive simulations",
    metadata: {
      action: "updated",
      updatedAt: new Date().toISOString()
    }
  })
});
```

### Provider Switching for Cost Optimization

```javascript
// Use fast, cheap model for simple queries
const simpleQuery = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "What is 2+2?",
    userId: "student123",
    provider: "groq",  // Fast and cheap
    model: "llama-3.3-70b-versatile"
  })
});

// Use powerful model for complex reasoning
const complexQuery = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Explain the philosophical implications of quantum entanglement",
    userId: "student123",
    provider: "openrouter",  // Access to Claude
    model: "anthropic/claude-3.5-sonnet"
  })
});
```

---

## Environment Configuration

Required environment variables for all features:

```bash
# AI Providers
GROQ_API_KEY=your_groq_key
GEMINI_API_KEY=your_gemini_key
CEREBRAS_API_KEY=your_cerebras_key
COHERE_API_KEY=your_cohere_key
MISTRAL_API_KEY=your_mistral_key
OPENROUTER_API_KEY=your_openrouter_key

# Embedding Providers
VOYAGE_API_KEY=your_voyage_key

# Web Search
SERPER_API_KEY=your_serper_key

# Cloudflare R2
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=study-buddy-knowledge

# Database
DATABASE_URL=your_supabase_url
```

---

## Rate Limits and Best Practices

### Rate Limits

| Endpoint | Rate Limit | Notes |
|----------|-----------|-------|
| /api/ai/chat | 60 requests/minute | Per user |
| /api/ai/embedding | 100 requests/minute | Per user |
| /api/ai/files | 200 requests/minute | Per user |
| /api/ai/web-search | 30 requests/minute | Per user, limited by Serper |
| /api/ai/memory | 200 requests/minute | Per user |

### Best Practices

1. **Provider Selection**
   - Use Groq for fast, simple queries
   - Use Gemini for balanced performance
   - Use OpenRouter for advanced reasoning (Claude)

2. **Web Search**
   - Limit `maxArticles` to 1-2 for faster responses
   - Disable `explain` if you only need raw content
   - Cache search results when possible

3. **Memory Management**
   - Use session memory for conversation context
   - Use universal memory for long-term preferences
   - Set appropriate importance levels (1-10)

4. **RAG Operations**
   - Specify exact file paths when known
   - Use semantic search for discovery
   - Limit results to 3-5 most relevant files

5. **Error Handling**
   - Always implement fallback logic
   - Handle provider failures gracefully
   - Log errors for debugging

---

## Troubleshooting

### Common Issues

**Issue**: "Invalid provider specified"
- **Solution**: Check that the provider is in the supported list and properly configured with API keys

**Issue**: "Web search extraction failed"
- **Solution**: Some websites block scraping. The API will return partial results with `extractionStatus: 'failed'`

**Issue**: "R2 file not found"
- **Solution**: Verify the file path and ensure files are uploaded to the correct bucket

**Issue**: "Memory retrieval returns no results"
- **Solution**: Check that memories are stored with correct `userId` and `memoryType`

**Issue**: "Embedding generation timeout"
- **Solution**: Reduce the number of texts or switch to a faster provider (Voyage)

---

## API Versioning

Current API Version: **v1**

All endpoints are backward compatible. New parameters are optional and default to previous behavior when omitted.

### Deprecation Policy

- Deprecated features will be announced 90 days in advance
- Deprecated endpoints will continue to work for 180 days
- Migration guides will be provided for breaking changes

---

## Support

For API support and questions:
- Documentation: `/docs/API_DOCUMENTATION.md`
- R2 Setup Guide: `/docs/CLOUDFLARE_R2_SETUP_GUIDE.md`
- Example Files: `/examples/r2-knowledge-files/`
- Issues: Create a GitHub issue with the `api` label
