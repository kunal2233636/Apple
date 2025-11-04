# AI Study Assistant Database System

## 📋 Overview

This document provides comprehensive documentation for the AI Study Assistant Database System, a complete Supabase-based solution for managing chat conversations, study memory with vector search, API usage tracking, and personalized student profiles.

## 🏗️ System Architecture

### Database Schema Overview

The system consists of 7 interconnected tables designed to handle:

- **Chat Conversations & Messages**: Store user conversations with AI models
- **Study Memory with Vector Search**: Persist learning insights with embeddings for semantic search
- **Memory Summaries**: Auto-generated weekly/monthly summaries
- **Student Profiles**: Personalized AI coaching data
- **API Usage Tracking**: Monitor costs, performance, and usage patterns
- **System Prompts**: Manage AI model configurations and responses

### Technology Stack

- **Database**: PostgreSQL with Supabase
- **Extensions**: pgcrypto, vector (pgvector)
- **Security**: Row Level Security (RLS)
- **Performance**: Optimized indexes including vector search
- **API**: RESTful with Supabase client
- **Types**: TypeScript integration

## 📊 Database Tables

### 1. chat_conversations

Stores chat conversation metadata and session information.

```sql
CREATE TABLE chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    chat_type TEXT NOT NULL CHECK (chat_type IN ('general', 'study_assistant')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_archived BOOLEAN DEFAULT false
);
```

**Key Features:**
- Links to authenticated users via auth.users
- Supports conversation categorization
- Automatic timestamp management
- Archive functionality for data retention

### 2. chat_messages

Stores individual messages within conversations with rich metadata.

```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    model_used TEXT,
    provider_used TEXT,
    tokens_used INTEGER DEFAULT 0,
    latency_ms INTEGER,
    context_included BOOLEAN DEFAULT false,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Key Features:**
- Message role tracking (user/assistant)
- AI model and provider metadata
- Performance monitoring (latency, tokens)
- Context inclusion tracking

### 3. study_chat_memory

Core memory storage with vector embeddings for semantic search.

```sql
CREATE TABLE study_chat_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536),  -- Cohere embeddings
    importance_score INTEGER NOT NULL CHECK (importance_score BETWEEN 1 AND 5),
    tags TEXT[],
    source_conversation_id UUID REFERENCES chat_conversations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '8 months'),
    is_active BOOLEAN DEFAULT true
);
```

**Key Features:**
- Vector embeddings for semantic search
- Importance scoring system
- Tag-based categorization
- Automatic expiration (8 months)
- Source tracking for context

### 4. memory_summaries

Auto-generated summaries of memory content.

```sql
CREATE TABLE memory_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    summary_type TEXT NOT NULL CHECK (summary_type IN ('weekly', 'monthly')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    summary_text TEXT NOT NULL CHECK (length(summary_text) <= 500),
    token_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);
