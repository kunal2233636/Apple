'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { DashboardStats, MOCK_DASHBOARD_DATA } from '@/types/dashboard';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { ProviderStatusGrid } from '@/components/dashboard/provider-status-grid';
import { LiveGraphsSection } from '@/components/dashboard/live-graphs-section';
import { AlertsSection } from '@/components/dashboard/alerts-section';
import { FallbackEventsTable } from '@/components/dashboard/fallback-events-table';
import { SystemHealthSummary } from '@/components/dashboard/system-health-summary';
import { TimeRangeSelector } from '@/components/dashboard/time-range-selector';
import { ExportButtons } from '@/components/dashboard/export-buttons';

export default function UserDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>(MOCK_DASHBOARD_DATA);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  const [isExporting, setIsExporting] = useState(false);

  // Fetch dashboard data
  const fetchDashboardData = async (timeRange: string = '1h') => {
    try {
      const response = await fetch(`/api/user/dashboard/stats?timeRange=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setDashboardStats(data.stats);
      } else {
        // Use mock data if API fails
        console.warn('API unavailable, using mock data');
        setDashboardStats(MOCK_DASHBOARD_DATA);
      }
    } catch (error) {
      console.warn('Failed to fetch dashboard data:', error);
      // Use mock data on error
      setDashboardStats(MOCK_DASHBOARD_DATA);
    }
  };

  // Handle time range change
  const handleTimeRangeChange = async (range: string) => {
    setSelectedTimeRange(range);
    await fetchDashboardData(range);
  };

  // Handle export
  const handleExport = async (type: 'usage-report' | 'fallback-log' | 'dashboard-snapshot', format: 'csv' | 'pdf' | 'email') => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/user/dashboard/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          format,
          timeRange: selectedTimeRange
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (format === 'email' && data.emailSent) {
          toast({ title: "Email sent successfully", description: "Dashboard report has been sent to your email." });
        } else if (data.downloadUrl) {
          // Trigger download
          window.open(data.downloadUrl, '_blank');
          toast({ title: "Download started", description: "Your export is being prepared for download." });
        }
      } else {
        toast({ variant: 'destructive', title: "Export failed", description: "Please try again later." });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast({ variant: 'destructive', title: "Export failed", description: "Please try again later." });
    } finally {
      setIsExporting(false);
    }
  };

  // Handle provider test
  const handleProviderTest = async (provider: string) => {
    try {
      const response = await fetch('/api/admin/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      });

      if (response.ok) {
        toast({ title: "Provider test started", description: `Testing ${provider}...` });
        // Refresh data after test
        setTimeout(() => fetchDashboardData(selectedTimeRange), 2000);
      } else {
        toast({ variant: 'destructive', title: "Test failed", description: "Unable to test provider." });
      }
    } catch (error) {
      console.error('Provider test error:', error);
      toast({ variant: 'destructive', title: "Test failed", description: "Unable to test provider." });
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || !user) return;

    const interval = setInterval(() => {
      fetchDashboardData(selectedTimeRange);
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, selectedTimeRange, user]);

  // Check user authentication
  useEffect(() => {
    const checkUser = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push('/auth');
      } else {
        setUser(currentUser);
        await fetchDashboardData(selectedTimeRange);
      }
      setLoading(false);
    };
    checkUser();
  }, [router, selectedTimeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI System Dashboard</h1>
            <p className="text-muted-foreground">
              Real-time monitoring of AI providers and system health
            </p>
          </div>
          <div className="flex items-center gap-4">
            <TimeRangeSelector
              selectedRange={selectedTimeRange}
              onRangeChange={handleTimeRangeChange}
            />
            <ExportButtons
              onExport={handleExport}
              isExporting={isExporting}
            />
          </div>
        </div>

        {/* System Health Summary */}
        <SystemHealthSummary
          health={dashboardStats.systemHealth}
          onRefresh={() => fetchDashboardData(selectedTimeRange)}
        />

        {/* Provider Status Grid */}
        <ProviderStatusGrid
          providers={dashboardStats.providers}
          onTest={handleProviderTest}
        />

        {/* Live Graphs Section */}
        <LiveGraphsSection
          metrics={dashboardStats.liveMetrics}
          timeRange={dashboardStats.timeRange}
          onTimeRangeChange={handleTimeRangeChange}
        />

        {/* Alerts & Warnings */}
        <AlertsSection
          alerts={dashboardStats.activeAlerts}
          onDismiss={(alertId) => {
            setDashboardStats(prev => ({
              ...prev,
              activeAlerts: prev.activeAlerts.filter(alert => alert.id !== alertId)
            }));
          }}
        />

        {/* Recent Fallback Events */}
        <FallbackEventsTable
          events={dashboardStats.recentEvents}
          onLoadMore={() => {
            // In real implementation, this would fetch more events
            console.log('Load more events...');
          }}
          hasMore={false}
        />

        {/* Auto-refresh toggle */}
        <div className="flex items-center justify-center py-4 border-t">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              autoRefresh 
                ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}