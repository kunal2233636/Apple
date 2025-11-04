// Archive Conversations Job
// =========================

import { supabase } from '../supabase';
import type { JobResult } from './scheduler';

interface ConversationArchivingResult {
  totalConversations: number;
  archivedConversations: number;
  errorConversations: number;
  spaceSaved: number;
}

/**
 * Archive Conversations Job
 * Purpose: Archive old conversations to keep database clean
 * Schedule: Monthly on 15th at 02:00 UTC
 */
export async function executeArchiveConversations(): Promise<JobResult> {
  const startTime = Date.now();
  console.log('📦 Starting conversation archiving job...');

  try {
    // Calculate cutoff date (60 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 60);
    const cutoffISO = cutoffDate.toISOString();

    console.log(`🔍 Finding conversations older than: ${cutoffISO}`);

    // Get conversations that haven't been updated in 60 days
    const { data: conversations, error: fetchError } = await supabase
      .from('chat_conversations')
      .select('id, title, user_id, created_at, updated_at, is_archived')
      .lt('updated_at', cutoffISO)
      .eq('is_archived', false)
      .order('updated_at', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch conversations to archive: ${fetchError.message}`);
    }

    const totalConversations = conversations?.length || 0;
    console.log(`📊 Found ${totalConversations} conversations to archive`);

    if (totalConversations === 0) {
      return {
        success: true,
        message: 'Archive conversations completed - no conversations to archive',
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
        data: {
          totalConversations: 0,
          archivedConversations: 0,
          errorConversations: 0,
          spaceSaved: 0
        }
      };
    }

    // Archive conversations in batches
    const batchSize = 100;
    let archivedCount = 0;
    let errorCount = 0;
    let totalSize = 0;

    for (let i = 0; i < conversations!.length; i += batchSize) {
      const batch = conversations!.slice(i, i + batchSize);
      const ids = batch.map(conv => conv.id);

      try {
        // Calculate approximate size of messages for this batch
        const batchSizeEstimate = batch.length * 5000; // ~5KB per conversation average
        totalSize += batchSizeEstimate;

        // Mark conversations as archived
        const { error: updateError } = await supabase
          .from('chat_conversations')
          .update({ 
            is_archived: true,
            updated_at: new Date().toISOString()
          })
          .in('id', ids);

        if (updateError) {
          throw updateError;
        }

        archivedCount += batch.length;
        console.log(`✅ Archived batch ${Math.floor(i / batchSize) + 1} (${batch.length} conversations)`);

      } catch (error) {
        errorCount += batch.length;
        console.error(`❌ Error archiving batch ${Math.floor(i / batchSize) + 1}:`, error);
      }
    }

    // Log archiving activity
    await logArchivingActivity({
      totalConversations,
      archivedConversations: archivedCount,
      errorConversations: errorCount,
      spaceSaved: totalSize,
      cutoffDate: cutoffISO
    });

    const executionTime = Date.now() - startTime;
    const successMessage = `Archived ${archivedCount} old conversations (60+ days old)`;

    console.log(`✅ ${successMessage}`);

    return {
      success: errorCount === 0,
      message: successMessage,
      executionTime,
      timestamp: new Date(),
      data: {
        totalConversations,
        archivedConversations: archivedCount,
        errorConversations: errorCount,
        spaceSaved: Math.round(totalSize / 1024 / 1024 * 100) / 100, // MB
        cutoffDate: cutoffISO,
        successRate: Math.round((archivedCount / totalConversations) * 100)
      }
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('💥 Conversation archiving failed:', error);

    await logArchivingActivity({
      totalConversations: 0,
      archivedConversations: 0,
      errorConversations: 0,
      spaceSaved: 0,
      cutoffDate: '',
      errorMessage
    });

    return {
      success: false,
      message: `Conversation archiving failed: ${errorMessage}`,
      executionTime,
      timestamp: new Date()
    };
  }
}

/**
 * Log archiving activity
 */
async function logArchivingActivity(params: {
  totalConversations: number;
  archivedConversations: number;
  errorConversations: number;
  spaceSaved: number;
  cutoffDate: string;
  errorMessage?: string;
}): Promise<void> {
  try {
    const { totalConversations, archivedConversations, errorConversations, spaceSaved, cutoffDate, errorMessage } = params;
    
    const activitySummary = errorMessage
      ? `Conversation archiving failed: ${errorMessage}`
      : `Conversation archiving completed: ${archivedConversations}/${totalConversations} conversations archived`;

    const details = {
      totalConversations,
      archivedConversations,
      errorConversations,
      spaceSaved: Math.round(spaceSaved / 1024 / 1024 * 100) / 100, // MB
      cutoffDate,
      successRate: totalConversations > 0 ? Math.round((archivedConversations / totalConversations) * 100) : 0,
      jobType: 'archive-conversations',
      executionTime: new Date().toISOString()
    };

    console.log('Archiving activity logged:', activitySummary, details);

  } catch (error) {
    console.error('Failed to log archiving activity:', error);
  }
}

/**
 * Get archived conversations statistics
 */
export async function getArchiveStatistics() {
  try {
    // Get total conversations
    const { count: totalCount } = await supabase
      .from('chat_conversations')
      .select('*', { count: 'exact', head: true });

    // Get archived conversations count
    const { count: archivedCount } = await supabase
      .from('chat_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('is_archived', true);

    // Get conversations by age
    const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)).toISOString();
    const sixtyDaysAgo = new Date(Date.now() - (60 * 24 * 60 * 60 * 1000)).toISOString();
    const ninetyDaysAgo = new Date(Date.now() - (90 * 24 * 60 * 60 * 1000)).toISOString();

    const { data: recentConversations } = await supabase
      .from('chat_conversations')
      .select('id, updated_at')
      .gte('updated_at', thirtyDaysAgo);

    const { data: mediumAgeConversations } = await supabase
      .from('chat_conversations')
      .select('id, updated_at')
      .lt('updated_at', thirtyDaysAgo)
      .gte('updated_at', sixtyDaysAgo);

    const { data: oldConversations } = await supabase
      .from('chat_conversations')
      .select('id, updated_at')
      .lt('updated_at', sixtyDaysAgo)
      .gte('updated_at', ninetyDaysAgo);

    const { data: veryOldConversations } = await supabase
      .from('chat_conversations')
      .select('id, updated_at')
      .lt('updated_at', ninetyDaysAgo);

    return {
      totalConversations: totalCount || 0,
      archivedConversations: archivedCount || 0,
      activeConversations: (totalCount || 0) - (archivedCount || 0),
      archiveRate: totalCount ? Math.round(((archivedCount || 0) / totalCount) * 100) : 0,
      ageBreakdown: {
        recent: recentConversations?.length || 0, // < 30 days
        medium: mediumAgeConversations?.length || 0, // 30-60 days
        old: oldConversations?.length || 0, // 60-90 days
        veryOld: veryOldConversations?.length || 0 // > 90 days
      },
      nextArchivalDate: getNextArchivalDate()
    };

  } catch (error) {
    console.error('Failed to get archive statistics:', error);
    return null;
  }
}

/**
 * Get next monthly archival date (15th at 02:00 UTC)
 */
function getNextArchivalDate(): string {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Get 15th of current month
  const thisMonth15th = new Date(currentYear, currentMonth, 15, 2, 0, 0, 0);
  
  // If we've passed the 15th this month, go to next month
  if (now > thisMonth15th) {
    const nextMonth15th = new Date(currentYear, currentMonth + 1, 15, 2, 0, 0, 0);
    return nextMonth15th.toISOString();
  }
  
  return thisMonth15th.toISOString();
}
