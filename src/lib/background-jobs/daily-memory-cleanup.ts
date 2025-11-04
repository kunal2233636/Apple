// Daily Memory Cleanup Job
// =========================

import { supabase } from '../supabase';
import type { JobResult } from './scheduler';

interface ExpiredMemory {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  tags: string[] | null;
}

/**
 * Daily Memory Cleanup Job
 * Purpose: Remove expired conversation memories (8+ months old)
 * Schedule: Every day at 00:00 UTC
 */
export async function executeDailyMemoryCleanup(): Promise<JobResult> {
  const startTime = Date.now();
  console.log('🧹 Starting daily memory cleanup job...');

  try {
    // Calculate the cutoff date (8 months ago)
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 8);
    const cutoffISO = cutoffDate.toISOString();

    console.log(`🔍 Finding memories expiring before: ${cutoffISO}`);

    // Query expired memories (including null expires_at as expired)
    const { data: expiredMemories, error: fetchError } = await supabase
      .from('study_chat_memory')
      .select('id, content, user_id, created_at, expires_at, tags')
      .or(`expires_at.lt.${cutoffISO},expires_at.is.null`)
      .order('created_at', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch expired memories: ${fetchError.message}`);
    }

    const memoriesToDelete = expiredMemories || [];
    const totalCount = memoriesToDelete.length;

    console.log(`📊 Found ${totalCount} expired memories to delete`);

    if (totalCount === 0) {
      return {
        success: true,
        message: 'No expired memories found to clean up',
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
        data: {
          deletedCount: 0,
          storageFreed: 0,
          cutoffDate: cutoffISO
        }
      };
    }

    // Calculate approximate storage usage before deletion
    const totalSize = memoriesToDelete.reduce((acc, memory) => {
      // Rough estimate: content + metadata + vector embedding
      const contentSize = memory.content ? memory.content.length * 2 : 0; // 2 bytes per char
      const metadataSize = JSON.stringify({
        id: memory.id,
        user_id: memory.user_id,
        created_at: memory.created_at,
        expires_at: memory.expires_at,
        tags: memory.tags
      }).length * 2;
      // Vector embeddings are typically 1536 floats = 6144 bytes
      const embeddingSize = 6144;
      
      return acc + contentSize + metadataSize + embeddingSize;
    }, 0);

    const storageFreedMB = Math.round(totalSize / (1024 * 1024) * 100) / 100;

    // Delete expired memories in batches to avoid overwhelming the database
    const batchSize = 100;
    let deletedCount = 0;
    let errors = 0;

    for (let i = 0; i < memoriesToDelete.length; i += batchSize) {
      const batch = memoriesToDelete.slice(i, i + batchSize);
      const ids = batch.map(m => m.id);

      const { error: deleteError } = await supabase
        .from('study_chat_memory')
        .delete()
        .in('id', ids);

      if (deleteError) {
        console.error(`❌ Error deleting batch ${i / batchSize + 1}:`, deleteError);
        errors++;
      } else {
        deletedCount += batch.length;
        console.log(`✅ Deleted batch ${i / batchSize + 1} (${batch.length} memories)`);
      }
    }

    // Log cleanup activity to activity_logs table
    await logCleanupActivity({
      deletedCount,
      totalCount,
      storageFreedMB,
      cutoffDate: cutoffISO,
      errors,
      success: errors === 0
    });

    const executionTime = Date.now() - startTime;
    const successMessage = `Deleted ${deletedCount} expired memories (8+ months old). Freed ~${storageFreedMB}MB storage`;

    console.log(`✅ ${successMessage}`);

    return {
      success: errors === 0,
      message: successMessage,
      executionTime,
      timestamp: new Date(),
      data: {
        deletedCount,
        totalCount,
        storageFreed: storageFreedMB,
        cutoffDate: cutoffISO,
        errors,
        batchSize,
        batchesProcessed: Math.ceil(totalCount / batchSize)
      }
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('💥 Daily memory cleanup failed:', error);

    // Log the failure
    await logCleanupActivity({
      deletedCount: 0,
      totalCount: 0,
      storageFreedMB: 0,
      cutoffDate: new Date().toISOString(),
      errors: 1,
      success: false,
      errorMessage
    });

    return {
      success: false,
      message: `Daily memory cleanup failed: ${errorMessage}`,
      executionTime,
      timestamp: new Date()
    };
  }
}

/**
 * Log cleanup activity to activity_logs table
 */
async function logCleanupActivity(params: {
  deletedCount: number;
  totalCount: number;
  storageFreedMB: number;
  cutoffDate: string;
  errors: number;
  success: boolean;
  errorMessage?: string;
}): Promise<void> {
  try {
    const { deletedCount, totalCount, storageFreedMB, cutoffDate, errors, success, errorMessage } = params;
    
    const activitySummary = success
      ? `Memory cleanup completed: ${deletedCount}/${totalCount} memories deleted, ${storageFreedMB}MB freed`
      : `Memory cleanup failed: ${errorMessage}`;

    const details = {
      deletedCount,
      totalCount,
      storageFreedMB,
      cutoffDate,
      errors,
      success,
      errorMessage,
      jobType: 'daily-memory-cleanup',
      executionTime: new Date().toISOString()
    };

    // Log to system activity (using a system user ID for background jobs)
    await supabase
      .from('activity_logs')
      .insert({
        user_id: 'system-background-jobs', // System user for background activities
        activity_type: 'memory_cleanup',
        summary: activitySummary,
        details
      });

  } catch (error) {
    console.error('Failed to log cleanup activity:', error);
    // Don't throw here - logging failure shouldn't break the cleanup job
  }
}

/**
 * Get memory cleanup statistics
 */
export async function getMemoryCleanupStats() {
  try {
    // Get total memory count and storage usage
    const { data: totalMemories, error: totalError } = await supabase
      .from('study_chat_memory')
      .select('count', { count: 'exact', head: true });

    if (totalError) throw totalError;

    // Get memories by age groups
    const cutoff3Months = new Date();
    cutoff3Months.setMonth(cutoff3Months.getMonth() - 3);
    
    const cutoff6Months = new Date();
    cutoff6Months.setMonth(cutoff6Months.getMonth() - 6);
    
    const cutoff8Months = new Date();
    cutoff8Months.setMonth(cutoff8Months.getMonth() - 8);

    const { data: ageGroups, error: ageError } = await supabase
      .from('study_chat_memory')
      .select('expires_at, is_active')
      .gte('created_at', cutoff8Months.toISOString());

    if (ageError) throw ageError;

    const stats = {
      totalMemories: totalMemories?.length || 0,
      activeMemories: ageGroups?.filter(m => m.is_active).length || 0,
      expiringWithin3Months: ageGroups?.filter(m => 
        !m.expires_at || new Date(m.expires_at) > cutoff3Months
      ).length || 0,
      expiringWithin8Months: ageGroups?.filter(m => 
        m.expires_at && new Date(m.expires_at) <= cutoff8Months
      ).length || 0,
      nextCleanupDate: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z'
    };

    return stats;
  } catch (error) {
    console.error('Failed to get memory cleanup stats:', error);
    return null;
  }
}