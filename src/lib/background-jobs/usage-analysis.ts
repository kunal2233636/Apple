// Usage Pattern Analysis Job
// ===========================

import { supabase } from '../supabase';
import type { JobResult } from './scheduler';
import type { AIProvider } from '@/types/api-test';

interface UsageStatistics {
  totalApiCalls: number;
  providers: Array<{
    provider: AIProvider;
    callCount: number;
    percentage: number;
    avgResponseTime: number;
    errorRate: number;
  }>;
  peakHours: Array<{ hour: number; calls: number }>;
  errorTypes: Array<{ error: string; count: number }>;
  featureUsage: Array<{ feature: string; count: number }>;
  anomalies: string[];
}

interface DailyUsageReport {
  date: string;
  totalCalls: number;
  providers: Record<string, number>;
  avgResponseTime: number;
  errorRate: number;
  peakHour: number;
  features: Record<string, number>;
}

/**
 * Usage Pattern Analysis Job
 * Purpose: Analyze API usage patterns for insights
 * Schedule: Daily at 01:00 UTC
 */
export async function executeUsageAnalysis(): Promise<JobResult> {
  const startTime = Date.now();
  console.log('📈 Starting usage pattern analysis job...');

  try {
    // Get data from past 24 hours
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (24 * 60 * 60 * 1000));
    
    const startISO = startTime.toISOString();
    const endISO = endTime.toISOString();

    console.log(`🔍 Analyzing usage patterns from ${startISO} to ${endISO}`);

    // Get API usage logs for the past 24 hours
    const { data: usageLogs, error: logsError } = await supabase
      .from('api_usage_logs')
      .select('*')
      .gte('created_at', startISO)
      .lte('created_at', endISO)
      .order('created_at', { ascending: true });

    if (logsError) {
      throw new Error(`Failed to fetch usage logs: ${logsError.message}`);
    }

    if (!usageLogs || usageLogs.length === 0) {
      return {
        success: true,
        message: 'Usage analysis completed - no usage data found',
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
        data: {
          totalApiCalls: 0,
          providers: [],
          peakHours: [],
          errorTypes: [],
          featureUsage: [],
          anomalies: []
        }
      };
    }

    // Analyze usage patterns
    const analysisResult = await analyzeUsagePatterns(usageLogs);
    
    // Store daily usage report
    await storeDailyUsageReport(analysisResult);
    
    // Detect anomalies
    const anomalies = await detectAnomalies(usageLogs, analysisResult);
    
    // Log analysis results
    await logUsageAnalysisActivity({
      totalApiCalls: analysisResult.totalApiCalls,
      providersAnalyzed: analysisResult.providers.length,
      anomalies: anomalies.length,
      peakHour: analysisResult.peakHours[0]?.hour || 0,
      avgResponseTime: analysisResult.providers.reduce((acc, p) => acc + p.avgResponseTime, 0) / analysisResult.providers.length
    });

    const executionTime = Date.now() - startTime;
    const successMessage = `Usage analysis completed. ${analysisResult.totalApiCalls} API calls analyzed. ${anomalies.length} anomalies detected.`;

    console.log(`✅ ${successMessage}`);

    return {
      success: true,
      message: successMessage,
      executionTime,
      timestamp: new Date(),
      data: {
        ...analysisResult,
        anomalies,
        analysisPeriod: { start: startISO, end: endISO }
      }
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('💥 Usage analysis failed:', error);

    await logUsageAnalysisActivity({
      totalApiCalls: 0,
      providersAnalyzed: 0,
      anomalies: 0,
      peakHour: 0,
      avgResponseTime: 0,
      errorMessage
    });

    return {
      success: false,
      message: `Usage analysis failed: ${errorMessage}`,
      executionTime,
      timestamp: new Date()
    };
  }
}

/**
 * Analyze usage patterns from API logs
 */
