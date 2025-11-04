
'use server';

import { buildFullAIContext, buildRecentActivityContext, buildDailyContext, type ContextType } from './context-builder';
import { supabaseBrowserClient } from '@/lib/supabase';
import { format } from 'date-fns';
import { getNextAchievements } from '../gamification/achievement-tracker';
import { updateDailySummary } from './daily-summary';

/**
 * Prepares the full context string, including a system prompt, to be sent to the Gemini API.
 * @param userId - The ID of the user.
 * @param contextLevel - The level of detail for the context ('minimal', 'standard', 'comprehensive').
 * @returns A promise that resolves to the complete prompt string.
 */
export async function prepareAIChatContext(
  userId: string,
  contextLevel: ContextType = 'standard'
): Promise<string> {
  const fullContext = await buildFullAIContext(userId, contextLevel);

  const systemPrompt = `
    You are an AI study assistant for the BlockWise app. Here is the complete context about the user's study activities:

    [CONTEXT]
    ${fullContext}
    [END CONTEXT]

    Use this context to provide personalized suggestions, answer questions about their progress, and help them optimize their study schedule.
    Be concise, friendly, and encouraging.
  `;

  return systemPrompt.trim();
}

/**
 * Gathers a few key metrics for a quick, at-a-glance user status update.
 * @param userId - The ID of the user.
 * @returns A promise that resolves to a formatted string of quick stats.
 */
export async function getQuickStats(userId: string): Promise<string> {
    const today = format(new Date(), 'yyyy-MM-dd');

    const [
        gamificationData,
        pendingTopicsCount,
        revisionQueueSize,
        recentAchievements
    ] = await Promise.all([
        supabaseBrowserClient.from('user_gamification').select('current_streak, total_points_earned').eq('user_id', userId).single(),
        supabaseBrowserClient.from('topics').select('id', { count: 'exact' }).eq('user_id', userId).eq('is_remaining', true),
        supabaseBrowserClient.from('topics').select('id', { count: 'exact' }).eq('user_id', userId).eq('is_in_spare', true).lt('revision_count', 5).lte('next_revision_date', today),
        getNextAchievements(userId),
    ]);

    const streak = (gamificationData as any)?.data?.current_streak || 0;
    // Mock study hours for now since getDailySummary might not exist
    const studyHours = 2.5;
    const pending = pendingTopicsCount.count || 0;
    const revisions = revisionQueueSize.count || 0;
    const recentAchievement = recentAchievements?.[0];

    const stats = [
        `${streak}-day streak 🔥`,
        `${studyHours.toFixed(1)}h studied today`,
        `${pending} topics pending`,
        `${revisions} revisions due`,
        recentAchievement ? `Next: ${recentAchievement.name} ${recentAchievement.icon}` : 'No new achievements'
    ];

    return `Quick Stats: ${stats.join(' | ')}`;
}


/**
 * Generates actionable suggestions based on the user's recent activity and progress.
 * Note: This is a placeholder. A real implementation would involve more sophisticated analysis or an AI call.
 * @param userId - The ID of the user.
 * @returns A promise that resolves to an array of suggestion strings.
 */
export async function getAISuggestions(userId: string): Promise<string[]> {
    const context = await buildFullAIContext(userId, 'standard');
    const suggestions: string[] = [];

    // Basic heuristic analysis for demonstration
    if (context.includes('Concerns:')) {
        if (context.includes('overdue for revision')) {
            suggestions.push("Your revision queue is growing. Try to complete a quick revision session for overdue topics today.");
        }
        if (context.includes('skipped')) {
            suggestions.push("You missed a few planned blocks this week. Try to stick to your schedule or adjust it to be more realistic.");
        }
    }
    
    if (context.includes('most studied subject: Physics')) {
        suggestions.push("You're focusing a lot on Physics. Don't forget to give some time to Chemistry and Maths to keep your preparation balanced.");
    } else {
        suggestions.push("You have a good balance across subjects. Keep it up!");
    }
    
    if (suggestions.length < 3) {
        suggestions.push("Consider scheduling a 2-hour deep study block for your weakest chapter this weekend.");
        suggestions.push("Try starting your day with a 25-minute question practice session to warm up your brain.");
    }
    
    return suggestions.slice(0, 3); // Return a max of 3 suggestions
}
