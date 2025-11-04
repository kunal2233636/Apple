

import { supabaseBrowserClient } from '@/lib/supabase';
import { startOfDay, isBefore } from 'date-fns';
import { POINTS_PENALTY } from './points-advanced';
import type { Database } from '@/lib/database.types';
import { logPenaltyApplied } from '@/lib/ai/activity-logger';

type Penalty = {
  user_id: string;
  penalty_type: keyof typeof POINTS_PENALTY;
  points_deducted: number;
  reason: string;
  related_entity_id?: string; // e.g., block_id, topic_id
};

/**
 * Applies a penalty to a user, updating their gamification stats and logging the penalty.
 * @param userId - The ID of the user to penalize.
 * @param penalty - The penalty object.
 */
export async function applyPenalty(userId: string, penalty: Omit<Penalty, 'user_id'>) {
  const { data: gamificationData, error: fetchError } = await (supabaseBrowserClient
    .from('user_gamification')
    .select('*')
    .eq('user_id', userId)
    .single() as any);

  if (fetchError || !gamificationData) {
    console.error('Apply Penalty: Could not fetch user gamification data.', fetchError);
    return;
  }

  const newExperiencePoints = ((gamificationData as any).experience_points || 0) + penalty.points_deducted;

  const { error: updateError } = await ((supabaseBrowserClient
    .from('user_gamification') as any)
    .update({
      experience_points: newExperiencePoints,
    })
    .eq('user_id', userId) as any);

  if (updateError) {
    console.error('Apply Penalty: Failed to update user points.', updateError);
    return;
  }

  // Note: user_penalties table may not exist in current schema
  // In a real implementation, you would create this table or use activity_logs instead
  try {
    // Try to log to activity_logs instead of user_penalties
    await logPenaltyApplied(userId, { ...penalty, user_id: userId });
  } catch(logError) {
    console.error("Failed to log penalty:", logError);
    // Continue even if logging fails - the penalty was still applied to experience points
  }
}

/**
 * Checks if a user has studied for less than the daily goal (e.g., 10 hours).
 * @param userId - The ID of the user.
 * @param date - The date to check.
 * @returns A penalty object if the goal is not met, otherwise null.
 */
export async function checkDailyStudyPenalty(userId: string, date: Date): Promise<Penalty[] | null> {
  const dateString = date.toISOString().split('T')[0];
  const { data: sessions, error } = await (supabaseBrowserClient
    .from('sessions')
    .select('duration_minutes')
    .eq('user_id', userId)
    .gte('created_at', `${dateString}T00:00:00.000Z`)
    .lte('created_at', `${dateString}T23:59:59.999Z`) as any);
  
  if (error) {
    console.error('Daily Study Penalty: Error fetching sessions.', error);
    return null;
  }

  const totalStudyMinutes = (sessions as any[]).reduce((acc, s: any) => acc + (s.duration_minutes || 0), 0);

  if (totalStudyMinutes < 600) {
    return [{
      user_id: userId,
      penalty_type: 'STUDY_BELOW_10_HOURS',
      points_deducted: POINTS_PENALTY.STUDY_BELOW_10_HOURS,
      reason: `Studied for only ${totalStudyMinutes.toFixed(0)} minutes, which is less than the 10-hour goal.`,
    }];
  }

  return null;
}

/**
 * Checks if a user has studied for less than 2 hours of boards block content in a day.
 * @param userId - The ID of the user.
 * @param date - The date to check.
 * @returns A penalty object if the goal is not met, otherwise null.
 */
export async function checkBoardBlockPenalty(userId: string, date: Date): Promise<Penalty[] | null> {
  const dateString = date.toISOString().split('T')[0];
  
  // Note: This function needs to be adapted based on the actual database schema
  // For now, return null as the board block detection requires schema changes
  return null;
}

/**
 * Checks for overdue topics in the user's revision schedule.
 * @param userId - The ID of the user.
 * @returns An array of penalty objects for each overdue topic.
 */
