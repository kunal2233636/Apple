# Dual-Layer Memory System - Usage Guide

## Quick Reference

### Memory Types

- **Session Memory**: Conversation-specific, tied to a conversation_id
- **Universal Memory**: Cross-session, accessible across all conversations

## API Operations

### 1. Store Session Memory

```javascript
POST /api/ai/memory
Content-Type: application/json

{
  "userId": "user-uuid",
  "message": "What is the capital of France?",
  "response": "The capital of France is Paris.",
  "conversationId": "conv-uuid",
  "memory_type": "session",
  "metadata": {
    "memoryType": "learning_interaction",
    "priority": "medium",
    "topic": "geography"
  }
}
```

### 2. Store Universal Memory

```javascript
POST /api/ai/memory
Content-Type: application/json

{
  "userId": "user-uuid",
  "message": "I learn best with visual examples",
  "response": "Noted: User prefers visual learning with examples.",
  "memory_type": "universal",
  "metadata": {
    "memoryType": "insight",
    "priority": "high",
    "topic": "user_preferences",
    "tags": ["learning_style", "preferences"]
  }
}
```

### 3. Update Memory

```javascript
POST /api/ai/memory
Content-Type: application/json

{
  "userId": "user-uuid",
  "memoryId": "memory-uuid",
  "message": "Updated content",
  "metadata": {
    "priority": "high",
    "tags": ["updated"]
  }
}
```

### 4. Search Memories

```javascript
POST /api/ai/memory
Content-Type: application/json

{
  "userId": "user-uuid",
  "query": "learning preferences",
  "limit": 10,
  "minSimilarity": 0.5,
  "searchType": "hybrid"
}
```

## Programmatic Usage

### Retrieve Session Memories

```typescript
import { getSessionMemories } from '@/app/api/ai/memory/route';

const memories = await getSessionMemories(
  userId,
  conversationId,
  10 // limit
);

// Returns array of memories for this specific conversation
```

### Retrieve Universal Memories

```typescript
import { getUniversalMemories } from '@/app/api/ai/memory/route';

const memories = await getUniversalMemories(
  userId,
  "user learning preferences",
  {
    limit: 5,
    minSimilarity: 0.6,
    preferredProvider: 'gemini'
  }
);

// Returns semantically relevant memories across all conversations
```

## Use Cases

### Session Memory Use Cases

1. **Conversation Context**: Remember what was discussed in this chat
2. **Follow-up Questions**: Reference previous questions in the conversation
3. **Temporary Context**: Information relevant only to current session
4. **Problem-Solving Steps**: Track steps in a multi-turn problem

Example:
```
User: "What is photosynthesis?"
AI: [Explains photosynthesis]
[Stored as session memory]

User: "Can you explain that in simpler terms?"
AI: [Retrieves session memory, provides simpler explanation]
```

### Universal Memory Use Cases

1. **User Preferences**: Learning style, explanation depth, language preferences
2. **Long-term Knowledge**: Facts the user wants to remember across sessions
3. **Personal Context**: User's background, interests, goals
4. **Recurring Topics**: Subjects the user frequently asks about

Example:
```
User: "I prefer detailed explanations with examples"
[Stored as universal memory with high priority]

[In a new conversation days later]
User: "Explain quantum mechanics"
AI: [Retrieves universal memory, provides detailed explanation with examples]
```

## Best Practices

### When to Use Session Memory

- ✅ Conversation-specific context
- ✅ Temporary information
- ✅ Follow-up questions
- ✅ Multi-turn problem solving
- ✅ Current topic discussion

### When to Use Universal Memory

- ✅ User preferences and settings
- ✅ Important facts to remember
- ✅ Personal context and background
- ✅ Learning objectives
- ✅ Recurring topics of interest

### Priority Levels

- **Critical**: Essential user preferences, safety information
- **High**: Important preferences, key facts
- **Medium**: General information, common topics
- **Low**: Nice-to-have context, temporary notes

### Memory Update Strategy

Update memories when:
- User corrects information
- Preferences change
- Additional context is provided
- Information becomes more important

```javascript
// Example: User updates their preference
POST /api/ai/memory
{
  "userId": "user-uuid",
  "memoryId": "preference-memory-uuid",
  "message": "I now prefer concise explanations instead of detailed ones",
  "metadata": {
    "priority": "high",
    "tags": ["preferences", "updated"]
  }
}
```

## Integration with Chat

### Building Context for AI

```typescript
async function buildMemoryContext(userId: string, conversationId: string, query: string) {
  // Get session context
  const sessionMemories = await getSessionMemories(userId, conversationId, 10);
  
  // Get universal context
  const universalMemories = await getUniversalMemories(userId, query, {
    limit: 5,
    minSimilarity: 0.6
  });
  
  // Format for AI prompt
  const context = {
    session: sessionMemories.map(m => extractMemoryContent(m)),
    universal: universalMemories.map(m => extractMemoryContent(m))
  };
  
  return context;
}
```

### Storing New Memories

```typescript
async function storeMemoryAfterResponse(
  userId: string,
  conversationId: string,
  userMessage: string,
  aiResponse: string,
  isImportant: boolean
) {
  const memory_type = isImportant ? 'universal' : 'session';
  
  await fetch('/api/ai/memory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      conversationId,
      message: userMessage,
      response: aiResponse,
      memory_type,
      metadata: {
        priority: isImportant ? 'high' : 'medium',
        memoryType: 'learning_interaction'
      }
    })
  });
}
```

## Performance Considerations

### Session Memory
- **Fast**: Simple database query with indexes
- **Scalable**: Limited to conversation scope
- **Use for**: Real-time conversation context

### Universal Memory
- **Semantic**: Uses vector embeddings for relevance
- **Intelligent**: Ranks by similarity and importance
- **Use for**: Cross-session knowledge retrieval

## Monitoring

Check memory system health:
```bash
GET /api/ai/memory?action=health
```

Response includes:
- Database connectivity
- Search modes available
- Storage configuration

## Troubleshooting

### Memory Not Found
- Verify userId matches
- Check memory_type filter
- Ensure conversation_id is correct

### Low Similarity Scores
- Lower minSimilarity threshold
- Use hybrid search mode
- Check query phrasing

### Update Fails
- Verify memoryId exists
- Confirm user ownership
- Check userId format

## Migration

Apply the database migration:
```bash
node apply-memory-type-migration.js
```

Or manually in Supabase SQL Editor:
```sql
-- See: src/lib/migrations/add_memory_type_column.sql
```
