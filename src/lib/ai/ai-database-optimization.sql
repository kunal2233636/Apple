-- AI Database Optimization: Views and Performance Enhancements
-- This file contains SQL optimizations for efficient AI data access

-- 1. Create a comprehensive AI user profile view
-- This view pre-joins all the data that AI needs frequently
CREATE OR REPLACE VIEW ai_user_profiles AS
SELECT 
    p.id as user_id,
    p.email,
    p.full_name,
    p.created_at as profile_created_at,
    p.updated_at as profile_updated_at,
    
    -- Gamification data
    ug.current_streak,
    ug.longest_streak,
    ug.current_level,
    ug.total_points_earned,
    ug.total_penalty_points,
    ug.experience_points,
    ug.total_topics_completed,
    ug.badges_earned,
    ug.last_activity_date,
    
    -- Summary statistics
    das.daily_study_time,
    das.weekly_blocks_completed,
    das.monthly_topics_completed,
    das.study_consistency_percentage,
    das.average_session_duration,
    das.favorite_study_time,
    
    -- Subject progress summary
    subj_stats.total_subjects,
    subj_stats.completed_subjects,
    subj_stats.total_topics,
    subj_stats.completed_topics,
    subj_stats.in_progress_topics,
    subj_stats.mastered_subjects,
    
    -- Revision queue status
    rev_stats.overdue_topics,
    rev_stats.due_today_topics,
    rev_stats.high_priority_topics,
    rev_stats.total_pending_reviews
    
FROM profiles p
LEFT JOIN user_gamification ug ON p.id = ug.user_id
LEFT JOIN daily_activity_summary das ON p.id = das.user_id 
    AND das.date = CURRENT_DATE
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as total_subjects,
        COUNT(CASE WHEN completion_rate = 100 THEN 1 END) as completed_subjects,
        SUM(total_topics) as total_topics,
        SUM(completed_topics) as completed_topics,
        SUM(in_progress_topics) as in_progress_topics,
        COUNT(CASE WHEN completion_rate >= 80 THEN 1 END) as mastered_subjects
    FROM (
        SELECT 
            s.user_id,
            s.id as subject_id,
            COUNT(DISTINCT c.id) as total_chapters,
            COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_topics,
            COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_topics,
            COUNT(DISTINCT t.id) as total_topics,
            CASE 
                WHEN COUNT(DISTINCT t.id) = 0 THEN 0
                ELSE ROUND((COUNT(CASE WHEN t.status = 'completed' THEN 1 END) * 100.0 / COUNT(DISTINCT t.id)), 2)
            END as completion_rate
        FROM subjects s
        LEFT JOIN chapters c ON s.id = c.subject_id AND s.user_id = c.user_id
        LEFT JOIN topics t ON c.id = t.chapter_id AND c.user_id = t.user_id
        WHERE s.user_id IS NOT NULL
        GROUP BY s.user_id, s.id
    ) subject_progress
    GROUP BY user_id
) subj_stats ON p.id = subj_stats.user_id
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(CASE WHEN due_date < CURRENT_DATE AND is_completed = false THEN 1 END) as overdue_topics,
        COUNT(CASE WHEN due_date = CURRENT_DATE AND is_completed = false THEN 1 END) as due_today_topics,
        COUNT(CASE WHEN priority IN ('high', 'critical') AND is_completed = false THEN 1 END) as high_priority_topics,
        COUNT(CASE WHEN is_completed = false THEN 1 END) as total_pending_reviews
    FROM revision_topics
    GROUP BY user_id
) rev_stats ON p.id = rev_stats.user_id;

-- 2. Create AI activity patterns view
-- Pre-computes common study patterns for AI analysis
CREATE OR REPLACE VIEW ai_study_patterns AS
SELECT 
    b.user_id,
    DATE_TRUNC('month', b.date) as month,
    DATE_TRUNC('week', b.date) as week,
    
    -- Time of day patterns
    COUNT(CASE WHEN EXTRACT(hour FROM b.start_time::time) BETWEEN 6 AND 11 THEN 1 END) as morning_sessions,
    COUNT(CASE WHEN EXTRACT(hour FROM b.start_time::time) BETWEEN 12 AND 17 THEN 1 END) as afternoon_sessions,
    COUNT(CASE WHEN EXTRACT(hour FROM b.start_time::time) BETWEEN 18 AND 21 THEN 1 END) as evening_sessions,
    COUNT(CASE WHEN EXTRACT(hour FROM b.start_time::time) NOT BETWEEN 6 AND 21 THEN 1 END) as night_sessions,
    
    -- Subject preferences
    s.name as subject_name,
    COUNT(*) as subject_sessions,
    SUM(b.duration) as total_duration_minutes,
    AVG(b.duration) as avg_session_duration,
    
    -- Performance metrics
    COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_sessions,
    ROUND(COUNT(CASE WHEN b.status = 'completed' THEN 1 END) * 100.0 / COUNT(*), 2) as completion_rate
    