export async function checkRevisionQueuePenalty(userId: string): Promise<Penalty[] | null> {
    const today = startOfDay(new Date());
    const { data: overdueTopics, error } = await (supabaseBrowserClient
      .from('topics')
      .select('id, name, next_revision_date')
      .eq('user_id', userId)
      .eq('is_in_spare', true)
      .lt('revision_count', 5)
      .lt('next_revision_date', today.toISOString()) as any);

    if (error) {
        console.error('Revision Queue Penalty: Error fetching overdue topics.', error);
        return null;
    }

    if (!overdueTopics || overdueTopics.length === 0) {
        return null;
    }

    return overdueTopics.map((topic: any) => ({
        user_id: userId,
        penalty_type: 'REVISION_QUEUE_OVERFLOW',
        points_deducted: POINTS_PENALTY.REVISION_QUEUE_OVERFLOW,
        reason: `Revision for topic "${topic.name}" was due on ${topic.next_revision_date}.`,
        related_entity_id: String(topic.id),
    }));
}


/**
 * Calculates penalty for wrong answers in a question block.
 * @param userId - The ID of the user.
 * @param blockId - The ID of the question block.
 * @param wrongAnswersCount - The number of questions answered incorrectly.
 * @returns A single penalty object.
 */
export function checkWrongAnswerPenalty(userId: string, blockId: string, wrongAnswersCount: number): Penalty | null {
    if (wrongAnswersCount <= 0) return null;

    return {
        user_id: userId,
        penalty_type: 'WRONG_ANSWER',
        points_deducted: wrongAnswersCount * POINTS_PENALTY.WRONG_ANSWER,
        reason: `${wrongAnswersCount} incorrect answers in question practice.`,
        related_entity_id: blockId,
    };
}

/**
 * Calculates the total actual duration for all sessions of a specific block.
 * This is used for tracking and penalty calculation.
 * @param userId - The ID of the user.
 * @param blockId - The ID of the block.
 * @param sessionDate - The date of the sessions (optional, if not provided, gets all sessions).
 * @returns Total duration in minutes.
 */
export async function calculateActualBlockDuration(
  userId: string,
  blockId: string,
  sessionDate?: Date
): Promise<number> {
  let query = supabaseBrowserClient
    .from('sessions')
    .select('duration_minutes')
    .eq('user_id', userId)
    .eq('block_id', blockId);

  if (sessionDate) {
    const dateString = sessionDate.toISOString().split('T')[0];
    query = query
      .gte('created_at', `${dateString}T00:00:00.000Z`)
      .lte('created_at', `${dateString}T23:59:59.999Z`);
  }

  const { data: sessions, error } = await (query as any);

  if (error || !sessions) {
    console.error('Error calculating actual block duration:', error);
    return 0;
  }

  return (sessions as any[]).reduce((total: number, session: any) => {
    return total + (session.duration_minutes || 0);
  }, 0);
}

/**
 * Gets the planned duration for a block from the database.
 * @param userId - The ID of the user.
 * @param blockId - The ID of the block.
 * @returns Planned duration in minutes, or 0 if not found.
 */
export async function getPlannedBlockDuration(userId: string, blockId: string): Promise<number> {
  const { data: blockData, error } = await (supabaseBrowserClient
    .from('blocks')
    .select('duration')
    .eq('id', blockId)
    .eq('user_id', userId)
    .single() as any);

  if (error || !blockData) {
    console.error('Error fetching planned block duration:', error);
    return 0;
  }

  return (blockData as any).duration || 0;
}

/**
 * Checks if a block has exceeded its planned duration and applies penalty if needed.
 * This function is typically called when a session is completed or at the end of a day.
 * @param userId - The ID of the user.
 * @param blockId - The ID of the block.
 * @param sessionDate - The date of the session (optional).
 * @returns Penalty object if excess time found, otherwise null.
 */
export async function checkAndApplyBlockTimePenalty(
  userId: string,
  blockId: string,
  sessionDate?: Date
): Promise<Penalty | null> {
  const actualDuration = await calculateActualBlockDuration(userId, blockId, sessionDate);
  const plannedDuration = await getPlannedBlockDuration(userId, blockId);

  // Use the basic time exceeded penalty function
  return await checkTimeExceededPenalty(userId, blockId, plannedDuration, actualDuration);
}

/**
 * Tracks cumulative time exceeded for a user across all blocks and sessions.
 * This can be used for analytics and future time deduction logic.
 * @param userId - The ID of the user.
 * @param dateRange - Optional date range to check (defaults to today).
 * @returns Object with total exceeded time and breakdown by blocks.
 */
