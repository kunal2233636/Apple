
'use server';

import { supabaseBrowserClient } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import { getDailySummary, getWeeklySummaries } from './daily-summary';
import { format, parseISO } from 'date-fns';

type ActivityLog = Database['public']['Tables']['activity_logs']['Row'];
type DailySummary = Database['public']['Tables']['daily_activity_summary']['Row'];
type Block = Database['public']['Tables']['blocks']['Row'];
type Topic = Database['public']['Tables']['topics']['Row'];


/**
 * Fetches recent activity logs and formats them into a simple text list.
 * @param userId - The ID of the user.
 * @param limit - The number of recent activities to fetch.
 * @returns A formatted string of recent activities.
 */
export async function buildRecentActivityContext(userId: string, limit = 50): Promise<string> {
    const { data, error } = await supabaseBrowserClient
        .from('activity_logs')
        .select('created_at, summary')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('[ContextBuilder] Error fetching recent activity:', error);
        return '';
    }

    if (!data || data.length === 0) {
        return '# Recent Activity\n- No recent activities found.\n';
    }

    const formattedActivities = data.map(log => 
        `[${format(parseISO(log.created_at), 'yyyy-MM-dd HH:mm')}] ${log.summary}`
    ).join('\n');

    return `# Recent Activity (Last ${data.length} entries)\n${formattedActivities}\n`;
}


/**
 * Fetches and formats the daily summary for a specific date.
 * @param userId - The ID of the user.
 * @param date - The date for the summary.
 * @returns A formatted string of the daily summary.
 */
export async function buildDailyContext(userId: string, date: Date): Promise<string> {
    const summary = await getDailySummary(userId, date);

    if (!summary) {
        return `# Daily Summary - ${format(date, 'MMMM dd, yyyy')}\n- No summary available for this day.\n`;
    }

    const metrics = summary.metrics as any;
    let context = `# Daily Summary - ${format(parseISO(summary.summary_date as string), 'MMMM dd, yyyy')}\n\n`;
    
    context += `Study Time: ${(metrics.total_study_minutes / 60).toFixed(1)}h\n`;
    context += `Blocks: ${metrics.blocks_completed_count} completed / ${metrics.blocks_planned_count} planned\n`;
    context += `Topics: ${metrics.topics_studied_count} studied, ${metrics.topics_revised_count} revised\n`;
    context += `Questions: ${metrics.questions_attempted} attempted (${metrics.question_accuracy?.toFixed(0) || 0}% accuracy)\n`;
    context += `Points: +${metrics.points_earned} earned, -${metrics.points_lost} lost = ${metrics.points_earned - metrics.points_lost} net\n\n`;

    if (summary.highlights && (summary.highlights as string[]).length > 0) {
        context += "Highlights:\n" + (summary.highlights as string[]).map(h => `- ${h}`).join('\n') + '\n\n';
    }
    if (summary.concerns && (summary.concerns as string[]).length > 0) {
        context += "Concerns:\n" + (summary.concerns as string[]).map(c => `- ${c}`).join('\n') + '\n\n';
    }
    
    return context;
}

/**
 * Fetches and formats summaries for the last 7 days, including weekly totals.
 * @param userId - The ID of the user.
 * @returns A formatted string of the weekly context.
 */
export async function buildWeeklyContext(userId: string): Promise<string> {
    const summaries = await getWeeklySummaries(userId);
    if (summaries.length === 0) return "# Weekly Context\n- No data for the last 7 days.\n";

    let totalMinutes = 0;
    let totalBlocksCompleted = 0;
    let totalTopicsStudied = 0;

    summaries.forEach(s => {
        const metrics = s.metrics as any;
        totalMinutes += metrics.total_study_minutes || 0;
        totalBlocksCompleted += metrics.blocks_completed_count || 0;
        totalTopicsStudied += metrics.topics_studied_count || 0;
    });
    
    let context = "# Weekly Summary\n\n";
    context += `Total Study Time: ${(totalMinutes / 60).toFixed(1)}h\n`;
    context += `Average Daily Study: ${(totalMinutes / 60 / summaries.length).toFixed(1)}h\n`;
    context += `Total Blocks Completed: ${totalBlocksCompleted}\n`;
    context += `Total Topics Studied: ${totalTopicsStudied}\n\n`;
    
    context += "## Daily Breakdown\n";
    summaries.forEach(s => {
        context += `[${format(parseISO(s.summary_date as string), 'EEE, MMM dd')}] ${(s.metrics as any).total_study_minutes / 60}h | ${(s.metrics as any).blocks_completed_count} blocks | ${(s.metrics as any).topics_studied_count} topics\n`;
    });

    return context + '\n';
}


/**
 * Analyzes the last 30 days of blocks to find study patterns.
 * @param userId - The ID of the user.
 * @returns A formatted string describing the user's study patterns.
 */
