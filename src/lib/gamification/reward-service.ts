

import { supabaseBrowserClient } from '@/lib/supabase';
import { POINTS_REWARD } from './points-advanced';
import type { Database } from '../database.types';

// Type definitions for function inputs
interface BlockData {
  type: 'Study' | 'Question' | 'Revision';
  duration: number; // in minutes
  topicsCompleted: number;
}

interface QuestionData {
  questionsCount: number;
  accuracy: number; // as a percentage, e.g., 85 for 85%
}

/**
 * Calculates reward points for a completed study or revision block.
 * @param blockData - The data from the completed block.
 * @returns An object with the total points and a breakdown of how they were earned.
 */
export function calculateBlockReward(blockData: BlockData) {
  let totalPoints = 0;
  const breakdown: { [key: string]: number } = {};

  // Base points for completing any block
  breakdown.blockCompletion = POINTS_REWARD.BLOCK_COMPLETED;
  totalPoints += POINTS_REWARD.BLOCK_COMPLETED;

  // Duration-based points (for study blocks)
  if (blockData.type === 'Study') {
    const durationPoints = Math.floor(blockData.duration / 30) * POINTS_REWARD.STUDY_30_MIN;
    breakdown.durationBonus = durationPoints;
    totalPoints += durationPoints;
  }
  
  // Topic-based points
  if (blockData.topicsCompleted > 0) {
      const topicCompletionPoints = blockData.topicsCompleted * POINTS_REWARD.TOPIC_COMPLETED;
      breakdown.topicCompletion = topicCompletionPoints;
      totalPoints += topicCompletionPoints;
  }
  
  // Revision-specific points
  if (blockData.type === 'Revision' && blockData.topicsCompleted > 0) {
      const revisionPoints = blockData.topicsCompleted * POINTS_REWARD.REVISION_COMPLETED;
      breakdown.revisionBonus = revisionPoints;
      totalPoints += revisionPoints;
  }


  return { totalPoints, breakdown };
}

/**
 * Calculates reward points for a question practice session.
 * @param questionData - Data about the questions solved and accuracy.
 * @returns Total points earned for the session.
 */
export function calculateQuestionReward(questionData: QuestionData): number {
  let totalPoints = 0;

  totalPoints += questionData.questionsCount * POINTS_REWARD.QUESTION_SOLVED;

  // Accuracy bonus
  if (questionData.accuracy >= 80) {
    totalPoints += 50; // Special bonus for high accuracy
  }

  return totalPoints;
}

/**
 * Calculates reward points for completing revision topics.
 * @param revisionTopicsCount - The number of topics revised.
 * @returns Total points for the revision session.
 */
export function calculateRevisionReward(revisionTopicsCount: number): number {
  return revisionTopicsCount * POINTS_REWARD.REVISION_COMPLETED;
}

/**
 * Calculates special daily bonus points based on overall performance for a day.
 * @param userId - The ID of the user.
 * @param date - The date to calculate bonuses for.
 * @returns Total daily bonus points.
 */
export async function calculateDailyReward(userId: string, date: Date): Promise<number> {
    const dateString = date.toISOString().split('T')[0];
    let dailyBonus = 0;

    const { data: blocks, error } = await supabaseBrowserClient
        .from('blocks')
        .select('start_time, duration')
        .eq('user_id', userId)
        .eq('date', dateString);

    if (error || !blocks) {
        console.error("Failed to fetch daily blocks for reward calculation:", error);
        return 0;
    }

    const totalStudySeconds = blocks.reduce((acc, block) => acc + (block.duration * 60), 0);
    const totalStudyHours = totalStudySeconds / 3600;

    // Daily goal met bonus
    if (totalStudyHours >= 10) {
        dailyBonus += POINTS_REWARD.DAILY_GOAL_MET;
    }

    // Early riser bonus
    const firstBlock = blocks.sort((a, b) => a.start_time.localeCompare(b.start_time))[0];
    if (firstBlock) {
        const firstBlockHour = parseInt(firstBlock.start_time.split(':')[0], 10);
        if (firstBlockHour < 7) {
            dailyBonus += POINTS_REWARD.EARLY_RISER_BONUS;
        }
    }
    
    // TODO: Add logic for NIGHT_OWL_PENALTY_AVOIDED
    // This would require comparing against completed sessions.

    return dailyBonus;
}

/**
 * Calculates streak-related bonus points.
 * @param currentStreak - The user's current consecutive day streak.
 * @returns Total points from streak bonuses.
 */
export function calculateStreakReward(currentStreak: number): number {
  if (currentStreak <= 0) return 0;
  
  let totalPoints = POINTS_REWARD.DAILY_STREAK; // Base daily streak points
  
  if (currentStreak > 0 && currentStreak % 7 === 0) {
    totalPoints += POINTS_REWARD.WEEKLY_GOAL_MET; // Weekly bonus
  }

  return totalPoints;
}


/**
 * Awards points to a user and logs the activity.
 * @param userId - The ID of the user to award points to.
 * @param points - The number of points to award.
 * @param activityType - A string describing the reason for the points.
 * @param details - Optional metadata about the activity.
 */
export async function awardPoints(
    userId: string, 
    points: number, 
    activityType: string,
    details?: object
) {
    if (points <= 0) return;

    const { data: currentGamification, error: fetchError } = await supabaseBrowserClient
        .from('user_gamification')
        .select('*')
        .eq('user_id', userId)
        .single();
    
    if (fetchError || !currentGamification) {
        console.error("Award Points: Could not fetch user gamification data.", fetchError);
        return;
    }

    const newTotalPoints = (currentGamification.total_points_earned || 0) + points;
    const newExperiencePoints = (currentGamification.experience_points || 0) + points;

    const { error: updateError } = await supabaseBrowserClient
        .from('user_gamification')
        .update({
            total_points_earned: newTotalPoints,
            experience_points: newExperiencePoints,
        })
        .eq('user_id', userId);

    if (updateError) {
        console.error("Award Points: Failed to update user points.", updateError);
        return;
    }

    // Log the activity to the history table
    const { error: historyError } = await supabaseBrowserClient
        .from('points_history')
        .insert({
            user_id: userId,
            points_awarded: points,
            reason: activityType,
            details: details as any,
        });
    
    if (historyError) {
        console.error("Award Points: Failed to log points history.", historyError);
    }
}