export async function trackCumulativeTimeExceeded(
  userId: string,
  dateRange?: { start: Date; end: Date }
): Promise<{
  totalExceededMinutes: number;
  totalExceededSeconds: number;
  blocksExceeded: Array<{
    blockId: string;
    blockTitle: string;
    exceededMinutes: number;
    exceededSeconds: number;
    pointsPenalty: number;
  }>;
}> {
  const startDate = dateRange?.start || new Date();
  const endDate = dateRange?.end || new Date();
  const dateString = startDate.toISOString().split('T')[0];

  // Get all completed blocks for the date range
  const { data: completedBlocks, error: blocksError } = await (supabaseBrowserClient
    .from('blocks')
    .select('id, title, duration')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('date', dateString)
    .lte('date', endDate.toISOString().split('T')[0]) as any);

  if (blocksError || !completedBlocks) {
    console.error('Error fetching completed blocks:', blocksError);
    return {
      totalExceededMinutes: 0,
      totalExceededSeconds: 0,
      blocksExceeded: []
    };
  }

  let totalExceededSeconds = 0;
  const blocksExceeded: Array<{
    blockId: string;
    blockTitle: string;
    exceededMinutes: number;
    exceededSeconds: number;
    pointsPenalty: number;
  }> = [];

  // Check each block for time exceeded
  for (const block of completedBlocks as any[]) {
    const actualDuration = await calculateActualBlockDuration(userId, block.id, startDate);
    const plannedDuration = block.duration || 0;
    
    const exceededMinutes = Math.max(0, actualDuration - plannedDuration);
    const exceededSeconds = exceededMinutes * 60;
    
    if (exceededMinutes > 0) {
      const pointsPenalty = exceededSeconds * POINTS_PENALTY.TIME_EXCEEDED_PENALTY;
      
      blocksExceeded.push({
        blockId: block.id,
        blockTitle: block.title || 'Untitled',
        exceededMinutes,
        exceededSeconds,
        pointsPenalty
      });
      
      totalExceededSeconds += exceededSeconds;
    }
  }

  return {
    totalExceededMinutes: totalExceededSeconds / 60,
    totalExceededSeconds,
    blocksExceeded
  };
}


/**
 * Checks for any planned blocks that were not completed for a given date.
 * @param userId - The ID of the user.
 * @param date - The date to check for skipped blocks.
 * @returns An array of penalty objects for each skipped block.
 */
export async function checkBlockSkippedPenalty(userId: string, date: Date): Promise<Penalty[] | null> {
    const dateString = date.toISOString().split('T')[0];

    const { data: plannedBlocks, error: blocksError } = await (supabaseBrowserClient
      .from('blocks')
      .select('id, title')
      .eq('user_id', userId)
      .eq('date', dateString) as any);

    if (blocksError) {
        console.error('Block Skipped Penalty: Error fetching planned blocks.', blocksError);
        return null;
    }

    const { data: completedSessions, error: sessionsError } = await (supabaseBrowserClient
      .from('sessions')
      .select('block_id')
      .in('block_id', (plannedBlocks as any[]).map((b: any) => b.id)) as any);

    if (sessionsError) {
        console.error('Block Skipped Penalty: Error fetching completed sessions.', sessionsError);
        return null;
    }

    const completedBlockIds = new Set((completedSessions as any[]).map((s: any) => s.block_id));
    const skippedBlocks = (plannedBlocks as any[]).filter((block: any) => !completedBlockIds.has(block.id));

    if (skippedBlocks.length === 0) {
        return null;
    }

    return skippedBlocks.map((block: any) => ({
        user_id: userId,
        penalty_type: 'BLOCK_SKIPPED',
        points_deducted: POINTS_PENALTY.BLOCK_SKIPPED,
        reason: `Skipped planned block: ${block.title || 'Untitled'}.`,
        related_entity_id: block.id,
    }));
}


/**
 * Checks if the total session duration exceeds the planned duration and applies time-exceeded penalty.
 * @param userId - The ID of the user.
 * @param blockId - The ID of the block/session.
 * @param totalPlannedDuration - The total planned duration in minutes.
 * @param actualTotalDuration - The actual total duration in minutes.
 * @returns A penalty object if excess time is found, otherwise null.
 */
