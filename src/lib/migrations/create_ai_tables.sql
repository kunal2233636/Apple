-- ============================================================================
-- AI STUDY ASSISTANT DATABASE SETUP - PART 1: EXTENSIONS AND TABLES
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- TABLE 1: chat_conversations
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    chat_type TEXT NOT NULL CHECK (chat_type IN ('general', 'study_assistant')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_archived BOOLEAN DEFAULT false
);

-- ============================================================================
-- TABLE 2: chat_messages
-- ============================================================================
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

-- ============================================================================
-- TABLE 3: study_chat_memory
-- ============================================================================
CREATE TABLE IF NOT EXISTS study_chat_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536),
    importance_score INTEGER NOT NULL CHECK (importance_score BETWEEN 1 AND 5),
    tags TEXT[],
    source_conversation_id UUID REFERENCES chat_conversations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '8 months'),
    is_active BOOLEAN DEFAULT true
);

-- ============================================================================
-- TABLE 4: memory_summaries
-- ============================================================================
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

-- ============================================================================
-- TABLE 5: student_ai_profile
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_ai_profile (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_text TEXT NOT NULL CHECK (length(profile_text) <= 200),
    strong_subjects TEXT[],
    weak_subjects TEXT[],
    learning_style TEXT,
    exam_target TEXT,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE 6: api_usage_logs
-- ============================================================================
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

-- ============================================================================
-- TABLE 7: ai_system_prompts
-- ============================================================================
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
-- INITIAL DATA: SYSTEM PROMPTS
-- ============================================================================

-- Insert the two required system prompts
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
-- VALIDATION AND VERIFICATION
-- ============================================================================

-- Verify all tables were created
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
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
ORDER BY tablename;

-- Verify system prompts were inserted
SELECT name, language, is_active, version 
FROM ai_system_prompts 
ORDER BY name;