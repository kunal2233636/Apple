// Background Jobs System - Main Export
// =====================================

// Core system components
export { BackgroundJobScheduler, backgroundJobScheduler } from './scheduler';
export { BackgroundJobRunner, backgroundJobRunner } from './runner';
export { JOB_CONFIGURATIONS, ENVIRONMENT_CONFIGS, JOB_PRIORITIES, RETRY_POLICIES, ALERT_THRESHOLDS } from './configuration';

// Individual job implementations
export { executeDailyMemoryCleanup } from './daily-memory-cleanup';
export { executeWeeklySummaryGeneration } from './weekly-summary-generation';
export { executeMonthlyQuotaReset } from './monthly-quota-reset';
export { executeHealthCheck } from './health-check';
export { executeCacheCleanup } from './cache-cleanup';
export { executeDatabaseMaintenance } from './database-maintenance';
export { executeRateLimitMonitor, RateLimitMonitor, rateLimitMonitor } from './rate-limit-monitor';
export { executeArchiveConversations } from './archive-conversations';
export { executeUsageAnalysis } from './usage-analysis';
export { executeAutomatedBackup } from './automated-backup';
export { executeProfileRefresh } from './profile-refresh';

// Job execution functions
export { runDailyMemoryCleanup } from './daily-memory-cleanup';
export { runWeeklySummaryGeneration } from './weekly-summary-generation';
export { runMonthlyQuotaReset } from './monthly-quota-reset';
export { runHealthCheck } from './health-check';
export { runCacheCleanup } from './cache-cleanup';
export { runDatabaseMaintenance } from './database-maintenance';
export { runRateLimitMonitor } from './rate-limit-monitor';
export { runArchiveConversations } from './archive-conversations';
export { runUsageAnalysis } from './usage-analysis';
export { runAutomatedBackup } from './automated-backup';
export { runProfileRefresh } from './profile-refresh';

// Utility and helper functions
export { JOB_CONFIGURATIONS, getActiveJobs, validateJobConfiguration } from './configuration';
export { backgroundJobScheduler } from './scheduler';

// Auto-initialization and cleanup functions
export { initializeBackgroundJobs, cleanupBackgroundJobs } from './runner';

// Statistics and monitoring functions
export { getHealthCheckStats } from './health-check';
export { getCacheCleanupStats } from './cache-cleanup';
export { getDatabaseMaintenanceStats } from './database-maintenance';
export { getArchiveStatistics } from './archive-conversations';
export { getUsageAnalysisStats, generateUsageInsights } from './usage-analysis';
export { getBackupStatistics } from './automated-backup';
export { getProfileRefreshStats } from './profile-refresh';

// Configuration validation
export { validateJobConfiguration } from './configuration';

// Type definitions
export type { JobConfig, JobStatus, JobResult } from './scheduler';
export type { ProviderUsage, RateLimitAlert } from './rate-limit-monitor';
export type { ConversationArchivingResult } from './archive-conversations';
export type { DailyUsageReport, UsageStatistics } from './usage-analysis';
export type { BackupMetadata, BackupResult } from './automated-backup';
export type { StudentProfileData, ProfileRefreshResult } from './profile-refresh';

/**
 * Quick start guide for using the background job system
 * 
 * @example
 * ```typescript
 * import { 
 *   backgroundJobRunner, 
 *   initializeBackgroundJobs,
 *   executeDailyMemoryCleanup 
 * } from '@/lib/background-jobs';
 * 
 * // Auto-initialize (recommended for most cases)
 * await initializeBackgroundJobs();
 * 
 * // Or manual initialization
 * const result = await backgroundJobRunner.initialize();
 * 
 * // Execute a job manually
 * const cleanupResult = await executeDailyMemoryCleanup();
 * 
 * // Get system status
 * const status = backgroundJobRunner.getStatus();
 * console.log('System health:', status.systemHealth);
 * ```
 */

// Environment-specific configurations
export const PRODUCTION_CONFIG = {
  jobs: {
    'health-check': { schedule: '*/5 * * * *', timeout: 30000 },
    'rate-limit-monitor': { schedule: '* * * * *', timeout: 5000 },
    'daily-memory-cleanup': { schedule: '0 0 * * *', timeout: 300000 }
  },
  monitoring: {
    alertThresholds: {
      consecutiveFailures: 3,
      executionTimeWarning: 60000,
      executionTimeCritical: 300000
    }
  }
};

export const DEVELOPMENT_CONFIG = {
  jobs: {
    'health-check': { schedule: '*/2 * * * *', timeout: 10000 },
    'rate-limit-monitor': { schedule: '*/30 * * * *', timeout: 2000 },
    'daily-memory-cleanup': { schedule: '*/10 * * * *', timeout: 60000 }
  },
  monitoring: {
    alertThresholds: {
      consecutiveFailures: 2,
      executionTimeWarning: 30000,
      executionTimeCritical: 60000
    }
  }
};

// Quick access to commonly used functions
export const QuickJobs = {
  // Daily operations
  cleanup: executeDailyMemoryCleanup,
  healthCheck: executeHealthCheck,
  
  // Weekly operations
  generateSummaries: executeWeeklySummaryGeneration,
  
  // Monthly operations
  resetQuotas: executeMonthlyQuotaReset,
  
  // Manual operations
  backup: executeAutomatedBackup,
  analyze: executeUsageAnalysis
} as const;

// System health check function
export async function checkSystemHealth(): Promise<{
  overall: 'healthy' | 'degraded' | 'unhealthy';
  details: {
    scheduler: any;
    rateLimitMonitor: any;
    memoryUsage: NodeJS.MemoryUsage;
    uptime: number;
  };
  recommendations: string[];
}> {
  try {
    const status = backgroundJobRunner.getStatus();
    const metrics = backgroundJobRunner.getSystemMetrics();
    
    const recommendations: string[] = [];
    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    // Check memory usage
    if (metrics.memoryUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
      recommendations.push('High memory usage detected - consider running garbage collection');
      overall = 'degraded';
    }
    
    // Check uptime
    if (status.uptime < 3600000) { // Less than 1 hour
      recommendations.push('System has been running for less than 1 hour');
    }
    
    // Check failed jobs
    const failedJobs = backgroundJobRunner.getJobHistory().filter(job => job.failureCount > 0);
    if (failedJobs.length > 0) {
      recommendations.push(`${failedJobs.length} jobs have failed recently`);
      overall = 'degraded';
    }
    
    if (failedJobs.length > 2) {
      overall = 'unhealthy';
    }
    
    return {
      overall,
      details: metrics,
      recommendations
    };
    
  } catch (error) {
    return {
      overall: 'unhealthy',
      details: {
        scheduler: null,
        rateLimitMonitor: null,
        memoryUsage: process.memoryUsage(),
        uptime: 0
      },
      recommendations: ['System health check failed - check logs for details']
    };
  }
}

// Emergency stop function
export async function emergencyStop(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    console.log('🚨 Emergency stop triggered');
    
    // Stop all jobs immediately
    backgroundJobRunner.shutdown();
    
    return {
      success: true,
      message: 'Emergency stop completed - all jobs stopped'
    };
    
  } catch (error) {
    return {
      success: false,
      message: `Emergency stop failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}