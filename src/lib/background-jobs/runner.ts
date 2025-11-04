// Background Job Runner and Startup
// ==================================

import { backgroundJobScheduler } from './scheduler';
import { JOB_CONFIGURATIONS, getActiveJobs, validateJobConfiguration } from './configuration';

// Import all job implementations
import { executeDailyMemoryCleanup } from './daily-memory-cleanup';
import { executeWeeklySummaryGeneration } from './weekly-summary-generation';
import { executeMonthlyQuotaReset } from './monthly-quota-reset';
import { executeHealthCheck } from './health-check';
import { executeCacheCleanup } from './cache-cleanup';
import { executeDatabaseMaintenance } from './database-maintenance';
import { executeRateLimitMonitor, rateLimitMonitor } from './rate-limit-monitor';
import { executeArchiveConversations } from './archive-conversations';
import { executeUsageAnalysis } from './usage-analysis';
import { executeAutomatedBackup } from './automated-backup';
import { executeProfileRefresh } from './profile-refresh';

import type { JobResult } from './scheduler';

/**
 * Background Job Runner
 * Handles initialization, startup, and lifecycle management of all background jobs
 */
export class BackgroundJobRunner {
  private isInitialized = false;
  private isRunning = false;
  private startupTime: Date | null = null;
  private environment: string;

  constructor(environment: string = 'production') {
    this.environment = environment;
  }

