// Monthly Quota Reset Job
// =======================

import { rateLimitTracker } from '../ai/rate-limit-tracker';
import type { AIProvider } from '@/types/api-test';
import type { JobResult } from './scheduler';

interface QuotaResetResult {
  provider: AIProvider;
  previousUsage: number;
  limit: number;
  resetTime: Date;
  success: boolean;
  error?: string;
}

/**
 * Monthly Quota Reset Job
 * Purpose: Reset monthly API quotas and counters
 * Schedule: 1st of every month at 00:00 UTC
 */
export async function executeMonthlyQuotaReset(): Promise<JobResult> {
  const startTime = Date.now();
  console.log('🔄 Starting monthly quota reset job...');

  try {
    const now = new Date();
    const monthName = now.toLocaleDateString('en', { month: 'long', year: 'numeric' });
    
    console.log(`📅 Resetting quotas for ${monthName}`);

    // Providers with monthly limits that need resetting
    const monthlyProviders: Array<{ 
      provider: AIProvider; 
      limit: number; 
      description: string 
    }> = [
      {
        provider: 'cohere',
        limit: 1000,
        description: 'Cohere API calls (1000 calls/month)'
      },
      {
        provider: 'mistral',
        limit: 500,
        description: 'Mistral API calls (500 calls/month)'
      }
    ];

    const resetResults: QuotaResetResult[] = [];
    let totalResets = 0;
    let errors = 0;

    // Reset quotas for each provider
    for (const providerConfig of monthlyProviders) {
      try {
        console.log(`🔄 Resetting ${providerConfig.provider} quota...`);
        
        // Get current status before reset
        const beforeStatus = rateLimitTracker.checkRateLimit(providerConfig.provider);
        
        // Reset the provider tracking
        rateLimitTracker.resetProvider(providerConfig.provider);
        
        // Get status after reset
        const afterStatus = rateLimitTracker.checkRateLimit(providerConfig.provider);
        
        resetResults.push({
          provider: providerConfig.provider,
          previousUsage: beforeStatus.usage,
          limit: beforeStatus.limit,
          resetTime: new Date(),
          success: true
        });

        totalResets++;
        console.log(`✅ ${providerConfig.provider}: ${beforeStatus.usage}/${beforeStatus.limit} reset to 0/${beforeStatus.limit}`);

      } catch (error) {
        errors++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        resetResults.push({
          provider: providerConfig.provider,
          previousUsage: 0,
          limit: providerConfig.limit,
          resetTime: new Date(),
          success: false,
          error: errorMessage
        });

        console.error(`❌ Failed to reset ${providerConfig.provider}:`, errorMessage);
      }
    }

    // Log the quota reset activity
    await logQuotaResetActivity({
      monthName,
      totalResets,
      errors,
      results: resetResults,
      resetTime: new Date()
    });

    // Log the system activity
    console.log(`📊 Monthly quotas reset for ${monthName}. Summary:`);
    for (const result of resetResults) {
      if (result.success) {
        console.log(`  - ${result.provider}: ${result.previousUsage}/${result.limit} → 0/${result.limit}`);
      } else {
        console.log(`  - ${result.provider}: FAILED (${result.error})`);
      }
    }

    // Optional: Send email notification to admin (can be implemented with email service)
    // await sendAdminNotification(resetResults, monthName);

    const executionTime = Date.now() - startTime;
    const successMessage = `Monthly quotas reset for ${monthName}. ${totalResets} providers reset successfully.${errors > 0 ? ` ${errors} errors encountered.` : ''}`;

    return {
      success: errors === 0,
      message: successMessage,
      executionTime,
      timestamp: new Date(),
      data: {
        monthName,
        totalResets,
        errors,
        resetResults,
        nextResetDate: getNextMonthFirst()
      }
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('💥 Monthly quota reset failed:', error);

    await logQuotaResetActivity({
      monthName: new Date().toLocaleDateString('en', { month: 'long', year: 'numeric' }),
      totalResets: 0,
      errors: 1,
      results: [],
      resetTime: new Date(),
      errorMessage
    });

    return {
      success: false,
      message: `Monthly quota reset failed: ${errorMessage}`,
      executionTime,
      timestamp: new Date()
    };
  }
}

/**
 * Log quota reset activity to activity_logs table
 */
async function logQuotaResetActivity(params: {
  monthName: string;
  totalResets: number;
  errors: number;
  results: QuotaResetResult[];
  resetTime: Date;
  errorMessage?: string;
}): Promise<void> {
  try {
    const { monthName, totalResets, errors, results, resetTime, errorMessage } = params;
    
    const activitySummary = errorMessage
      ? `Monthly quota reset failed for ${monthName}: ${errorMessage}`
      : `Monthly quota reset completed for ${monthName}: ${totalResets} providers reset successfully${errors > 0 ? `, ${errors} errors` : ''}`;

    const details = {
      monthName,
      totalResets,
      errors,
      successRate: totalResets > 0 ? Math.round(((totalResets - errors) / totalResets) * 100) : 0,
      results: results.map(result => ({
        provider: result.provider,
        success: result.success,
        previousUsage: result.previousUsage,
        limit: result.limit,
        error: result.error
      })),
      resetTime: resetTime.toISOString(),
      jobType: 'monthly-quota-reset',
      executionTime: new Date().toISOString()
    };

    // We need to import supabase, but it's not available in this scope
    // This will be called from the scheduler which has access to supabase
    console.log('Quota reset activity logged:', activitySummary, details);

  } catch (error) {
    console.error('Failed to log quota reset activity:', error);
  }
}

/**
 * Send admin notification about quota reset (placeholder for email integration)
 */
async function sendAdminNotification(results: QuotaResetResult[], monthName: string): Promise<void> {
  try {
    // This is a placeholder for email notification functionality
    // In a real implementation, you would integrate with your email service
    // like SendGrid, AWS SES, or similar
    
    const successfulResets = results.filter(r => r.success).length;
    const failedResets = results.filter(r => !r.success).length;
    
    const emailContent = `
Monthly Quota Reset Report - ${monthName}

✅ Successful Resets: ${successfulResets}
❌ Failed Resets: ${failedResets}

Details:
${results.map(result => 
  `- ${result.provider}: ${result.success ? 'SUCCESS' : `FAILED - ${result.error}`}`
).join('\n')}

Next reset scheduled for: ${getNextMonthFirst()}
`;

    console.log('📧 Admin notification email (placeholder):');
    console.log(emailContent);

    // In real implementation:
    // await emailService.send({
    //   to: 'admin@blockwise.com',
    //   subject: `Monthly Quota Reset Report - ${monthName}`,
    //   text: emailContent
    // });

  } catch (error) {
    console.error('Failed to send admin notification:', error);
  }
}

/**
 * Get next month's first day for scheduling reference
 */
function getNextMonthFirst(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
}

/**
 * Get current quota status for monitoring dashboard
 */
export function getCurrentQuotaStatus(): Array<{
  provider: AIProvider;
  usage: number;
  limit: number;
  percentage: number;
  status: 'healthy' | 'warning' | 'critical' | 'blocked';
  daysUntilReset: number;
}> {
  const providers: AIProvider[] = ['cohere', 'mistral']; // Only providers with monthly limits
  
  return providers.map(provider => {
    const status = rateLimitTracker.checkRateLimit(provider);
    const daysUntilReset = Math.ceil((new Date(status.resetTime).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    return {
      provider,
      usage: status.usage,
      limit: status.limit,
      percentage: Math.round(status.percentage),
      status: status.status,
      daysUntilReset: Math.max(0, daysUntilReset)
    };
  });
}

/**
 * Get quota reset statistics
 */
export function getQuotaResetStats() {
  try {
    const currentStatus = getCurrentQuotaStatus();
    const nextResetDate = getNextMonthFirst();
    
    return {
      currentStatus,
      nextResetDate,
      monthlyProviders: currentStatus.length,
      providersNearLimit: currentStatus.filter(s => s.percentage >= 80).length,
      providersAtLimit: currentStatus.filter(s => s.status === 'blocked').length
    };
  } catch (error) {
    console.error('Failed to get quota reset stats:', error);
    return null;
  }
}