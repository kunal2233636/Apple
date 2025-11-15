# Task 10: RAG Integration Usage Examples

## Quick Start

The RAG (Retrieval-Augmented Generation) system allows the AI to access knowledge base files stored in Cloudflare R2 to provide more informed responses.

## Basic Usage

### Example 1: Enable RAG with Semantic Search
The AI will automatically search for relevant files based on your query:

```javascript
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    message: 'Explain the laws of thermodynamics',
    rag: {
      enabled: true  // Enable RAG with semantic search
    }
  })
});

const data = await response.json();
console.log('Files used:', data.data.aiResponse.rag_results.filesRetrieved);
console.log('Response:', data.data.aiResponse.content);
```

### Example 2: Retrieve Specific Files
Directly specify which files to include:

```javascript
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    message: 'What does our knowledge base say about energy?',
    rag: {
      enabled: true,
      sources: [
        'physics/thermodynamics.md',
        'physics/energy-conservation.md',
        'science/heat-transfer.md'
      ]
    }
  })
});
```

## Advanced Usage

### Example 3: Combine RAG with Web Search
Get both knowledge base context AND current web information:

```javascript
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    message: 'What are the latest applications of thermodynamics?',
    rag: {
      enabled: true  // Knowledge base context
    },
    webSearch: {
      enabled: true,      // Current web information
      maxArticles: 2,
      explain: true
    }
  })
});

const data = await response.json();
console.log('RAG files:', data.data.aiResponse.rag_results.filesRetrieved);
console.log('Web articles:', data.data.aiResponse.web_search_results.articlesProcessed);
```

### Example 4: Full System Integration
Use all available context sources:

```javascript
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    message: 'Help me understand thermodynamics better',
    conversationId: 'conv-456',
    
    // RAG: Knowledge base files
    rag: {
      enabled: true
    },
    
    // Web Search: Current information
    webSearch: {
      enabled: true,
      maxArticles: 1,
      explain: true
    },
    
    // Memory: Past conversations
    memory: {
      includeSession: true,    // This conversation
      includeUniversal: true   // All conversations
    },
    
    // Model Selection
    provider: 'gemini',
    model: 'gemini-2.0-flash-lite'
  })
});

const data = await response.json();
console.log('Integration Status:', data.data.integrationStatus);
// {
//   memory_system: true,
//   web_search_system: true,
//   rag_system: true,
//   memories_found: 5,
//   rag_files_retrieved: 3
// }
```

## Response Structure

### With RAG Enabled
```json
{
  "success": true,
  "data": {
    "aiResponse": {
      "content": "Based on the knowledge base files...",
      "rag_enabled": true,
      "rag_results": {
        "filesRetrieved": 3,
        "files": [
          {
            "path": "physics/thermodynamics.md",
            "relevanceScore": 0.953,
            "contentLength": 1847
          },
          {
            "path": "physics/energy.md",
            "relevanceScore": 0.872,
            "contentLength": 2000
          }
        ],
        "provider": "voyage",
        "model": "voyage-multilingual-2"
      }
    },
    "integrationStatus": {
      "rag_system": true,
      "rag_files_retrieved": 3
    }
  }
}
```

### Without RAG (Default)
```json
{
  "success": true,
  "data": {
    "aiResponse": {
      "content": "...",
      "rag_enabled": false
    },
    "integrationStatus": {
      "rag_system": false,
      "rag_files_retrieved": 0
    }
  }
}
```

## Use Cases

### 1. Educational Content
```javascript
// Student asking about a topic covered in course materials
{
  message: "Explain the second law of thermodynamics",
  rag: {
    enabled: true,
    sources: ["courses/physics-101/thermodynamics.md"]
  }
}
```

### 2. Documentation Lookup
```javascript
// Developer asking about API documentation
{
  message: "How do I authenticate with the API?",
  rag: {
    enabled: true,
    sources: [
      "docs/api/authentication.md",
      "docs/api/getting-started.md"
    ]
  }
}
```

### 3. Research Assistant
```javascript
// Researcher combining knowledge base with current research
{
  message: "What's the current state of quantum thermodynamics?",
  rag: { enabled: true },
  webSearch: { enabled: true, maxArticles: 3, explain: true }
}
```

### 4. Personalized Learning
```javascript
// Student with conversation history and knowledge base
{
  message: "Can you review what we learned about entropy?",
  conversationId: "study-session-123",
  rag: { enabled: true },
  memory: { includeSession: true, includeUniversal: true }
}
```

## Error Handling

### Graceful Degradation
If R2 is unavailable or files don't exist, the chat continues without RAG:

```javascript
// Even if RAG fails, you still get a response
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  body: JSON.stringify({
    userId: 'user-123',
    message: 'Explain thermodynamics',
    rag: { enabled: true }
  })
});

const data = await response.json();
// data.success === true (chat still works)
// data.data.aiResponse.rag_enabled === false (RAG failed gracefully)
// data.data.aiResponse.content === "..." (AI response without RAG context)
```

## Best Practices

### 1. Use Semantic Search for Exploration
When you don't know which files are relevant:
```javascript
rag: { enabled: true }  // Let the AI find relevant files
```

### 2. Use Specific Sources for Precision
When you know exactly which files to use:
```javascript
rag: {
  enabled: true,
  sources: ['specific/file.md']
}
```

### 3. Combine with Web Search for Current Info
For topics that change frequently:
```javascript
rag: { enabled: true },        // Historical/foundational knowledge
webSearch: { enabled: true }   // Current developments
```

### 4. Use with Memory for Personalization
For ongoing learning sessions:
```javascript
rag: { enabled: true },                    // Knowledge base
memory: { includeSession: true }           // Conversation context
```

## Performance Tips

1. **Limit Sources**: Specify only necessary files to reduce latency
2. **Use Semantic Search**: Let the system find the most relevant files
3. **Combine Wisely**: Don't enable all features if not needed
4. **Cache Results**: Consider caching responses for common queries

## Testing

Run the test suite to verify RAG integration:
```bash
node test-rag-integration.js
```

This will test:
- ✅ Backward compatibility (RAG disabled by default)
- ✅ Semantic search mode
- ✅ Specific file retrieval
- ✅ Combined systems (RAG + Web Search + Memory)

## Troubleshooting

### RAG Not Working?
1. Check if R2 credentials are configured
2. Verify files exist in R2 bucket
3. Check file paths match exactly
4. Review server logs for errors

### No Files Retrieved?
1. Verify `enabled: true` is set
2. Check if files exist in R2
3. Try semantic search instead of specific sources
4. Review relevance scores (may be too low)

### Slow Responses?
1. Limit number of sources
2. Use smaller files
3. Consider caching frequently accessed files
4. Check R2 connection latency

## Summary

The RAG system provides powerful knowledge base integration:
- 🔍 **Semantic Search**: Automatically finds relevant files
- 📁 **Direct Access**: Retrieve specific files by path
- 🔗 **Integration**: Works with web search and memory
- 🛡️ **Reliable**: Graceful degradation on failures
- ⚡ **Fast**: Optimized for performance

Start with basic semantic search and expand to more advanced use cases as needed!
