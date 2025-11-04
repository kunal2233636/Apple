-- ============================================================================
-- AI STUDY ASSISTANT DATABASE SETUP - PART 3: PERFORMANCE INDEXES
-- ============================================================================

-- ============================================================================
-- CHAT_CONVERSATIONS INDEXES
-- ============================================================================

-- User-based queries
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id 
ON chat_conversations(user_id);

-- Recent conversations ordering
CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated_at 
ON chat_conversations(updated_at DESC);

-- Combined filter for active conversations
CREATE INDEX IF NOT EXISTS idx_chat_conversations_active_user 
ON chat_conversations(user_id, is_archived, updated_at DESC) 
WHERE is_archived = false;

-- ============================================================================
-- CHAT_MESSAGES INDEXES
-- ============================================================================

-- Message retrieval by conversation
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id 
ON chat_messages(conversation_id);

-- Message ordering by timestamp
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp 
ON chat_messages(timestamp DESC);

-- Efficient conversation + timestamp ordering
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_timestamp 
ON chat_messages(conversation_id, timestamp DESC);

-- Performance for message filtering by role
CREATE INDEX IF NOT EXISTS idx_chat_messages_role 
ON chat_messages(role, timestamp DESC);

-- ============================================================================
-- STUDY_CHAT_MEMORY INDEXES
-- ============================================================================

-- User-based memory queries
CREATE INDEX IF NOT EXISTS idx_study_chat_memory_user_id 
ON study_chat_memory(user_id);

-- Expired memory cleanup
CREATE INDEX IF NOT EXISTS idx_study_chat_memory_expires_at 
ON study_chat_memory(expires_at);

-- Active memory queries (partial index for performance)
CREATE INDEX IF NOT EXISTS idx_study_chat_memory_active 
ON study_chat_memory(user_id, importance_score, created_at DESC) 
WHERE is_active = true;

-- Tag-based filtering
CREATE INDEX IF NOT EXISTS idx_study_chat_memory_tags 
ON study_chat_memory USING GIN(tags);

-- Vector index for embeddings (created after data is loaded)
-- Note: This will be created separately when embeddings are inserted

-- ============================================================================
-- MEMORY_SUMMARIES INDEXES
-- ============================================================================

-- User-based summary queries
CREATE INDEX IF NOT EXISTS idx_memory_summaries_user_id 
ON memory_summaries(user_id);

-- Period-based queries
CREATE INDEX IF NOT EXISTS idx_memory_summaries_period 
ON memory_summaries(user_id, period_start, period_end);

-- Recent summaries
CREATE INDEX IF NOT EXISTS idx_memory_summaries_recent 
ON memory_summaries(user_id, created_at DESC);

-- Summary type filtering
CREATE INDEX IF NOT EXISTS idx_memory_summaries_type 
ON memory_summaries(summary_type, user_id, period_start);

-- ============================================================================
-- STUDENT_AI_PROFILE INDEXES
-- ============================================================================

-- Note: user_id is already primary key, no additional indexes needed

-- ============================================================================
-- API_USAGE_LOGS INDEXES
-- ============================================================================

-- User-based usage analysis
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_id 
ON api_usage_logs(user_id);

-- Provider-based filtering
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_provider 
ON api_usage_logs(provider_used);

-- Time-based usage tracking
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_timestamp 
ON api_usage_logs(timestamp DESC);

-- Feature-based analysis
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_feature 
ON api_usage_logs(feature_name, timestamp DESC);

-- Success rate monitoring
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_success 
ON api_usage_logs(success, timestamp DESC);

-- Cost analysis
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_cost 
ON api_usage_logs(cost_estimate, timestamp DESC);

-- Combined feature and provider queries
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_feature_provider 
ON api_usage_logs(feature_name, provider_used, timestamp DESC);

-- ============================================================================
-- AI_SYSTEM_PROMPTS INDEXES
-- ============================================================================

-- Unique name lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_system_prompts_name 
ON ai_system_prompts(name);

-- Active prompts filtering
CREATE INDEX IF NOT EXISTS idx_ai_system_prompts_active 
ON ai_system_prompts(is_active, language);

-- Version tracking
CREATE INDEX IF NOT EXISTS idx_ai_system_prompts_version 
ON ai_system_prompts(name, version);

-- ============================================================================
-- VECTOR SEARCH INDEXES (Created after embeddings are loaded)
-- ============================================================================

-- Vector similarity search (for study_chat_memory embeddings)
-- This index will be created when we have actual embeddings
-- CREATE INDEX idx_study_chat_memory_embedding 
-- ON study_chat_memory USING ivfflat (embedding vector_cosine_ops) 
-- WITH (lists = 100);

-- ============================================================================
-- ADDITIONAL PERFORMANCE OPTIMIZATIONS
-- ============================================================================

-- Composite indexes for common query patterns

-- Chat messages by conversation and timestamp (useful for user-based queries)
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_timestamp_user
ON chat_messages(conversation_id, timestamp DESC);

-- Memory search by importance and recency
CREATE INDEX IF NOT EXISTS idx_study_chat_memory_importance_creation 
ON study_chat_memory(importance_score DESC, created_at DESC) 
WHERE is_active = true;

-- API usage analysis by user and feature
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_feature 
ON api_usage_logs(user_id, feature_name, timestamp DESC);

-- ============================================================================
-- INDEX MAINTENANCE AND STATISTICS
-- ============================================================================

-- Update statistics for better query planning
ANALYZE chat_conversations;
ANALYZE chat_messages;
ANALYZE study_chat_memory;
ANALYZE memory_summaries;
ANALYZE student_ai_profile;
ANALYZE api_usage_logs;
ANALYZE ai_system_prompts;

-- ============================================================================
-- INDEX VERIFICATION
-- ============================================================================

-- List all created indexes with sizes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN (
    'chat_conversations',
    'chat_messages', 
    'study_chat_memory',
    'memory_summaries',
    'student_ai_profile',
    'api_usage_logs',
    'ai_system_prompts'
)
ORDER BY tablename, indexname;

-- Check index usage statistics (run after some queries)
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes 
WHERE schemaname = 'public' 
AND tablename IN (
    'chat_conversations',
    'chat_messages', 
    'study_chat_memory',
    'memory_summaries',
    'student_ai_profile',
    'api_usage_logs',
    'ai_system_prompts'
)
ORDER BY idx_scan DESC;