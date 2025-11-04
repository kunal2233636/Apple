
'use server';

import { supabaseBrowserClient } from '@/lib/supabase';
import { isToday, isYesterday, isBefore, startOfDay } from 'date-fns';
import { getUserGamification } from './service';
import { POINTS_SYSTEM } from './points';
import type { Database } from '../database.types';

type PointsHistoryInsert = Database['public']['Tables']['points_history']['Insert'];

/**
 * Checks the user's streak status. If the last activity was before yesterday,
 * it resets the current streak to 0.
 * @param userId The ID of the user to check.
 */
export async function checkStreakStatus(userId: string) {
  const { data: gamificationData, error } = await getUserGamification(userId);

  if (error || !gamificationData) {
    console.error('Streak Check: Could not get user gamification data.', error);
    return;
  }

  const { last_activity_date, current_streak } = gamificationData;

  if (!last_activity_date) {
    // No activity yet, nothing to do.
    return;
  }

  const lastActivity = startOfDay(new Date(last_activity_date));
  const today = startOfDay(new Date());

  if (isToday(lastActivity) || isYesterday(lastActivity)) {
    // Streak is intact, do nothing.
    return;
  }

  // If last activity was before yesterday and streak is not already 0, reset it.
  if (current_streak !== 0) {
    console.log(`[Streak] User ${userId} streak broken. Resetting to 0.`);
    const { error: updateError } = await supabaseBrowserClient
      .from('user_gamification')
      .update({ current_streak: 0 })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Streak Check: Failed to reset streak.', updateError);
    }
  }
}

/**
 * Marks a daily activity for the user, updating their streak and awarding bonuses if applicable.
 * This should be called only for the user's first completed session of the day.
 * @param userId The ID of the user.
 * @returns An object indicating if points were awarded and for what reason.
 */
export async function markDailyActivity(userId: string) {
  const { data: gamificationData, error } = await getUserGamification(userId);

  if (error || !gamificationData) {
    console.error('Mark Activity: Could not get user gamification data.', error);
    return { pointsAwarded: 0, reason: null };
  }

  const { last_activity_date } = gamificationData;
  const today = new Date();
  let pointsToAward = 0;
  let pointsReason: 'daily_streak_bonus' | 'weekly_streak_bonus' | 'monthly_streak_bonus' | null = null;
  let newStreak = 1;

  if (last_activity_date) {
    const lastActivity = startOfDay(new Date(last_activity_date));
    
    if (isToday(lastActivity)) {
      // Activity for today has already been marked.
      return { pointsAwarded: 0, reason: null };
    }
    
    if (isYesterday(lastActivity)) {
      // Streak continues
      newStreak = (gamificationData.current_streak || 0) + 1;
    }
  }

  // Check for streak bonuses
  if (newStreak === 30) {
    pointsToAward = POINTS_SYSTEM.monthlyStreakBonus;
    pointsReason = 'monthly_streak_bonus';
  } else if (newStreak === 7) {
    pointsToAward = POINTS_SYSTEM.weeklyStreakBonus;
    pointsReason = 'weekly_streak_bonus';
  } else if (newStreak > 0) {
      pointsToAward = POINTS_SYSTEM.dailyStreakBonus;
      pointsReason = 'daily_streak_bonus';
  }

  const newLongestStreak = Math.max(newStreak, gamificationData.longest_streak || 0);
  const newTotalPoints = (gamificationData.total_points_earned || 0) + pointsToAward;

  // Update the user_gamification table
  const { error: updateError } = await supabaseBrowserClient
    .from('user_gamification')
    .update({
      current_streak: newStreak,
      longest_streak: newLongestStreak,
      last_activity_date: today.toISOString(),
      total_points_earned: newTotalPoints,
      experience_points: (gamificationData.experience_points || 0) + pointsToAward,
    })
    .eq('user_id', userId);

  if (updateError) {
    console.error('Mark Activity: Failed to update streak.', updateError);
    return { pointsAwarded: 0, reason: null };
  }

  // If points were awarded, log them to history
  if (pointsToAward > 0 && pointsReason) {
    const historyRecord: PointsHistoryInsert = {
        user_id: userId,
        points_awarded: pointsToAward,
        reason: pointsReason,
        details: { newStreak: newStreak },
    };
    const { error: historyError } = await supabaseBrowserClient
        .from('points_history')
        .insert(historyRecord);
    
    if (historyError) {
        console.error('Mark Activity: Failed to log points history for streak bonus.', historyError);
    }
  }

  console.log(`[Streak] User ${userId} activity marked. New streak: ${newStreak}. Points awarded: ${pointsToAward}`);
  return { pointsAwarded: pointsToAward, reason: pointsReason };
}
