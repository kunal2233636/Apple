-- ============================================================================
-- AI STUDY ASSISTANT DATABASE SETUP - PART 2: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- ============================================================================
-- TABLE 1: chat_conversations - RLS POLICIES
-- ============================================================================

-- Enable RLS on chat_conversations
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

-- Users see only their own conversations
DROP POLICY IF EXISTS "Users can view their own conversations" ON chat_conversations;
CREATE POLICY "Users can view their own conversations" ON chat_conversations
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own conversations
DROP POLICY IF EXISTS "Users can insert their own conversations" ON chat_conversations;
CREATE POLICY "Users can insert their own conversations" ON chat_conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own conversations
DROP POLICY IF EXISTS "Users can update their own conversations" ON chat_conversations;
CREATE POLICY "Users can update their own conversations" ON chat_conversations
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own conversations
DROP POLICY IF EXISTS "Users can delete their own conversations" ON chat_conversations;
CREATE POLICY "Users can delete their own conversations" ON chat_conversations
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- TABLE 2: chat_messages - RLS POLICIES  
-- ============================================================================

-- Enable RLS on chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users see messages from conversations they own
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON chat_messages;
CREATE POLICY "Users can view messages from their conversations" ON chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_conversations 
            WHERE chat_conversations.id = chat_messages.conversation_id 
            AND chat_conversations.user_id = auth.uid()
        )
    );

-- Users can insert messages to their conversations
DROP POLICY IF EXISTS "Users can insert messages to their conversations" ON chat_messages;
CREATE POLICY "Users can insert messages to their conversations" ON chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_conversations 
            WHERE chat_conversations.id = chat_messages.conversation_id 
            AND chat_conversations.user_id = auth.uid()
        )
    );

-- Users can update messages in their conversations
DROP POLICY IF EXISTS "Users can update messages in their conversations" ON chat_messages;
CREATE POLICY "Users can update messages in their conversations" ON chat_messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM chat_conversations 
            WHERE chat_conversations.id = chat_messages.conversation_id 
            AND chat_conversations.user_id = auth.uid()
        )
    );

-- Users can delete messages in their conversations
DROP POLICY IF EXISTS "Users can delete messages in their conversations" ON chat_messages;
CREATE POLICY "Users can delete messages in their conversations" ON chat_messages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM chat_conversations 
            WHERE chat_conversations.id = chat_messages.conversation_id 
            AND chat_conversations.user_id = auth.uid()
        )
    );

-- ============================================================================
-- TABLE 3: study_chat_memory - RLS POLICIES
-- ============================================================================

-- Enable RLS on study_chat_memory
ALTER TABLE study_chat_memory ENABLE ROW LEVEL SECURITY;

-- Users see only their own memory
DROP POLICY IF EXISTS "Users can view their own memory" ON study_chat_memory;
CREATE POLICY "Users can view their own memory" ON study_chat_memory
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own memory
DROP POLICY IF EXISTS "Users can insert their own memory" ON study_chat_memory;
CREATE POLICY "Users can insert their own memory" ON study_chat_memory
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own memory
DROP POLICY IF EXISTS "Users can update their own memory" ON study_chat_memory;
CREATE POLICY "Users can update their own memory" ON study_chat_memory
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own memory
DROP POLICY IF EXISTS "Users can delete their own memory" ON study_chat_memory;
CREATE POLICY "Users can delete their own memory" ON study_chat_memory
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- TABLE 4: memory_summaries - RLS POLICIES
-- ============================================================================

-- Enable RLS on memory_summaries
ALTER TABLE memory_summaries ENABLE ROW LEVEL SECURITY;

-- Users see only their own summaries
DROP POLICY IF EXISTS "Users can view their own summaries" ON memory_summaries;
CREATE POLICY "Users can view their own summaries" ON memory_summaries
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own summaries
DROP POLICY IF EXISTS "Users can insert their own summaries" ON memory_summaries;
CREATE POLICY "Users can insert their own summaries" ON memory_summaries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own summaries
DROP POLICY IF EXISTS "Users can update their own summaries" ON memory_summaries;
CREATE POLICY "Users can update their own summaries" ON memory_summaries
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own summaries
DROP POLICY IF EXISTS "Users can delete their own summaries" ON memory_summaries;
CREATE POLICY "Users can delete their own summaries" ON memory_summaries
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- TABLE 5: student_ai_profile - RLS POLICIES
-- ============================================================================

-- Enable RLS on student_ai_profile
ALTER TABLE student_ai_profile ENABLE ROW LEVEL SECURITY;

-- Users see only their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON student_ai_profile;
CREATE POLICY "Users can view their own profile" ON student_ai_profile
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON student_ai_profile;
CREATE POLICY "Users can insert their own profile" ON student_ai_profile
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON student_ai_profile;
CREATE POLICY "Users can update their own profile" ON student_ai_profile
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own profile
DROP POLICY IF EXISTS "Users can delete their own profile" ON student_ai_profile;
CREATE POLICY "Users can delete their own profile" ON student_ai_profile
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- TABLE 6: api_usage_logs - RLS POLICIES
-- ============================================================================

-- Enable RLS on api_usage_logs
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Users see only their own API usage logs
DROP POLICY IF EXISTS "Users can view their own API usage logs" ON api_usage_logs;
CREATE POLICY "Users can view their own API usage logs" ON api_usage_logs
    FOR SELECT USING (auth.uid() = user_id);

-- System can insert API usage logs
DROP POLICY IF EXISTS "System can insert API usage logs" ON api_usage_logs;
CREATE POLICY "System can insert API usage logs" ON api_usage_logs
    FOR INSERT WITH CHECK (true);

-- Users can update their own API usage logs (for caching, success status, etc.)
DROP POLICY IF EXISTS "Users can update their own API usage logs" ON api_usage_logs;
CREATE POLICY "Users can update their own API usage logs" ON api_usage_logs
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own API usage logs
DROP POLICY IF EXISTS "Users can delete their own API usage logs" ON api_usage_logs;
CREATE POLICY "Users can delete their own API usage logs" ON api_usage_logs
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- TABLE 7: ai_system_prompts - RLS POLICIES
-- ============================================================================

-- Enable RLS on ai_system_prompts
ALTER TABLE ai_system_prompts ENABLE ROW LEVEL SECURITY;

-- All authenticated users can SELECT system prompts
DROP POLICY IF EXISTS "Authenticated users can view system prompts" ON ai_system_prompts;
CREATE POLICY "Authenticated users can view system prompts" ON ai_system_prompts
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only service role can modify system prompts
DROP POLICY IF EXISTS "Service role can manage system prompts" ON ai_system_prompts;
CREATE POLICY "Service role can manage system prompts" ON ai_system_prompts
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- SECURITY VERIFICATION
-- ============================================================================

-- Verify RLS is enabled on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
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

-- Check policy counts per table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
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
ORDER BY tablename, policyname;