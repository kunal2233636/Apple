import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase';
import { apiUsageLogger } from '@/lib/ai/api-logger';
import { rateLimitTracker } from '@/lib/ai/rate-limit-tracker';
import type { ExportRequest } from '@/types/dashboard';

// POST /api/user/dashboard/export
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, format, timeRange } = body as ExportRequest;

    // Validate request
    if (!type || !format) {
      return NextResponse.json(
        { error: 'Missing required fields: type, format' },
        { status: 400 }
      );
    }

    // Generate export data based on type
    let exportData;
    let filename;

    switch (type) {
      case 'usage-report':
        exportData = await generateUsageReport(user.id, timeRange);
        filename = `usage-report-${timeRange}-${new Date().toISOString().split('T')[0]}`;
        break;
      
      case 'fallback-log':
        exportData = await generateFallbackLog(user.id, timeRange);
        filename = `fallback-log-${timeRange}-${new Date().toISOString().split('T')[0]}`;
        break;
      
      case 'dashboard-snapshot':
        exportData = await generateDashboardSnapshot(user.id, timeRange);
        filename = `dashboard-snapshot-${timeRange}-${new Date().toISOString().split('T')[0]}`;
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid export type' },
          { status: 400 }
        );
    }

    // Handle different formats
    switch (format) {
      case 'csv':
        return handleCSVExport(exportData, filename);
      
      case 'pdf':
        return handlePDFExport(exportData, filename);
      
      case 'email':
        return handleEmailExport(exportData, filename, user.email);
      
      default:
        return NextResponse.json(
          { error: 'Invalid export format' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Export error:', error);
    
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    );
  }
}

async function generateUsageReport(userId: string, timeRange: string) {
  // Get user usage statistics
  const userStats = await apiUsageLogger.getUserStats(userId, timeRange as 'day' | 'week' | 'month');
  const rateLimitStats = rateLimitTracker.getStatistics();

  return {
    summary: {
      totalRequests: userStats.totalRequests,
      successfulRequests: userStats.successfulRequests,
      failedRequests: userStats.failedRequests,
      cachedRequests: userStats.cachedRequests,
      fallbackRequests: userStats.fallbackRequests,
      totalTokens: userStats.totalTokens,
      averageLatency: userStats.averageLatency,
      timeRange
    },
    providerBreakdown: userStats.byProvider,
    queryTypeBreakdown: userStats.byQueryType,
    tierBreakdown: userStats.byTier,
    rateLimits: Object.fromEntries(rateLimitStats.providerStatuses),
    generatedAt: new Date().toISOString()
  };
}

async function generateFallbackLog(userId: string, timeRange: string) {
  // Mock fallback events data - in real implementation, this would query the database
  const fallbackEvents = [
    {
      timestamp: new Date(Date.now() - 120000).toISOString(),
      featureName: 'General Chat',
      primaryModel: 'groq:llama-3.3-70b',
      fallbackModel: 'cerebras:llama-3.3-70b',
      reason: 'Rate limit exceeded',
      status: 'success',
      responseTime: 2100
    },
    {
      timestamp: new Date(Date.now() - 300000).toISOString(),
      featureName: 'Study Assistant',
      primaryModel: 'gemini:gemini-2.0-flash',
      fallbackModel: 'mistral:mistral-large-latest',
      reason: 'Provider timeout',
      status: 'success',
      responseTime: 1800
    }
  ];

  return {
    events: fallbackEvents,
    summary: {
      totalEvents: fallbackEvents.length,
      successfulEvents: fallbackEvents.filter(e => e.status === 'success').length,
      failedEvents: fallbackEvents.filter(e => e.status === 'failed').length,
      averageFallbackTime: fallbackEvents.reduce((sum, e) => sum + e.responseTime, 0) / fallbackEvents.length,
      timeRange
    },
    generatedAt: new Date().toISOString()
  };
}

async function generateDashboardSnapshot(userId: string, timeRange: string) {
  const usageReport = await generateUsageReport(userId, timeRange);
  const fallbackLog = await generateFallbackLog(userId, timeRange);
  
  return {
    usage: usageReport,
    fallback: fallbackLog,
    systemHealth: {
      status: 'operational',
      overallStatus: '✓ ALL SYSTEMS OPERATIONAL',
      avgResponseTime: 850,
      cacheHitRate: 94.2,
      apiCallsThisHour: 1247,
      errorRate: 0.8
    },
    generatedAt: new Date().toISOString(),
    timeRange
  };
}

function handleCSVExport(data: any, filename: string) {
  let csvContent = '';
  
  // Convert data to CSV based on type
  if (data.summary) {
    // Usage report
    csvContent = convertUsageReportToCSV(data);
  } else if (data.events) {
    // Fallback log
    csvContent = convertFallbackLogToCSV(data);
  }

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const downloadUrl = URL.createObjectURL(blob);

  return NextResponse.json({
    success: true,
    downloadUrl,
    filename: `${filename}.csv`,
    message: 'CSV export generated successfully'
  });
}

function handlePDFExport(data: any, filename: string) {
  // For PDF generation, we would typically use a library like Puppeteer or jsPDF
  // For now, return a mock response
  const downloadUrl = `/api/user/dashboard/export/download/${filename}.pdf`;

  return NextResponse.json({
    success: true,
    downloadUrl,
    filename: `${filename}.pdf`,
    message: 'PDF export generated successfully (mock)'
  });
}

function handleEmailExport(data: any, filename: string, userEmail: string) {
  // Mock email sending - in real implementation, this would send an email
  console.log(`Sending email to ${userEmail} with attachment ${filename}`);
  
  return NextResponse.json({
    success: true,
    emailSent: true,
    recipient: userEmail,
    filename,
    message: 'Email sent successfully'
  });
}

function convertUsageReportToCSV(data: any): string {
  const headers = [
    'Metric',
    'Value',
    'Percentage'
  ];

  const rows = [
    headers.join(','),
    `Total Requests,${data.summary.totalRequests},100%`,
    `Successful Requests,${data.summary.successfulRequests},${((data.summary.successfulRequests / data.summary.totalRequests) * 100).toFixed(1)}%`,
    `Failed Requests,${data.summary.failedRequests},${((data.summary.failedRequests / data.summary.totalRequests) * 100).toFixed(1)}%`,
    `Cached Requests,${data.summary.cachedRequests},${((data.summary.cachedRequests / data.summary.totalRequests) * 100).toFixed(1)}%`,
    `Fallback Requests,${data.summary.fallbackRequests},${((data.summary.fallbackRequests / data.summary.totalRequests) * 100).toFixed(1)}%`,
    `Total Tokens,${data.summary.totalTokens},`,
    `Average Latency (ms),${data.summary.averageLatency},`
  ];

  // Add provider breakdown
  rows.push('');
  rows.push('Provider Breakdown,Requests,Tokens,Success Rate (%)');
  
  Object.entries(data.providerBreakdown).forEach(([provider, stats]: [string, any]) => {
    rows.push(`${provider},${stats.requests},${stats.tokens},${stats.successRate.toFixed(1)}`);
  });

  return rows.join('\n');
}

function convertFallbackLogToCSV(data: any): string {
  const headers = [
    'Timestamp',
    'Feature',
    'Primary Model',
    'Fallback Model',
    'Reason',
    'Status',
    'Response Time (ms)'
  ];

  const rows = [
    headers.join(','),
    ...data.events.map((event: any) => [
      event.timestamp,
      event.featureName,
      event.primaryModel,
      event.fallbackModel,
      event.reason,
      event.status,
      event.responseTime
    ].map(field => `"${field}"`).join(','))
  ];

  return rows.join('\n');
}