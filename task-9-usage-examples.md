# Task 9: Dual-Layer Memory Integration - Usage Examples

## Overview
This document provides practical examples of how to use the dual-layer memory system integrated into the `/api/ai/chat` endpoint.

## API Endpoint
```
POST /api/ai/chat
```

## Memory Parameter Structure

```typescript
{
  memory?: {
    includeSession?: boolean;    // Default: true
    includeUniversal?: boolean;  // Default: true
  }
}
```

## Usage Examples

### Example 1: Default Behavior (Both Memory Layers)

**Request:**
```json
{
  "userId": "user-123",
  "message": "Can you help me understand thermodynamics?",
  "conversationId": "conv-456"
}
```

**Behavior:**
- ✅ Retrieves session memories from conversation `conv-456`
- ✅ Retrieves universal memories using semantic search
- ✅ Combines both for comprehensive context
- ✅ Stores new memory (automatically classified as session or universal)

**Use Case:** Regular conversation with full memory context

---

### Example 2: Session Memory Only

**Request:**
```json
{
  "userId": "user-123",
  "message": "What did we discuss in the last message?",
  "conversationId": "conv-456",
  "memory": {
    "includeSession": true,
    "includeUniversal": false
  }
}
```

**Behavior:**
- ✅ Retrieves only session memories from `conv-456`
- ❌ Skips universal memory search
- ✅ Provides conversation-specific context
- ✅ Stores new memory (classified automatically)

**Use Case:** 
- Following up on recent conversation
- Maintaining conversation flow
- Quick context without semantic search overhead

---

### Example 3: Universal Memory Only

**Request:**
```json
{
  "userId": "user-123",
  "message": "What do you know about my learning preferences?",
  "memory": {
    "includeSession": false,
    "includeUniversal": true
  }
}
```

**Behavior:**
- ❌ Skips session memory retrieval
- ✅ Retrieves universal memories using semantic search
- ✅ Provides cross-session knowledge
- ✅ Stores new memory (likely as universal due to personal info)

**Use Case:**
- Querying personal information
- Accessing long-term knowledge
- Cross-conversation insights

---

### Example 4: No Memory Context

**Request:**
```json
{
  "userId": "user-123",
  "message": "What is quantum mechanics?",
  "memory": {
    "includeSession": false,
    "includeUniversal": false
  }
}
```

**Behavior:**
- ❌ Skips all memory retrieval
- ✅ Provides fresh response without context
- ✅ Still stores new memory for future use

**Use Case:**
- Fresh start without context
- Testing without memory influence
- Privacy-sensitive queries

---

### Example 5: Personal Information (Auto-Universal)

**Request:**
```json
{
  "userId": "user-123",
  "message": "My name is Alex and I prefer detailed explanations with examples",
  "conversationId": "conv-456"
}
```

**Behavior:**
- ✅ Retrieves both memory layers (default)
- ✅ Processes message normally
- ✅ **Automatically stores as UNIVERSAL memory** (detected personal info)
- ✅ Sets priority to HIGH
- ✅ Sets retention to PERMANENT

**Detection Triggers:**
- "my name"
- "i prefer"
- "i like"
- "i learn best"

---

### Example 6: Important Learning (Auto-Universal)

**Request:**
```json
{
  "userId": "user-123",
  "message": "Remember that entropy always increases in isolated systems - this is key!",
  "conversationId": "conv-456"
}
```

**Behavior:**
- ✅ Retrieves both memory layers
- ✅ Processes message normally
- ✅ **Automatically stores as UNIVERSAL memory** (detected important learning)
- ✅ Sets priority to HIGH
- ✅ Sets retention to PERMANENT

**Detection Triggers:**
- "remember"
- "important"
- "key concept"
- "always"
- "never forget"

---

### Example 7: Correction/Insight (Auto-Universal)

**Request:**
```json
{
  "userId": "user-123",
  "message": "Actually, I made a mistake - the correct formula is E=mc², not E=mv²",
  "conversationId": "conv-456"
}
```

**Behavior:**
- ✅ Retrieves both memory layers
- ✅ Processes message normally
- ✅ **Automatically stores as UNIVERSAL memory** (detected correction)
- ✅ Sets priority to CRITICAL
- ✅ Sets retention to PERMANENT

**Detection Triggers:**
- "correction"
- "actually"
- "mistake"
- "important distinction"

---

### Example 8: Regular Conversation (Auto-Session)

**Request:**
```json
{
  "userId": "user-123",
  "message": "Can you explain that in simpler terms?",
  "conversationId": "conv-456"
}
```

**Behavior:**
- ✅ Retrieves both memory layers
- ✅ Processes message normally
- ✅ **Automatically stores as SESSION memory** (regular conversation)
- ✅ Sets priority to MEDIUM
- ✅ Sets retention to LONG_TERM

**Characteristics:**
- No special keywords detected
- Has conversation ID
- Regular follow-up question

---

### Example 9: With Memory Options

**Request:**
```json
{
  "userId": "user-123",
  "message": "What have we discussed about physics?",
  "conversationId": "conv-456",
  "memory": {
    "includeSession": true,
    "includeUniversal": true
  },
  "memoryOptions": {
    "limit": 10,
    "contextLevel": "comprehensive",
    "minSimilarity": 0.7
  }
}
```

