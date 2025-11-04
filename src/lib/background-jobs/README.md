# BlockWise AI Background Jobs System

## Overview

The BlockWise AI Background Jobs System is a comprehensive maintenance and automation framework that runs silently in the background to ensure optimal system health, data management, and AI service performance. This system implements 12 specialized jobs that handle everything from memory cleanup to health monitoring.

## 🎯 Key Features

- **12 Specialized Jobs**: Complete automation for system maintenance
- **Intelligent Scheduling**: Optimized cron-based scheduling with dependencies
- **Real-time Monitoring**: Continuous health checks and rate limit monitoring
- **Automatic Failover**: Smart provider switching when limits are reached
- **Comprehensive Logging**: Detailed execution tracking and error handling
- **Production Ready**: Robust error recovery and graceful shutdown
- **Easy Integration**: Simple API for manual execution and monitoring

## 📁 System Architecture

```
src/lib/background-jobs/
├── scheduler.ts              # Core job scheduling infrastructure
├── runner.ts                 # Startup, lifecycle management
├── configuration.ts          # Job configurations and settings
├── index.ts                  # Main export and quick access
├── daily-memory-cleanup.ts   # Remove expired conversation memories
├── weekly-summary-generation.ts # Generate weekly student summaries
├── monthly-quota-reset.ts    # Reset API quotas and counters
├── health-check.ts          # System health monitoring
├── cache-cleanup.ts         # Clean expired cache entries
├── database-maintenance.ts   # Database optimization tasks
├── rate-limit-monitor.ts     # Continuous rate limit monitoring
├── archive-conversations.ts  # Archive old conversations
├── usage-analysis.ts         # Analyze API usage patterns
├── automated-backup.ts       # Automated data backup
├── profile-refresh.ts        # Update student AI profiles
└── README.md                # This documentation
```

## 🕒 Job Schedule Overview

| Job | Schedule | Purpose | Duration |
|-----|----------|---------|----------|
| **Health Check** | Every 5 minutes | Monitor system health | 30s |
| **Rate Limit Monitor** | Continuous (1min intervals) | API usage monitoring | 5s |
| **Cache Cleanup** | Every 6 hours | Clean expired cache | 2min |
| **Daily Memory Cleanup** | Daily 00:00 UTC | Remove expired memories | 5min |
| **Usage Analysis** | Daily 01:00 UTC | Analyze usage patterns | 10min |
| **Automated Backup** | Daily 03:00 UTC | Backup critical data | 30min |
| **Profile Refresh** | Daily 04:00 UTC | Update student profiles | 15min |
| **Weekly Summary Generation** | Sunday 00:00 UTC | Generate weekly summaries | 1hr |
| **Database Maintenance** | Saturday 02:00 UTC | Database optimization | 10min |
| **Archive Conversations** | 15th monthly 02:00 UTC | Archive old conversations | 5min |
| **Monthly Quota Reset** | 1st monthly 00:00 UTC | Reset API quotas | 1min |

## 🚀 Quick Start

### 1. Auto-Initialization (Recommended)

```typescript
import { initializeBackgroundJobs } from '@/lib/background-jobs';

// Initialize automatically (uses NODE_ENV)
await initializeBackgroundJobs();

// Check system status
import { backgroundJobRunner } from '@/lib/background-jobs';
const status = backgroundJobRunner.getStatus();
console.log('System health:', status.systemHealth);
```

### 2. Manual Initialization

```typescript
import { backgroundJobRunner } from '@/lib/background-jobs';

const result = await backgroundJobRunner.initialize();

if (result.success) {
  console.log('Background jobs started successfully');
  console.log('Jobs started:', result.jobsStarted);
} else {
  console.error('Initialization failed:', result.errors);
}
```

### 3. Execute Jobs Manually

```typescript
import { 
  executeDailyMemoryCleanup,
  executeHealthCheck,
  executeAutomatedBackup 
} from '@/lib/background-jobs';

// Run individual jobs
const cleanupResult = await executeDailyMemoryCleanup();
const healthResult = await executeHealthCheck();
const backupResult = await executeAutomatedBackup();

console.log('Cleanup result:', cleanupResult.success);
```

## 📊 Monitoring and Statistics

### System Health Check

```typescript
import { checkSystemHealth } from '@/lib/background-jobs';

const health = await checkSystemHealth();
console.log('Overall health:', health.overall);
console.log('Recommendations:', health.recommendations);
```

### Get Job Statistics

```typescript
import { backgroundJobRunner } from '@/lib/background-jobs';

// Get execution history
const history = backgroundJobRunner.getJobHistory();
console.log('Recent job executions:', history);

// Get system metrics
const metrics = backgroundJobRunner.getSystemMetrics();
console.log('Memory usage:', metrics.memoryUsage);
console.log('Uptime:', Math.round(metrics.uptime / 1000), 'seconds');
```

