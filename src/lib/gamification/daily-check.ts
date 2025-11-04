
'use server';

import { supabaseBrowserClient } from '@/lib/supabase';
import {
  calculateAndApplyDailyPenalties,
  checkBlockSkippedPenalty,
  checkDailyStudyPenalty,
  checkRevisionQueuePenalty,
  applyPenalty,
} from './penalty-service';
import {
  calculateDailyReward,
  calculateStreakReward,
  awardPoints,
} from './reward-service';
import { checkAchievementsDaily, updateAchievementProgress } from './achievement-tracker';
import { startOfDay } from 'date-fns';

/**
 * Runs a comprehensive daily check for a user to apply all end-of-day gamification logic.
 * This function calculates and applies rewards for meeting goals and streaks, as well as penalties for missed targets.
 * @param userId - The ID of the user.
 * @param date - The date for which to run the daily check.
 */
export async function runDailyCheck(userId: string, date: Date) {
  console.log(`[Daily Check] Starting for user ${userId} for date ${date.toISOString()}`);

  const dateString = date.toISOString().split('T')[0];
  let totalPointsEarned = 0;
  let totalPenaltiesApplied = 0;

  try {
    // --- 1. Fetch Daily Data ---
    const { data: blocks, error: blocksError } = await supabaseBrowserClient
        .from('blocks')
        .select('id, start_time, duration')
        .eq('user_id', userId)
        .eq('date', dateString);

    if (blocksError) throw new Error(`Failed to fetch blocks: ${blocksError.message}`);

    const totalStudyTimeMinutes = blocks.reduce((sum, block) => sum + block.duration, 0);

    // --- 2. Calculate & Apply Rewards ---
    const dailyBonusPoints = await calculateDailyReward(userId, date);
    if (dailyBonusPoints > 0) {
        await awardPoints(userId, dailyBonusPoints, 'daily_bonus');
        totalPointsEarned += dailyBonusPoints;
    }
    
    // Streak reward (assuming this runs after a session confirms the streak for the day)
    const { data: gamificationData } = await supabaseBrowserClient.from('user_gamification').select('current_streak').eq('user_id', userId).single();
    const streakBonusPoints = calculateStreakReward(gamificationData?.current_streak || 0);
    if (streakBonusPoints > 0) {
        await awardPoints(userId, streakBonusPoints, 'streak_bonus');
        totalPointsEarned += streakBonusPoints;
    }

    // --- 3. Calculate & Apply Penalties ---
    const penalties = [];
    
    const studyPenalty = await checkDailyStudyPenalty(userId, date);
    if (studyPenalty) penalties.push(...studyPenalty);

    const revisionPenalty = await checkRevisionQueuePenalty(userId);
    if (revisionPenalty) penalties.push(...revisionPenalty);

    const skippedBlockPenalty = await checkBlockSkippedPenalty(userId, date);
    if (skippedBlockPenalty) penalties.push(...skippedBlockPenalty);

    for (const penalty of penalties) {
        await applyPenalty(userId, penalty);
        totalPenaltiesApplied += penalty.points_deducted;
    }
    
    // --- 4. Update Achievements ---
    // This function will need to be implemented with the specific logic for daily achievements.
    await checkAchievementsDaily(userId, date);
    
    // Example: Update "Perfect Day" if no penalties were applied
    if (penalties.length === 0 && blocks.length > 0) {
        await updateAchievementProgress(userId, 20, 1);
    }


    // --- 5. Log Summary ---
    const netPoints = totalPointsEarned + totalPenaltiesApplied; // Penalties are negative
    await supabaseBrowserClient.from('points_history').insert({
        user_id: userId,
        points_awarded: netPoints,
        reason: 'daily_summary',
        details: {
            rewards: totalPointsEarned,
            penalties: totalPenaltiesApplied,
            date: dateString,
        },
    });

    console.log(`[Daily Check] Completed for user ${userId}. Rewards: ${totalPointsEarned}, Penalties: ${totalPenaltiesApplied}, Net: ${netPoints}`);

  } catch (error: any) {
    console.error(`[Daily Check] Failed for user ${userId}:`, error.message);
  }
}

/**
 * Simulates a scheduled task to run the daily check for all active users.
 * In a real-world application, this would be a cron job.
 */
export async function scheduleDailyCheck() {
  console.log('[Scheduler] Starting daily check for all users...');
  
  const yesterday = startOfDay(new Date());
  yesterday.setDate(yesterday.getDate() - 1);

  // Fetch users who were active yesterday to avoid checking dormant accounts
  const { data: users, error } = await supabaseBrowserClient
    .from('sessions')
    .select('user_id', { count: 'exact' })
    .gte('created_at', yesterday.toISOString());
    
  if (error || !users) {
    console.error('[Scheduler] Failed to fetch active users.', error);
    return;
  }
  
  const uniqueUserIds = [...new Set(users.map(u => u.user_id))];

  console.log(`[Scheduler] Found ${uniqueUserIds.length} active users to process.`);

  for (const userId of uniqueUserIds) {
    await runDailyCheck(userId, yesterday);
  }

  console.log('[Scheduler] Finished daily checks for all active users.');
}

