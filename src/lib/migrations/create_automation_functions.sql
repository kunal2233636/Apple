-- ============================================================================
-- AI STUDY ASSISTANT DATABASE SETUP - PART 4: TRIGGERS AND AUTOMATION
-- ============================================================================

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- CHAT_CONVERSATIONS TRIGGERS
-- ============================================================================

-- Auto-update updated_at for chat_conversations
DROP TRIGGER IF EXISTS update_chat_conversations_updated_at ON chat_conversations;
CREATE TRIGGER update_chat_conversations_updated_at 
    BEFORE UPDATE ON chat_conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- AI_SYSTEM_PROMPTS TRIGGERS  
-- ============================================================================

-- Auto-update updated_at for ai_system_prompts
DROP TRIGGER IF EXISTS update_ai_system_prompts_updated_at ON ai_system_prompts;
CREATE TRIGGER update_ai_system_prompts_updated_at 
    BEFORE UPDATE ON ai_system_prompts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STUDENT AI PROFILE TRIGGERS
-- ============================================================================

-- Auto-update last_updated for student_ai_profile
DROP TRIGGER IF EXISTS update_student_ai_profile_updated_at ON student_ai_profile;
CREATE TRIGGER update_student_ai_profile_updated_at 
    BEFORE UPDATE ON student_ai_profile 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DATA LIFECYCLE MANAGEMENT FUNCTIONS
-- ============================================================================

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
    month_start DATE;
    month_end DATE;
    summary_text TEXT;
    memory_count INTEGER;
