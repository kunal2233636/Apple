
'use server';

import { supabaseBrowserClient } from '@/lib/supabase';
import { ACHIEVEMENTS, type Achievement } from './achievements-advanced';
import { awardPoints } from './reward-service';
import { awardBadge } from './service';
import type { Database } from '../database.types';
import { logAchievementUnlocked } from '../ai/activity-logger';

type AchievementProgress = Database['public']['Tables']['achievement_progress']['Row'];
type AchievementProgressInsert = Database['public']['Tables']['achievement_progress']['Insert'];

/**
 * Initializes the achievement progress records for a new user.
 * It iterates through all available achievements and creates a starting progress record for each one.
 * @param userId - The ID of the user.
 */
export async function initializeAchievements(userId: string) {
  const { data: existing, error: checkError } = await supabaseBrowserClient
    .from('achievement_progress')
    .select('achievement_id')
    .eq('user_id', userId);

  if (checkError) {
    console.error('Achievement Init: Failed to check existing achievements.', checkError);
    return;
  }

  const existingAchievementIds = new Set(existing.map(e => e.achievement_id));
  
  const achievementsToInsert: AchievementProgressInsert[] = ACHIEVEMENTS
    .filter(ach => !existingAchievementIds.has(ach.id))
    .map(achievement => ({
      user_id: userId,
      achievement_id: achievement.id,
      current_value: 0,
      is_completed: false,
    }));
    
  if (achievementsToInsert.length > 0) {
    const { error } = await supabaseBrowserClient
        .from('achievement_progress')
        .insert(achievementsToInsert);
    
    if (error) {
        console.error('Achievement Init: Failed to insert initial achievements.', error);
    } else {
        console.log(`[Achievements] Initialized ${achievementsToInsert.length} new achievements for user ${userId}.`);
    }
  }
}

/**
 * Updates the progress of a specific achievement for a user and checks if it's completed.
 * @param userId - The ID of the user.
 * @param achievementId - The ID of the achievement to update.
 * @param incrementValue - The value to add to the current progress.
 */
export async function updateAchievementProgress(userId: string, achievementId: number, incrementValue: number) {
  const { data: progress, error: fetchError } = await supabaseBrowserClient
    .from('achievement_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('achievement_id', achievementId)
    .single();

  if (fetchError || !progress || progress.is_completed) {
    if (progress?.is_completed) return; // Don't update completed achievements
    console.error(`Achievement Update: Could not fetch progress for achievement ${achievementId}.`, fetchError);
    return;
  }

  const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
  if (!achievement) return;

  const newValue = (progress.current_value || 0) + incrementValue;

  if (newValue >= achievement.target_value) {
    // Achievement Unlocked!
    const { error: updateError } = await supabaseBrowserClient
      .from('achievement_progress')
      .update({
        current_value: newValue,
        is_completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq('id', progress.id);

    if (updateError) {
      console.error(`Achievement Update: Failed to mark achievement ${achievementId} as complete.`, updateError);
    } else {
      // Award points
      await awardPoints(userId, achievement.points_reward, 'achievement_unlocked', { achievement: achievement.name });
      
      // Award a corresponding badge (if achievements are 1-to-1 with badges)
      await awardBadge(userId, {
        name: achievement.name,
        type: 'session', // This might need a new badge type, e.g., 'achievement'
        description: achievement.description,
        icon: achievement.icon,
        requirement: achievement.target_value,
      });

      console.log(`[Achievements] User ${userId} unlocked "${achievement.name}"!`);
      
      try {
        await logAchievementUnlocked(userId, achievement);
      } catch(logError) {
        console.error("Failed to log achievement unlocked:", logError);
      }
    }
  } else {
    // Just update the progress
    const { error: updateError } = await supabaseBrowserClient
      .from('achievement_progress')
      .update({ current_value: newValue })
      .eq('id', progress.id);
      
    if (updateError) {
      console.error(`Achievement Update: Failed to update progress for achievement ${achievementId}.`, updateError);
    }
  }
}

/**
 * Checks and updates relevant achievements after a block is completed.
 * @param userId - The ID of the user.
 * @param blockData - Data from the completed block.
 */
export async function checkAchievementsAfterBlock(userId: string, blockData: { type: string, duration: number, topicsCompleted: number }) {
  console.log('[Achievements] Checking achievements after block completion...');
  
  try {
    // Update total study time achievements
    if (blockData.duration > 0) {
        await updateAchievementProgress(userId, 4, blockData.duration); // Study Beast
        await updateAchievementProgress(userId, 5, blockData.duration); // Dedicated Grinder
    }

    // Update block completion achievements
    await updateAchievementProgress(userId, 6, 1); // Block Master (this is a simple increment, daily logic is more complex)
    
    // For "Perfect Week", a daily job would sum up weekly blocks. For now, we can increment another total counter.
    // Let's assume ID 22 for "Total Blocks Completed".
    // await updateAchievementProgress(userId, 22, 1);

    // Update revision achievements if it was a revision block
    if (blockData.type === 'Revision' && blockData.topicsCompleted > 0) {
        await updateAchievementProgress(userId, 10, blockData.topicsCompleted); // Never Forget
    }

    // Update topics completed achievements
    if (blockData.topicsCompleted > 0) {
        // Here you would check topic difficulty and update achievements 15 & 16.
        // This requires fetching topic details, so it's a more complex operation.
    }


  } catch(e) {
    console.error("Failed to check achievements after block", e);
  }
}

/**
 * Checks and updates daily achievements.
 * To be run by a scheduled function at the end of the day.
 * @param userId - The ID of the user.
 * @param date - The date to check for.
 */
export async function checkAchievementsDaily(userId: string, date: Date) {
    console.log(`[Achievements] Running daily check for user ${userId} for date ${date.toISOString()}...`);
    // Placeholder for a complex daily summary function.
    // This would calculate total study time, check for perfect day, etc.
}

/**
 * Gets all achievement progress for a user, joined with the static achievement data.
 * @param userId - The ID of the user.
 * @returns An array of achievement objects with their current progress.
 */
export async function getAchievementProgress(userId: string) {
    const { data: progressData, error } = await supabaseBrowserClient
        .from('achievement_progress')
        .select('*')
        .eq('user_id', userId);

    if (error) {
        console.error('Get Progress: Failed to fetch achievement progress.', error);
        return [];
    }

    return progressData.map(progress => {
        const achievement = ACHIEVEMENTS.find(a => a.id === progress.achievement_id);
        if (!achievement) return null;
        
        const percentage = Math.min(((progress.current_value || 0) / achievement.target_value) * 100, 100);

        return {
            ...achievement,
            ...progress,
            progress_percentage: percentage,
        };
    }).filter(Boolean);
}

/**
 * Gets all achievements a user has completed.
 * @param userId - The ID of the user.
 * @returns An array of completed achievement progress objects.
 */
export async function getUnlockedAchievements(userId: string) {
    const { data, error } = await supabaseBrowserClient
        .from('achievement_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('is_completed', true)
        .order('completed_at', { ascending: false });

    if (error) {
        console.error('Get Unlocked: Failed to fetch unlocked achievements.', error);
        return [];
    }
    return data;
}

/**
 * Gets the top 5 achievements the user is closest to unlocking.
 * @param userId - The ID of the user.
 * @returns An array of the top 5 closest uncompleted achievements.
 */
export async function getNextAchievements(userId: string) {
    const allProgress = await getAchievementProgress(userId);

    const uncompleted = allProgress.filter(p => !p.is_completed);

    uncompleted.sort((a, b) => b!.progress_percentage - a!.progress_percentage);
    
    return uncompleted.slice(0, 5);
}
