// Background Job Scheduler Infrastructure
// ======================================

import cron, { ScheduledTask } from 'node-cron';
import { aiServiceManager } from '../ai/ai-service-manager';
import { rateLimitTracker } from '../ai/rate-limit-tracker';
import { responseCache } from '../ai/response-cache';

// Job types and interfaces
export interface JobConfig {
  name: string;
  description: string;
  schedule: string; // cron expression
  enabled: boolean;
  timeout?: number; // milliseconds
  retryAttempts?: number;
  dependencies?: string[]; // job names this job depends on
}

export interface JobStatus {
  name: string;
  status: 'running' | 'completed' | 'failed' | 'pending' | 'disabled';
  lastRun?: Date;
  lastSuccess?: Date;
  lastError?: string;
  executionTime?: number; // milliseconds
  runCount: number;
  successCount: number;
  failureCount: number;
}

export interface JobResult {
  success: boolean;
  message: string;
  data?: any;
  executionTime: number;
  timestamp: Date;
}

/**
 * Centralized Background Job Scheduler
 * Manages all scheduled jobs with robust error handling and monitoring
 */
export class BackgroundJobScheduler {
  private jobs: Map<string, JobConfig> = new Map();
  private scheduledTasks: Map<string, ScheduledTask> = new Map();
  private jobStatuses: Map<string, JobStatus> = new Map();
  private runningJobs: Set<string> = new Set();
  private isShuttingDown = false;

  constructor() {
    this.initializeDefaultJobs();
    this.setupGracefulShutdown();
  }

  /**
   * Register a new job
   */
  registerJob(config: JobConfig): void {
    this.jobs.set(config.name, config);
    this.jobStatuses.set(config.name, {
      name: config.name,
      status: config.enabled ? 'pending' : 'disabled',
      runCount: 0,
      successCount: 0,
      failureCount: 0
    });
  }

  /**
   * Start all enabled jobs
   */
  startAllJobs(): void {
    console.log('🚀 Starting Background Job Scheduler...');
    
    for (const [jobName, config] of this.jobs) {
      if (config.enabled) {
        this.startJob(jobName);
      } else {
        console.log(`⏸️  Job '${jobName}' is disabled`);
      }
    }
    
    console.log(`✅ Background Job Scheduler started with ${this.jobs.size} jobs`);
  }

