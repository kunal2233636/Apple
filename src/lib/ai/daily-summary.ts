
'use server';

import { supabaseBrowserClient } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import { startOfDay, endOfDay, subDays } from 'date-fns';

type ActivityLog = Database['public']['Tables']['activity_logs']['Row'];
type DailyActivitySummary = Database['public']['Tables']['daily_activity_summary']['Row'];
type DailyActivitySummaryInsert = Database['public']['Tables']['daily_activity_summary']['Insert'];


/**
 * Processes activity logs for a given day to generate a structured summary.
 * This is the main function that powers the daily summary generation.
 * @param userId - The ID of the user.
 * @param date - The date for which to generate the summary.
 * @returns A promise that resolves to the generated summary object.
 */
export async function generateDailySummary(
    userId: string,
    date: Date
): Promise<DailyActivitySummary | null> {
    const dateString = date.toISOString().split('T')[0];
    const startDate = startOfDay(date);
    const endDate = endOfDay(date);

    const { data: logs, error: logError } = await supabaseBrowserClient
        .from('activity_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

    if (logError) {
        console.error(`[DailySummary] Error fetching logs for ${dateString}:`, logError);
        return null;
    }
    
    const hasActivity = logs && logs.length > 0;
    
    // --- Metric Calculation ---
    let total_study_minutes = 0;
    let blocks_completed_count = 0;
    let topics_studied_count = 0;
    let topics_revised_count = 0;
    let questions_attempted = 0;
    let questions_correct = 0;
    let points_earned = 0;
    let points_lost = 0;
    const achievements_unlocked: string[] = [];
    
    const uniqueBlockCreationIds = new Set<string>();
    if (hasActivity) {
      logs.forEach(log => {
          const data = log.activity_data as any;
          switch (log.activity_type) {
              case 'block_created':
                  if (log.related_block_id && !uniqueBlockCreationIds.has(log.related_block_id)) {
                      uniqueBlockCreationIds.add(log.related_block_id);
                  }
                  break;
              case 'block_completed':
                  blocks_completed_count++;
                  if (data?.duration) total_study_minutes += data.duration;
                  if (data?.topics_covered) topics_studied_count += data.topics_covered;
                  break;
              case 'topic_revised':
                  topics_revised_count++;
                  break;
              case 'question_practice':
                   if (data?.total) questions_attempted += data.total;
                   if (data?.correct) questions_correct += data.correct;
                  break;
              case 'points_earned':
                  if (data?.points) points_earned += data.points;
                  break;
              case 'penalty_applied':
                  if (data?.points_deducted) points_lost += data.points_deducted;
                  break;
              case 'achievement_unlocked':
                  if(data?.name) achievements_unlocked.push(data.name);
                  break;
          }
      });
    }

    const blocks_planned_count = uniqueBlockCreationIds.size;
    const question_accuracy = questions_attempted > 0 ? (questions_correct / questions_attempted) * 100 : 0;
    const total_study_hours = total_study_minutes / 60;

    // --- AI-Friendly Text Summary Generation ---
    const summaryParts: string[] = [];
    if (total_study_hours > 0) summaryParts.push(`Studied ${total_study_hours.toFixed(1)} hours across ${blocks_completed_count} blocks.`);
    if (topics_studied_count > 0) summaryParts.push(`Completed ${topics_studied_count} topics.`);
    if (topics_revised_count > 0) summaryParts.push(`Revised ${topics_revised_count} topics.`);
    if (questions_attempted > 0) summaryParts.push(`Attempted ${questions_attempted} questions with ${question_accuracy.toFixed(0)}% accuracy.`);
    if (points_earned > 0 || points_lost > 0) summaryParts.push(`Net points: ${points_earned - points_lost}.`);
    if (achievements_unlocked.length > 0) summaryParts.push(`Unlocked ${achievements_unlocked.length} achievements.`);

    const text_summary = hasActivity ? `Today: ${summaryParts.join(' ')}` : "No activity recorded today.";

    // --- Highlights and Concerns Identification ---
    const highlights: string[] = [];
    const concerns: string[] = [];

    if (total_study_hours >= 10) highlights.push("Daily study goal (10+ hours) met or exceeded.");
    if (question_accuracy >= 90 && questions_attempted > 10) highlights.push("Excellent accuracy in question practice.");
    if (achievements_unlocked.length > 0) highlights.push(`Unlocked new achievements: ${achievements_unlocked.join(', ')}.`);
    if (blocks_completed_count > 0 && blocks_completed_count === blocks_planned_count) highlights.push("Completed all planned blocks for the day.");

    if (!hasActivity) {
      concerns.push("No activity logged for the day.")
    } else {
      if (blocks_planned_count > blocks_completed_count) concerns.push(`${blocks_planned_count - blocks_completed_count} planned blocks were skipped.`);
      if (points_lost > 0) concerns.push(`Lost ${points_lost} points from penalties.`);
      if (topics_revised_count === 0 && logs.some(l => l.activity_type === 'revision_queue_overflow')) concerns.push("Revision queue has overdue topics.");
    }


    const summaryPayload: DailyActivitySummaryInsert = {
        user_id: userId,
        summary_date: dateString,
        text_summary,
        metrics: {
            total_study_minutes,
            blocks_completed_count,
            blocks_planned_count,
            topics_studied_count,
            topics_revised_count,
            questions_attempted,
            question_accuracy,
            points_earned,
            points_lost,
            achievements_unlocked_count: achievements_unlocked.length
        },
        highlights,
        concerns,
    };
    
    // Upsert the summary into the database
    const { data: savedSummary, error: saveError } = await supabaseBrowserClient
        .from('daily_activity_summary')
        .upsert(summaryPayload, { onConflict: 'user_id, summary_date' })
        .select()
        .single();
    
    if (saveError) {
        console.error(`[DailySummary] Error saving summary for ${dateString}:`, saveError);
        return null;
    }

    return savedSummary as DailyActivitySummary;
}


/**
 * Generates or updates the daily summary for the current day.
 * Should be called after any significant user activity.
 * @param userId - The ID of the user.
 * @returns The updated daily summary or null on error.
 */
export async function updateDailySummary(userId: string): Promise<DailyActivitySummary | null> {
    try {
        console.log(`[DailySummary] Triggering update for user ${userId} for today.`);
        return await generateDailySummary(userId, new Date());
    } catch(e) {
        console.error("[DailySummary] Failed to update daily summary:", e);
        return null;
    }
}

/**
 * Retrieves an existing daily summary, or generates a new one if it doesn't exist.
 * @param userId - The ID of the user.
 * @param date - The date of the summary to retrieve.
 * @returns The daily summary object.
 */
export async function getDailySummary(userId: string, date: Date): Promise<DailyActivitySummary | null> {
    const dateString = date.toISOString().split('T')[0];

    const { data, error } = await supabaseBrowserClient
        .from('daily_activity_summary')
        .select('*')
        .eq('user_id', userId)
        .eq('summary_date', dateString)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error(`[DailySummary] Error fetching existing summary for ${dateString}:`, error);
        return null;
    }

    if (data) {
        return data;
    } else {
        // If no summary exists, generate one
        console.log(`[DailySummary] No summary found for ${dateString}, generating new one.`);
        return generateDailySummary(userId, date);
    }
}