export async function checkTimeExceededPenalty(
  userId: string,
  blockId: string,
  totalPlannedDuration: number, // in minutes
  actualTotalDuration: number   // in minutes
): Promise<Penalty | null> {
  // Calculate excess time in minutes
  const excessMinutes = Math.max(0, actualTotalDuration - totalPlannedDuration);
  
  // If no excess time, return null
  if (excessMinutes <= 0) {
    return null;
  }
  
  // Convert excess time to seconds and calculate penalty
  const excessSeconds = excessMinutes * 60;
  const pointsDeducted = excessSeconds * POINTS_PENALTY.TIME_EXCEEDED_PENALTY;
  
  return {
    user_id: userId,
    penalty_type: 'TIME_EXCEEDED_PENALTY',
    points_deducted: pointsDeducted,
    reason: `Session exceeded planned duration by ${excessMinutes.toFixed(1)} minutes (${excessSeconds} seconds).`,
    related_entity_id: blockId,
  };
}

/**
 * Advanced function to check time exceeded penalty by fetching session data from database.
 * This function is typically called during session completion to check total duration.
 * @param userId - The ID of the user.
 * @param blockId - The ID of the block/session.
 * @param sessionDate - The date of the session to check.
 * @returns A penalty object if excess time is found, otherwise null.
 */
export async function checkTimeExceededPenaltyFromDB(
  userId: string,
  blockId: string,
  sessionDate: Date
): Promise<Penalty | null> {
  const dateString = sessionDate.toISOString().split('T')[0];
  
  // Get the block to understand planned duration
  const { data: blockData, error: blockError } = await (supabaseBrowserClient
    .from('blocks')
    .select('duration, title')
    .eq('id', blockId)
    .eq('user_id', userId)
    .single() as any);
    
  if (blockError || !blockData) {
    console.error('Time Exceeded Penalty: Could not fetch block data.', blockError);
    return null;
  }
  
  // Get all sessions for this block on the specified date
  const { data: sessions, error: sessionsError } = await (supabaseBrowserClient
    .from('sessions')
    .select('duration_minutes, session_type')
    .eq('user_id', userId)
    .eq('block_id', blockId)
    .gte('created_at', `${dateString}T00:00:00.000Z`)
    .lte('created_at', `${dateString}T23:59:59.999Z`) as any);
    
  if (sessionsError) {
    console.error('Time Exceeded Penalty: Could not fetch session data.', sessionsError);
    return null;
  }
  
  if (!sessions || sessions.length === 0) {
    return null;
  }
  
  // Calculate actual total duration (sum of all session durations)
  const actualTotalMinutes = sessions.reduce((acc: number, session: any) => {
    return acc + (session.duration_minutes || 0);
  }, 0);
  
  const plannedDuration = (blockData as any).duration || 0;
  
  // Apply the same logic as the basic function
  const excessMinutes = Math.max(0, actualTotalMinutes - plannedDuration);
  
  if (excessMinutes <= 0) {
    return null;
  }
  
  const excessSeconds = excessMinutes * 60;
  const pointsDeducted = excessSeconds * POINTS_PENALTY.TIME_EXCEEDED_PENALTY;
  
  return {
    user_id: userId,
    penalty_type: 'TIME_EXCEEDED_PENALTY',
    points_deducted: pointsDeducted,
    reason: `Session "${(blockData as any).title}" exceeded planned duration by ${excessMinutes.toFixed(1)} minutes (${excessSeconds} seconds).`,
    related_entity_id: blockId,
  };
}

/**
 * Interface for tracking excess time that needs to be deducted from future sessions.
 */
interface TimeExcessRecord {
  id: string;
  user_id: string;
  original_block_id: string;
  excess_minutes: number;
  excess_seconds: number;
  created_at: string;
  applied_to_block_id?: string;
  applied_at?: string;
  status: 'pending' | 'applied' | 'cancelled';
}

/**
 * Tracks excess time that should be deducted from future sessions.
 * This is called when a block exceeds its planned duration.
 * @param userId - The ID of the user.
 * @param originalBlockId - The ID of the block that exceeded time.
 * @param excessMinutes - The amount of excess time in minutes.
 * @returns Promise<TimeExcessRecord> - The created record.
 */
