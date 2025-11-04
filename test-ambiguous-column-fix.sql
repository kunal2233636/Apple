-- Test to verify the fix for ambiguous column reference error
DO $$
DECLARE
    expected_tables TEXT[] := ARRAY[
        'chat_conversations', 'chat_messages', 'study_chat_memory',
        'memory_summaries', 'student_ai_profile', 'api_usage_logs', 'ai_system_prompts'
    ];
    target_table_name TEXT;
    table_exists BOOLEAN;
BEGIN
    -- Test the fixed version - this should work without errors
    FOREACH target_table_name IN ARRAY expected_tables
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = target_table_name
        ) INTO table_exists;
        
        RAISE NOTICE 'Table % exists: %', target_table_name, table_exists;
        
        IF NOT table_exists THEN
            RAISE EXCEPTION 'Table % was not created successfully', target_table_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'All % tables verified successfully', array_length(expected_tables, 1);
END $$;