// Weekly Summary Generation Job
// =============================

import { supabase } from '../supabase';
import { aiServiceManager } from '../ai/ai-service-manager';
import type { AIServiceManagerRequest } from '@/types/ai-service-manager';
import type { JobResult } from './scheduler';

interface ActiveStudent {
  user_id: string;
  memory_count: number;
  last_activity: string;
}

interface WeeklyMemoryData {
  user_id: string;
  content: string;
  importance_score: number;
  created_at: string;
  tags: string[] | null;
}

/**
 * Weekly Summary Generation Job
 * Purpose: Generate weekly summaries for active students
 * Schedule: Every Sunday at 00:00 UTC
 */
export async function executeWeeklySummaryGeneration(): Promise<JobResult> {
  const startTime = Date.now();
  console.log('📋 Starting weekly summary generation job...');

  try {
    // Calculate date range for the past 7 days
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (7 * 24 * 60 * 60 * 1000));
    
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    console.log(`🔍 Analyzing activity from ${startISO} to ${endISO}`);

    // Get students who were active this week and have at least 5 memories
    const { data: activeStudents, error: studentsError } = await supabase
      .from('study_chat_memory')
      .select('user_id')
      .gte('created_at', startISO)
      .lte('created_at', endISO)
      .order('user_id');

    if (studentsError) {
      throw new Error(`Failed to fetch active students: ${studentsError.message}`);
    }

    if (!activeStudents || activeStudents.length === 0) {
      return {
        success: true,
        message: 'No active students found for weekly summary generation',
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
        data: {
          activeStudents: 0,
          summariesGenerated: 0,
          skippedStudents: 0,
          dateRange: { start: startISO, end: endISO }
        }
      };
    }

    // Count memories per student and filter for those with >= 5 memories
    const studentMemoryCounts = new Map<string, number>();
    activeStudents.forEach(student => {
      studentMemoryCounts.set(student.user_id, (studentMemoryCounts.get(student.user_id) || 0) + 1);
    });

    const eligibleStudents = Array.from(studentMemoryCounts.entries())
      .filter(([_, count]) => count >= 5)
      .map(([user_id, memory_count]) => ({ user_id, memory_count }));

    console.log(`📊 Found ${eligibleStudents.length} eligible students (${activeStudents.length} total with activity)`);

    if (eligibleStudents.length === 0) {
      return {
        success: true,
        message: 'No students have sufficient memories for weekly summaries',
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
        data: {
          activeStudents: activeStudents.length,
          summariesGenerated: 0,
          skippedStudents: activeStudents.length,
          dateRange: { start: startISO, end: endISO }
        }
      };
    }

    // Generate summaries for each eligible student
    let summariesGenerated = 0;
    let skippedStudents = activeStudents.length - eligibleStudents.length;
    let errors = 0;
    const summaryResults: Array<{
      user_id: string;
      success: boolean;
      summary?: string;
      tokens?: number;
      error?: string;
    }> = [];

    for (const student of eligibleStudents) {
      try {
        console.log(`📝 Generating summary for student ${student.user_id}...`);
        
        // Get memories for this student from the past week
        const { data: memories, error: memoriesError } = await supabase
          .from('study_chat_memory')
          .select('content, importance_score, created_at, tags')
          .eq('user_id', student.user_id)
          .gte('created_at', startISO)
          .lte('created_at', endISO)
          .order('importance_score', { ascending: false })
          .limit(10); // Limit to top 10 most important memories

        if (memoriesError || !memories || memories.length === 0) {
          console.warn(`⚠️ No memories found for student ${student.user_id}`);
          skippedStudents++;
          continue;
        }

        // Generate summary using AI Service Manager
        const summaryResult = await generateStudentSummary(memories, student.user_id);

        if (summaryResult.success && summaryResult.summary) {
          // Store summary in memory_summaries table
          const { error: insertError } = await supabase
            .from('memory_summaries')
            .insert({
              user_id: student.user_id,
              summary_type: 'weekly',
              period_start: startISO,
              period_end: endISO,
              summary_text: summaryResult.summary,
              token_count: summaryResult.tokens || 0,
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week
              created_at: new Date().toISOString()
            });

          if (insertError) {
            throw new Error(`Failed to store summary for ${student.user_id}: ${insertError.message}`);
          }

          summariesGenerated++;
          summaryResults.push({
            user_id: student.user_id,
            success: true,
            summary: summaryResult.summary,
            tokens: summaryResult.tokens
          });

          console.log(`✅ Generated summary for student ${student.user_id} (${summaryResult.tokens} tokens)`);
        } else {
          throw new Error(summaryResult.error || 'Failed to generate summary');
        }

        // Add small delay to avoid overwhelming AI providers
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        errors++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Failed to generate summary for student ${student.user_id}:`, errorMessage);
        
        summaryResults.push({
          user_id: student.user_id,
          success: false,
          error: errorMessage
        });
      }
    }

    // Log the summary generation activity
    await logSummaryGenerationActivity({
      summariesGenerated,
      skippedStudents,
      activeStudents: activeStudents.length,
      errors,
      dateRange: { start: startISO, end: endISO },
      results: summaryResults
    });

    const executionTime = Date.now() - startTime;
    const successMessage = `Generated weekly summaries for ${summariesGenerated} students. Skipped ${skippedStudents} students (no activity)`;

    console.log(`✅ ${successMessage}`);

    return {
      success: errors === 0,
      message: successMessage,
      executionTime,
      timestamp: new Date(),
      data: {
        summariesGenerated,
        skippedStudents,
        activeStudents: activeStudents.length,
        errors,
        dateRange: { start: startISO, end: endISO },
        summaryResults
      }
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('💥 Weekly summary generation failed:', error);

    // Log the failure
    await logSummaryGenerationActivity({
      summariesGenerated: 0,
      skippedStudents: 0,
      activeStudents: 0,
      errors: 1,
      dateRange: { start: '', end: '' },
      results: [],
      errorMessage
    });

    return {
      success: false,
      message: `Weekly summary generation failed: ${errorMessage}`,
      executionTime,
      timestamp: new Date()
    };
  }
}

/**
 * Generate a summary for a student using AI Service Manager
 */
async function generateStudentSummary(memories: WeeklyMemoryData[], userId: string): Promise<{
  success: boolean;
  summary?: string;
  tokens?: number;
  error?: string;
}> {
  try {
    // Prepare memory context for AI
    const memoryContext = memories.map((memory, index) => 
      `${index + 1}. [Score: ${memory.importance_score}] ${memory.content} (${new Date(memory.created_at).toLocaleDateString()})`
    ).join('\n');

    const prompt = `
Based on the student's study chat memories from this week, create a concise weekly summary highlighting:

1. Key learning topics and subjects studied
2. Progress and achievements made
3. Areas that need attention or improvement
4. Study patterns and habits observed
5. Overall performance insights

Memories to analyze:
${memoryContext}

Provide a summary in 3-4 sentences, max 500 characters, focusing on actionable insights for the student.
`;

    const request: AIServiceManagerRequest = {
      userId,
      message: prompt,
      conversationId: 'weekly-summary-generation',
      chatType: 'general',
      includeAppData: false
    };

    // Generate summary using AI Service Manager
    const response = await aiServiceManager.processQuery(request);

    if (!response.content || response.content.trim().length === 0) {
      throw new Error('AI returned empty response');
    }

    return {
      success: true,
      summary: response.content.substring(0, 500), // Ensure max 500 characters
      tokens: response.tokens_used.output
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown AI error'
    };
  }
}

/**
 * Log summary generation activity to activity_logs table
 */
async function logSummaryGenerationActivity(params: {
  summariesGenerated: number;
  skippedStudents: number;
  activeStudents: number;
  errors: number;
  dateRange: { start: string; end: string };
  results: Array<{ user_id: string; success: boolean; error?: string }>;
  errorMessage?: string;
}): Promise<void> {
  try {
    const { summariesGenerated, skippedStudents, activeStudents, errors, dateRange, results, errorMessage } = params;
    
    const activitySummary = errorMessage 
      ? `Weekly summary generation failed: ${errorMessage}`
      : `Weekly summary generation completed: ${summariesGenerated}/${activeStudents} students processed, ${skippedStudents} skipped`;

    const details = {
      summariesGenerated,
      skippedStudents,
      activeStudents,
      errors,
      dateRange,
      successRate: activeStudents > 0 ? Math.round((summariesGenerated / activeStudents) * 100) : 0,
      results: results.slice(0, 10), // Store first 10 results for debugging
      jobType: 'weekly-summary-generation',
      executionTime: new Date().toISOString()
    };

    await supabase
      .from('activity_logs')
      .insert({
        user_id: 'system-background-jobs',
        activity_type: 'weekly_summary_generation',
        summary: activitySummary,
        details
      });

  } catch (error) {
    console.error('Failed to log summary generation activity:', error);
  }
}

/**
 * Get weekly summary generation statistics
 */
export async function getWeeklySummaryStats() {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    
    // Get summaries generated in the past week
    const { data: recentSummaries, error: summariesError } = await supabase
      .from('memory_summaries')
      .select('user_id, summary_type, created_at')
      .eq('summary_type', 'weekly')
      .gte('created_at', weekAgo.toISOString());

    if (summariesError) throw summariesError;

    // Get active students this week
    const { data: activeStudents, error: studentsError } = await supabase
      .from('study_chat_memory')
      .select('user_id')
      .gte('created_at', weekAgo.toISOString());

    if (studentsError) throw studentsError;

    const uniqueActiveStudents = new Set(activeStudents?.map(s => s.user_id) || []).size;
    const summariesGenerated = recentSummaries?.length || 0;

    return {
      summariesGenerated,
      uniqueActiveStudents,
      coverage: uniqueActiveStudents > 0 ? Math.round((summariesGenerated / uniqueActiveStudents) * 100) : 0,
      nextScheduledRun: getNextSunday(),
      weekPeriod: {
        start: weekAgo.toISOString(),
        end: now.toISOString()
      }
    };
  } catch (error) {
    console.error('Failed to get weekly summary stats:', error);
    return null;
  }
}

/**
 * Get next Sunday date for scheduling reference
 */
function getNextSunday(): string {
  const now = new Date();
  const daysUntilSunday = 7 - now.getDay(); // 0 = Sunday, 6 = Saturday
  const nextSunday = new Date(now.getTime() + (daysUntilSunday * 24 * 60 * 60 * 1000));
  nextSunday.setHours(0, 0, 0, 0);
  return nextSunday.toISOString();
}