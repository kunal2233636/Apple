-- AI Suggestions Table Migration - Critical Fix for Analytics System
-- Creates missing ai_suggestions table that analytics system requires
-- FIXED: Added vector extension enablement

-- Enable vector extension for embedding storage
CREATE EXTENSION IF NOT EXISTS vector;

-- AI Suggestions Table for storing all AI-generated suggestions
CREATE TABLE IF NOT EXISTS ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  suggestion_type VARCHAR(50) NOT NULL CHECK (suggestion_type IN (
    'schedule', 'prediction', 'motivation', 'general', 'study_plan', 'revision', 'exam_prep'
  )),
  suggestion_title VARCHAR(255) NOT NULL,
  suggestion_content TEXT NOT NULL,
  suggestion_data JSONB DEFAULT '{}'::jsonb,
  is_viewed BOOLEAN DEFAULT false,
  is_accepted BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
  category VARCHAR(100) DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
  -- Note: Removed embedding field to avoid dependency issues
  -- embedding vector(1536)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user_id ON ai_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_type ON ai_suggestions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_created_at ON ai_suggestions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user_type ON ai_suggestions(user_id, suggestion_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user_viewed ON ai_suggestions(user_id, is_viewed, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_category ON ai_suggestions(category);

-- Composite index for analytics queries
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_analytics ON ai_suggestions(user_id, suggestion_type, is_viewed, is_accepted, created_at);

-- Row Level Security (RLS)
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own AI suggestions" ON ai_suggestions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI suggestions" ON ai_suggestions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI suggestions" ON ai_suggestions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI suggestions" ON ai_suggestions
  FOR DELETE USING (auth.uid() = user_id);

-- System can manage suggestions (for background processing)
CREATE POLICY "System can manage all AI suggestions" ON ai_suggestions
  FOR ALL USING (true);

-- Analytics Views for suggestion data
CREATE OR REPLACE VIEW ai_suggestions_analytics AS
SELECT 
  suggestion_type,
  COUNT(*) as total_suggestions,
  COUNT(CASE WHEN is_viewed THEN 1 END) as viewed_suggestions,
  COUNT(CASE WHEN is_accepted THEN 1 END) as accepted_suggestions,
  COUNT(CASE WHEN is_dismissed THEN 1 END) as dismissed_suggestions,
  ROUND(COUNT(CASE WHEN is_viewed THEN 1 END) * 100.0 / COUNT(*), 2) as view_rate,
  ROUND(COUNT(CASE WHEN is_accepted THEN 1 END) * 100.0 / COUNT(*), 2) as acceptance_rate,
  ROUND(COUNT(CASE WHEN is_accepted THEN 1 END) * 100.0 / NULLIF(COUNT(CASE WHEN is_viewed THEN 1 END), 0), 2) as conversion_rate,
  DATE(created_at) as suggestion_date
FROM ai_suggestions
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY suggestion_type, DATE(created_at);

-- User suggestion summary view
CREATE OR REPLACE VIEW user_suggestion_summary AS
SELECT 
  user_id,
  COUNT(*) as total_suggestions,
  COUNT(CASE WHEN is_viewed THEN 1 END) as viewed_suggestions,
  COUNT(CASE WHEN is_accepted THEN 1 END) as accepted_suggestions,
  COUNT(CASE WHEN is_dismissed THEN 1 END) as dismissed_suggestions,
  ROUND(COUNT(CASE WHEN is_viewed THEN 1 END) * 100.0 / COUNT(*), 2) as view_rate,
  ROUND(COUNT(CASE WHEN is_accepted THEN 1 END) * 100.0 / COUNT(*), 2) as acceptance_rate,
  MAX(created_at) as last_suggestion_date
FROM ai_suggestions
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY user_id;

-- Helper functions for analytics
CREATE OR REPLACE FUNCTION get_user_suggestion_stats(user_uuid UUID, days_back INTEGER DEFAULT 30)
RETURNS TABLE(
  total_suggestions BIGINT,
  viewed_suggestions BIGINT,
  accepted_suggestions BIGINT,
  dismissed_suggestions BIGINT,
  view_rate DECIMAL(5,2),
  acceptance_rate DECIMAL(5,2),
  last_interaction TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_suggestions,
    COUNT(CASE WHEN is_viewed THEN 1 END) as viewed_suggestions,
    COUNT(CASE WHEN is_accepted THEN 1 END) as accepted_suggestions,
    COUNT(CASE WHEN is_dismissed THEN 1 END) as dismissed_suggestions,
    ROUND(COUNT(CASE WHEN is_viewed THEN 1 END) * 100.0 / COUNT(*), 2) as view_rate,
    ROUND(COUNT(CASE WHEN is_accepted THEN 1 END) * 100.0 / COUNT(*), 2) as acceptance_rate,
    MAX(
      CASE 
        WHEN is_accepted THEN updated_at
        WHEN is_dismissed THEN updated_at
        WHEN is_viewed THEN updated_at
        ELSE NULL 
      END
    ) as last_interaction
  FROM ai_suggestions
  WHERE user_id = user_uuid 
    AND created_at >= CURRENT_DATE - (days_back || ' days')::INTERVAL;
END;
$$;

CREATE OR REPLACE FUNCTION get_suggestion_type_performance(days_back INTEGER DEFAULT 30)
RETURNS TABLE(
  suggestion_type VARCHAR(50),
  total_count BIGINT,
  view_count BIGINT,
  accept_count BIGINT,
  view_rate DECIMAL(5,2),
  acceptance_rate DECIMAL(5,2),
  avg_time_to_interaction INTERVAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    as_table.suggestion_type,
    COUNT(*) as total_count,
    COUNT(CASE WHEN is_viewed THEN 1 END) as view_count,
    COUNT(CASE WHEN is_accepted THEN 1 END) as accept_count,
    ROUND(COUNT(CASE WHEN is_viewed THEN 1 END) * 100.0 / COUNT(*), 2) as view_rate,
    ROUND(COUNT(CASE WHEN is_accepted THEN 1 END) * 100.0 / COUNT(*), 2) as acceptance_rate,
    AVG(
      CASE 
        WHEN is_viewed OR is_accepted OR is_dismissed 
        THEN updated_at - created_at 
        ELSE NULL 
      END
    ) as avg_time_to_interaction
  FROM ai_suggestions as_table
  WHERE created_at >= CURRENT_DATE - (days_back || ' days')::INTERVAL
  GROUP BY as_table.suggestion_type
  ORDER BY total_count DESC;
END;
$$;

-- Update function for updated_at
CREATE OR REPLACE FUNCTION update_ai_suggestions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_ai_suggestions_updated_at 
    BEFORE UPDATE ON ai_suggestions 
    FOR EACH ROW EXECUTE FUNCTION update_ai_suggestions_updated_at();

-- Insert some sample data for testing (optional - can be removed in production)
-- This will help test the analytics system immediately
INSERT INTO ai_suggestions (user_id, suggestion_type, suggestion_title, suggestion_content, suggestion_data, is_viewed, is_accepted, category)
SELECT 
  '00000000-0000-0000-0000-000000000000'::UUID, -- Placeholder user ID
  'schedule',
  'Optimize Your Study Schedule',
  'Based on your recent performance, we recommend adjusting your study schedule to focus more on Mathematics during peak hours.',
  '{"recommended_hours": 3, "focus_subject": "Mathematics", "reason": "low_performance"}',
  true,
  false,
  'productivity'
WHERE NOT EXISTS (SELECT 1 FROM ai_suggestions WHERE suggestion_type = 'schedule' LIMIT 1);

-- Grant permissions
GRANT ALL ON ai_suggestions TO authenticated;
GRANT SELECT ON ai_suggestions_analytics TO authenticated;
GRANT SELECT ON user_suggestion_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_suggestion_stats(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_suggestion_type_performance(INTEGER) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE ai_suggestions IS 'Stores all AI-generated suggestions for users with engagement tracking';
COMMENT ON VIEW ai_suggestions_analytics IS 'Aggregated analytics for AI suggestions performance';
COMMENT ON VIEW user_suggestion_summary IS 'Summary statistics for user suggestion engagement';
COMMENT ON FUNCTION get_user_suggestion_stats(UUID, INTEGER) IS 'Get detailed suggestion statistics for a user';
COMMENT ON FUNCTION get_suggestion_type_performance(INTEGER) IS 'Get performance metrics by suggestion type';

-- Final verification
DO $$
BEGIN
    RAISE NOTICE 'AI Suggestions migration completed successfully!';
    RAISE NOTICE 'Fixed: Added vector extension enablement';
    RAISE NOTICE 'Fixed: Removed embedding column to avoid dependency issues';
    RAISE NOTICE 'Added: Auto-updating updated_at trigger';
END $$;
