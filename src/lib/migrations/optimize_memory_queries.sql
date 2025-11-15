-- Memory Query Performance Optimization
-- ======================================
-- Add indexes to improve memory query performance

-- Index for session memory retrieval (user_id + conversation_id + memory_type)
CREATE INDEX IF NOT EXISTS idx_conversation_memory_session_lookup 
ON conversation_memory(user_id, conversation_id, memory_type, created_at DESC)
WHERE memory_type = 'session';

-- Index for universal memory retrieval (user_id + memory_type + relevance)
CREATE INDEX IF NOT EXISTS idx_conversation_memory_universal_lookup 
ON conversation_memory(user_id, memory_type, memory_relevance_score DESC, created_at DESC)
WHERE memory_type = 'universal';

-- Index for memory search by tags
CREATE INDEX IF NOT EXISTS idx_conversation_memory_tags 
ON conversation_memory USING GIN ((interaction_data->'tags'))
WHERE interaction_data->'tags' IS NOT NULL;

-- Index for memory search by topic
CREATE INDEX IF NOT EXISTS idx_conversation_memory_topic 
ON conversation_memory((interaction_data->>'topic'))
WHERE interaction_data->>'topic' IS NOT NULL;

-- Index for memory expiration cleanup
CREATE INDEX IF NOT EXISTS idx_conversation_memory_expires_at 
ON conversation_memory(expires_at)
WHERE expires_at IS NOT NULL;

-- Index for quality score filtering
CREATE INDEX IF NOT EXISTS idx_conversation_memory_quality 
ON conversation_memory(user_id, quality_score DESC)
WHERE quality_score > 0.5;

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_conversation_memory_composite 
ON conversation_memory(user_id, memory_type, created_at DESC, memory_relevance_score DESC);

-- Add statistics for query planner
ANALYZE conversation_memory;

-- Create a function to clean up expired memories (for maintenance)
-- Drop the function first if it exists to avoid return type conflicts
DROP FUNCTION IF EXISTS cleanup_expired_memories();

CREATE FUNCTION cleanup_expired_memories()
RETURNS BIGINT AS $$
DECLARE
  count_deleted BIGINT;
BEGIN
  DELETE FROM conversation_memory
  WHERE expires_at < NOW()
  AND expires_at IS NOT NULL;
  
  GET DIAGNOSTICS count_deleted = ROW_COUNT;
  
  RETURN count_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get memory statistics
CREATE OR REPLACE FUNCTION get_memory_statistics(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_memories', COUNT(*),
    'session_memories', COUNT(*) FILTER (WHERE memory_type = 'session'),
    'universal_memories', COUNT(*) FILTER (WHERE memory_type = 'universal'),
    'avg_quality_score', AVG(quality_score),
    'avg_relevance_score', AVG(memory_relevance_score),
    'total_conversations', COUNT(DISTINCT conversation_id),
    'oldest_memory', MIN(created_at),
    'newest_memory', MAX(created_at),
    'expired_memories', COUNT(*) FILTER (WHERE expires_at < NOW())
  ) INTO result
  FROM conversation_memory
  WHERE user_id = p_user_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON INDEX idx_conversation_memory_session_lookup IS 
'Optimizes session memory retrieval by user_id, conversation_id, and memory_type';

COMMENT ON INDEX idx_conversation_memory_universal_lookup IS 
'Optimizes universal memory retrieval with relevance scoring';

COMMENT ON FUNCTION cleanup_expired_memories IS 
'Removes expired memories from the database to maintain performance';

COMMENT ON FUNCTION get_memory_statistics IS 
'Returns comprehensive statistics about a user''s memory storage';