  /**
   * Initialize and start all background jobs
   */
  async initialize(): Promise<{
    success: boolean;
    message: string;
    jobsStarted: string[];
    errors: string[];
  }> {
    if (this.isInitialized) {
      return {
        success: false,
        message: 'Background job runner is already initialized',
        jobsStarted: [],
        errors: []
      };
    }

    console.log('🚀 Initializing BlockWise AI Background Job System...');
    console.log(`🌍 Environment: ${this.environment}`);

    const errors: string[] = [];
    const jobsStarted: string[] = [];

    try {
      // Step 1: Validate all job configurations
      console.log('🔍 Validating job configurations...');
      const validationResults = this.validateAllJobConfigurations();
      
      if (validationResults.invalidJobs.length > 0) {
        errors.push(...validationResults.invalidJobs.map(job => `Invalid configuration: ${job}`));
      }

      if (errors.length > 0) {
        console.error('❌ Job configuration validation failed');
        return {
          success: false,
          message: 'Job configuration validation failed',
          jobsStarted: [],
          errors
        };
      }

      // Step 2: Load job configurations into scheduler
      console.log('📋 Loading job configurations...');
      this.loadJobConfigurations();

      // Step 3: Initialize individual job systems
      console.log('⚙️ Initializing individual job systems...');
      await this.initializeIndividualJobs();

      // Step 4: Start scheduler
      console.log('🕒 Starting job scheduler...');
      backgroundJobScheduler.startAllJobs();

      // Step 5: Start continuous monitoring jobs
      console.log('📡 Starting continuous monitoring...');
      await this.startContinuousJobs();

      this.isInitialized = true;
      this.isRunning = true;
      this.startupTime = new Date();

      console.log('✅ Background job system initialized successfully');
      console.log(`📊 Total jobs configured: ${Object.keys(JOB_CONFIGURATIONS).length}`);
      console.log(`🎯 Active jobs: ${getActiveJobs(this.environment).length}`);

      return {
        success: true,
        message: 'Background job system initialized successfully',
        jobsStarted: getActiveJobs(this.environment),
        errors
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('💥 Background job system initialization failed:', error);

      return {
        success: false,
        message: `Initialization failed: ${errorMessage}`,
        jobsStarted: [],
        errors: [errorMessage]
      };
    }
  }

  /**
   * Update the scheduler to use actual job implementations
   */
  private loadJobConfigurations(): void {
    // Replace the scheduler's placeholder methods with actual implementations
    const scheduler: any = backgroundJobScheduler;

    // Update job execution methods
    scheduler.executeJobLogic = async (jobName: string): Promise<JobResult> => {
      switch (jobName) {
        case 'daily-memory-cleanup':
          return await executeDailyMemoryCleanup();
        case 'weekly-summary-generation':
          return await executeWeeklySummaryGeneration();
        case 'monthly-quota-reset':
          return await executeMonthlyQuotaReset();
        case 'health-check':
          return await executeHealthCheck();
        case 'cache-cleanup':
          return await executeCacheCleanup();
        case 'database-maintenance':
          return await executeDatabaseMaintenance();
        case 'rate-limit-monitor':
          return await executeRateLimitMonitor();
        case 'archive-conversations':
          return await executeArchiveConversations();
        case 'usage-analysis':
          return await executeUsageAnalysis();
        case 'automated-backup':
          return await executeAutomatedBackup();
        case 'profile-refresh':
          return await executeProfileRefresh();
        default:
          throw new Error(`Job '${jobName}' not implemented`);
      }
    };
  }

  /**
   * Initialize individual job systems
   */
  private async initializeIndividualJobs(): Promise<void> {
    // Initialize rate limit monitor (continuous monitoring)
    console.log('📡 Initializing rate limit monitor...');
    // rateLimitMonitor is already initialized as singleton

    // Add other job-specific initializations here as needed
    console.log('✅ Individual job systems initialized');
  }

  /**
   * Start continuous monitoring jobs
   */
  private async startContinuousJobs(): Promise<void> {
    try {
      // Start rate limit monitoring (continuous, not cron-based)
      rateLimitMonitor.start();
      console.log('📡 Rate limit monitoring started');
    } catch (error) {
      console.error('Failed to start continuous jobs:', error);
      throw error;
    }
  }

  /**
   * Validate all job configurations
   */
  private validateAllJobConfigurations(): {
    invalidJobs: string[];
    warnings: string[];
  } {
    const invalidJobs: string[] = [];
    const warnings: string[] = [];

    for (const jobName of Object.keys(JOB_CONFIGURATIONS)) {
      const validation = validateJobConfiguration(jobName);
      
      if (!validation.isValid) {
        invalidJobs.push(`${jobName}: ${validation.errors.join(', ')}`);
      }
      
      if (validation.warnings.length > 0) {
        warnings.push(`${jobName}: ${validation.warnings.join(', ')}`);
      }
    }

    if (warnings.length > 0) {
      console.warn('⚠️ Job configuration warnings:', warnings);
    }

    return { invalidJobs, warnings };
  }

  /**
   * Stop all background jobs
   */
  async shutdown(): Promise<{
    success: boolean;
    message: string;
    uptime: number;
  }> {
    if (!this.isRunning) {
      return {
        success: false,
        message: 'Background job system is not running',
        uptime: 0
      };
    }

    console.log('🛑 Shutting down background job system...');

    try {
      // Stop scheduler
      backgroundJobScheduler.shutdown();

      // Stop continuous monitoring
      rateLimitMonitor.stop();

      this.isRunning = false;
      this.isInitialized = false;

      const uptime = this.startupTime ? Date.now() - this.startupTime.getTime() : 0;

      console.log('✅ Background job system shutdown completed');
      console.log(`⏱️ System uptime: ${Math.round(uptime / 1000)} seconds`);

      return {
        success: true,
        message: 'Background job system shutdown completed',
        uptime
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('💥 Background job system shutdown failed:', error);

      return {
        success: false,
        message: `Shutdown failed: ${errorMessage}`,
        uptime: 0
      };
    }
  }

  /**
   * Get system status
   */
  getStatus(): {
    isInitialized: boolean;
    isRunning: boolean;
    uptime: number;
    jobsCount: number;
    activeJobs: number;
    systemHealth: 'healthy' | 'degraded' | 'unhealthy';
    lastHealthCheck: Date | null;
  } {
    const jobStatuses = backgroundJobScheduler.getJobStatuses();
    const runningJobs = jobStatuses.filter(status => status.status === 'running').length;
    const failedJobs = jobStatuses.filter(status => status.status === 'failed').length;
    const healthyJobs = jobStatuses.filter(status => status.status === 'completed' || status.status === 'running').length;

    let systemHealth: 'healthy' | 'degraded' | 'unhealthy';
    
    if (failedJobs > jobStatuses.length * 0.2) { // More than 20% failed
      systemHealth = 'unhealthy';
    } else if (failedJobs > 0 || healthyJobs < jobStatuses.length * 0.8) { // Some failures or low health
      systemHealth = 'degraded';
    } else {
      systemHealth = 'healthy';
    }

    return {
      isInitialized: this.isInitialized,
      isRunning: this.isRunning,
      uptime: this.startupTime ? Date.now() - this.startupTime.getTime() : 0,
      jobsCount: jobStatuses.length,
      activeJobs: runningJobs,
      systemHealth,
      lastHealthCheck: jobStatuses.find(s => s.name === 'health-check')?.lastRun || null
    };
  }

  /**
   * Execute a specific job manually
   */
  async executeJobManually(jobName: string): Promise<JobResult> {
    if (!this.isInitialized) {
      return {
        success: false,
        message: 'Background job system is not initialized',
        executionTime: 0,
        timestamp: new Date()
      };
    }

    console.log(`🔧 Manually executing job: ${jobName}`);
    return await backgroundJobScheduler.executeJob(jobName);
  }

  /**
   * Get job execution history
   */
  getJobHistory(): Array<{
    jobName: string;
    status: string;
    lastRun: Date | null;
    lastSuccess: Date | null;
    executionTime: number | null;
    runCount: number;
    successCount: number;
    failureCount: number;
  }> {
    return backgroundJobScheduler.getJobStatuses().map(status => ({
      jobName: status.name,
      status: status.status,
      lastRun: status.lastRun,
      lastSuccess: status.lastSuccess,
      executionTime: status.executionTime,
      runCount: status.runCount,
      successCount: status.successCount,
      failureCount: status.failureCount
    }));
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): {
    schedulerStats: any;
    rateLimitMonitorStats: any;
    memoryUsage: NodeJS.MemoryUsage;
    uptime: number;
  } {
    return {
      schedulerStats: backgroundJobScheduler.getStatistics(),
      rateLimitMonitorStats: rateLimitMonitor.getStatistics(),
      memoryUsage: process.memoryUsage(),
      uptime: this.startupTime ? Date.now() - this.startupTime.getTime() : 0
    };
  }
}

// Export singleton instance
export const backgroundJobRunner = new BackgroundJobRunner();

// Auto-initialization function for Next.js API routes
export async function initializeBackgroundJobs(environment: string = process.env.NODE_ENV || 'production') {
  if (backgroundJobRunner.getStatus().isInitialized) {
    console.log('Background jobs already initialized');
    return;
  }

  console.log('Auto-initializing background jobs...');
  await backgroundJobRunner.initialize();
}

// Cleanup function for graceful shutdown
export async function cleanupBackgroundJobs() {
  console.log('Cleaning up background jobs...');
  await backgroundJobRunner.shutdown();
}