```

**Key Features:**
- Weekly and monthly summaries
- Fixed-length summaries for UI consistency
- Token counting for cost tracking

### 5. student_ai_profile

Personalized student data for AI coaching.

```sql
CREATE TABLE student_ai_profile (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_text TEXT NOT NULL CHECK (length(profile_text) <= 200),
    strong_subjects TEXT[],
    weak_subjects TEXT[],
    learning_style TEXT,
    exam_target TEXT,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Key Features:**
- Compressed profile for AI context
- Subject strength/weakness tracking
- Learning style preferences
- Exam goal tracking

### 6. api_usage_logs

Comprehensive API usage tracking for cost monitoring.

```sql
CREATE TABLE api_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    feature_name TEXT NOT NULL,
    provider_used TEXT NOT NULL,
    model_used TEXT NOT NULL,
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    latency_ms INTEGER,
    cached BOOLEAN DEFAULT false,
    cost_estimate DECIMAL(10,4) DEFAULT 0.0000,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    success BOOLEAN DEFAULT true,
    error_message TEXT
);
```

**Key Features:**
- Detailed usage metrics
- Automatic cost calculation
- Performance monitoring
- Error tracking

### 7. ai_system_prompts

Manages AI model configurations and prompts.

```sql
CREATE TABLE ai_system_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    system_prompt TEXT NOT NULL,
    language TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Key Features:**
- Version control for prompts
- Multi-language support
- Active/inactive status management

## 🔐 Security Model

### Row Level Security (RLS) Policies

All tables implement strict RLS policies ensuring users only access their own data:

#### Per-User Data Protection
- **chat_conversations**: Users see only their conversations
- **chat_messages**: Users see messages from their conversations
- **study_chat_memory**: Users see only their memory
- **memory_summaries**: Users see only their summaries
- **student_ai_profile**: Users see only their profile
- **api_usage_logs**: Users see only their usage logs

#### Admin Access
- **ai_system_prompts**: All users can read, only admins can modify

### Authentication Flow

1. **User Authentication**: Supabase Auth handles user sessions
2. **RLS Enforcement**: PostgreSQL enforces data isolation
3. **Service Role**: Backend operations use service role for admin functions
4. **Client-Side**: Anonymous keys for client operations (RLS-protected)

## 🚀 Performance Optimization

### Indexes Strategy

#### Primary Indexes
```sql
-- User-based queries
CREATE INDEX idx_chat_conversations_user_id ON chat_conversations(user_id);
CREATE INDEX idx_study_chat_memory_user_id ON study_chat_memory(user_id);

-- Time-based ordering
CREATE INDEX idx_chat_conversations_updated_at ON chat_conversations(updated_at DESC);
CREATE INDEX idx_chat_messages_timestamp ON chat_messages(timestamp DESC);

-- Conversation relationships
CREATE INDEX idx_chat_messages_conversation_timestamp ON chat_messages(conversation_id, timestamp DESC);
```

#### Vector Search Index
```sql
-- Vector similarity search
CREATE INDEX idx_study_chat_memory_embedding 
ON study_chat_memory USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);
```

#### Specialized Indexes
```sql
-- Active memory optimization
CREATE INDEX idx_study_chat_memory_active 
ON study_chat_memory(user_id, importance_score, created_at DESC) 
WHERE is_active = true;

-- Tag-based filtering
CREATE INDEX idx_study_chat_memory_tags 
ON study_chat_memory USING GIN(tags);
```

### Query Optimization

- **Composite indexes** for common query patterns
- **Partial indexes** for filtered queries (active records only)
- **GIN indexes** for array operations (tags)
- **Vector indexes** for similarity search

## ⚡ Database Functions

### Memory Management

#### `clean_expired_memory()`
Removes expired memory records automatically.

```sql
SELECT clean_expired_memory();
```

#### `generate_memory_summaries()`
Creates weekly and monthly summaries for all users.

```sql
SELECT generate_memory_summaries();
```

#### `find_similar_memories(user_id, embedding, limit, min_similarity)`
Performs vector similarity search.

```sql
SELECT * FROM find_similar_memories(
    'user-uuid',
    '[0.1, 0.2, ...]',  -- 1536 dimensions
    5,                  -- limit results
    0.7                 -- minimum similarity
);
```

### Chat Management

#### `create_chat_conversation(user_id, title, chat_type)`
Creates a new conversation.

```sql
SELECT create_chat_conversation(
    'user-uuid',
    'Math Study Session',
    'study_assistant'
);
```

#### `add_chat_message(conversation_id, role, content, metadata)`
Adds a message to a conversation.

```sql
SELECT add_chat_message(
    'conversation-uuid',
    'assistant',
    'Let me help you with calculus...',
    '{
        "model_used": "llama-3.1-70b",
        "provider_used": "groq",
        "tokens_used": 150,
        "latency_ms": 1200
    }'
);
```

### API Usage Tracking

#### `log_api_usage(user_id, feature_name, provider, model, metrics)`
Logs API usage with automatic cost calculation.

```sql
SELECT log_api_usage(
    'user-uuid',
    'general_chat',
    'groq',
    'llama-3.1-70b',
    '{
        "tokens_input": 50,
        "tokens_output": 150,
        "latency_ms": 1200,
        "success": true
    }'
);
```

### Maintenance Operations

#### `run_maintenance_tasks()`
Runs all scheduled maintenance tasks.

```sql
SELECT * FROM run_maintenance_tasks();
-- Returns: task_name, records_affected
```

## 🔄 Data Lifecycle Management

### Memory Expiration
- **Default TTL**: 8 months for study memory
- **Cleanup**: Automatic via `clean_expired_memory()` function
- **Retention**: Configurable per memory type

### Summary Generation
- **Weekly**: Generated every 7 days
- **Monthly**: Generated every 30 days
- **Expiration**: 1 month for weekly, 3 months for monthly

### Maintenance Schedule
```javascript
// Recommended cron jobs (external scheduler):
// Daily: clean_expired_memory()
// Weekly: generate_memory_summaries()
// Monthly: run_maintenance_tasks()
```

## 🛠️ Migration Guide

### Prerequisites
1. **Supabase Project**: Set up with database access
2. **Environment Variables**: Configure Supabase URL and keys
3. **Extensions**: Enable pgcrypto and vector extensions

### Migration Process

#### Option 1: Automated Migration
```bash
cd src/lib/migrations
node run-ai-migrations.js
```

#### Option 2: Manual Migration
1. Execute `create_ai_tables.sql` in Supabase SQL Editor
2. Execute `create_rls_policies.sql`
3. Execute `create_indexes.sql`
4. Execute `create_automation_functions.sql`

#### Option 3: TypeScript Integration
```typescript
import { runMigrations } from './migrations/run-ai-migrations.js';