BEGIN
    -- Process each user
    FOR user_record IN 
        SELECT DISTINCT user_id FROM study_chat_memory WHERE is_active = true
    LOOP
        -- Generate weekly summary (last 7 days)
        week_start := CURRENT_DATE - INTERVAL '7 days';
        week_end := CURRENT_DATE;
        
        SELECT 
            'Weekly Summary: ' || 
            COUNT(*) || ' insights captured. ' ||
            'Top subjects: ' || 
            string_agg(DISTINCT unnest(tags), ', ') ||
            '. Generated on ' || CURRENT_DATE::TEXT as summary,
            COUNT(*) as count
        INTO summary_text, memory_count
        FROM study_chat_memory 
        WHERE user_id = user_record.user_id 
        AND created_at >= week_start 
        AND is_active = true
        AND summary_text IS NOT NULL AND length(summary_text) <= 500;
        
        IF summary_text IS NOT NULL AND memory_count > 0 THEN
            INSERT INTO memory_summaries (
                user_id, 
                summary_type, 
                period_start, 
                period_end, 
                summary_text,
                expires_at
            ) VALUES (
                user_record.user_id,
                'weekly',
                week_start,
                week_end,
                summary_text,
                NOW() + INTERVAL '1 month'
            );
        END IF;
        
        -- Generate monthly summary (last 30 days)
        month_start := CURRENT_DATE - INTERVAL '30 days';
        month_end := CURRENT_DATE;
        
        SELECT 
            'Monthly Summary: ' || 
            COUNT(*) || ' total insights captured. ' ||
            'Most important areas: ' ||
            array_to_string(
                (SELECT array_agg(DISTINCT content) 
                 FROM study_chat_memory 
                 WHERE user_id = user_record.user_id 
                 AND importance_score >= 4 
                 AND created_at >= month_start 
                 LIMIT 3), 
                ', '
            ) ||
            '. Generated on ' || CURRENT_DATE::TEXT as summary,
            COUNT(*) as count
        INTO summary_text, memory_count
        FROM study_chat_memory 
        WHERE user_id = user_record.user_id 
        AND created_at >= month_start 
        AND is_active = true;
        
        IF summary_text IS NOT NULL AND memory_count > 0 THEN
            INSERT INTO memory_summaries (
                user_id, 
                summary_type, 
                period_start, 
                period_end, 
                summary_text,
                expires_at
            ) VALUES (
                user_record.user_id,
                'monthly',
                month_start,
                month_end,
                summary_text,
                NOW() + INTERVAL '3 months'
            );
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Generated summaries for % users', (SELECT COUNT(DISTINCT user_id) FROM study_chat_memory WHERE is_active = true);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- API USAGE TRACKING FUNCTIONS
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
    -- Calculate cost based on provider and model (example rates)
    CASE 
        WHEN p_provider_used = 'groq' AND p_model_used LIKE '%llama%' THEN
            cost_per_million_tokens := 0.27;
        WHEN p_provider_used = 'groq' AND p_model_used LIKE '%mixtral%' THEN
            cost_per_million_tokens := 0.27;
        WHEN p_provider_used = 'gemini' THEN
            cost_per_million_tokens := 0.25;
        WHEN p_provider_used = 'cerebras' THEN
            cost_per_million_tokens := 0.60;
        WHEN p_provider_used = 'openrouter' THEN
            cost_per_million_tokens := 0.50;
        ELSE
            cost_per_million_tokens := 0.30; -- Default rate
    END CASE;
    
    -- Calculate total cost
    total_cost := ((p_tokens_input + p_tokens_output) / 1000000.0) * cost_per_million_tokens;
    
    -- Insert usage log
    INSERT INTO api_usage_logs (
        user_id,
        feature_name,
        provider_used,
        model_used,
        tokens_input,
        tokens_output,
        latency_ms,
        cost_estimate,
        success,
        error_message
    ) VALUES (
        p_user_id,
        p_feature_name,
        p_provider_used,
        p_model_used,
        p_tokens_input,
        p_tokens_output,
        p_latency_ms,
        total_cost,
        p_success,
        p_error_message
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CHAT FUNCTIONS
-- ============================================================================

-- Function to create a new chat conversation
CREATE OR REPLACE FUNCTION create_chat_conversation(
    p_user_id UUID,
    p_title TEXT,
    p_chat_type TEXT DEFAULT 'general'
) RETURNS UUID AS $$
DECLARE
    conversation_id UUID;
BEGIN
    INSERT INTO chat_conversations (user_id, title, chat_type)
    VALUES (p_user_id, p_title, p_chat_type)
    RETURNING id INTO conversation_id;
    
    RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add a message to a conversation
CREATE OR REPLACE FUNCTION add_chat_message(
    p_conversation_id UUID,
    p_role TEXT,
    p_content TEXT,
    p_model_used TEXT DEFAULT NULL,
    p_provider_used TEXT DEFAULT NULL,
    p_tokens_used INTEGER DEFAULT 0,
    p_latency_ms INTEGER DEFAULT 0,
    p_context_included BOOLEAN DEFAULT false
) RETURNS UUID AS $$
DECLARE
    message_id UUID;
BEGIN
    INSERT INTO chat_messages (
        conversation_id,
        role,
        content,
        model_used,
        provider_used,
        tokens_used,
        latency_ms,
        context_included
    ) VALUES (
        p_conversation_id,
        p_role,
        p_content,
        p_model_used,
        p_provider_used,
        p_tokens_used,
        p_latency_ms,
        p_context_included
    ) RETURNING id INTO message_id;
    
    RETURN message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update conversation updated_at when new messages are added
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chat_conversations 
    SET updated_at = NOW() 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation timestamp when messages are added
DROP TRIGGER IF EXISTS update_conversation_timestamp_trigger ON chat_messages;
CREATE TRIGGER update_conversation_timestamp_trigger
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_timestamp();

-- ============================================================================
-- MEMORY MANAGEMENT FUNCTIONS
-- ============================================================================

-- Function to add memory with embedding
CREATE OR REPLACE FUNCTION add_study_memory(
    p_user_id UUID,
    p_content TEXT,
    p_embedding vector(1536),
    p_importance_score INTEGER,
    p_tags TEXT[] DEFAULT NULL,
    p_source_conversation_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    memory_id UUID;
BEGIN
    INSERT INTO study_chat_memory (
        user_id,
        content,
        embedding,
        importance_score,
        tags,
        source_conversation_id
    ) VALUES (
        p_user_id,
        p_content,
        p_embedding,
        p_importance_score,
        p_tags,
        p_source_conversation_id
    ) RETURNING id INTO memory_id;
    
    RETURN memory_id;
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
    ORDER BY scm.embedding <=> p_embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- AUTOMATIC CLEANUP FUNCTIONS
-- ============================================================================

-- Function to run scheduled maintenance tasks
CREATE OR REPLACE FUNCTION run_maintenance_tasks()
RETURNS TABLE (task_name TEXT, records_affected INTEGER) AS $$
DECLARE
    memory_cleanup_count INTEGER;
    summary_count INTEGER;
BEGIN
    -- Clean expired memory
    PERFORM clean_expired_memory();
    GET DIAGNOSTICS memory_cleanup_count = ROW_COUNT;
    
    -- Generate new summaries (weekly/monthly)
    PERFORM generate_memory_summaries();
    GET DIAGNOSTICS summary_count = ROW_COUNT;
    
    RETURN QUERY SELECT 'clean_expired_memory'::TEXT, memory_cleanup_count;
    RETURN QUERY SELECT 'generate_summaries'::TEXT, summary_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SCHEDULED MAINTENANCE SETUP
-- ============================================================================

-- Note: pg_cron extension would be needed for automatic scheduling
-- For now, we'll provide the functions that can be called manually or via external scheduler

-- ============================================================================
-- FUNCTION VERIFICATION
-- ============================================================================

-- List all created functions
SELECT 
    routine_name,
    routine_type,
    specific_name,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'update_updated_at_column',
    'clean_expired_memory',
    'generate_memory_summaries',
    'log_api_usage',
    'create_chat_conversation',
    'add_chat_message',
    'update_conversation_timestamp',
    'add_study_memory',
    'find_similar_memories',
    'run_maintenance_tasks'
)
ORDER BY routine_name;