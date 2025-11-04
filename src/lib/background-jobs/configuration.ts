// Background Job Configuration
// ============================

import type { JobConfig } from './scheduler';

// All job configurations
export const JOB_CONFIGURATIONS: Record<string, JobConfig> = {
  'daily-memory-cleanup': {
    name: 'daily-memory-cleanup',
    description: 'Remove expired conversation memories (8+ months old)',
    schedule: '0 0 * * *', // Daily at 00:00 UTC
    enabled: true,
    timeout: 300000, // 5 minutes
    retryAttempts: 3,
    dependencies: []
  },
  
  'weekly-summary-generation': {
    name: 'weekly-summary-generation',
    description: 'Generate weekly summaries for active students',
    schedule: '0 0 * * 0', // Every Sunday at 00:00 UTC
    enabled: true,
    timeout: 3600000, // 1 hour
    retryAttempts: 2,
    dependencies: ['daily-memory-cleanup']
  },
  
  'monthly-quota-reset': {
    name: 'monthly-quota-reset',
    description: 'Reset monthly API quotas and counters',
    schedule: '0 0 1 * *', // 1st of every month at 00:00 UTC
    enabled: true,
    timeout: 60000, // 1 minute
    retryAttempts: 1,
    dependencies: []
  },
  
  'health-check': {
    name: 'health-check',
    description: 'Monitor system health and detect issues',
    schedule: '*/5 * * * *', // Every 5 minutes
    enabled: true,
    timeout: 30000, // 30 seconds
    retryAttempts: 2,
    dependencies: []
  },
  
  'cache-cleanup': {
    name: 'cache-cleanup',
    description: 'Clean expired cache entries',
    schedule: '0 */6 * * *', // Every 6 hours
    enabled: true,
    timeout: 120000, // 2 minutes
    retryAttempts: 2,
    dependencies: []
  },
  
  'database-maintenance': {
    name: 'database-maintenance',
    description: 'Maintain database performance',
    schedule: '0 2 * * 6', // Every Saturday at 02:00 UTC
    enabled: true,
    timeout: 600000, // 10 minutes
    retryAttempts: 1,
    dependencies: ['health-check']
  },
  
  'rate-limit-monitor': {
    name: 'rate-limit-monitor',
    description: 'Monitor API usage and handle rate limits',
    schedule: '* * * * *', // Every minute (continuous monitoring)
    enabled: true,
    timeout: 5000, // 5 seconds
    retryAttempts: 3,
    dependencies: ['health-check']
  },
  
  'archive-conversations': {
    name: 'archive-conversations',
    description: 'Archive old conversations',
    schedule: '0 2 15 * *', // Monthly on 15th at 02:00 UTC
    enabled: true,
    timeout: 300000, // 5 minutes
    retryAttempts: 2,
    dependencies: ['database-maintenance']
  },
  
  'usage-analysis': {
    name: 'usage-analysis',
    description: 'Analyze API usage patterns',
    schedule: '0 1 * * *', // Daily at 01:00 UTC
    enabled: true,
    timeout: 600000, // 10 minutes
    retryAttempts: 2,
    dependencies: ['daily-memory-cleanup']
  },
  
  'automated-backup': {
    name: 'automated-backup',
    description: 'Backup critical data automatically',
    schedule: '0 3 * * *', // Daily at 03:00 UTC
    enabled: true,
    timeout: 1800000, // 30 minutes
    retryAttempts: 1,
    dependencies: ['usage-analysis']
  },
  
  'profile-refresh': {
    name: 'profile-refresh',
    description: 'Keep student profiles updated',
    schedule: '0 4 * * *', // Daily at 04:00 UTC
    enabled: true,
    timeout: 900000, // 15 minutes
    retryAttempts: 2,
    dependencies: ['automated-backup']
  }
};

// Environment-specific configurations
export const ENVIRONMENT_CONFIGS = {
  development: {
    schedules: {
      'health-check': '*/2 * * * *', // Every 2 minutes in dev
      'rate-limit-monitor': '*/30 * * * *', // Every 30 seconds in dev
    },
    timeouts: {
      'health-check': 10000, // 10 seconds in dev
      'rate-limit-monitor': 2000, // 2 seconds in dev
    }
  },
  
  staging: {
    schedules: {
      'health-check': '*/3 * * * *', // Every 3 minutes in staging
    },
    timeouts: {
      'database-maintenance': 300000, // 5 minutes in staging
    }
  },
  
  production: {
    schedules: JOB_CONFIGURATIONS, // Use default schedules
    timeouts: JOB_CONFIGURATIONS // Use default timeouts
  }
};

// Job priority levels
export const JOB_PRIORITIES = {
  critical: ['health-check', 'rate-limit-monitor', 'automated-backup'],
  high: ['daily-memory-cleanup', 'database-maintenance', 'profile-refresh'],
  medium: ['weekly-summary-generation', 'usage-analysis', 'archive-conversations'],
  low: ['monthly-quota-reset', 'cache-cleanup']
};