export async function buildStudyPatternContext(userId: string): Promise<string> {
    // This is a simplified analysis. A real implementation could be more complex.
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: blocks, error } = await supabaseBrowserClient
        .from('blocks')
        .select('start_time, duration, subjects(name)')
        .eq('user_id', userId)
        .gte('date', thirtyDaysAgo.toISOString());
    
    if (error || !blocks || blocks.length === 0) return "# Study Patterns\n- Not enough data to analyze.\n";

    const timeOfDayCounts: Record<string, number> = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };
    const subjectCounts: Record<string, number> = {};

    blocks.forEach((block: any) => {
        const hour = parseInt(block.start_time.split(':')[0], 10);
        if (hour >= 6 && hour < 12) timeOfDayCounts.Morning++;
        else if (hour >= 12 && hour < 17) timeOfDayCounts.Afternoon++;
        else if (hour >= 17 && hour < 21) timeOfDayCounts.Evening++;
        else timeOfDayCounts.Night++;

        if (block.subjects?.name) {
            subjectCounts[block.subjects.name] = (subjectCounts[block.subjects.name] || 0) + 1;
        }
    });

    const mostProductiveTime = Object.entries(timeOfDayCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const favoriteSubject = Object.entries(subjectCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    
    let context = "# Study Patterns (Last 30 Days)\n";
    if (mostProductiveTime) context += `- Most productive time: ${mostProductiveTime}\n`;
    if (favoriteSubject) context += `- Most studied subject: ${favoriteSubject}\n`;

    return context;
}

/**
 * Provides a summary of topic progress grouped by subject.
 * @param userId - The ID of the user.
 * @returns A formatted string of topic progress.
 */
export async function buildTopicProgressContext(userId: string): Promise<string> {
    const { data, error } = await supabaseBrowserClient
        .from('topics')
        .select('status, chapter:chapters(subject:subjects(name))')
        .eq('user_id', userId);

    if (error || !data) return "# Topic Progress\n- Could not fetch topic data.\n";

    const progress: Record<string, { completed: number, in_progress: number, pending: number }> = {};

    data.forEach((topic: any) => {
        const subjectName = topic.chapter?.subject?.name || 'Uncategorized';
        if (!progress[subjectName]) {
            progress[subjectName] = { completed: 0, in_progress: 0, pending: 0 };
        }
        progress[subjectName][topic.status as keyof typeof progress[string]]++;
    });

    let context = "# Topic Progress\n";
    for (const [subject, counts] of Object.entries(progress)) {
        context += `- ${subject}: ${counts.completed} completed, ${counts.in_progress} in progress, ${counts.pending} pending\n`;
    }
    return context;
}

/**
 * Builds a context string describing the state of the user's revision queue.
 * @param userId - The ID of the user.
 * @returns A formatted string of the revision queue status.
 */
export async function buildRevisionQueueContext(userId: string): Promise<string> {
    const today = new Date().toISOString();
    const { count: overdueCount, error: overdueError } = await supabaseBrowserClient
        .from('topics')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('is_in_spare', true)
        .lt('revision_count', 5)
        .lt('next_revision_date', today);

    const { count: todayCount, error: todayError } = await supabaseBrowserClient
        .from('topics')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('is_in_spare', true)
        .lt('revision_count', 5)
        .eq('next_revision_date', today);

    if (overdueError || todayError) return "# Revision Queue\n- Error fetching revision data.\n";

    return `# Revision Queue Status\n- Overdue topics: ${overdueCount || 0}\n- Topics due today: ${todayCount || 0}\n`;
}

export type ContextType = 'minimal' | 'standard' | 'comprehensive';

/**
 * The master function to assemble a complete AI context string based on the desired level of detail.
 * @param userId - The ID of the user.
 * @param contextType - The level of detail required: 'minimal', 'standard', or 'comprehensive'.
 * @returns A single, large formatted string ready for an AI prompt.
 */
export async function buildFullAIContext(userId: string, contextType: ContextType = 'standard'): Promise<string> {
    let contextParts: Promise<string>[] = [];

    const today = new Date();
    
    // Minimal context
    contextParts.push(buildRecentActivityContext(userId, 20));
    contextParts.push(buildDailyContext(userId, today));

    if (contextType === 'standard' || contextType === 'comprehensive') {
        contextParts.push(buildWeeklyContext(userId));
        contextParts.push(buildRevisionQueueContext(userId));
    }

    if (contextType === 'comprehensive') {
        contextParts.push(buildStudyPatternContext(userId));
        contextParts.push(buildTopicProgressContext(userId));
    }

    const resolvedParts = await Promise.all(contextParts);
    return resolvedParts.join('\n\n');
}