**Behavior:**
- ✅ Retrieves up to 10 session memories
- ✅ Retrieves up to 10 universal memories
- ✅ Uses comprehensive context level
- ✅ Filters by 0.7 minimum similarity
- ✅ Provides rich, detailed context

**Use Case:**
- Deep dive into topic
- Comprehensive review
- Research-style queries

---

### Example 10: Backward Compatibility (Legacy Flag)

**Request:**
```json
{
  "userId": "user-123",
  "message": "Help me study",
  "conversationId": "conv-456",
  "includeMemoryContext": false
}
```

**Behavior:**
- ❌ Skips all memory retrieval (legacy flag respected)
- ✅ Works exactly as before
- ✅ Maintains backward compatibility

**Use Case:**
- Legacy code integration
- Gradual migration
- Compatibility testing

---

## Response Structure

### With Memory Context

```json
{
  "success": true,
  "data": {
    "aiResponse": {
      "content": "Based on our previous discussions about thermodynamics...",
      "model_used": "llama-3.3-70b-versatile",
      "provider_used": "groq",
      "tokens_used": 1234,
      "latency_ms": 567,
      "query_type": "teaching",
      "web_search_enabled": false,
      "fallback_used": false,
      "cached": false
    },
    "integrationStatus": {
      "personalization_system": true,
      "teaching_system": false,
      "memory_system": true,
      "web_search_system": false,
      "hallucination_prevention_layers": [1, 2, 3, 4, 5],
      "memories_found": 8
    }
  },
  "metadata": {
    "requestId": "ai-chat-1234567890",
    "processingTime": 678,
    "timestamp": "2024-11-15T10:30:00.000Z",
    "integration": "COMPREHENSIVE - ALL SYSTEMS ACTIVE (FIXED)"
  }
}
```

### Memory Context in Logs

```
🧠 Step 4: Dual-Layer Memory Context Building
📝 Retrieving session memories for conversation: conv-456
✅ Session memories retrieved: 3
🌐 Retrieving universal memories with semantic search
✅ Universal memories retrieved: 5
✅ Dual-layer memory context built: { total: 8, session: 3, universal: 5 }
```

---

## Memory Storage Logs

### Session Memory Storage
```
📝 Storing as session memory: Regular conversation
💾 Memory stored successfully as session memory
```

### Universal Memory Storage
```
📌 Storing as universal memory: Personal information detected
💾 Memory stored successfully as universal memory
```

---

## Best Practices

### 1. Use Session Memory For:
- ✅ Conversation flow and context
- ✅ Follow-up questions
- ✅ Temporary working memory
- ✅ Context-specific information

### 2. Use Universal Memory For:
- ✅ Personal information and preferences
- ✅ Important learning moments
- ✅ Corrections and insights
- ✅ Cross-conversation knowledge

### 3. Use Both (Default) For:
- ✅ General conversations
- ✅ Study sessions
- ✅ Comprehensive context
- ✅ Best user experience

### 4. Use Neither For:
- ✅ Privacy-sensitive queries
- ✅ Fresh start scenarios
- ✅ Testing without context
- ✅ Stateless interactions

---

## Performance Tips

1. **Limit Memory Retrieval:**
   ```json
   "memoryOptions": { "limit": 5 }
   ```

2. **Use Light Context Level:**
   ```json
   "memoryOptions": { "contextLevel": "light" }
   ```

3. **Disable When Not Needed:**
   ```json
   "memory": { "includeSession": false, "includeUniversal": false }
   ```

4. **Adjust Similarity Threshold:**
   ```json
   "memoryOptions": { "minSimilarity": 0.8 }
   ```

---

## Error Handling

### Graceful Degradation
- If session memory retrieval fails → continues with universal only
- If universal memory retrieval fails → continues with session only
- If both fail → continues without memory context
- Always stores new memory regardless of retrieval status

### Logging
All memory operations are logged with:
- ✅ Success indicators
- ⚠️ Warning messages
- ❌ Error details
- 📊 Performance metrics

---

## Migration Guide

### From Single-Layer to Dual-Layer

**Before:**
```json
{
  "userId": "user-123",
  "message": "Help me study",
  "includeMemoryContext": true
}
```

**After (Equivalent):**
```json
{
  "userId": "user-123",
  "message": "Help me study",
  "memory": {
    "includeSession": true,
    "includeUniversal": true
  }
}
```

**Or Simply:**
```json
{
  "userId": "user-123",
  "message": "Help me study"
  // memory defaults to both enabled
}
```

---

## Testing Checklist

- [ ] Test with both memory layers enabled
- [ ] Test with session only
- [ ] Test with universal only
- [ ] Test with no memory
- [ ] Test personal information detection
- [ ] Test important learning detection
- [ ] Test correction detection
- [ ] Test backward compatibility
- [ ] Test with various memory limits
- [ ] Test with different context levels

---

## Conclusion

The dual-layer memory system provides:
- ✅ Flexible memory retrieval options
- ✅ Intelligent automatic classification
- ✅ Full backward compatibility
- ✅ Graceful error handling
- ✅ Comprehensive logging
- ✅ Performance optimization options

Ready for production use! 🚀