await runMigrations();
```

### Validation
```bash
node test-ai-database.js
```

## 💻 TypeScript Integration

### Database Types
```typescript
// Import types
import type {
  ChatConversation,
  StudyChatMemory,
  APIUsageStats,
  VectorSearchOptions
} from '@/types/database-ai';
```

### Query Utilities
```typescript
import { 
  ChatQueries, 
  MemoryQueries, 
  ProfileQueries 
} from '@/lib/database/queries';

// Create conversation
const conversation = await ChatQueries.createConversation(
  userId, 
  'Study Session', 
  'study_assistant'
);

// Add memory with vector
const memory = await MemoryQueries.addMemory(
  userId,
  ' photosynthesis converts light energy to chemical energy',
  embedding, // 1536-dimensional array
  5, // importance score
  { tags: ['biology', 'chemistry'] }
);

// Find similar memories
const similar = await MemoryQueries.findSimilarMemories(
  userId,
  queryEmbedding,
  { limit: 5, min_similarity: 0.8 }
);
```

### Error Handling
```typescript
try {
  const result = await ChatQueries.createConversation(userId, title);
} catch (error) {
  if (error instanceof DatabaseError) {
    console.error('Database error:', error.message);
  } else if (error instanceof SecurityError) {
    console.error('Access denied:', error.message);
  }
}
```

## 📊 Monitoring & Analytics

### API Usage Statistics
```typescript
const stats = await APIUsageQueries.getUsageStats(userId, {
  days: 30,
  provider: 'groq'
});

console.log({
  total_calls: stats.total_calls,
  total_cost: stats.total_cost,
  success_rate: stats.success_rate,
  provider_breakdown: stats.provider_breakdown
});
```

### Chat Analytics
```typescript
const chatStats = await StatsQueries.getChatStats(userId, 30);
console.log({
  total_conversations: chatStats.total_conversations,
  average_length: chatStats.average_conversation_length,
  model_usage: chatStats.most_used_models
});
```

### Memory Insights
```typescript
const memoryStats = await StatsQueries.getMemoryStats(userId);
console.log({
  total_memories: memoryStats.total_memories,
  average_importance: memoryStats.average_importance,
  top_tags: memoryStats.top_tags
});
```

## 🔧 Configuration

### Environment Variables
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Vector Embeddings
COHERE_API_KEY=your_cohere_key

# API Provider Keys
GROQ_API_KEY=your_groq_key
GEMINI_API_KEY=your_gemini_key
```

### Rate Limiting
```javascript
// Recommended rate limits per user
const RATE_LIMITS = {
  general_chat: { requests: 100, window: '1h' },
  vector_search: { requests: 50, window: '1h' },
  memory_storage: { requests: 1000, window: '1h' }
};
```

## 🧪 Testing

### Unit Tests
```bash
# Run database tests
npm run test:database

# Run migration tests  
npm run test:migrations
```

### Integration Tests
```typescript
// Test vector search functionality
const testVectorSearch = async () => {
  const embedding = generateTestEmbedding();
  const results = await MemoryQueries.findSimilarMemories(
    testUserId, 
    embedding, 
    { limit: 5 }
  );
  expect(results).toHaveLength(5);
  expect(results[0].similarity).toBeGreaterThan(0.7);
};
```

### Load Testing
```bash
# Test concurrent users
artillery run load-test-config.yml

# Test vector search performance
pgbench -d database_name -f vector-search-test.sql
```