### Individual Job Statistics

```typescript
import { 
  getHealthCheckStats,
  getBackupStatistics,
  getUsageAnalysisStats 
} from '@/lib/background-jobs';

const healthStats = await getHealthCheckStats();
const backupStats = await getBackupStatistics();
const usageStats = await getUsageAnalysisStats();
```

## ⚡ Rate Limit Monitoring

The system includes continuous rate limit monitoring with automatic failover:

```typescript
import { rateLimitMonitor } from '@/lib/background-jobs';

// Check current status
const currentStatus = rateLimitMonitor.getCurrentStatus();
currentStatus.forEach(status => {
  console.log(`${status.provider}: ${status.percentage}% used`);
});

// Get active failovers
const failovers = rateLimitMonitor.getActiveFailovers();
console.log('Active failovers:', Object.fromEntries(failovers));
```

### Automatic Failover Behavior

- **80% Usage**: Warning logs, increased monitoring
- **95% Usage**: Automatic switch to fallback provider
- **100% Usage**: Provider blocked, use fallback until reset

## 🔧 Configuration

### Environment-Specific Settings

```typescript
import { ENVIRONMENT_CONFIGS } from '@/lib/background-jobs';

const config = ENVIRONMENT_CONFIGS[process.env.NODE_ENV || 'production'];
```

### Custom Job Configuration

```typescript
import { JOB_CONFIGURATIONS } from '@/lib/background-jobs';

// Modify job settings
JOB_CONFIGURATIONS['health-check'].timeout = 45000; // 45 seconds
JOB_CONFIGURATIONS['daily-memory-cleanup'].enabled = true;
```

### Job Dependencies

Jobs can depend on other jobs completing successfully:

```typescript
// Example dependency chain
'weekly-summary-generation' depends on 'daily-memory-cleanup'
'automated-backup' depends on 'usage-analysis'
'profile-refresh' depends on 'automated-backup'
```

## 🛠️ Individual Job Details

### Daily Memory Cleanup

**Purpose**: Remove expired conversation memories older than 8 months

**Actions**:
- Query `study_chat_memory` table for expired records
- Calculate storage space before deletion
- Delete expired records with detailed logging
- Report space freed and records processed

**Manual Execution**:
```typescript
import { executeDailyMemoryCleanup } from '@/lib/background-jobs';
const result = await executeDailyMemoryCleanup();
```

### Health Check

**Purpose**: Monitor system health every 5 minutes

**Actions**:
- Test all 6 AI providers with lightweight calls
- Measure response times and detect issues
- Check database connectivity
- Monitor disk space usage
- Track provider uptime and downtime

**Manual Execution**:
```typescript
import { executeHealthCheck } from '@/lib/background-jobs';
const result = await executeHealthCheck();
```

### Rate Limit Monitor

**Purpose**: Continuous monitoring with automatic failover

**Actions**:
- Monitor usage every second for real-time response
- Automatic provider switching at 95% usage
- Alert generation for critical situations
- Track and display usage percentages

**Continuous Operation**: Starts automatically with system initialization

### Database Maintenance

**Purpose**: Weekly database optimization

**Actions**:
- Run VACUUM to reclaim space from deleted rows
- REINDEX all tables for better performance
- ANALYZE tables to update query planner statistics
- Report performance improvements

**Schedule**: Every Saturday at 02:00 UTC (off-peak hours)

### Automated Backup

**Purpose**: Daily critical data backup

**Actions**:
- Backup AI tables (chat_conversations, study_chat_memory, etc.)
- Core application tables (profiles, subjects, topics)
- Verify backup integrity
- Maintain 30-day retention policy
- Clean up old backups automatically

**Schedule**: Daily at 03:00 UTC

### Usage Pattern Analysis

**Purpose**: Daily usage pattern analysis

**Actions**:
- Analyze 24-hour API usage data
- Generate provider usage statistics
- Detect unusual patterns and anomalies
- Create daily usage reports
- Provide optimization recommendations

**Schedule**: Daily at 01:00 UTC

## 🚨 Error Handling and Recovery

### Graceful Degradation

The system includes comprehensive error handling:

```typescript
// Example error handling in job execution
try {
  const result = await executeHealthCheck();
  if (!result.success) {
    console.error('Health check failed:', result.message);
    // System continues operating with degraded functionality
  }
} catch (error) {
  // Critical error handling
  console.error('Unexpected error:', error);
  // System attempts recovery
}
```

### Retry Policies

- **Critical jobs**: 3 retry attempts with exponential backoff
- **High priority**: 2 retry attempts
- **Medium priority**: 2 retry attempts
- **Low priority**: 1 retry attempt

### Emergency Procedures

```typescript
import { emergencyStop } from '@/lib/background-jobs';

// Emergency stop all jobs
const result = await emergencyStop();
console.log(result.message);
```