FROM blocks b
LEFT JOIN subjects s ON b.subject = s.name AND b.user_id = s.user_id
WHERE b.date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY b.user_id, DATE_TRUNC('month', b.date), DATE_TRUNC('week', b.date), s.name;

-- 3. Create AI performance metrics view
-- Aggregates performance data for AI insights
CREATE OR REPLACE VIEW ai_performance_metrics AS
SELECT 
    das.user_id,
    das.date,
    
    -- Daily metrics
    das.total_study_minutes,
    das.blocks_completed_count,
    das.current_streak,
    das.points_earned,
    
    -- Weekly aggregation
    WEEK(das.date) as week_number,
    YEAR(das.date) as year,
    
    -- Rolling averages (7-day window)
    AVG(das.total_study_minutes) OVER (
        PARTITION BY das.user_id 
        ORDER BY das.date 
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as rolling_7day_study_time,
    
    -- Study consistency (consecutive active days)
    CASE 
        WHEN das.total_study_minutes > 0 THEN 1 
        ELSE 0 
    END as active_day_indicator,
    
    -- Points efficiency
    CASE 
        WHEN das.total_study_minutes > 0 
        THEN ROUND(das.points_earned * 1.0 / das.total_study_minutes, 4)
        ELSE 0 
    END as points_per_minute
    
FROM daily_activity_summary das
WHERE das.date >= CURRENT_DATE - INTERVAL '365 days';

-- 4. Create AI learning progression view
-- Tracks learning progression across subjects and topics
CREATE OR REPLACE VIEW ai_learning_progression AS
SELECT 
    t.user_id,
    s.id as subject_id,
    s.name as subject_name,
    s.category as subject_category,
    c.id as chapter_id,
    c.name as chapter_name,
    t.id as topic_id,
    t.name as topic_name,
    t.difficulty,
    t.status,
    t.revision_count,
    t.studied_count,
    
    -- Learning progression metrics
    CASE 
        WHEN t.status = 'completed' THEN 1 
        WHEN t.status = 'in_progress' THEN 0.5 
        ELSE 0 
    END as progress_score,
    
    -- Mastery indicators
    CASE 
        WHEN t.revision_count >= 3 AND t.status = 'completed' THEN 'mastered'
        WHEN t.revision_count >= 1 AND t.status = 'completed' THEN 'learned'
        WHEN t.status = 'in_progress' THEN 'learning'
        ELSE 'not_started'
    END as mastery_level,
    
    -- Time-based metrics
    EXTRACT(days FROM (CURRENT_DATE - t.created_at)) as days_since_created,
    EXTRACT(days FROM (t.last_revised_date - CURRENT_DATE)) as days_until_next_revision
    
FROM topics t
JOIN chapters c ON t.chapter_id = c.id AND t.user_id = c.user_id
JOIN subjects s ON c.subject_id = s.id AND c.user_id = s.user_id
WHERE t.user_id IS NOT NULL;

-- 5. Create indexes for AI query optimization
-- These indexes will significantly improve AI data access performance

-- Index for user-based queries (most common AI access pattern)
CREATE INDEX CONCURRENTLY idx_ai_user_queries 
ON profiles(id, email, full_name);

-- Index for gamification data access
CREATE INDEX CONCURRENTLY idx_ai_gamification 
ON user_gamification(user_id, current_streak, total_points_earned, last_activity_date);

-- Index for daily activity summaries (time-series data)
CREATE INDEX CONCURRENTLY idx_ai_daily_activity 
ON daily_activity_summary(user_id, date DESC);

-- Index for study blocks with time filtering
CREATE INDEX CONCURRENTLY idx_ai_blocks_patterns 
ON blocks(user_id, date DESC, status, start_time, duration);

-- Index for subjects hierarchy
CREATE INDEX CONCURRENTLY idx_ai_subjects_hierarchy 
ON subjects(user_id, id, name, category);

-- Index for chapters with subject relationship
CREATE INDEX CONCURRENTLY idx_ai_chapters 
ON chapters(user_id, subject_id, id, name);

-- Index for topics with status and difficulty
CREATE INDEX CONCURRENTLY idx_ai_topics 
ON topics(user_id, chapter_id, status, difficulty, revision_count);

-- Index for revision queue with priority and dates
CREATE INDEX CONCURRENTLY idx_ai_revision_queue 
ON revision_topics(user_id, is_completed, priority, due_date);

-- Composite index for common AI subject progress queries
CREATE INDEX CONCURRENTLY idx_ai_subject_progress 
ON topics(user_id, status) 
INCLUDE (id, name, difficulty, revision_count);

-- Index for activity logs with time filtering
CREATE INDEX CONCURRENTLY idx_ai_activity_logs 
ON activity_logs(user_id, created_at DESC, activity_type);

-- 6. Create materialized views for heavy AI computations
-- These are refreshed periodically for optimal performance

-- Materialized view for user study patterns (refreshed daily)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_ai_user_patterns AS
SELECT 
    user_id,
    DATE_TRUNC('month', date) as month,
    
    -- Study time patterns
    AVG(total_study_minutes) as avg_monthly_study_minutes,
    SUM(total_study_minutes) as total_monthly_study_minutes,
    
    -- Consistency metrics
    COUNT(CASE WHEN total_study_minutes > 0 THEN 1 END) as active_days,
    COUNT(*) as total_days,
    ROUND(COUNT(CASE WHEN total_study_minutes > 0 THEN 1 END) * 100.0 / COUNT(*), 2) as consistency_rate,
    
    -- Performance trends
    AVG(points_earned) as avg_daily_points,
    SUM(blocks_completed_count) as total_blocks_completed,
    
    -- Streak information
    MAX(current_streak) as max_streak_reached
    
FROM daily_activity_summary
WHERE date >= CURRENT_DATE - INTERVAL '365 days'
GROUP BY user_id, DATE_TRUNC('month', date);

-- Index for materialized view
CREATE UNIQUE INDEX CONCURRENTLY idx_mv_ai_user_patterns 
ON mv_ai_user_patterns(user_id, month);

-- 7. Create function to refresh AI materialized views
CREATE OR REPLACE FUNCTION refresh_ai_materialized_views()
RETURNS void AS $$
BEGIN
    -- Refresh the user patterns materialized view
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ai_user_patterns;
    
    -- Log the refresh
    INSERT INTO activity_logs (user_id, activity_type, summary, details)
    VALUES ('system', 'maintenance', 'AI materialized views refreshed', 
            json_build_object('refresh_time', CURRENT_TIMESTAMP, 'views_refreshed', 1));
END;
$$ LANGUAGE plpgsql;

-- 8. Create scheduled job for regular view refreshes
-- This would typically be called by a cron job or scheduler
CREATE OR REPLACE FUNCTION schedule_ai_view_refresh()
RETURNS void AS $$
BEGIN
    -- Refresh views during low-traffic hours
    IF EXTRACT(hour FROM CURRENT_TIME) BETWEEN 2 AND 4 THEN
        PERFORM refresh_ai_materialized_views();
        
        -- Log the scheduled refresh
        INSERT INTO activity_logs (user_id, activity_type, summary, details)
        VALUES ('system', 'maintenance', 'Scheduled AI view refresh completed', 
                json_build_object('schedule_time', CURRENT_TIMESTAMP));
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 9. Grant permissions for AI service user (if using service role)
-- Replace 'ai_service_user' with your actual AI service user
-- GRANT SELECT ON ai_user_profiles TO ai_service_user;
-- GRANT SELECT ON ai_study_patterns TO ai_service_user;
-- GRANT SELECT ON ai_performance_metrics TO ai_service_user;
-- GRANT SELECT ON ai_learning_progression TO ai_service_user;
-- GRANT SELECT ON mv_ai_user_patterns TO ai_service_user;
-- GRANT EXECUTE ON FUNCTION refresh_ai_materialized_views() TO ai_service_user;

-- 10. Create helpful comments for documentation
COMMENT ON VIEW ai_user_profiles IS 'Comprehensive user profile view optimized for AI data access. Pre-joins gamification, activity, and progress data.';
COMMENT ON VIEW ai_study_patterns IS 'Study pattern analysis view with time-of-day and subject preferences for AI insights.';
COMMENT ON VIEW ai_performance_metrics IS 'Performance metrics view with rolling averages and efficiency calculations.';
COMMENT ON VIEW ai_learning_progression IS 'Learning progression tracking with mastery levels and progression scores.';
COMMENT ON MATERIALIZED VIEW mv_ai_user_patterns IS 'Materialized view of user study patterns, refreshed daily for optimal AI query performance.';