## 📈 Performance Tuning

### Vector Search Optimization
```sql
-- Rebuild vector index for better performance
REINDEX INDEX idx_study_chat_memory_embedding;

-- Analyze table statistics
ANALYZE study_chat_memory;
```

### Query Performance
```sql
-- Enable query plan analysis
EXPLAIN ANALYZE SELECT * FROM find_similar_memories(...);

-- Monitor slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

### Memory Management
```sql
-- Monitor memory usage
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE tablename LIKE '%memory%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 🛡️ Backup & Recovery

### Backup Strategy
```bash
# Daily backup of entire database
pg_dump supabase_db > backup_$(date +%Y%m%d).sql

# Selective backup of AI tables
pg_dump -t chat_conversations -t study_chat_memory supabase_db > ai_backup.sql
```

### Recovery Procedures
```bash
# Restore from backup
psql supabase_db < backup_20241102.sql

# Point-in-time recovery (requires WAL archiving)
pg_restore --target-time="2024-11-02 12:00:00" backup_file
```

### Data Export/Import
```sql
-- Export study memory for analysis
COPY study_chat_memory TO '/tmp/memory_export.csv' CSV HEADER;

-- Import vector embeddings
COPY study_chat_memory(embedding) FROM '/tmp/embeddings.csv';
```

## 🚨 Troubleshooting

### Common Issues

#### Vector Search Not Working
```sql
-- Check if vector extension is enabled
SELECT extname FROM pg_extension WHERE extname = 'vector';

-- Verify vector index exists
SELECT indexname FROM pg_indexes WHERE indexname = 'idx_study_chat_memory_embedding';
```

#### RLS Policy Issues
```sql
-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables WHERE tablename IN ('chat_conversations', 'study_chat_memory');

-- Test policy
SET role authenticated;
SELECT * FROM chat_conversations WHERE user_id = auth.uid();
```

#### Performance Issues
```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan 
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM study_chat_memory WHERE user_id = 'uuid';
```

### Debug Mode
```typescript
// Enable detailed logging
import { enableDebugLogging } from '@/lib/database/queries';

enableDebugLogging();

// Query debugging
const result = await MemoryQueries.findSimilarMemories(userId, embedding);
// Check console for detailed query logs
```

## 📚 API Reference

### Chat Operations
```typescript
// Create conversation
ChatQueries.createConversation(userId: string, title: string, type?: string)

// Get user conversations  
ChatQueries.getUserConversations(userId: string, options?: QueryOptions)

// Add message
MessageQueries.addMessage(conversationId: string, role: string, content: string)
```

### Memory Operations
```typescript
// Add memory with embedding
MemoryQueries.addMemory(userId: string, content: string, embedding: number[], importance: number)

// Find similar memories
MemoryQueries.findSimilarMemories(userId: string, embedding: number[], options?: VectorSearchOptions)

// Get user memories
MemoryQueries.getUserMemories(userId: string, options?: QueryOptions)
```

### Profile Operations
```typescript
// Get student profile
ProfileQueries.getProfile(userId: string)

// Upsert profile
ProfileQueries.upsertProfile(userId: string, profileData: ProfileData)
```

### System Operations
```typescript
// Get active prompts
PromptQueries.getActivePrompts()

// Get specific prompt
PromptQueries.getPromptByName(name: string)

// Run maintenance
MaintenanceQueries.runMaintenanceTasks()
```

## 🔮 Future Enhancements

### Planned Features
- **Real-time subscriptions** for live chat updates
- **Advanced analytics** with data visualization
- **Machine learning** model training on user data
- **Multi-tenant support** for institutional deployments
- **Advanced vector search** with hybrid algorithms

### Performance Improvements
- **Connection pooling** for high-traffic scenarios
- **Caching layer** with Redis for frequent queries
- **Database sharding** for horizontal scaling
- **Read replicas** for analytical workloads

## 📞 Support

### Getting Help
- **Documentation**: This file and inline code comments
- **Issues**: Create GitHub issues for bugs or feature requests
- **Community**: Join our Discord for discussions
- **Professional Support**: Contact for enterprise support

### Contributing
1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Run the test suite
5. Submit a pull request

---

**Version**: 1.0.0  
**Last Updated**: November 2, 2024  
**Maintained By**: AI Study Assistant Team