// Retry policies
export const RETRY_POLICIES = {
  'health-check': {
    maxAttempts: 3,
    backoffMultiplier: 2,
    initialDelay: 5000, // 5 seconds
    maxDelay: 60000 // 1 minute
  },
  'automated-backup': {
    maxAttempts: 2,
    backoffMultiplier: 3,
    initialDelay: 300000, // 5 minutes
    maxDelay: 1800000 // 30 minutes
  },
  default: {
    maxAttempts: 3,
    backoffMultiplier: 2,
    initialDelay: 10000, // 10 seconds
    maxDelay: 300000 // 5 minutes
  }
};

// Monitoring and alerting thresholds
export const ALERT_THRESHOLDS = {
  consecutiveFailures: 3,
  executionTimeWarning: 60000, // 1 minute
  executionTimeCritical: 300000, // 5 minutes
  memoryUsageWarning: 100 * 1024 * 1024, // 100MB
  memoryUsageCritical: 500 * 1024 * 1024, // 500MB
  diskSpaceWarning: 10, // 10% free
  diskSpaceCritical: 5 // 5% free
};

// Job dependency graph for visualization and validation
export const JOB_DEPENDENCY_GRAPH = {
  nodes: Object.keys(JOB_CONFIGURATIONS).map(jobName => ({
    id: jobName,
    label: JOB_CONFIGURATIONS[jobName].description,
    group: getJobGroup(jobName)
  })),
  edges: Object.entries(JOB_CONFIGURATIONS).map(([jobName, config]) => ({
    from: jobName,
    to: config.dependencies || []
  })).flatMap(edge => 
    edge.to.map(target => ({
      from: edge.from,
      to: target,
      arrows: 'to'
    }))
  )
};

// Helper function to get job group for visualization
function getJobGroup(jobName: string): string {
  if (JOB_PRIORITIES.critical.includes(jobName)) return 'critical';
  if (JOB_PRIORITIES.high.includes(jobName)) return 'high';
  if (JOB_PRIORITIES.medium.includes(jobName)) return 'medium';
  return 'low';
}

// Get active jobs for current environment
export function getActiveJobs(environment: string = 'production'): string[] {
  const config = ENVIRONMENT_CONFIGS[environment as keyof typeof ENVIRONMENT_CONFIGS] || ENVIRONMENT_CONFIGS.production;
  return Object.keys(JOB_CONFIGURATIONS).filter(jobName => 
    JOB_CONFIGURATIONS[jobName].enabled
  );
}

// Validate job configuration
export function validateJobConfiguration(jobName: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const config = JOB_CONFIGURATIONS[jobName];
  
  if (!config) {
    errors.push(`Job '${jobName}' not found in configuration`);
    return { isValid: false, errors, warnings };
  }
  
  // Validate timeout
  if (config.timeout && config.timeout > 3600000) { // 1 hour
    warnings.push(`Timeout of ${config.timeout}ms is very long for job '${jobName}'`);
  }
  
  // Validate dependencies
  for (const dependency of config.dependencies || []) {
    if (!JOB_CONFIGURATIONS[dependency]) {
      errors.push(`Dependency '${dependency}' not found for job '${jobName}'`);
    }
  }
  
  // Check for circular dependencies
  const circularDeps = findCircularDependencies();
  if (circularDeps.length > 0) {
    errors.push(`Circular dependencies detected: ${circularDeps.join(' -> ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Find circular dependencies
function findCircularDependencies(): string[] {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const circularPaths: string[] = [];
  
  function dfs(jobName: string, path: string[]): void {
    if (recursionStack.has(jobName)) {
      const cycleStart = path.indexOf(jobName);
      circularPaths.push(path.slice(cycleStart).join(' -> ') + ` -> ${jobName}`);
      return;
    }
    
    if (visited.has(jobName)) return;
    
    visited.add(jobName);
    recursionStack.add(jobName);
    
    const config = JOB_CONFIGURATIONS[jobName];
    for (const dependency of config?.dependencies || []) {
      dfs(dependency, [...path, jobName]);
    }
    
    recursionStack.delete(jobName);
  }
  
  for (const jobName of Object.keys(JOB_CONFIGURATIONS)) {
    if (!visited.has(jobName)) {
      dfs(jobName, []);
    }
  }
  
  return circularPaths;
}

// Get job health metrics
export function getJobHealthMetrics(jobName: string): {
  uptime: number;
  successRate: number;
  avgExecutionTime: number;
  lastExecution: Date | null;
  nextExecution: Date | null;
} {
  // This would be implemented to fetch actual metrics from monitoring system
  // For now, return placeholder data
  return {
    uptime: 99.5, // 99.5%
    successRate: 98.2, // 98.2%
    avgExecutionTime: 45000, // 45 seconds
    lastExecution: new Date(),
    nextExecution: calculateNextExecution(jobName)
  };
}

// Calculate next execution time for a job
export function calculateNextExecution(jobName: string): Date | null {
  const config = JOB_CONFIGURATIONS[jobName];
  if (!config) return null;
  
  // This would use the cron expression to calculate next run time
  // For now, return a placeholder
  const now = new Date();
  return new Date(now.getTime() + 3600000); // 1 hour from now
}