## 📈 Performance Monitoring

### Key Metrics Tracked

- **Job Execution Times**: Monitor for performance degradation
- **Success/Failure Rates**: Track job reliability
- **Memory Usage**: Monitor system resource consumption
- **Provider Response Times**: Track AI service performance
- **Rate Limit Usage**: Monitor API consumption patterns

### Health Thresholds

```typescript
// Default thresholds
const thresholds = {
  consecutiveFailures: 3,           // Alert after 3 consecutive failures
  executionTimeWarning: 60000,      // 1 minute execution warning
  executionTimeCritical: 300000,    // 5 minutes execution critical
  memoryUsageWarning: 100 * 1024 * 1024,    // 100MB warning
  memoryUsageCritical: 500 * 1024 * 1024,   // 500MB critical
  diskSpaceWarning: 10,             // 10% free space warning
  diskSpaceCritical: 5              // 5% free space critical
};
```

## 🔄 Integration with Existing Systems

### AI Service Manager Integration

```typescript
import { aiServiceManager } from '@/lib/ai/ai-service-manager';

// Background jobs integrate with existing AI infrastructure
// Rate limit monitoring works with rateLimitTracker
// Health checks test aiServiceManager.healthCheck()
```

### Database Integration

```typescript
import { supabase } from '@/lib/supabase';

// All jobs use existing Supabase integration
// Database operations follow existing patterns
// Compatible with existing RLS policies
```

## 🚀 Production Deployment

### Environment Variables

```bash
# Background Job Configuration
NODE_ENV=production
BACKGROUND_JOBS_ENABLED=true
BACKGROUND_JOBS_LOG_LEVEL=info

# Monitoring Configuration
HEALTH_CHECK_INTERVAL=300000
RATE_LIMIT_MONITOR_INTERVAL=5000
```

### Startup Script

```typescript
// In your main application startup
import { initializeBackgroundJobs } from '@/lib/background-jobs';

async function startApplication() {
  // Initialize background jobs first
  await initializeBackgroundJobs();
  
  // Start your application
  startServer();
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  const { cleanupBackgroundJobs } = await import('@/lib/background-jobs');
  await cleanupBackgroundJobs();
  process.exit(0);
});
```

## 🧪 Testing

### Manual Testing

```typescript
// Test individual jobs
import { executeHealthCheck } from '@/lib/background-jobs';

// Run health check manually
const result = await executeHealthCheck();
console.log('Health check result:', result);
```

### Integration Testing

```typescript
// Test full system initialization
import { backgroundJobRunner } from '@/lib/background-jobs';

async function testBackgroundJobs() {
  const initResult = await backgroundJobRunner.initialize();
  console.log('Init successful:', initResult.success);
  
  // Test manual job execution
  const manualResult = await backgroundJobRunner.executeJobManually('health-check');
  console.log('Manual execution:', manualResult.success);
  
  // Test system status
  const status = backgroundJobRunner.getStatus();
  console.log('System status:', status);
  
  // Cleanup
  await backgroundJobRunner.shutdown();
}
```

## 🔍 Troubleshooting

### Common Issues

1. **Jobs not starting**
   - Check environment configuration
   - Verify database connectivity
   - Review error logs

2. **High memory usage**
   - Run manual garbage collection
   - Check for memory leaks in jobs
   - Monitor rate limit monitor performance

3. **Provider timeouts**
   - Check API key validity
   - Verify network connectivity
   - Review rate limit configurations

### Debug Mode

```typescript
// Enable detailed logging
import { BACKGROUND_JOBS_LOG_LEVEL } from '@/lib/background-jobs';

process.env.BACKGROUND_JOBS_LOG_LEVEL = 'debug';
```

## 📋 Maintenance Tasks

### Regular Maintenance

1. **Weekly**: Review job execution reports
2. **Monthly**: Analyze usage patterns and optimize schedules
3. **Quarterly**: Update provider configurations and add new providers
4. **Annually**: Review and update retention policies

### Performance Optimization

1. **Monitor execution times** and optimize slow jobs
2. **Adjust schedules** based on usage patterns
3. **Update fallback chains** based on provider performance
4. **Clean up old logs** and backup files

## 🤝 Contributing

When adding new jobs:

1. Follow the existing pattern in `scheduler.ts`
2. Add configuration to `configuration.ts`
3. Update `runner.ts` with the new implementation
4. Add tests and documentation
5. Update this README

## 📞 Support

For issues or questions:

1. Check the job logs for error details
2. Review the troubleshooting section
3. Check system health status
4. Consult the existing AI system documentation

---

**Note**: This background job system is a critical component of the BlockWise AI infrastructure. It runs silently to ensure optimal performance and reliability. Regular monitoring and maintenance will ensure long-term system health.