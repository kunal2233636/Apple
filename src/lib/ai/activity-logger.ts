'use server';

import { supabaseBrowserClient } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type ActivityLogInsert = Database['public']['Tables']['activity_logs']['Insert'];
type ActivityLog = Database['public']['Tables']['activity_logs']['Row'];

/**
 * The main function to log any user activity to the database.
 * @param params - The parameters for the log entry.
 * @returns The created log entry or null on error.
 */
export async function logActivity(params: {
    user_id: string;
    activity_type: string;
    summary: string;
    activity_data?: object;
}): Promise<ActivityLog | null> {
    const {
        user_id,
        activity_type,
        summary,
        activity_data = {}
    } = params;

    try {
        const logEntry: ActivityLogInsert = {
            user_id,
            activity_type,
            summary,
            details: activity_data as any
        };

        const { data, error } = await (supabaseBrowserClient as any)
            .from('activity_logs')
            .insert(logEntry)
            .select()
            .single();

        if (error) throw error;
        
        return data;

    } catch (error: any) {
        console.error(`[ActivityLogger] Failed to log activity of type "${activity_type}":`, error.message);
        return null;
    }
}

// --- Convenience Functions ---

export async function logBlockCreated(user_id: string, block: any) {
    const summary = `Created ${block.type} block for ${block.subject || 'general study'} from ${block.start_time} (${block.duration} mins).`;
    return logActivity({
        user_id,
        activity_type: 'block_created',
        summary,
        activity_data: {
            ...block,
            timestamp: new Date().toISOString()
        }
    });
}

export async function logBlockCompleted(user_id: string, block_id: string, completionData: any) {
    const { topics_covered, duration, difficulty, score } = completionData;
    const summary = `Completed block. Studied ${topics_covered} topics for ${duration} mins. Average difficulty: ${difficulty || 'N/A'}.`;
    return logActivity({
        user_id,
        activity_type: 'block_completed',
        summary,
        activity_data: {
            block_id,
            ...completionData,
            timestamp: new Date().toISOString()
        }
    });
}

export async function logTopicStudied(user_id: string, topic: any) {
    const summary = `Studied topic "${topic.name}" (${topic.subject} > ${topic.chapter}) - marked as ${topic.difficulty} difficulty.`;
    return logActivity({
        user_id,
        activity_type: 'topic_studied',
        summary,
        activity_data: {
            topic_id: topic.id,
            name: topic.name,
            difficulty: topic.difficulty,
            timestamp: new Date().toISOString()
        }
    });
}

export async function logTopicRevised(user_id: string, topic: any, revisionDetails: any) {
    const { revision_count, confidence } = revisionDetails;
    const summary = `Revised "${topic.name}" (Revision #${revision_count}). Confidence: ${confidence}.`;
    return logActivity({
        user_id,
        activity_type: 'topic_revised',
        summary,
        activity_data: {
            topic_id: topic.id,
            revision_count,
            confidence,
            timestamp: new Date().toISOString()
        }
    });
}

export async function logQuestionAttempted(user_id: string, attemptData: any) {
    const { subject, chapter, correct, incorrect, total } = attemptData;
    const summary = `Practiced ${total} Board questions in ${subject} > ${chapter}: ${correct} correct, ${incorrect} wrong.`;
    return logActivity({
        user_id,
        activity_type: 'question_practice',
        summary,
        activity_data: {
            ...attemptData,
            timestamp: new Date().toISOString()
        }
    });
}

export async function logAchievementUnlocked(user_id: string, achievement: any) {
    const summary = `Unlocked achievement: ${achievement.name} ${achievement.icon} - ${achievement.description}`;
    return logActivity({
        user_id,
        activity_type: 'achievement_unlocked',
        summary,
        activity_data: {
            ...achievement,
            timestamp: new Date().toISOString()
        }
    });
}

export async function logPenaltyApplied(user_id: string, penalty: any) {
    const summary = `Penalty applied: ${penalty.reason} (${penalty.points_deducted} points).`;
    return logActivity({
        user_id,
        activity_type: 'penalty_applied',
        summary,
        activity_data: {
            ...penalty,
            timestamp: new Date().toISOString()
        }
    });
}

export async function logPointsEarned(user_id: string, pointsData: any) {
    const { points, reason, breakdown } = pointsData;
    const summary = `Earned ${points} points for: ${reason}.`;
    return logActivity({
        user_id,
        activity_type: 'points_earned',
        summary,
        activity_data: {
            points,
            reason,
            breakdown,
            timestamp: new Date().toISOString()
        }
    });
}

