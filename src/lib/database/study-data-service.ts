import { supabase } from '@/lib/supabase';

/**
 * Centralized Supabase-backed study-data service.
 *
 * NOTE: This is intentionally minimal and safe. It returns neutral defaults
 * when no data is found, so the AI never invents fake progress numbers.
 */

export interface UserStudySummary {
  totalBlocks: number;
  completedBlocks: number;
  accuracy: number; // 0-100
  subjectsStudied: string[];
  timeSpentMinutes: number;
}

const NEUTRAL_STUDY_SUMMARY: UserStudySummary = {
  totalBlocks: 0,
  completedBlocks: 0,
  accuracy: 0,
  subjectsStudied: [],
  timeSpentMinutes: 0,
};

/**
 * Fetch a compact study summary for the given user.
 *
 * Implementation notes:
 * - Reads from `study_sessions` and `study_topic_progress` when available.
 * - Falls back to neutral defaults if tables are empty or errors occur.
 */
export async function getUserStudySummary(userId: string): Promise<UserStudySummary> {
  if (!userId) return NEUTRAL_STUDY_SUMMARY;

  try {
    // Aggregate from study_sessions (most recent sessions first)
    const { data: sessions, error: sessionsError } = await supabase
      .from('study_sessions')
      .select('total_blocks, completed_blocks, accuracy, subject, time_spent_minutes')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(50);

    if (sessionsError) {
      console.warn('[study-data-service] Error fetching study_sessions:', sessionsError.message);
      return NEUTRAL_STUDY_SUMMARY;
    }

    if (!sessions || sessions.length === 0) {
      return NEUTRAL_STUDY_SUMMARY;
    }

    let totalBlocks = 0;
    let completedBlocks = 0;
    let weightedAccuracySum = 0;
    let accuracyWeight = 0;
    let timeSpentMinutes = 0;
    const subjects = new Set<string>();

    for (const session of sessions as any[]) {
      const tb = Number(session.total_blocks) || 0;
      const cb = Number(session.completed_blocks) || 0;
      const acc = Number(session.accuracy) || 0;
      const ts = Number(session.time_spent_minutes) || 0;

      totalBlocks += tb;
      completedBlocks += cb;
      timeSpentMinutes += ts;
      if (session.subject) subjects.add(String(session.subject));

      // Weight accuracy by completed blocks to avoid tiny sessions skewing the average
      if (cb > 0 && acc > 0) {
        weightedAccuracySum += acc * cb;
        accuracyWeight += cb;
      }
    }

    const accuracy = accuracyWeight > 0 ? Math.round(weightedAccuracySum / accuracyWeight) : 0;

    return {
      totalBlocks,
      completedBlocks,
      accuracy,
      subjectsStudied: Array.from(subjects),
      timeSpentMinutes,
    };
  } catch (error) {
    console.error('[study-data-service] Unexpected error in getUserStudySummary:', error);
    return NEUTRAL_STUDY_SUMMARY;
  }
}
