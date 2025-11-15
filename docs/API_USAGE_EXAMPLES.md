# API Usage Examples

This document provides practical, real-world examples of using the Study Buddy AI API endpoints.

## Table of Contents

1. [Basic Chat Examples](#basic-chat-examples)
2. [Model Selection Examples](#model-selection-examples)
3. [Web Search Examples](#web-search-examples)
4. [Embedding Examples](#embedding-examples)
5. [File RAG Examples](#file-rag-examples)
6. [Memory Management Examples](#memory-management-examples)
7. [Advanced Integration Examples](#advanced-integration-examples)

---

## Basic Chat Examples

### Simple Question and Answer

```javascript
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "What is the Pythagorean theorem?",
    userId: "user123",
    conversationId: "math-help-001"
  })
});

const data = await response.json();
console.log(data.response);
// Output: "The Pythagorean theorem states that in a right triangle..."
```

### Continuing a Conversation

```javascript
// First message
await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Explain photosynthesis",
    userId: "user123",
    conversationId: "biology-study"
  })
});

// Follow-up question (uses conversation context)
const followUp = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "What role does chlorophyll play in this process?",
    userId: "user123",
    conversationId: "biology-study"
  })
});

const data = await followUp.json();
console.log(data.response);
// AI understands "this process" refers to photosynthesis from context
```

---

## Model Selection Examples

### Choosing Fast Model for Simple Queries

```javascript
// Use Groq for quick, simple answers
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "What is 15% of 80?",
    userId: "user123",
    provider: "groq",
    model: "llama-3.3-70b-versatile"
  })
});

const data = await response.json();
console.log(`Answer: ${data.response}`);
console.log(`Provider: ${data.metadata.providerUsed}`);
console.log(`Model: ${data.metadata.modelUsed}`);
```

### Using Advanced Model for Complex Reasoning

```javascript
// Use Claude via OpenRouter for complex analysis
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Compare and contrast the economic theories of Keynes and Hayek",
    userId: "user123",
    provider: "openrouter",
    model: "anthropic/claude-3.5-sonnet"
  })
});

const data = await response.json();
console.log(data.response);
// Detailed, nuanced analysis from Claude
```

### Provider Fallback Handling

```javascript
// Request with preferred provider, automatic fallback if unavailable
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Explain quantum entanglement",
    userId: "user123",
    provider: "gemini"  // Will fallback to other providers if Gemini fails
  })
});

const data = await response.json();
console.log(`Used provider: ${data.metadata.providerUsed}`);
// Might show "groq" if Gemini was unavailable
```

---

## Web Search Examples

### Basic Web Search with Explanation

```javascript
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "What are the latest breakthroughs in cancer research?",
    userId: "user123",
    webSearch: {
      enabled: true,
      maxArticles: 1,
      explain: true
    }
  })
});

const data = await response.json();
console.log('AI Response:', data.response);
console.log('Search Results:', data.metadata.webSearchResults);

// Output includes:
// - AI-generated response incorporating search results
// - Full article content
// - LLM explanation of the article
```

### Multi-Article Research

```javascript
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Compare different approaches to renewable energy",
    userId: "user123",
    webSearch: {
      enabled: true,
      maxArticles: 3,
      explain: true
    }
  })
});

const data = await response.json();

// Process multiple article explanations
data.metadata.webSearchResults.forEach((result, index) => {
  console.log(`\n--- Article ${index + 1}: ${result.title} ---`);
  console.log(`URL: ${result.url}`);
  console.log(`Explanation: ${result.explanation}`);
});
```

### Direct Web Search API

```javascript
// Use web search endpoint directly (without chat)
const response = await fetch('/api/ai/web-search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "machine learning algorithms explained",
    userId: "user123",
    maxArticles: 2,
    explain: true,
    provider: "gemini"
  })
});

const data = await response.json();
console.log('Search Results:', data.results);
console.log('Articles Processed:', data.metadata.articlesProcessed);
```

---

## Embedding Examples

### Generate Embeddings for Text

```javascript
const response = await fetch('/api/ai/embedding', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: "embed",
    userId: "user123",
    texts: [
      "The mitochondria is the powerhouse of the cell",
      "Photosynthesis converts light energy into chemical energy",
      "DNA contains the genetic instructions for life"
    ],
    provider: "voyage"
  })
});

const data = await response.json();
console.log('Embeddings:', data.embeddings);
console.log('Dimensions:', data.dimensions);
console.log('Provider:', data.provider);

// Use embeddings for similarity search, clustering, etc.
```

### Semantic Search Over Memories

```javascript
const response = await fetch('/api/ai/embedding', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: "search",
    userId: "user123",
    query: "What did I learn about biology?",
    conversationId: "study-session-001",
    limit: 5
  })
});

const data = await response.json();

// Results ranked by semantic similarity
data.results.forEach(result => {
  console.log(`Similarity: ${result.similarity.toFixed(3)}`);
  console.log(`Content: ${result.content}`);
  console.log(`Type: ${result.metadata.memoryType}`);
  console.log('---');
});
```

### RAG with Answer Generation

```javascript
const response = await fetch('/api/ai/embedding', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: "rag",
    userId: "user123",
    query: "How should I prepare for a math exam?",
    generateAnswer: true
  })
});

const data = await response.json();

console.log('Retrieved Context:');
data.context.forEach(ctx => {
  console.log(`- ${ctx.source} (relevance: ${ctx.relevance})`);
  console.log(`  ${ctx.content.substring(0, 100)}...`);
});

console.log('\nGenerated Answer:');
console.log(data.answer);
```

---

## File RAG Examples

### Search for Relevant Study Materials

```javascript
const response = await fetch('/api/ai/files', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: "search",
    userId: "user123",
    query: "effective note-taking strategies for visual learners",
    limit: 3
  })
});

const data = await response.json();

console.log('Relevant Files:');
data.results.forEach(file => {
  console.log(`\n${file.path} (relevance: ${file.relevance.toFixed(3)})`);
  console.log(file.content.substring(0, 200) + '...');
});
```

### Get Specific Files

```javascript
const response = await fetch('/api/ai/files', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: "get",
    userId: "user123",
    paths: [
      "study-guides/exam-prep-tips.md",
      "subjects/science/physics-laws.md"
    ]
  })
});

const data = await response.json();

data.files.forEach(file => {
  console.log(`\n=== ${file.path} ===`);
  console.log(file.content);
  console.log(`\nSize: ${file.metadata.size} bytes`);
  console.log(`Last Modified: ${file.metadata.lastModified}`);
});
```

### List Files in Directory

```javascript
const response = await fetch('/api/ai/files', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: "list",
    userId: "user123",
    prefix: "subjects/mathematics/"
  })
});

const data = await response.json();

console.log('Available Math Resources:');
data.files.forEach(file => {
  console.log(`- ${file.path} (${file.size} bytes)`);
});
```

### Chat with RAG Integration

```javascript
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Help me understand Newton's laws of motion",
    userId: "user123",
    conversationId: "physics-study",
    rag: {
      enabled: true,
      sources: ["subjects/science/physics-laws.md"]
    }
  })
});

const data = await response.json();
console.log('AI Response:', data.response);
console.log('RAG Sources Used:', data.metadata.ragSources);
```

---

## Memory Management Examples

### Store Session Memory

```javascript
// Store conversation-specific memory
const response = await fetch('/api/ai/memory', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: "user123",
    conversationId: "study-session-001",
    memoryType: "session",
    content: "User is studying for biology midterm on cellular processes",
    response: "Provided overview of photosynthesis and cellular respiration",
    metadata: {
      importance: 7,
      tags: ["biology", "exam-prep", "cellular-processes"]
    }
  })
});

const data = await response.json();
console.log('Memory stored:', data.memoryId);
```

### Store Universal Memory

```javascript
// Store long-term user preferences
const response = await fetch('/api/ai/memory', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: "user123",
    memoryType: "universal",
    content: "User is a visual learner who prefers diagrams, charts, and video explanations",
    metadata: {
      importance: 9,
      tags: ["learning-style", "preferences", "visual-learner"]
    }
  })
});

const data = await response.json();
console.log('Universal memory stored:', data.memoryId);
```

### Retrieve Session Memories

```javascript
// Get memories from specific conversation
const response = await fetch(
  '/api/ai/memory?userId=user123&conversationId=study-session-001&memoryType=session&limit=10'
);

const data = await response.json();

console.log(`Found ${data.total} session memories:`);
data.memories.forEach(memory => {
  console.log(`\n[${memory.createdAt}]`);
  console.log(`Content: ${memory.content}`);
  if (memory.response) {
    console.log(`Response: ${memory.response}`);
  }
});
```

### Retrieve Universal Memories

```javascript
// Get cross-conversation memories
const response = await fetch(
  '/api/ai/memory?userId=user123&memoryType=universal&limit=5'
);

const data = await response.json();

console.log('Universal Knowledge:');
data.memories.forEach(memory => {
  console.log(`\n- ${memory.content}`);
  console.log(`  Importance: ${memory.metadata?.importance || 'N/A'}`);
  console.log(`  Tags: ${memory.metadata?.tags?.join(', ') || 'None'}`);
});
```

### Update Memory

```javascript
// Update existing memory with new information
const response = await fetch('/api/ai/memory', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: "user123",
    memoryId: "mem-456",
    content: "User is a visual learner who prefers diagrams, charts, video explanations, and interactive simulations",
    metadata: {
      action: "updated",
      updatedAt: new Date().toISOString(),
      importance: 10
    }
  })
});

const data = await response.json();
console.log('Memory updated:', data.message);
console.log('Updated at:', data.updatedAt);
```

### Chat with Memory Context

```javascript
// Chat uses both session and universal memory automatically
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Can you explain this concept using my preferred learning style?",
    userId: "user123",
    conversationId: "study-session-001",
    memory: {
      includeSession: true,
      includeUniversal: true
    }
  })
});

const data = await response.json();
console.log('AI Response:', data.response);
console.log('Memories Used:', data.metadata.memoriesUsed);
// AI will use visual explanations based on universal memory
```

---

## Advanced Integration Examples

### Complete Study Session Workflow

```javascript
class StudyBuddySession {
  constructor(userId) {
    this.userId = userId;
    this.conversationId = `study-${Date.now()}`;
  }

  async startSession(topic) {
    // Initialize session with RAG and web search
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `I want to study ${topic}. Can you help me get started?`,
        userId: this.userId,
        conversationId: this.conversationId,
        webSearch: {
          enabled: true,
          maxArticles: 2,
          explain: true
        },
        rag: {
          enabled: true
        },
        memory: {
          includeSession: true,
          includeUniversal: true
        }
      })
    });

    const data = await response.json();
    
    // Store session start in memory
    await this.storeMemory({
      content: `Started study session on ${topic}`,
      response: data.response,
      memoryType: 'session'
    });

    return data;
  }

  async ask(question) {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: question,
        userId: this.userId,
        conversationId: this.conversationId,
        memory: {
          includeSession: true,
          includeUniversal: true
        }
      })
    });

    return await response.json();
  }

  async searchFiles(query) {
    const response = await fetch('/api/ai/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'search',
        userId: this.userId,
        query: query,
        limit: 3
      })
    });

    return await response.json();
  }

  async storeMemory({ content, response, memoryType = 'session' }) {
    const body = {
      userId: this.userId,
      memoryType: memoryType,
      content: content
    };

    if (memoryType === 'session') {
      body.conversationId = this.conversationId;
    }

    if (response) {
      body.response = response;
    }

    const res = await fetch('/api/ai/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    return await res.json();
  }

  async getSessionSummary() {
    const response = await fetch(
      `/api/ai/memory?userId=${this.userId}&conversationId=${this.conversationId}&memoryType=session&limit=50`
    );

    const data = await response.json();
    return data.memories;
  }
}

// Usage
const session = new StudyBuddySession('user123');

// Start studying
const intro = await session.startSession('quantum mechanics');
console.log(intro.response);

// Ask questions
const answer1 = await session.ask('What is wave-particle duality?');
console.log(answer1.response);

// Search for materials
const files = await session.searchFiles('quantum mechanics basics');
console.log('Found materials:', files.results);

// Get session summary
const summary = await session.getSessionSummary();
console.log('Session covered:', summary.length, 'topics');
```

### Intelligent Provider Selection

```javascript
class SmartProviderSelector {
  constructor() {
    this.providers = {
      fast: { provider: 'groq', model: 'llama-3.3-70b-versatile' },
      balanced: { provider: 'gemini', model: 'gemini-2.0-flash-exp' },
      advanced: { provider: 'openrouter', model: 'anthropic/claude-3.5-sonnet' }
    };
  }

  selectProvider(message) {
    const wordCount = message.split(' ').length;
    const hasComplexKeywords = /compare|analyze|evaluate|critique|synthesize/i.test(message);
    
    if (hasComplexKeywords || wordCount > 50) {
      return this.providers.advanced;
    } else if (wordCount > 20) {
      return this.providers.balanced;
    } else {
      return this.providers.fast;
    }
  }

  async chat(message, userId, conversationId) {
    const providerConfig = this.selectProvider(message);
    
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        userId,
        conversationId,
        ...providerConfig
      })
    });

    const data = await response.json();
    console.log(`Used ${data.metadata.providerUsed} for this query`);
    return data;
  }
}

// Usage
const selector = new SmartProviderSelector();

// Simple query -> uses Groq (fast)
await selector.chat('What is 2+2?', 'user123', 'conv1');

// Medium query -> uses Gemini (balanced)
await selector.chat('Explain the water cycle and its importance', 'user123', 'conv1');

// Complex query -> uses Claude (advanced)
await selector.chat('Compare and contrast the philosophical implications of determinism versus free will', 'user123', 'conv1');
```

### Batch Embedding Generation

```javascript
async function generateBatchEmbeddings(texts, batchSize = 10) {
  const results = [];
  
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    
    const response = await fetch('/api/ai/embedding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'embed',
        userId: 'user123',
        texts: batch,
        provider: 'voyage'
      })
    });

    const data = await response.json();
    results.push(...data.embeddings);
    
    console.log(`Processed ${Math.min(i + batchSize, texts.length)}/${texts.length} texts`);
  }
  
  return results;
}

// Usage
const studyNotes = [
  "Photosynthesis converts light to energy",
  "Mitochondria produces ATP",
  "DNA stores genetic information",
  // ... hundreds more
];

const embeddings = await generateBatchEmbeddings(studyNotes);
console.log(`Generated ${embeddings.length} embeddings`);
```

### Multi-Source Research Assistant

```javascript
async function comprehensiveResearch(topic, userId) {
  console.log(`Researching: ${topic}`);
  
  // 1. Web search for latest information
  const webSearch = await fetch('/api/ai/web-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: topic,
      userId: userId,
      maxArticles: 3,
      explain: true
    })
  });
  const webData = await webSearch.json();
  
  // 2. Search knowledge base files
  const fileSearch = await fetch('/api/ai/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'search',
      userId: userId,
      query: topic,
      limit: 5
    })
  });
  const fileData = await fileSearch.json();
  
  // 3. Search memories for related past discussions
  const memorySearch = await fetch('/api/ai/embedding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'search',
      userId: userId,
      query: topic,
      limit: 5
    })
  });
  const memoryData = await memorySearch.json();
  
  // 4. Generate comprehensive response
  const chat = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Based on web research, knowledge base, and my memory, provide a comprehensive explanation of: ${topic}`,
      userId: userId,
      conversationId: `research-${Date.now()}`,
      provider: 'gemini'
    })
  });
  const chatData = await chat.json();
  
  return {
    summary: chatData.response,
    webSources: webData.results,
    knowledgeBase: fileData.results,
    relatedMemories: memoryData.results
  };
}

// Usage
const research = await comprehensiveResearch('climate change impacts', 'user123');
console.log('Summary:', research.summary);
console.log('Web Sources:', research.webSources.length);
console.log('Knowledge Base:', research.knowledgeBase.length);
console.log('Related Memories:', research.relatedMemories.length);
```

---

## Error Handling Examples

### Graceful Provider Fallback

```javascript
async function robustChat(message, userId) {
  const providers = ['groq', 'gemini', 'cerebras', 'mistral'];
  
  for (const provider of providers) {
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          userId,
          provider
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Success with ${data.metadata.providerUsed}`);
        return data;
      }
    } catch (error) {
      console.log(`${provider} failed, trying next...`);
    }
  }
  
  throw new Error('All providers failed');
}
```

### Retry Logic with Exponential Backoff

```javascript
async function chatWithRetry(message, userId, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, userId })
      });

      if (response.ok) {
        return await response.json();
      }

      if (response.status === 429) {
        // Rate limited, wait and retry
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`Rate limited, waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      console.log(`Attempt ${attempt + 1} failed, retrying...`);
    }
  }
}
```

---

## Performance Optimization Examples

### Caching Strategy

```javascript
class CachedStudyBuddy {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  getCacheKey(message, userId) {
    return `${userId}:${message.toLowerCase().trim()}`;
  }

  async chat(message, userId) {
    const cacheKey = this.getCacheKey(message, userId);
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log('Cache hit!');
      return cached.data;
    }

    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, userId })
    });

    const data = await response.json();
    
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    return data;
  }
}
```

### Parallel Requests

```javascript
async function parallelResearch(topics, userId) {
  const promises = topics.map(topic =>
    fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Briefly explain ${topic}`,
        userId,
        provider: 'groq' // Use fast provider for parallel requests
      })
    }).then(r => r.json())
  );

  const results = await Promise.all(promises);
  
  return topics.map((topic, i) => ({
    topic,
    explanation: results[i].response
  }));
}

// Usage
const topics = ['photosynthesis', 'cellular respiration', 'mitosis'];
const explanations = await parallelResearch(topics, 'user123');
console.log(explanations);
```

---

## Testing Examples

### Integration Test

```javascript
async function testCompleteWorkflow() {
  const userId = 'test-user-' + Date.now();
  const conversationId = 'test-conv-' + Date.now();

  console.log('Testing complete workflow...');

  // 1. Test basic chat
  const chat1 = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Hello, I want to study biology',
      userId,
      conversationId
    })
  });
  console.assert(chat1.ok, 'Basic chat failed');

  // 2. Test memory storage
  const memory = await fetch('/api/ai/memory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      conversationId,
      memoryType: 'session',
      content: 'User wants to study biology'
    })
  });
  console.assert(memory.ok, 'Memory storage failed');

  // 3. Test memory retrieval
  const memoryGet = await fetch(
    `/api/ai/memory?userId=${userId}&conversationId=${conversationId}`
  );
  const memoryData = await memoryGet.json();
  console.assert(memoryData.memories.length > 0, 'Memory retrieval failed');

  // 4. Test web search
  const search = await fetch('/api/ai/web-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'biology basics',
      userId,
      maxArticles: 1
    })
  });
  console.assert(search.ok, 'Web search failed');

  console.log('All tests passed!');
}

testCompleteWorkflow();
```

---

This document provides comprehensive examples for all API endpoints. For more information, see:
- [API Documentation](./API_DOCUMENTATION.md)
- [Cloudflare R2 Setup Guide](./CLOUDFLARE_R2_SETUP_GUIDE.md)
- [Example Knowledge Files](../examples/r2-knowledge-files/)