/**
 * Retrieves the last 7 days of summaries for a user.
 * @param userId - The ID of the user.
 * @returns An array of daily summary objects.
 */
export async function getWeeklySummaries(userId: string): Promise<DailyActivitySummary[]> {
    const today = startOfDay(new Date());
    const sevenDaysAgo = startOfDay(subDays(today, 6));

    const { data, error } = await supabaseBrowserClient
        .from('daily_activity_summary')
        .select('*')
        .eq('user_id', userId)
        .gte('summary_date', sevenDaysAgo.toISOString().split('T')[0])
        .lte('summary_date', today.toISOString().split('T')[0])
        .order('summary_date', { ascending: false });

    if (error) {
        console.error('[DailySummary] Error fetching weekly summaries:', error);
        return [];
    }

    return data;
}

/**
 * Retrieves the last 30 days of summaries for a user.
 * @param userId - The ID of the user.
 * @returns An array of daily summary objects.
 */
export async function getMonthlySummaries(userId: string): Promise<DailyActivitySummary[]> {
    const today = startOfDay(new Date());
    const thirtyDaysAgo = startOfDay(subDays(today, 29));

    const { data, error } = await supabaseBrowserClient
        .from('daily_activity_summary')
        .select('*')
        .eq('user_id', userId)
        .gte('summary_date', thirtyDaysAgo.toISOString().split('T')[0])
        .lte('summary_date', today.toISOString().split('T')[0])
        .order('summary_date', { ascending: false });
    
    if (error) {
        console.error('[DailySummary] Error fetching monthly summaries:', error);
        return [];
    }

    return data;
}
