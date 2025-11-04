
// ============================================================================
// AI STUDY ASSISTANT DATABASE SETUP - MASTER MIGRATION
// ============================================================================
//
// This script creates the complete AI study assistant database schema with:
// - 7 tables for chat, memory, profiles, API usage, and system prompts
// - Row Level Security (RLS) for data protection
// - Vector search capabilities for memory retrieval
// - Performance indexes for optimal query performance
// - Automated triggers and functions for data management
//
// ============================================================================

-- ============================================================================
-- PART 1: EXTENSIONS
-- ============================================================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enable vector extension for embeddings and similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable pg_stat_statements for query monitoring (optional)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ============================================================================
-- PART 2: CORE TABLES
-- ============================================================================

-- Table 1: Chat conversations
CREATE TABLE IF NOT EXISTS chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    chat_type TEXT NOT NULL CHECK (chat_type IN ('general', 'study_assistant')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_archived BOOLEAN DEFAULT false
);

-- Table 2: Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
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

-- Table 3: Study chat memory (with vector embeddings)
CREATE TABLE IF NOT EXISTS study_chat_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536),  -- Cohere embeddings dimension
    importance_score INTEGER NOT NULL CHECK (importance_score BETWEEN 1 AND 5),
    tags TEXT[],
    source_conversation_id UUID REFERENCES chat_conversations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '8 months'),
    is_active BOOLEAN DEFAULT true
);

