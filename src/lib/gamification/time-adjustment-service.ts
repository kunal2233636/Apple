'use client';

import { supabaseBrowserClient } from '@/lib/supabase';
import { applyPenalty } from './penalty-service';

/**
 * Interface for time adjustment result
 */
interface TimeAdjustmentResult {
  adjusted: boolean;
  penaltyPoints?: number;
  penaltyReason?: string;
  originalStartTime: string;
  newStartTime: string;
  delaySeconds: number;
}

/**
 * Calculates time delay and applies automatic time adjustment with penalties
 * @param userId - The ID of the user
 * @param blockId - The ID of the block
 * @param scheduledStartTime - The originally scheduled start time
 * @returns Promise<TimeAdjustmentResult>
 */
export async function calculateAndApplyTimeAdjustment(
  userId: string,
  blockId: string,
  scheduledStartTime: string
): Promise<TimeAdjustmentResult> {
  const currentTime = new Date();
  const scheduledTime = new Date(scheduledStartTime);
  
  // Calculate delay in seconds
  const delaySeconds = Math.max(0, Math.floor((currentTime.getTime() - scheduledTime.getTime()) / 1000));
  
  // If on time or early, no adjustment needed
  if (delaySeconds <= 0) {
    return {
      adjusted: false,
      originalStartTime: scheduledStartTime,
      newStartTime: scheduledStartTime,
      delaySeconds: 0
    };
  }
  
  // Calculate penalty: 10 points per second of delay
  const penaltyPoints = delaySeconds * 10;
  const penaltyReason = `Started ${delaySeconds} seconds late`;
  
  // Auto-adjust start time to current time + 1 minute
  const newStartTime = new Date(currentTime.getTime() + 60 * 1000); // +1 minute
  const newStartTimeString = newStartTime.toISOString();
  
  try {
    // Update block start time in database
    const { error: updateError } = await supabaseBrowserClient
      .from('blocks')
      .update({ 
        start_time: newStartTimeString,
        updated_at: currentTime.toISOString()
      })
      .eq('id', blockId)
      .eq('user_id', userId);
    
    if (updateError) {
      console.error('Failed to update block start time:', updateError);
      throw updateError;
    }
    
    // Apply penalty to user's points
    const penalty = {
      penalty_type: 'LATE_START_DELAY' as const,
      points_deducted: penaltyPoints,
      reason: penaltyReason,
      related_entity_id: blockId,
    };
    
    await applyPenalty(userId, penalty);
    
    return {
      adjusted: true,
      penaltyPoints,
      penaltyReason,
      originalStartTime: scheduledStartTime,
      newStartTime: newStartTimeString,
      delaySeconds
    };
    
  } catch (error) {
    console.error('Error applying time adjustment:', error);
    // Even if DB update fails, apply the penalty for accountability
    const penalty = {
      penalty_type: 'LATE_START_DELAY' as const,
      points_deducted: penaltyPoints,
      reason: `${penaltyReason} (time adjustment failed)`,
      related_entity_id: blockId,
    };
    
    await applyPenalty(userId, penalty);
    
    return {
      adjusted: false, // Indicates the time adjustment failed
      penaltyPoints,
      penaltyReason: `${penaltyReason} (time adjustment failed)`,
      originalStartTime: scheduledStartTime,
      newStartTime: scheduledStartTime,
      delaySeconds
    };
  }
}

/**
 * Formats delay duration for user-friendly display
 * @param delaySeconds - The delay in seconds
 * @returns Formatted delay string
 */
export function formatDelay(delaySeconds: number): string {
  if (delaySeconds < 60) {
    return `${delaySeconds} second${delaySeconds !== 1 ? 's' : ''}`;
  } else if (delaySeconds < 3600) {
    const minutes = Math.floor(delaySeconds / 60);
    const remainingSeconds = delaySeconds % 60;
    return remainingSeconds > 0 
      ? `${minutes} minute${minutes !== 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`
      : `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else {
    const hours = Math.floor(delaySeconds / 3600);
    const remainingMinutes = Math.floor((delaySeconds % 3600) / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
  }
}

/**
 * Formats penalty points for user-friendly display
 * @param points - The penalty points
 * @returns Formatted penalty string
 */
export function formatPenalty(points: number): string {
  return `${points} point${points !== 1 ? 's' : ''}`;
}