export async function trackExcessTimeForDeduction(
  userId: string,
  originalBlockId: string,
  excessMinutes: number
): Promise<TimeExcessRecord> {
  const excessSeconds = excessMinutes * 60;
  const record: TimeExcessRecord = {
    id: `excess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    user_id: userId,
    original_block_id: originalBlockId,
    excess_minutes: excessMinutes,
    excess_seconds: excessSeconds,
    created_at: new Date().toISOString(),
    status: 'pending'
  };

  // In a real implementation, you would store this in a database table
  // For now, we'll return the record and log it
  console.log(`[Time Deduction] Tracking excess time: ${excessMinutes.toFixed(1)} minutes for user ${userId}`, record);
  
  return record;
}

/**
 * Gets all pending excess time records for a user.
 * @param userId - The ID of the user.
 * @returns Array of pending TimeExcessRecord objects.
 */
export async function getPendingExcessTime(userId: string): Promise<TimeExcessRecord[]> {
  // In a real implementation, this would query a database table
  // For now, return an empty array as we don't have the table
  console.log(`[Time Deduction] Getting pending excess time for user ${userId}`);
  return [];
}

/**
 * Applies time deduction to a specific future session.
 * This reduces the planned duration of the target session by the excess amount.
 * @param userId - The ID of the user.
 * @param targetBlockId - The ID of the block/session to deduct time from.
 * @param excessRecordId - The ID of the excess time record to apply.
 * @returns Promise<boolean> - Success status.
 */
export async function applyTimeDeduction(
  userId: string,
  targetBlockId: string,
  excessRecordId: string
): Promise<boolean> {
  try {
    // Get the excess record
    const pendingExcess = await getPendingExcessTime(userId);
    const excess = pendingExcess.find(e => e.id === excessRecordId);
    
    if (!excess) {
      console.error(`[Time Deduction] Excess record ${excessRecordId} not found for user ${userId}`);
      return false;
    }

    // Get the target block's current planned duration
    const { data: blockData, error: blockError } = await (supabaseBrowserClient
      .from('blocks')
      .select('duration, title')
      .eq('id', targetBlockId)
      .eq('user_id', userId)
      .single() as any);

    if (blockError || !blockData) {
      console.error('[Time Deduction] Target block not found:', blockError);
      return false;
    }

    const currentDuration = (blockData as any).duration || 0;
    const newDuration = Math.max(0, currentDuration - excess.excess_minutes);

    if (newDuration === currentDuration) {
      console.log(`[Time Deduction] No time deduction applied - duration would remain ${currentDuration}`);
      return false;
    }

    // Update the block's duration
    const { error: updateError } = await ((supabaseBrowserClient
      .from('blocks') as any)
      .update({ duration: newDuration })
      .eq('id', targetBlockId)
      .eq('user_id', userId) as any);

    if (updateError) {
      console.error('[Time Deduction] Failed to update block duration:', updateError);
      return false;
    }

    console.log(`[Time Deduction] Applied ${excess.excess_minutes.toFixed(1)} minutes deduction to block ${targetBlockId}: ${currentDuration} -> ${newDuration} minutes`);

    // In a real implementation, you would update the excess record status to 'applied'
    // and store the applied_to_block_id and applied_at timestamp
    
    return true;
  } catch (error) {
    console.error('[Time Deduction] Error applying time deduction:', error);
    return false;
  }
}

/**
 * Automatically applies time deductions to future sessions.
 * Priority: 1) Next break sessions, 2) Next study sessions, 3) Track for future
 * @param userId - The ID of the user.
 * @param excessMinutes - Total excess minutes to deduct.
 * @param currentDate - Current date (defaults to today).
 * @returns Promise<{applied: number, remaining: number}> - Applied and remaining excess time.
 */
export async function autoApplyTimeDeductions(
  userId: string,
  excessMinutes: number,
  currentDate: Date = new Date()
): Promise<{applied: number; remaining: number}> {
  let remainingExcess = excessMinutes;
  let appliedExcess = 0;

  try {
    // Get future blocks (starting from tomorrow)
    const tomorrow = new Date(currentDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowString = tomorrow.toISOString().split('T')[0];

    const { data: futureBlocks, error } = await (supabaseBrowserClient
      .from('blocks')
      .select('id, title, type, duration')
      .eq('user_id', userId)
      .gte('date', tomorrowString)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true }) as any);

    if (error || !futureBlocks) {
      console.error('[Time Deduction] Error fetching future blocks:', error);
      return { applied: 0, remaining: excessMinutes };
    }

    // Priority 1: Apply to break sessions first
    const breakBlocks = (futureBlocks as any[]).filter(block =>
      (block as any).type === 'Break' || (block as any).title?.toLowerCase().includes('break')
    );

    for (const breakBlock of breakBlocks) {
      if (remainingExcess <= 0) break;

      const blockDuration = (breakBlock as any).duration || 0;
      const deductionAmount = Math.min(remainingExcess, blockDuration);
      
      if (deductionAmount > 0) {
        const success = await applyTimeDeduction(
          userId,
          breakBlock.id,
          `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        );
        
        if (success) {
          appliedExcess += deductionAmount;
          remainingExcess -= deductionAmount;
        }
      }
    }

    // Priority 2: Apply to study sessions if excess remains
    if (remainingExcess > 0) {
      const studyBlocks = (futureBlocks as any[]).filter(block =>
        (block as any).type === 'Study' || !((block as any).title?.toLowerCase().includes('break'))
      );

      for (const studyBlock of studyBlocks) {
        if (remainingExcess <= 0) break;

        const blockDuration = (studyBlock as any).duration || 0;
        const deductionAmount = Math.min(remainingExcess, blockDuration);
        
        if (deductionAmount > 0) {
          const success = await applyTimeDeduction(
            userId,
            studyBlock.id,
            `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          );
          
          if (success) {
            appliedExcess += deductionAmount;
            remainingExcess -= deductionAmount;
          }
        }
      }
    }

    // Priority 3: Track remaining excess for future application
    if (remainingExcess > 0) {
      await trackExcessTimeForDeduction(userId, 'cumulative', remainingExcess);
      console.log(`[Time Deduction] Tracked ${remainingExcess.toFixed(1)} minutes for future deduction`);
    }

    return { applied: appliedExcess, remaining: remainingExcess };
  } catch (error) {
    console.error('[Time Deduction] Error in auto apply:', error);
    return { applied: appliedExcess, remaining: remainingExcess };
  }
}

/**
 * A master function to calculate and apply all daily penalties for a user.
 * This would typically be run by a scheduled job (e.g., a cron job) at the end of each day.
 * @param userId - The ID of the user.
 * @param date - The date for which to calculate penalties.
 */
export async function calculateAndApplyDailyPenalties(userId: string, date: Date) {
    console.log(`[Penalty Service] Calculating daily penalties for user ${userId} for date ${date.toISOString()}`);
    
    const penaltiesToApply: Penalty[] = [];

    const studyPenalty = await checkDailyStudyPenalty(userId, date);
    if (studyPenalty) penaltiesToApply.push(...studyPenalty);

    const boardPenalty = await checkBoardBlockPenalty(userId, date);
    if (boardPenalty) penaltiesToApply.push(...boardPenalty);

    const revisionPenalty = await checkRevisionQueuePenalty(userId);
    if (revisionPenalty) penaltiesToApply.push(...revisionPenalty);

    const skippedBlockPenalty = await checkBlockSkippedPenalty(userId, date);
    if (skippedBlockPenalty) penaltiesToApply.push(...skippedBlockPenalty);

    // Check for time exceeded penalties for all blocks completed on this date
    const timeExceededPenalties = await checkTimeExceededPenaltiesForDate(userId, date);
    if (timeExceededPenalties) penaltiesToApply.push(...timeExceededPenalties);

    if (penaltiesToApply.length === 0) {
        console.log(`[Penalty Service] No penalties to apply for user ${userId}.`);
        return;
    }
    
    console.log(`[Penalty Service] Applying ${penaltiesToApply.length} penalties for user ${userId}.`);
    
    for (const penalty of penaltiesToApply) {
        // In a real scenario, you might want to batch these updates.
        await applyPenalty(userId, penalty);
    }
    
    console.log(`[Penalty Service] Finished applying penalties for user ${userId}.`);
}

/**
 * Checks time exceeded penalties for all blocks completed on a specific date.
 * This is called from the main penalty calculation function.
 * @param userId - The ID of the user.
 * @param date - The date to check.
 * @returns An array of penalty objects for each block that exceeded its planned duration.
 */
export async function checkTimeExceededPenaltiesForDate(userId: string, date: Date): Promise<Penalty[] | null> {
    const dateString = date.toISOString().split('T')[0];
    
    // Get all blocks completed on this date
    const { data: completedBlocks, error: blocksError } = await (supabaseBrowserClient
        .from('blocks')
        .select('id, duration')
        .eq('user_id', userId)
        .eq('date', dateString)
        .eq('status', 'completed') as any);
    
    if (blocksError || !completedBlocks || completedBlocks.length === 0) {
        return null;
    }
    
    const penalties: Penalty[] = [];
    
    // Check each completed block for time exceeded penalty
    for (const block of completedBlocks) {
        const penalty = await checkTimeExceededPenaltyFromDB(userId, block.id, date);
        if (penalty) {
            penalties.push(penalty);
        }
    }
    
    return penalties.length > 0 ? penalties : null;
}
