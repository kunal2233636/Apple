-- Migration: Add memory_type column to conversation_memory table
-- Purpose: Enable dual-layer memory system with session and universal memory types
-- Date: 2025-11-15

-- Add memory_type column with CHECK constraint
ALTER TABLE conversation_memory 
ADD COLUMN IF NOT EXISTS memory_type TEXT DEFAULT 'session'
CHECK (memory_type IN ('session', 'universal'));

-- Create index for efficient filtering by user_id, memory_type, and created_at
CREATE INDEX IF NOT EXISTS idx_conversation_memory_type_user_created 
ON conversation_memory(user_id, memory_type, created_at DESC);

-- Add comment to document the column
COMMENT ON COLUMN conversation_memory.memory_type IS 
'Memory type: session (conversation-specific) or universal (cross-session semantic memory)';