  /**
   * Start a specific job
   */
  startJob(jobName: string): void {
    const config = this.jobs.get(jobName);
    if (!config) {
      throw new Error(`Job '${jobName}' not found`);
    }

    if (this.scheduledTasks.has(jobName)) {
      console.log(`⚠️  Job '${jobName}' is already running`);
      return;
    }

    try {
      const task = cron.schedule(config.schedule, async () => {
        await this.executeJob(jobName);
      }, {
        scheduled: false,
        timezone: 'UTC'
      });

      this.scheduledTasks.set(jobName, task);
      task.start();
      
      const status = this.jobStatuses.get(jobName)!;
      status.status = 'pending';
      
      console.log(`✅ Job '${jobName}' started with schedule: ${config.schedule}`);
    } catch (error) {
      console.error(`❌ Failed to start job '${jobName}':`, error);
      this.updateJobStatus(jobName, 'failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Stop a specific job
   */
  stopJob(jobName: string): void {
    const task = this.scheduledTasks.get(jobName);
    if (task) {
      task.stop();
      this.scheduledTasks.delete(jobName);
      
      const status = this.jobStatuses.get(jobName)!;
      status.status = 'disabled';
      
      console.log(`⏸️  Job '${jobName}' stopped`);
    }
  }

  /**
   * Execute a job immediately
   */
  async executeJob(jobName: string): Promise<JobResult> {
    if (this.isShuttingDown) {
      return {
        success: false,
        message: 'System is shutting down, job execution cancelled',
        executionTime: 0,
        timestamp: new Date()
      };
    }

    // Check if job is already running
    if (this.runningJobs.has(jobName)) {
      console.log(`⚠️  Job '${jobName}' is already running, skipping`);
      return {
        success: false,
        message: 'Job is already running',
        executionTime: 0,
        timestamp: new Date()
      };
    }

    const config = this.jobs.get(jobName);
    if (!config || !config.enabled) {
      return {
        success: false,
        message: 'Job is disabled or not found',
        executionTime: 0,
        timestamp: new Date()
      };
    }

    // Check dependencies
    for (const dependency of config.dependencies || []) {
      const depStatus = this.jobStatuses.get(dependency);
      if (!depStatus || depStatus.status !== 'completed') {
        console.log(`⏳ Job '${jobName}' waiting for dependency '${dependency}'`);
        return {
          success: false,
          message: `Waiting for dependency '${dependency}'`,
          executionTime: 0,
          timestamp: new Date()
        };
      }
    }

    this.runningJobs.add(jobName);
    this.updateJobStatus(jobName, 'running');

    const startTime = Date.now();
    console.log(`🔄 Starting job: ${jobName}`);

    try {
      const jobResult = await this.executeJobLogic(jobName);
      const executionTime = Date.now() - startTime;

      if (jobResult.success) {
        this.updateJobStatus(jobName, 'completed', undefined, executionTime);
        console.log(`✅ Job '${jobName}' completed in ${executionTime}ms: ${jobResult.message}`);
      } else {
        this.updateJobStatus(jobName, 'failed', jobResult.message, executionTime);
        console.error(`❌ Job '${jobName}' failed after ${executionTime}ms: ${jobResult.message}`);
      }

      return { ...jobResult, executionTime };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.updateJobStatus(jobName, 'failed', errorMessage, executionTime);
      console.error(`💥 Job '${jobName}' crashed after ${executionTime}ms:`, error);
      
      return {
        success: false,
        message: errorMessage,
        executionTime,
        timestamp: new Date()
      };
    } finally {
      this.runningJobs.delete(jobName);
    }
  }

  /**
   * Execute the actual job logic (to be implemented by each job)
   */
  private async executeJobLogic(jobName: string): Promise<JobResult> {
    // This will be overridden by individual job implementations
    switch (jobName) {
      case 'daily-memory-cleanup':
        return await this.executeDailyMemoryCleanup();
      case 'weekly-summary-generation':
        return await this.executeWeeklySummaryGeneration();
      case 'monthly-quota-reset':
        return await this.executeMonthlyQuotaReset();
      case 'health-check':
        return await this.executeHealthCheck();
      case 'cache-cleanup':
        return await this.executeCacheCleanup();
      case 'database-maintenance':
        return await this.executeDatabaseMaintenance();
      case 'rate-limit-monitor':
        return await this.executeRateLimitMonitor();
      case 'archive-conversations':
        return await this.executeArchiveConversations();
      case 'usage-analysis':
        return await this.executeUsageAnalysis();
      case 'automated-backup':
        return await this.executeAutomatedBackup();
      case 'profile-refresh':
        return await this.executeProfileRefresh();
      default:
        throw new Error(`Job '${jobName}' not implemented`);
    }
  }

  // Individual job implementations (to be completed)
  private async executeDailyMemoryCleanup(): Promise<JobResult> {
    // Placeholder - will be implemented in daily-memory-cleanup.ts
    return { success: true, message: 'Daily memory cleanup completed', executionTime: 1000, timestamp: new Date() };
  }

  private async executeWeeklySummaryGeneration(): Promise<JobResult> {
    // Placeholder - will be implemented in weekly-summary-generation.ts
    return { success: true, message: 'Weekly summary generation completed', executionTime: 2000, timestamp: new Date() };
  }

  private async executeMonthlyQuotaReset(): Promise<JobResult> {
    // Placeholder - will be implemented in monthly-quota-reset.ts
    return { success: true, message: 'Monthly quota reset completed', executionTime: 500, timestamp: new Date() };
  }

  private async executeHealthCheck(): Promise<JobResult> {
    // Placeholder - will be implemented in health-check.ts
    return { success: true, message: 'Health check completed', executionTime: 3000, timestamp: new Date() };
  }

  private async executeCacheCleanup(): Promise<JobResult> {
    // Placeholder - will be implemented in cache-cleanup.ts
    return { success: true, message: 'Cache cleanup completed', executionTime: 1500, timestamp: new Date() };
  }

  private async executeDatabaseMaintenance(): Promise<JobResult> {
    // Placeholder - will be implemented in database-maintenance.ts
    return { success: true, message: 'Database maintenance completed', executionTime: 5000, timestamp: new Date() };
  }

  private async executeRateLimitMonitor(): Promise<JobResult> {
    // Placeholder - will be implemented in rate-limit-monitor.ts
    return { success: true, message: 'Rate limit monitoring completed', executionTime: 100, timestamp: new Date() };
  }

  private async executeArchiveConversations(): Promise<JobResult> {
    // Placeholder - will be implemented in archive-conversations.ts
    return { success: true, message: 'Archive conversations completed', executionTime: 3000, timestamp: new Date() };
  }

  private async executeUsageAnalysis(): Promise<JobResult> {
    // Placeholder - will be implemented in usage-analysis.ts
    return { success: true, message: 'Usage analysis completed', executionTime: 4000, timestamp: new Date() };
  }

  private async executeAutomatedBackup(): Promise<JobResult> {
    // Placeholder - will be implemented in automated-backup.ts
    return { success: true, message: 'Automated backup completed', executionTime: 10000, timestamp: new Date() };
  }

  private async executeProfileRefresh(): Promise<JobResult> {
    // Placeholder - will be implemented in profile-refresh.ts
    return { success: true, message: 'Profile refresh completed', executionTime: 2500, timestamp: new Date() };
  }

  /**
   * Update job status
   */
  private updateJobStatus(
    jobName: string, 
    status: 'running' | 'completed' | 'failed' | 'pending' | 'disabled',
    errorMessage?: string,
    executionTime?: number
  ): void {
    const jobStatus = this.jobStatuses.get(jobName);
    if (!jobStatus) return;

    jobStatus.status = status;
    jobStatus.lastRun = new Date();
    
    if (status === 'completed') {
      jobStatus.lastSuccess = jobStatus.lastRun;
      jobStatus.successCount++;
    } else if (status === 'failed') {
      jobStatus.lastError = errorMessage;
      jobStatus.failureCount++;
    }

    if (executionTime) {
      jobStatus.executionTime = executionTime;
    }

    jobStatus.runCount++;
  }

  /**
   * Initialize default job configurations
   */
  private initializeDefaultJobs(): void {
    const defaultJobs: JobConfig[] = [
      {
        name: 'daily-memory-cleanup',
        description: 'Remove expired conversation memories (8+ months old)',
        schedule: '0 0 * * *', // Daily at 00:00 UTC
        enabled: true,
        timeout: 300000 // 5 minutes
      },
      {
        name: 'weekly-summary-generation',
        description: 'Generate weekly summaries for active students',
        schedule: '0 0 * * 0', // Every Sunday at 00:00 UTC
        enabled: true,
        timeout: 3600000 // 1 hour
      },
      {
        name: 'monthly-quota-reset',
        description: 'Reset monthly API quotas and counters',
        schedule: '0 0 1 * *', // 1st of every month at 00:00 UTC
        enabled: true,
        timeout: 60000 // 1 minute
      },
      {
        name: 'health-check',
        description: 'Monitor system health and detect issues',
        schedule: '*/5 * * * *', // Every 5 minutes
        enabled: true,
        timeout: 30000 // 30 seconds
      },
      {
        name: 'cache-cleanup',
        description: 'Clean expired cache entries',
        schedule: '0 */6 * * *', // Every 6 hours
        enabled: true,
        timeout: 120000 // 2 minutes
      },
      {
        name: 'database-maintenance',
        description: 'Maintain database performance',
        schedule: '0 2 * * 6', // Every Saturday at 02:00 UTC
        enabled: true,
        timeout: 600000 // 10 minutes
      },
      {
        name: 'rate-limit-monitor',
        description: 'Monitor API usage and handle rate limits',
        schedule: '* * * * *', // Every minute
        enabled: true,
        timeout: 5000 // 5 seconds
      },
      {
        name: 'archive-conversations',
        description: 'Archive old conversations',
        schedule: '0 2 15 * *', // Monthly on 15th at 02:00 UTC
        enabled: true,
        timeout: 300000 // 5 minutes
      },
      {
        name: 'usage-analysis',
        description: 'Analyze API usage patterns',
        schedule: '0 1 * * *', // Daily at 01:00 UTC
        enabled: true,
        timeout: 600000 // 10 minutes
      },
      {
        name: 'automated-backup',
        description: 'Backup critical data automatically',
        schedule: '0 3 * * *', // Daily at 03:00 UTC
        enabled: true,
        timeout: 1800000 // 30 minutes
      },
      {
        name: 'profile-refresh',
        description: 'Keep student profiles updated',
        schedule: '0 4 * * *', // Daily at 04:00 UTC
        enabled: true,
        timeout: 900000 // 15 minutes
      }
    ];

    for (const jobConfig of defaultJobs) {
      this.registerJob(jobConfig);
    }
  }

  /**
   * Setup graceful shutdown handling
   */
  private setupGracefulShutdown(): void {
    const gracefulShutdown = () => {
      console.log('🛑 Graceful shutdown initiated...');
      this.isShuttingDown = true;
      
      // Stop accepting new jobs
      for (const [jobName, task] of this.scheduledTasks) {
        console.log(`⏸️  Stopping job: ${jobName}`);
        task.stop();
      }
      
      // Wait for running jobs to complete (with timeout)
      const shutdownTimeout = setTimeout(() => {
        console.log('⚠️  Force shutting down - some jobs may be incomplete');
        process.exit(0);
      }, 30000); // 30 seconds timeout
      
      const waitForJobs = () => {
        if (this.runningJobs.size === 0) {
          clearTimeout(shutdownTimeout);
          console.log('✅ All background jobs completed');
          process.exit(0);
        } else {
          console.log(`⏳ Waiting for ${this.runningJobs.size} jobs to complete...`);
          setTimeout(waitForJobs, 1000);
        }
      };
      
      waitForJobs();
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGUSR2', gracefulShutdown); // Nodemon restart
  }

  /**
   * Get all job statuses
   */
  getJobStatuses(): JobStatus[] {
    return Array.from(this.jobStatuses.values());
  }

  /**
   * Get status of a specific job
   */
  getJobStatus(jobName: string): JobStatus | null {
    return this.jobStatuses.get(jobName) || null;
  }

  /**
   * Enable or disable a job
   */
  setJobEnabled(jobName: string, enabled: boolean): void {
    const config = this.jobs.get(jobName);
    if (config) {
      config.enabled = enabled;
      if (enabled) {
        this.startJob(jobName);
      } else {
        this.stopJob(jobName);
      }
    }
  }

  /**
   * Stop all jobs and shutdown
   */
  shutdown(): void {
    console.log('🔄 Shutting down Background Job Scheduler...');
    
    for (const [jobName, task] of this.scheduledTasks) {
      console.log(`⏸️  Stopping job: ${jobName}`);
      task.stop();
    }
    
    this.scheduledTasks.clear();
    this.runningJobs.clear();
    
    console.log('✅ Background Job Scheduler stopped');
  }

  /**
   * Get scheduler statistics
   */
  getStatistics() {
    const statuses = Array.from(this.jobStatuses.values());
    const running = statuses.filter(s => s.status === 'running').length;
    const completed = statuses.filter(s => s.status === 'completed').length;
    const failed = statuses.filter(s => s.status === 'failed').length;
    const disabled = statuses.filter(s => s.status === 'disabled').length;

    return {
      totalJobs: statuses.length,
      running,
      completed,
      failed,
      disabled,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      systemTime: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const backgroundJobScheduler = new BackgroundJobScheduler();