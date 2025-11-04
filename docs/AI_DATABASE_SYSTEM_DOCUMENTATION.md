# AI Study Assistant Database System - Comprehensive Documentation

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [Security Model](#security-model)
5. [Performance Optimization](#performance-optimization)
6. [API Integration](#api-integration)
7. [Migration Guide](#migration-guide)
8. [Development Guide](#development-guide)
9. [Maintenance & Operations](#maintenance--operations)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The AI Study Assistant Database System is a comprehensive PostgreSQL-based solution designed to power intelligent study assistance features for JEE exam preparation. The system combines traditional relational data storage with vector embeddings for semantic search, providing a robust foundation for personalized AI-driven learning experiences.

### Key Features

- **Chat Conversations**: Store and manage user chat sessions with AI assistants
- **Vector Memory**: Store study insights with semantic search capabilities
- **Student Profiles**: Maintain personalized learning data and preferences
- **API Usage Tracking**: Monitor and analyze AI provider costs and performance
- **Memory Summaries**: Automated weekly/monthly insight compression
- **System Prompts**: Configurable AI behavior for different use cases
- **Security First**: Row Level Security (RLS) enabled across all tables
- **Performance Optimized**: 25+ indexes for fast query execution

### Technology Stack

- **Database**: PostgreSQL with Supabase
- **Extensions**: `pgcrypto` (UUIDs), `vector` (embeddings)
- **Language**: TypeScript for application integration
- **AI Providers**: Groq, Gemini, Cerebras, OpenRouter, Cohere

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│  TypeScript Integration Layer  │  Migration Scripts        │
│  - AIDatabaseIntegration       │  - create_ai_tables.sql   │
│  - Query Utilities             │  - create_rls_policies.sql│
│  - Type Definitions            │  - create_indexes.sql     │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                Database Layer (PostgreSQL)                  │
├─────────────────────────────────────────────────────────────┤
│  Security (RLS) │ Core Tables (7) │ Functions │ Triggers    │
│  - User Isolation│ - Chat Tables  │ - API Log │ - Auto-TS   │
│  - Data Access   │ - Memory Store │ - Vector  │ - Cleanup   │
│                  │ - Profiles     │ Search    │ - Summary   │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### 1. Chat Conversations (`chat_conversations`)

Stores chat session metadata and configuration.

**Columns:**
- `id` (UUID, Primary Key) - Unique conversation identifier
- `user_id` (UUID, Foreign Key) - Links to `auth.users`
- `title` (TEXT) - Display name for the chat
- `chat_type` (TEXT) - Either "general" or "study_assistant"
- `created_at` (TIMESTAMP) - Auto-generated creation time
- `updated_at` (TIMESTAMP) - Auto-updated modification time
- `is_archived` (BOOLEAN) - Soft deletion flag

**Indexing Strategy:**
- User-based queries: `idx_chat_conversations_user_id`
- Recent activity: `idx_chat_conversations_updated_at`
- Active conversations: `idx_chat_conversations_active_user`

### 2. Chat Messages (`chat_messages`)

Stores individual messages within conversations.

**Columns:**
- `id` (UUID, Primary Key) - Message identifier
- `conversation_id` (UUID, Foreign Key) - Links to `chat_conversations`
- `role` (TEXT) - "user" or "assistant"
- `content` (TEXT) - Actual message text
- `model_used` (TEXT) - AI model that generated response
- `provider_used` (TEXT) - AI provider service
- `tokens_used` (INTEGER) - Token consumption count
- `latency_ms` (INTEGER) - Response time in milliseconds
- `context_included` (BOOLEAN) - Whether student data was included
- `timestamp` (TIMESTAMP) - Message creation time

**Indexing Strategy:**
- Conversation lookup: `idx_chat_messages_conversation_id`
- Message ordering: `idx_chat_messages_timestamp`
- Combined queries: `idx_chat_messages_conversation_timestamp`

### 3. Study Chat Memory (`study_chat_memory`)

Stores study insights with vector embeddings for semantic search.

**Columns:**
- `id` (UUID, Primary Key) - Memory identifier
- `user_id` (UUID, Foreign Key) - Links to `auth.users`
- `content` (TEXT) - The insight or memory content
- `embedding` (vector(1536)) - Cohere vector representation
- `importance_score` (INTEGER) - 1-5 rating of importance
- `tags` (TEXT[]) - Categorization tags
- `source_conversation_id` (UUID, Foreign Key) - Optional chat link
- `created_at` (TIMESTAMP) - Memory creation time
- `expires_at` (TIMESTAMP) - Automatic deletion date (8 months)
- `is_active` (BOOLEAN) - Soft deletion flag

**Indexing Strategy:**
- User search: `idx_study_chat_memory_user_id`
- Cleanup operations: `idx_study_chat_memory_expires_at`
- Active memory queries: `idx_study_chat_memory_active`
- Tag filtering: `idx_study_chat_memory_tags` (GIN)
- Vector similarity: `idx_study_chat_memory_embedding` (IVFFlat)

### 4. Memory Summaries (`memory_summaries`)

Compressed weekly/monthly insights for long-term retention.

**Columns:**
- `id` (UUID, Primary Key) - Summary identifier
- `user_id` (UUID, Foreign Key) - Links to `auth.users`
- `summary_type` (TEXT) - "weekly" or "monthly"
- `period_start` (DATE) - Summary period start
- `period_end` (DATE) - Summary period end
- `summary_text` (TEXT, Max 500 chars) - Compressed insights
- `token_count` (INTEGER) - Token usage for generation
- `created_at` (TIMESTAMP) - Summary creation time
- `expires_at` (TIMESTAMP) - Summary expiration date

### 5. Student AI Profile (`student_ai_profile`)

Personalized learning preferences and performance data.

**Columns:**
- `user_id` (UUID, Primary Key, Foreign Key) - User identifier
- `profile_text` (TEXT, Max 200 chars) - Compressed profile summary
- `strong_subjects` (TEXT[]) - Areas of strength
- `weak_subjects` (TEXT[]) - Areas needing improvement
- `learning_style` (TEXT) - Preferred learning method
- `exam_target` (TEXT) - Exam goal (e.g., "JEE 2025")
- `last_updated` (TIMESTAMP) - Profile modification time

### 6. API Usage Logs (`api_usage_logs`)

Comprehensive tracking of AI provider costs and performance.

**Columns:**
- `id` (UUID, Primary Key) - Log identifier
- `user_id` (UUID, Foreign Key) - User who made the request
- `feature_name` (TEXT) - Feature being used
- `provider_used` (TEXT) - AI provider (groq, gemini, etc.)
- `model_used` (TEXT) - Specific AI model
- `tokens_input` (INTEGER) - Input token consumption
- `tokens_output` (INTEGER) - Output token generation
- `latency_ms` (INTEGER) - Response time
- `cached` (BOOLEAN) - Cache hit flag
- `cost_estimate` (DECIMAL(10,4)) - Cost in USD
- `timestamp` (TIMESTAMP) - Request timestamp
- `success` (BOOLEAN) - Success flag
- `error_message` (TEXT) - Error details if failed

**Indexing Strategy:**
- User analytics: `idx_api_usage_logs_user_id`
- Provider breakdown: `idx_api_usage_logs_provider`
- Performance tracking: `idx_api_usage_logs_timestamp`
- Feature analysis: `idx_api_usage_logs_feature`

### 7. AI System Prompts (`ai_system_prompts`)

Configurable AI behavior and personality settings.

**Columns:**
- `id` (UUID, Primary Key) - Prompt identifier
- `name` (TEXT, Unique) - Prompt identifier
- `system_prompt` (TEXT) - AI instruction text
- `language` (TEXT) - Response language setting
- `is_active` (BOOLEAN) - Current usage flag
- `version` (INTEGER) - Version tracking
- `created_at` (TIMESTAMP) - Creation time
- `updated_at` (TIMESTAMP) - Modification time

**Indexing Strategy:**
- Unique name lookup: `idx_ai_system_prompts_name`
- Active prompt filtering: `idx_ai_system_prompts_active`

---

## Security Model

### Row Level Security (RLS) Implementation

Every table has RLS enabled with user-specific access policies:

#### Chat Tables (`chat_conversations`, `chat_messages`)
- Users can only access conversations they own
- Messages accessible only through conversation ownership
- Cascading deletion ensures data consistency

#### Memory Tables (`study_chat_memory`, `memory_summaries`)
- Strict user isolation for study data
- Vector embeddings stay private to each user
- Automatic expiration prevents data bloat

#### Profile Table (`student_ai_profile`)
- One profile per user with full control
- Sensitive learning data protection
- Automatic timestamp updates

#### API Usage (`api_usage_logs`)
- Users see only their own usage data
- Cost tracking for budgeting and optimization
- Success/failure monitoring

#### System Prompts (`ai_system_prompts`)
- All authenticated users can read prompts
- Only service role can modify configurations
- Version tracking for change management

### Security Best Practices

1. **Service Role Separation**: Backend operations use service role key
2. **Client Key Restrictions**: Frontend uses anon key with RLS
3. **Input Validation**: All user inputs validated before database operations
4. **SQL Injection Prevention**: Use parameterized queries via Supabase
5. **Data Encryption**: At-rest encryption handled by Supabase

---

## Performance Optimization

### Index Strategy

The system includes 25+ strategically placed indexes:

#### Query Pattern Optimization
- **User-based queries**: Indexed on `user_id` for all user-scoped data
- **Time-series queries**: Descending indexes on timestamps
- **Vector similarity**: IVFFlat index for embeddings
- **Composite queries**: Multi-column indexes for common patterns

#### Performance Monitoring
```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan 
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM study_chat_memory 
WHERE user_id = 'uuid' AND is_active = true 
ORDER BY importance_score DESC;
```

### Vector Search Optimization

Vector similarity search performance:

1. **Embedding Dimension**: Fixed at 1536 (Cohere standard)
2. **Index Type**: IVFFlat with cosine similarity
3. **Similarity Threshold**: Configurable (default 0.7)
4. **Result Limiting**: Configurable limits (default 5 results)

---

## API Integration

### TypeScript Integration Layer

The `AIDatabaseIntegration` class provides a clean interface:

```typescript
import AIDatabaseIntegration from '@/lib/database/integration';

// Initialize
const aiDB = new AIDatabaseIntegration();

// Create chat
const chat = await aiDB.createAIChat('Math Study', 'study_assistant');

// Process AI response
await aiDB.processChatMessage(
  chat.id,
  'Explain derivatives',
  aiResponse,
  { model: 'llama-3.1-70b', provider: 'groq', tokensUsed: 150, latencyMs: 1200 }
);

// Store insight
await aiDB.storeStudyInsight(
  'Derivative rule: d/dx(x^n) = nx^(n-1)',
  embedding,
  5,
  { tags: ['calculus', 'derivatives'] }
);

// Find similar memories
const memories = await aiDB.findRelevantMemories(queryEmbedding, {
  limit: 3,
  min_similarity: 0.8
});
```

### Query Utilities

Direct database access via specialized query classes:

```typescript
import { ChatQueries, MemoryQueries, ProfileQueries } from '@/lib/database/queries';

// Chat operations
const conversations = await ChatQueries.getUserConversations(userId, {
  limit: 10,
  includeArchived: false
});

// Memory operations
const similarMemories = await MemoryQueries.findSimilarMemories(
  userId, 
  embedding, 
  { limit: 5, min_similarity: 0.7 }
);

// Profile operations
const profile = await ProfileQueries.getProfile(userId);
```

---

## Migration Guide

### Automated Migration

Run the master migration script:

```bash
# Dry run to verify setup
node src/lib/migrations/master-migration.js --dry-run

# Execute full migration
node src/lib/migrations/master-migration.js

# Run validation
node src/lib/database/validation-tests.js
```

### Manual Migration

1. **Apply SQL Files in Order**:
   ```bash
   # 1. Create tables and data
   psql -d your_database -f src/lib/migrations/create_ai_tables.sql
   
   # 2. Set up security
   psql -d your_database -f src/lib/migrations/create_rls_policies.sql
   
   # 3. Create indexes
   psql -d your_database -f src/lib/migrations/create_indexes.sql
   
   # 4. Set up functions and triggers
   psql -d your_database -f src/lib/migrations/create_automation_functions.sql
   ```

2. **Verify Migration**:
   ```sql
   -- Check tables exist
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('chat_conversations', 'chat_messages', ...);
   
   -- Verify system prompts
   SELECT name, language, is_active FROM ai_system_prompts;
   ```

### Rollback Procedure

1. **From Backup**:
   ```bash
   # Restore from backup file
   psql -d your_database -f backups/backup-timestamp.sql
   ```

2. **Manual Cleanup**:
   ```sql
   -- Drop tables in reverse dependency order
   DROP TABLE IF EXISTS chat_messages CASCADE;
   DROP TABLE IF EXISTS chat_conversations CASCADE;
   DROP TABLE IF EXISTS study_chat_memory CASCADE;
   DROP TABLE IF EXISTS memory_summaries CASCADE;
   DROP TABLE IF EXISTS api_usage_logs CASCADE;
   DROP TABLE IF EXISTS ai_system_prompts CASCADE;
   DROP TABLE IF EXISTS student_ai_profile CASCADE;
   ```

---

## Development Guide

### Adding New Tables

1. **Create Migration**:
   ```sql
   CREATE TABLE your_new_table (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

2. **Set Up RLS**:
   ```sql
   ALTER TABLE your_new_table ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Users can manage their own data" ON your_new_table
     FOR ALL USING (auth.uid() = user_id);
   ```

3. **Create Indexes**:
   ```sql
   CREATE INDEX idx_your_new_table_user_id ON your_new_table(user_id);
   ```

4. **Update TypeScript Types**:
   ```typescript
   // src/types/database-ai.ts
   export interface YourNewTable {
     id: string;
     user_id: string;
     created_at: string;
   }
   ```

5. **Add Query Methods**:
   ```typescript
   // src/lib/database/queries.ts
   export class YourNewTableQueries {
     static async getData(userId: string) {
       return await supabase.from('your_new_table').select('*').eq('user_id', userId);
     }
   }
   ```

### Adding Vector Search

1. **Add Vector Column**:
   ```sql
   ALTER TABLE your_table ADD COLUMN embedding vector(1536);
   ```

2. **Create Vector Index**:
   ```sql
   CREATE INDEX idx_your_table_embedding ON your_table 
   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
   ```

3. **Add Search Function**:
   ```sql
   CREATE OR REPLACE FUNCTION find_similar_data(
     p_user_id UUID,
     p_embedding vector(1536),
     p_limit INTEGER DEFAULT 5
   ) RETURNS TABLE (id UUID, content TEXT, similarity FLOAT) AS $$
   BEGIN
     RETURN QUERY
     SELECT yt.id, yt.content, 1 - (yt.embedding <=> p_embedding) as similarity
     FROM your_table yt
     WHERE yt.user_id = p_user_id AND yt.embedding IS NOT NULL
     ORDER BY yt.embedding <=> p_embedding
     LIMIT p_limit;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

---

## Maintenance & Operations

### Automated Maintenance

The system includes automated cleanup and optimization:

```sql
-- Run maintenance tasks
SELECT * FROM run_maintenance_tasks();

-- Clean expired memories
SELECT clean_expired_memory();

-- Generate summaries
SELECT generate_memory_summaries();
```

### Performance Monitoring

1. **Query Performance**:
   ```sql
   -- Slow queries
   SELECT query, mean_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC LIMIT 10;
   
   -- Index usage
   SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
   FROM pg_stat_user_indexes
   ORDER BY idx_scan DESC;
   ```

2. **Storage Monitoring**:
   ```sql
   -- Table sizes
   SELECT 
     schemaname, tablename,
     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
   FROM pg_tables
   WHERE schemaname = 'public'
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
   ```

### Data Lifecycle Management

1. **Memory Expiration**: Automatic cleanup after 8 months
2. **Summary Rotation**: Weekly/monthly summaries expire after 1-3 months
3. **API Log Cleanup**: Consider archiving logs older than 6 months

---

## Troubleshooting

### Common Issues

#### 1. Vector Search Not Working

**Symptoms**: `find_similar_memories` returns no results or errors

**Solutions**:
- Verify vector extension is enabled
- Check embeddings are proper 1536-dimensional arrays
- Ensure vector index is created
- Verify similarity threshold isn't too high

```sql
-- Check extension
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Test embedding dimension
SELECT array_length(embedding, 1) FROM study_chat_memory LIMIT 1;
```

#### 2. RLS Policy Errors

**Symptoms**: Access denied errors or unexpected data visibility

**Solutions**:
- Verify RLS is enabled: `SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'your_table';`
- Check policies exist: `SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'your_table';`
- Test with service role key for administrative access

#### 3. Performance Issues

**Symptoms**: Slow queries, high latency

**Solutions**:
- Run `ANALYZE` on tables after bulk operations
- Check index usage statistics
- Consider adding more specific indexes
- Monitor vector search performance

#### 4. Migration Failures

**Symptoms**: Tables not created, missing functions

**Solutions**:
- Check extension dependencies
- Verify user permissions
- Run migrations in correct order
- Check for syntax errors in SQL files

### Debug Tools

1. **Migration Validation**:
   ```bash
   node run-migrations.js --validate
   node src/lib/migrations/master-migration.js --dry-run
   ```

2. **Database Testing**:
   ```bash
   node src/lib/database/validation-tests.js
   ```

3. **Manual SQL Testing**:
   ```sql
   -- Test RLS
   SET ROLE authenticated;
   SELECT * FROM chat_conversations; -- Should only return user data
   
   -- Test functions
   SELECT log_api_usage('uuid', 'test_feature', 'groq', 'llama-3.1-70b', 100, 50, 1000, true, null);
   
   -- Test vector search (requires actual embeddings)
   SELECT find_similar_memories('user_uuid', '[0.1,0.2,...]'::vector, 5, 0.7);
   ```

---

## Best Practices

### Development

1. **Always use TypeScript** for type safety
2. **Leverage query classes** instead of raw Supabase calls
3. **Test with the validation scripts** before deploying
4. **Use the integration layer** for complex operations
5. **Monitor API usage** for cost optimization

### Database Design

1. **Use UUIDs** for all primary keys
2. **Enable RLS** on all user-scoped tables
3. **Add indexes** for frequent query patterns
4. **Use appropriate data types** (vector for embeddings)
5. **Set up automated cleanup** for expired data

### Performance

1. **Vector search**: Use appropriate similarity thresholds
2. **Pagination**: Always limit large result sets
3. **Index monitoring**: Regularly check index usage
4. **Query optimization**: Use EXPLAIN ANALYZE for slow queries

### Security

1. **Environment variables** for sensitive configuration
2. **Service role separation** for backend operations
3. **Input validation** on all user data
4. **Regular security audits** of RLS policies

---

## Support and Resources

### File Structure Reference

```
src/
├── lib/
│   ├── database/
│   │   ├── integration.ts           # Main integration class
│   │   ├── queries.ts              # Query utilities
│   │   └── validation-tests.js     # Test suite
│   └── migrations/
│       ├── create_ai_tables.sql    # Core table creation
│       ├── create_rls_policies.sql # Security policies
│       ├── create_indexes.sql      # Performance indexes
│       ├── create_automation_functions.sql # Functions & triggers
│       └── master-migration.js     # Single-run migration
├── types/
│   └── database-ai.ts              # TypeScript definitions
└── docs/
    └── AI_DATABASE_SYSTEM_DOCUMENTATION.md # This file
```

### Key Commands

```bash
# Migration and setup
node src/lib/migrations/master-migration.js --dry-run
node src/lib/database/validation-tests.js
node run-migrations.js --backup --validate

# Development
npm run dev                    # Start development server
npm test                      # Run tests
npm run lint                  # Code linting
```

---

*This documentation is maintained alongside the codebase. For updates or questions, refer to the source code comments and implementation files.*