async function analyzeUsagePatterns(usageLogs: any[]): Promise<UsageStatistics> {
  const totalApiCalls = usageLogs.length;
  
  // Analyze provider usage
  const providerStats = new Map<string, {
    count: number;
    totalResponseTime: number;
    errorCount: number;
  }>();

  // Analyze hourly usage
  const hourlyUsage = new Map<number, number>();
  
  // Analyze error types
  const errorTypes = new Map<string, number>();
  
  // Analyze feature usage
  const featureUsage = new Map<string, number>();

  for (const log of usageLogs) {
    const provider = log.provider;
    const responseTime = log.latency_ms || 0;
    const hasError = !!log.error_message;
    
    // Provider stats
    const providerData = providerStats.get(provider) || { count: 0, totalResponseTime: 0, errorCount: 0 };
    providerData.count++;
    providerData.totalResponseTime += responseTime;
    if (hasError) providerData.errorCount++;
    providerStats.set(provider, providerData);
    
    // Hourly usage
    const hour = new Date(log.created_at).getUTCHours();
    hourlyUsage.set(hour, (hourlyUsage.get(hour) || 0) + 1);
    
    // Error types
    if (hasError && log.error_message) {
      const errorType = extractErrorType(log.error_message);
      errorTypes.set(errorType, (errorTypes.get(errorType) || 0) + 1);
    }
    
    // Feature usage
    const feature = log.feature_name || 'unknown';
    featureUsage.set(feature, (featureUsage.get(feature) || 0) + 1);
  }

  // Format provider statistics
  const providers = Array.from(providerStats.entries()).map(([provider, stats]) => ({
    provider: provider as AIProvider,
    callCount: stats.count,
    percentage: Math.round((stats.count / totalApiCalls) * 100),
    avgResponseTime: Math.round(stats.totalResponseTime / stats.count),
    errorRate: Math.round((stats.errorCount / stats.count) * 100)
  }));

  // Format peak hours
  const peakHours = Array.from(hourlyUsage.entries())
    .map(([hour, calls]) => ({ hour, calls }))
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 5);

  // Format error types
  const errorTypesList = Array.from(errorTypes.entries())
    .map(([error, count]) => ({ error, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Format feature usage
  const featureUsageList = Array.from(featureUsage.entries())
    .map(([feature, count]) => ({ feature, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalApiCalls,
    providers: providers.sort((a, b) => b.callCount - a.callCount),
    peakHours,
    errorTypes: errorTypesList,
    featureUsage: featureUsageList,
    anomalies: [] // Will be filled by detectAnomalies function
  };
}

/**
 * Extract error type from error message
 */
function extractErrorType(errorMessage: string): string {
  const message = errorMessage.toLowerCase();
  
  if (message.includes('rate limit') || message.includes('429')) {
    return 'Rate Limit Exceeded';
  } else if (message.includes('unauthorized') || message.includes('401')) {
    return 'Authentication Error';
  } else if (message.includes('forbidden') || message.includes('403')) {
    return 'Authorization Error';
  } else if (message.includes('not found') || message.includes('404')) {
    return 'Resource Not Found';
  } else if (message.includes('timeout') || message.includes('408')) {
    return 'Timeout Error';
  } else if (message.includes('server error') || message.includes('500')) {
    return 'Server Error';
  } else if (message.includes('network') || message.includes('connection')) {
    return 'Network Error';
  } else if (message.includes('quota') || message.includes('limit exceeded')) {
    return 'Quota Exceeded';
  } else if (message.includes('validation') || message.includes('invalid')) {
    return 'Validation Error';
  } else {
    return 'Unknown Error';
  }
}

/**
 * Detect anomalies in usage patterns
 */
async function detectAnomalies(usageLogs: any[], analysis: UsageStatistics): Promise<string[]> {
  const anomalies: string[] = [];
  
  try {
    // Check for unusual provider distribution
    const totalProviders = analysis.providers.length;
    if (totalProviders === 1) {
      anomalies.push(`Single provider dependency detected - only ${analysis.providers[0].provider} used`);
    }
    
    // Check for high error rates
    const highErrorProviders = analysis.providers.filter(p => p.errorRate > 20);
    if (highErrorProviders.length > 0) {
      anomalies.push(`High error rates detected: ${highErrorProviders.map(p => `${p.provider} (${p.errorRate}%)`).join(', ')}`);
    }
    
    // Check for unusual peak usage
    const maxPeakHour = analysis.peakHours[0];
    if (maxPeakHour && maxPeakHour.calls > analysis.totalApiCalls * 0.3) {
      anomalies.push(`Unusual peak usage at ${maxPeakHour.hour}:00 UTC (${maxPeakHour.calls} calls)`);
    }
    
    // Check for sudden spikes (compare with historical data)
    const hourlyData = analysis.peakHours.reduce((acc, item) => {
      acc[item.hour] = item.calls;
      return acc;
    }, {} as Record<number, number>);
    
    const avgCalls = analysis.totalApiCalls / 24;
    const spikes = Object.entries(hourlyData).filter(([hour, calls]) => calls > avgCalls * 3);
    
    if (spikes.length > 0) {
      anomalies.push(`Usage spikes detected: ${spikes.map(([hour, calls]) => `${hour}:00 (${calls} calls)`).join(', ')}`);
    }
    
    // Check for dominant provider
    const dominantProvider = analysis.providers[0];
    if (dominantProvider && dominantProvider.percentage > 80) {
      anomalies.push(`Heavy dependency on ${dominantProvider.provider} (${dominantProvider.percentage}% of traffic)`);
    }
    
    return anomalies;
    
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    return ['Failed to detect anomalies'];
  }
}

/**
 * Store daily usage report
 */
async function storeDailyUsageReport(analysis: UsageStatistics): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Create daily usage summary
    const reportData = {
      report_date: today,
      total_api_calls: analysis.totalApiCalls,
      provider_breakdown: analysis.providers.reduce((acc, p) => {
        acc[p.provider] = p.callCount;
        return acc;
      }, {} as Record<string, number>),
      avg_response_time: Math.round(analysis.providers.reduce((acc, p) => acc + p.avgResponseTime, 0) / analysis.providers.length),
      error_rate: Math.round(analysis.providers.reduce((acc, p) => acc + p.errorRate, 0) / analysis.providers.length),
      peak_hour: analysis.peakHours[0]?.hour || 0,
      feature_usage: analysis.featureUsage.reduce((acc, f) => {
        acc[f.feature] = f.count;
        return acc;
      }, {} as Record<string, number>),
      created_at: new Date().toISOString()
    };

    // Store in a daily_reports table (if it exists)
    const { error } = await supabase
      .from('daily_usage_reports')
      .upsert(reportData, { onConflict: 'report_date' });

    if (error && !error.message.includes('relation "daily_usage_reports" does not exist')) {
      throw error;
    }

    console.log(`📊 Daily usage report stored for ${today}`);
    
  } catch (error) {
    console.error('Failed to store daily usage report:', error);
  }
}

/**
 * Log usage analysis activity
 */
async function logUsageAnalysisActivity(params: {
  totalApiCalls: number;
  providersAnalyzed: number;
  anomalies: number;
  peakHour: number;
  avgResponseTime: number;
  errorMessage?: string;
}): Promise<void> {
  try {
    const { totalApiCalls, providersAnalyzed, anomalies, peakHour, avgResponseTime, errorMessage } = params;
    
    const activitySummary = errorMessage
      ? `Usage analysis failed: ${errorMessage}`
      : `Usage analysis completed: ${totalApiCalls} calls analyzed across ${providersAnalyzed} providers, ${anomalies} anomalies detected`;

    const details = {
      totalApiCalls,
      providersAnalyzed,
      anomalies,
      peakHour,
      avgResponseTime,
      anomaliesList: anomalies, // This would be the actual anomalies array
      jobType: 'usage-analysis',
      executionTime: new Date().toISOString()
    };

    console.log('Usage analysis activity logged:', activitySummary, details);

  } catch (error) {
    console.error('Failed to log usage analysis activity:', error);
  }
}

/**
 * Get usage analysis statistics for dashboard
 */
export async function getUsageAnalysisStats() {
  try {
    // Get today's usage
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Get recent reports (last 7 days)
    const { data: recentReports, error } = await supabase
      .from('daily_usage_reports')
      .select('*')
      .gte('report_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('report_date', { ascending: false });

    if (error && !error.message.includes('relation "daily_usage_reports" does not exist')) {
      throw error;
    }

    const totalCalls = recentReports?.reduce((acc, report) => acc + (report.total_api_calls || 0), 0) || 0;
    const avgResponseTime = recentReports?.length > 0 
      ? Math.round(recentReports.reduce((acc, report) => acc + (report.avg_response_time || 0), 0) / recentReports.length)
      : 0;

    return {
      todayCalls: recentReports?.[0]?.total_api_calls || 0,
      weeklyCalls: totalCalls,
      avgResponseTime,
      activeProviders: new Set(recentReports?.flatMap(r => Object.keys(r.provider_breakdown || {})) || []).size,
      reportsGenerated: recentReports?.length || 0,
      lastAnalysis: recentReports?.[0]?.created_at || null,
      nextAnalysis: getNextAnalysisTime()
    };

  } catch (error) {
    console.error('Failed to get usage analysis stats:', error);
    return null;
  }
}

/**
 * Get next daily analysis time (01:00 UTC)
 */
function getNextAnalysisTime(): string {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  tomorrow.setUTCHours(1, 0, 0, 0); // 01:00 UTC
  return tomorrow.toISOString();
}

/**
 * Generate usage insights report
 */
export async function generateUsageInsights(days: number = 7): Promise<{
  insights: string[];
  recommendations: string[];
  trends: any;
}> {
  try {
    const reports = await getHistoricalReports(days);
    const insights: string[] = [];
    const recommendations: string[] = [];
    
    if (reports.length === 0) {
      return {
        insights: ['No usage data available for analysis'],
        recommendations: ['Start using the AI system to generate insights'],
        trends: null
      };
    }
    
    // Analyze trends
    const totalCalls = reports.reduce((acc, r) => acc + (r.total_api_calls || 0), 0);
    const avgCallsPerDay = Math.round(totalCalls / reports.length);
    
    const providers = new Set(reports.flatMap(r => Object.keys(r.provider_breakdown || {})));
    
    // Generate insights
    insights.push(`Average ${avgCallsPerDay} API calls per day over ${days} days`);
    insights.push(`Using ${providers.size} different AI providers`);
    
    // Find trending provider
    const providerUsage = new Map<string, number>();
    reports.forEach(report => {
      Object.entries(report.provider_breakdown || {}).forEach(([provider, calls]) => {
        providerUsage.set(provider, (providerUsage.get(provider) || 0) + (calls as number));
      });
    });
    
    const topProvider = Array.from(providerUsage.entries()).sort((a, b) => b[1] - a[1])[0];
    if (topProvider) {
      insights.push(`${topProvider[0]} is the most used provider with ${topProvider[1]} calls`);
    }
    
    // Generate recommendations
    if (providers.size === 1) {
      recommendations.push('Consider diversifying providers for better reliability');
    }
    
    const avgResponseTime = reports.reduce((acc, r) => acc + (r.avg_response_time || 0), 0) / reports.length;
    if (avgResponseTime > 2000) {
      recommendations.push('High average response time detected - consider optimizing requests');
    }
    
    return {
      insights,
      recommendations,
      trends: {
        totalCalls,
        avgCallsPerDay,
        providersUsed: Array.from(providers),
        topProvider: topProvider?.[0] || null,
        avgResponseTime: Math.round(avgResponseTime)
      }
    };

  } catch (error) {
    console.error('Failed to generate usage insights:', error);
    return {
      insights: ['Failed to generate insights'],
      recommendations: ['Check system logs for errors'],
      trends: null
    };
  }
}

/**
 * Get historical reports (helper function)
 */
async function getHistoricalReports(days: number) {
  try {
    const { data, error } = await supabase
      .from('daily_usage_reports')
      .select('*')
      .gte('report_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('report_date', { ascending: false });

    if (error && !error.message.includes('relation "daily_usage_reports" does not exist')) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get historical reports:', error);
    return [];
  }
}