export async function logStreakUpdated(user_id: string, streakData: any) {
    const { current_streak, longest_streak } = streakData;
    const summary = `Study streak updated: Now at ${current_streak} days 🔥. Longest streak: ${longest_streak} days.`;
    return logActivity({
        user_id,
        activity_type: 'streak_updated',
        summary,
        activity_data: {
            current_streak,
            longest_streak,
            timestamp: new Date().toISOString()
        }
    });
}

export async function logFeedbackSubmitted(user_id: string, block_id: string, feedbackData: any) {
    const { 
        completedCount = 0, 
        halfDoneCount = 0, 
        notDoneCount = 0, 
        addedToSpareCount = 0, 
        extraTopicsCount = 0,
        topicFeedbacks = {},
        blockType = 'Study',
        subject = 'General'
    } = feedbackData;
    
    const totalTopics = completedCount + halfDoneCount + notDoneCount;
    const completionRate = totalTopics > 0 ? Math.round((completedCount + halfDoneCount) / totalTopics * 100) : 0;
    
    // Analyze difficulty trends from topic feedback
    const difficultyStats = {
        easy: 0,
        medium: 0,
        hard: 0,
        total_rated: 0
    };
    
    // Extract difficulty from topic feedbacks if available
    if (topicFeedbacks && typeof topicFeedbacks === 'object') {
        Object.values(topicFeedbacks).forEach((feedback: any) => {
            if (feedback && feedback.difficulty) {
                difficultyStats.total_rated++;
                const difficulty = feedback.difficulty.toLowerCase();
                switch (difficulty) {
                    case 'easy': difficultyStats.easy++; break;
                    case 'medium': difficultyStats.medium++; break;
                    case 'hard': difficultyStats.hard++; break;
                }
            }
        });
    }
    
    // Calculate advanced completion patterns
    const completionPatterns = {
        // Basic metrics
        totalTopics,
        completionRate,
        completedCount,
        halfDoneCount,
        notDoneCount,
        
        // SpaRE additions
        spareAdditions: addedToSpareCount,
        extraTopics: extraTopicsCount,
        
        // Efficiency indicators
        efficiency: totalTopics > 0 ? (completedCount / totalTopics * 100).toFixed(1) : '0.0',
        effortLevel: addedToSpareCount + extraTopicsCount, // Extra effort indicator
        
        // Difficulty analysis
        difficultyBreakdown: difficultyStats,
        averageDifficulty: difficultyStats.total_rated > 0 ? 
            parseFloat(((difficultyStats.easy * 1 + difficultyStats.medium * 2 + difficultyStats.hard * 3) / difficultyStats.total_rated).toFixed(2)) : 0,
        
        // Performance indicators
        highPerformer: completionRate >= 80,
        needsSupport: completionRate < 30,
        challengingSession: difficultyStats.hard > difficultyStats.easy,
        efficientLearner: parseFloat((completedCount / Math.max(totalTopics, 1) * 100).toFixed(1)) >= 70,
        intenseStudy: addedToSpareCount > 0 || extraTopicsCount > 0,
    };
    
    // Generate contextual summary
    const performanceDesc = completionPatterns.highPerformer ? 'excellent' : 
                           completionPatterns.needsSupport ? 'needs attention' : 'moderate';
    const difficultyDesc = completionPatterns.averageDifficulty >= 2.5 ? 'challenging' : 
                          completionPatterns.averageDifficulty >= 1.5 ? 'moderate' : 'easy';
    
    const summary = `Submitted ${blockType.toLowerCase()} feedback (${subject}): ${completionRate}% completion (${completedCount}/${totalTopics} topics). ${completionPatterns.intenseStudy ? 'Extra study: ' + (addedToSpareCount + extraTopicsCount) + ' topics. ' : ''}Avg difficulty: ${completionPatterns.averageDifficulty}/3 (${difficultyDesc}). Performance: ${performanceDesc}.`;
    
    return logActivity({
        user_id,
        activity_type: 'feedback_submitted',
        summary,
        activity_data: {
            block_id,
            feedbackData,
            completionPatterns,
            performanceIndicators: {
                sessionIntensity: completionPatterns.intenseStudy ? 'high' : 'normal',
                learningTrend: completionPatterns.efficientLearner ? 'improving' : 'baseline',
                difficultyFocus: completionPatterns.challengingSession ? 'challenging_topics' : 'comfortable_topics',
                userProfile: completionPatterns.highPerformer ? 'high_performer' : 
                           completionPatterns.needsSupport ? 'needs_support' : 'typical_learner'
            },
            timestamp: new Date().toISOString()
        }
    });
}