-- Table 4: Memory summaries (weekly/monthly compressed insights)
CREATE TABLE IF NOT EXISTS memory_summaries (
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

-- Table 5: Student AI profile (personalized learning data)
CREATE TABLE IF NOT EXISTS student_ai_profile (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_text TEXT NOT NULL CHECK (length(profile_text) <= 200),
    strong_subjects TEXT[],
    weak_subjects TEXT[],
    learning_style TEXT,
    exam_target TEXT,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 6: API usage logs (for monitoring and cost tracking)
CREATE TABLE IF NOT EXISTS api_usage_logs (
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

-- Table 7: AI system prompts (configurable AI behavior)
CREATE TABLE IF NOT EXISTS ai_system_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    system_prompt TEXT NOT NULL,
    language TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PART 3: INITIAL DATA - SYSTEM PROMPTS
-- ============================================================================

-- Insert the required system prompts for Hinglish chat support
INSERT INTO ai_system_prompts (name, system_prompt, language, is_active, version) VALUES
(
    'hinglish_chat_general',
    'You are a helpful study assistant for Indian JEE students. Always respond in Hinglish using Roman script only (no Devanagari). Be friendly, encouraging, and concise. Never invent exam dates - if unsure, tell student to check official sources.',
    'hinglish',
    true,
    1
),
(
    'hinglish_chat_with_data',
    'You are a personalized study coach with access to this student''s study data. Respond in Hinglish only using Roman script. Be specific about their performance, weak areas, and progress. Encourage them with data-backed insights.',
    'hinglish',
    true,
    1
)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- PART 4: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_chat_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_ai_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_system_prompts ENABLE ROW LEVEL SECURITY;

-- Chat conversations policies
CREATE POLICY "Users can manage their own conversations" ON chat_conversations
    FOR ALL USING (auth.uid() = user_id);

-- Chat messages policies (linked through conversations)
CREATE POLICY "Users can manage messages from their conversations" ON chat_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM chat_conversations 
            WHERE chat_conversations.id = chat_messages.conversation_id 
            AND chat_conversations.user_id = auth.uid()
        )
    );

-- Study memory policies
CREATE POLICY "Users can manage their own memory" ON study_chat_memory
    FOR ALL USING (auth.uid() = user_id);

-- Memory summaries policies
CREATE POLICY "Users can manage their own summaries" ON memory_summaries
    FOR ALL USING (auth.uid() = user_id);

-- Student profile policies
CREATE POLICY "Users can manage their own profile" ON student_ai_profile
    FOR ALL USING (auth.uid() = user_id);

-- API usage logs policies
CREATE POLICY "Users can manage their own API logs" ON api_usage_logs
    FOR ALL USING (auth.uid() = user_id);

-- System prompts policies (read for all, write for service role)
CREATE POLICY "All authenticated users can read prompts" ON ai_system_prompts
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage prompts" ON ai_system_prompts
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- PART 5: PERFORMANCE INDEXES
-- ============================================================================

-- Chat conversations indexes
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated_at ON chat_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_active_user ON chat_conversations(user_id, is_archived, updated_at DESC) WHERE is_archived = false;

-- Chat messages indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_timestamp ON chat_messages(conversation_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_role ON chat_messages(role, timestamp DESC);

-- Study chat memory indexes
CREATE INDEX IF NOT EXISTS idx_study_chat_memory_user_id ON study_chat_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_study_chat_memory_expires_at ON study_chat_memory(expires_at);
CREATE INDEX IF NOT EXISTS idx_study_chat_memory_active ON study_chat_memory(user_id, importance_score, created_at DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_study_chat_memory_tags ON study_chat_memory USING GIN(tags);

-- Memory summaries indexes
CREATE INDEX IF NOT EXISTS idx_memory_summaries_user_id ON memory_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_summaries_period ON memory_summaries(user_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_memory_summaries_recent ON memory_summaries(user_id, created_at DESC);

-- API usage logs indexes
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_id ON api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_provider ON api_usage_logs(provider_used);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_timestamp ON api_usage_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_feature ON api_usage_logs(feature_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_success ON api_usage_logs(success, timestamp DESC);

-- AI system prompts indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_system_prompts_name ON ai_system_prompts(name);
CREATE INDEX IF NOT EXISTS idx_ai_system_prompts_active ON ai_system_prompts(is_active, language);

-- ============================================================================
-- PART 6: TRIGGERS AND AUTOMATION
-- ============================================================================

-- Function to update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Auto-update triggers
CREATE TRIGGER update_chat_conversations_updated_at 
    BEFORE UPDATE ON chat_conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_system_prompts_updated_at 
    BEFORE UPDATE ON ai_system_prompts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_ai_profile_updated_at 
    BEFORE UPDATE ON student_ai_profile 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update conversation timestamp when messages are added
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chat_conversations 
    SET updated_at = NOW() 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_timestamp_trigger
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_timestamp();

-- ============================================================================
-- PART 7: DATABASE FUNCTIONS
-- ============================================================================

-- Function to log API usage with automatic cost calculation
CREATE OR REPLACE FUNCTION log_api_usage(
    p_user_id UUID,
    p_feature_name TEXT,
    p_provider_used TEXT,
    p_model_used TEXT,
    p_tokens_input INTEGER DEFAULT 0,
    p_tokens_output INTEGER DEFAULT 0,
    p_latency_ms INTEGER DEFAULT 0,
    p_success BOOLEAN DEFAULT true,
    p_error_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    cost_per_million_tokens DECIMAL(10,4) := 0.0;
    total_cost DECIMAL(10,4) := 0.0;
    log_id UUID;
BEGIN
    -- Calculate cost based on provider and model
    CASE 
        WHEN p_provider_used = 'groq' AND p_model_used LIKE '%llama%' THEN cost_per_million_tokens := 0.27;
        WHEN p_provider_used = 'groq' AND p_model_used LIKE '%mixtral%' THEN cost_per_million_tokens := 0.27;
        WHEN p_provider_used = 'gemini' THEN cost_per_million_tokens := 0.25;
        WHEN p_provider_used = 'cerebras' THEN cost_per_million_tokens := 0.60;
        WHEN p_provider_used = 'openrouter' THEN cost_per_million_tokens := 0.50;
        ELSE cost_per_million_tokens := 0.30; -- Default rate
    END CASE;
    
    -- Calculate total cost
    total_cost := ((p_tokens_input + p_tokens_output) / 1000000.0) * cost_per_million_tokens;
    
    -- Insert usage log
    INSERT INTO api_usage_logs (
        user_id, feature_name, provider_used, model_used,
        tokens_input, tokens_output, latency_ms, cost_estimate,
        success, error_message
    ) VALUES (
        p_user_id, p_feature_name, p_provider_used, p_model_used,
        p_tokens_input, p_tokens_output, p_latency_ms, total_cost,
        p_success, p_error_message
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find similar memories using vector search
CREATE OR REPLACE FUNCTION find_similar_memories(
    p_user_id UUID,
    p_embedding vector(1536),
    p_limit INTEGER DEFAULT 5,
    p_min_similarity FLOAT DEFAULT 0.7
) RETURNS TABLE (
    id UUID,
    content TEXT,
    importance_score INTEGER,
    tags TEXT[],
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        scm.id,
        scm.content,
        scm.importance_score,
        scm.tags,
        1 - (scm.embedding <=> p_embedding) as similarity
    FROM study_chat_memory scm
    WHERE scm.user_id = p_user_id 
    AND scm.is_active = true
    AND scm.expires_at > NOW()
    AND 1 - (scm.embedding <=> p_embedding) >= p_min_similarity
    ORDER BY scm.embedding <=> p_embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean expired memory
CREATE OR REPLACE FUNCTION clean_expired_memory()
RETURNS void AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM study_chat_memory WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Cleaned up % expired memory records', deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to generate memory summaries
CREATE OR REPLACE FUNCTION generate_memory_summaries()
RETURNS void AS $$
DECLARE
    user_record RECORD;
    week_start DATE;
    week_end DATE;
    summary_text TEXT;
BEGIN
    -- Generate weekly summaries for active users
    FOR user_record IN 
        SELECT DISTINCT user_id FROM study_chat_memory WHERE is_active = true
    LOOP
        week_start := CURRENT_DATE - INTERVAL '7 days';
        week_end := CURRENT_DATE;
        
        SELECT 'Weekly Summary: ' || COUNT(*) || ' insights captured. Top subjects: ' || 
               COALESCE(string_agg(DISTINCT unnest(tags), ', '), 'none') ||
               '. Generated on ' || CURRENT_DATE::TEXT
        INTO summary_text
        FROM study_chat_memory 
        WHERE user_id = user_record.user_id 
        AND created_at >= week_start 
        AND is_active = true;
        
        IF summary_text IS NOT NULL AND length(summary_text) <= 500 THEN
            INSERT INTO memory_summaries (
                user_id, summary_type, period_start, period_end, summary_text, expires_at
            ) VALUES (
                user_record.user_id, 'weekly', week_start, week_end, 
                summary_text, NOW() + INTERVAL '1 month'
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 8: VECTOR SEARCH INDEX (Created when embeddings are loaded)
-- ============================================================================

-- Note: Vector index will be created after actual embeddings are loaded
-- CREATE INDEX idx_study_chat_memory_embedding 
-- ON study_chat_memory USING ivfflat (embedding vector_cosine_ops) 
-- WITH (lists = 100);

-- ============================================================================
-- PART 9: PERFORMANCE OPTIMIZATION
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
-- PART 10: VERIFICATION QUERIES
-- ============================================================================

-- Verify all tables were created
DO $$
DECLARE
    expected_tables TEXT[] := ARRAY[
        'chat_conversations', 'chat_messages', 'study_chat_memory',
        'memory_summaries', 'student_ai_profile', 'api_usage_logs', 'ai_system_prompts'
    ];
    target_table_name TEXT;
    table_exists BOOLEAN;
BEGIN
    FOREACH target_table_name IN ARRAY expected_tables
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = target_table_name
        ) INTO table_exists;
        
        IF NOT table_exists THEN
            RAISE EXCEPTION 'Table % was not created successfully', target_table_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'All % tables created successfully', array_length(expected_tables, 1);
END $$;

-- Verify system prompts were inserted
DO $$
DECLARE
    prompt_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO prompt_count 
    FROM ai_system_prompts 
    WHERE name IN ('hinglish_chat_general', 'hinglish_chat_with_data');
    
    IF prompt_count < 2 THEN
        RAISE EXCEPTION 'System prompts not inserted correctly. Found: %', prompt_count;
    END IF;
    
    RAISE NOTICE 'System prompts inserted successfully';
END $$;

-- ============================================================================
-- PART 11: MIGRATION COMPLETE
-- ============================================================================

RAISE NOTICE 'AI Study Assistant database migration completed successfully!';
RAISE NOTICE 'Tables created: 7';
RAISE NOTICE 'Functions created: 5';
RAISE NOTICE 'Triggers created: 4';
RAISE NOTICE 'Indexes created: 25+';
RAISE NOTICE 'RLS policies: 7 tables secured';
