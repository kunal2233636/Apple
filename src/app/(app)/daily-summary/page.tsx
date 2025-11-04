
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabaseBrowserClient, getCurrentUser } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { format, startOfToday, subDays, eachDayOfInterval, formatDistanceToNow } from 'date-fns';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Clock, CheckCircle, Flame, Star, BookOpen, ListChecks, Target, Zap, Check, Info, BarChart2, RefreshCw } from 'lucide-react';
import type { Database } from '@/lib/database.types';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// Type definitions for the page's state and data structures.
type DailySummary = Database['public']['Tables']['daily_activity_summary']['Row'];

/**
 * Shape of the processed statistics for today's summary.
 */
type TodayStats = {
  total_study_minutes: number;
  blocks_completed_count: number;
  blocks_planned_count: number;
  topics_studied_count: number;
  topics_revised_count: number;
  questions_attempted: number;
  question_accuracy: number;
  points_earned: number;
  current_streak: number;
  highlights: string[];
  concerns: string[];
};

/**
 * Shape of the data required for the weekly trend chart.
 */
type WeeklyChartData = {
  day: string;
  hours: number;
};


/**
 * Helper function to format minutes into a readable "Xh Ym" string.
 * @param minutes - The total number of minutes.
 * @returns A formatted string, e.g., "2h 30m".
 */
const formatMinutes = (minutes: number) => {
  if (minutes < 1) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h > 0 ? `${h}h ` : ''}${m}m`;
};


/**
 * The main component for the Daily Summary page.
 * It fetches and displays a comprehensive breakdown of the user's activity for the current day.
 */
export default function DailySummaryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<TodayStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyChartData[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  /**
   * Fetches all necessary data for the daily summary page, including today's stats
   * and the weekly trend data. Memoized with useCallback to prevent re-creation.
   * @param isRefresh - If true, loading skeleton will not be shown, for background refresh.
   */
  const fetchAllData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setIsLoading(true);
    setError(null);
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated.');
      }
      setUser(currentUser);

      const today = new Date();
      // Fetch today's summary and gamification data in parallel for efficiency.
      const [summaryRes, gamificationRes] = await Promise.all([
          getDailySummary(currentUser.id, today),
          supabaseBrowserClient.from('user_gamification').select('current_streak').eq('user_id', currentUser.id).single()
      ]);
      
      if (summaryRes.error) throw new Error(`Failed to fetch daily summary: ${summaryRes.error.message}`);
      if (gamificationRes.error && gamificationRes.error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch gamification data: ${gamificationRes.error.message}`);
      }
      
      const summaryData = summaryRes.data;
      const gamificationData = gamificationRes.data;

      // Process and set the state for today's stats.
      if (summaryData) {
          const metrics = summaryData?.metrics as any;
          setStats({
              total_study_minutes: metrics?.total_study_minutes || 0,
              blocks_completed_count: metrics?.blocks_completed_count || 0,
              blocks_planned_count: metrics?.blocks_planned_count || 0,
              topics_studied_count: metrics?.topics_studied_count || 0,
              topics_revised_count: metrics?.topics_revised_count || 0,
              questions_attempted: metrics?.questions_attempted || 0,
              question_accuracy: metrics?.question_accuracy || 0,
              points_earned: metrics?.points_earned || 0,
              current_streak: gamificationData?.current_streak || 0,
              highlights: (summaryData?.highlights as string[]) || [],
              concerns: (summaryData?.concerns as string[]) || [],
          });
      } else {
          setStats(null); // No activity for today.
      }

      // Fetch and process data for the weekly trend chart.
      const sevenDaysAgo = subDays(today, 6);
      const dateInterval = eachDayOfInterval({ start: sevenDaysAgo, end: today });
      const { data: weeklySummaries, error: weeklyError } = await supabaseBrowserClient
          .from('daily_activity_summary')
          .select('summary_date, metrics')
          .eq('user_id', currentUser.id)
          .gte('summary_date', format(sevenDaysAgo, 'yyyy-MM-dd'))
          .lte('summary_date', format(today, 'yyyy-MM-dd'));
      
      if (weeklyError) throw new Error(`Failed to fetch weekly data: ${weeklyError.message}`);

      // Create a map for quick lookup and ensure all 7 days are present in the chart data.
      const weeklyMap = new Map(weeklySummaries.map(s => [s.summary_date, (s.metrics as any)?.total_study_minutes || 0]));
      
      const chartData = dateInterval.map(d => ({
          day: format(d, 'EEE'),
          hours: (weeklyMap.get(format(d, 'yyyy-MM-dd')) || 0) / 60
      }));
      setWeeklyData(chartData);

      setLastUpdated(new Date());

    } catch (err: any) {
      setError(err.message);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Initial data fetch on component mount.
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);
  
  /**
   * Fetches a single daily summary from the database.
   * @param userId The user's ID.
   * @param date The date to fetch the summary for.
   * @returns The summary data or null if not found.
   */
  async function getDailySummary(userId: string, date: Date) {
      const dateString = format(date, 'yyyy-MM-dd');
      return supabaseBrowserClient
          .from('daily_activity_summary')
          .select('*')
          .eq('user_id', userId)
          .eq('summary_date', dateString)
          .maybeSingle();
  }

  // Memoized value to determine if there's any activity to show.
  const hasActivity = useMemo(() => stats && (stats.total_study_minutes > 0 || stats.blocks_completed_count > 0 || stats.questions_attempted > 0), [stats]);

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Daily Summary</CardTitle>
                <CardDescription>
                    Your activity breakdown for {format(new Date(), 'MMMM dd, yyyy')}.
                </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => fetchAllData(true)}>
                <RefreshCw className="h-4 w-4" />
            </Button>
        </CardHeader>
      </Card>
      
      <div className="animate-in fade-in-50">
        {!hasActivity ? (
            <Card className="flex flex-col items-center justify-center text-center p-8 min-h-[50vh]">
                <BarChart2 className="h-16 w-16 text-muted-foreground" />
                <h3 className="mt-6 text-xl font-semibold">No Activity Recorded Today</h3>
                <p className="mt-2 text-muted-foreground">Complete a study session to see your progress here!</p>
            </Card>
       ) : (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Study Time" 
                    value={formatMinutes(stats?.total_study_minutes || 0)} 
                    icon={Clock} 
                    color="text-blue-500"
                />
                <StatCard 
                    title="Blocks Completed" 
                    value={String(stats?.blocks_completed_count || 0)} 
                    icon={CheckCircle} 
                    color="text-green-500"
                />
                <StatCard 
                    title="Current Streak" 
                    value={`${stats?.current_streak || 0} days`} 
                    icon={Flame} 
                    color="text-orange-500"
                />
                <StatCard 
                    title="Points Earned" 
                    value={`+${stats?.points_earned || 0} XP`} 
                    icon={Star} 
                    color="text-yellow-500"
                />
            </div>
            
            <ProgressCard stats={stats} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <HighlightsCard highlights={stats?.highlights || []} />
              <ConcernsCard concerns={stats?.concerns || []} />
            </div>

            <WeeklyTrendChart data={weeklyData} />
            
            {lastUpdated && (
                <p className="text-center text-xs text-muted-foreground">
                    Last updated: {formatDistanceToNow(lastUpdated, { addSuffix: true })}
                </p>
            )}
        </>
      )}
      </div>
    </div>
  );
}


/**
 * A reusable card component to display a single key statistic.
 */
function StatCard({ title, value, icon: Icon, color }: { title: string, value: string, icon: React.ElementType, color: string }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <Icon className={cn("h-5 w-5", color)} />
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold">{value}</div>
            </CardContent>
        </Card>
    );
}

/**
 * A card that provides a detailed breakdown of the day's progress, including
 * study goals, blocks, topics, and question performance.
 */
function ProgressCard({ stats }: { stats: TodayStats | null }) {
    const studyGoalMinutes = 600; // 10 hours
    
    // Memoized calculation for study progress percentage.
    const studyProgress = useMemo(() => {
        if (!stats || stats.total_study_minutes <= 0) return 0;
        return (stats.total_study_minutes / studyGoalMinutes) * 100;
    }, [stats]);
    
    // Memoized calculation for the progress bar color based on completion.
    const progressColor = useMemo(() => 
        studyProgress >= 100 ? 'bg-green-500' :
        studyProgress > 50 ? 'bg-orange-500' :
        'bg-muted', [studyProgress]);

    if (!stats) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Today's Progress Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
                {/* Study Time Progress */}
                <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                        <Label>Study Time Goal</Label>
                        <span className="text-sm font-semibold">{formatMinutes(stats.total_study_minutes)} / {formatMinutes(studyGoalMinutes)}</span>
                    </div>
                    <Progress value={studyProgress} className={cn("[&>div]:", progressColor)} />
                </div>

                {/* Blocks & Topics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <Card className="p-4">
                        <CardDescription className="flex items-center justify-center gap-2"><ListChecks className="h-4 w-4" /> Blocks</CardDescription>
                        <CardTitle className="mt-1">{stats.blocks_completed_count} / {stats.blocks_planned_count}</CardTitle>
                    </Card>
                    <Card className="p-4">
                        <CardDescription className="flex items-center justify-center gap-2"><BookOpen className="h-4 w-4" /> Topics Studied</CardDescription>
                        <CardTitle className="mt-1">{stats.topics_studied_count}</CardTitle>
                    </Card>
                     <Card className="p-4">
                        <CardDescription className="flex items-center justify-center gap-2"><Star className="h-4 w-4" /> Topics Revised</CardDescription>
                        <CardTitle className="mt-1">{stats.topics_revised_count}</CardTitle>
                    </Card>
                </div>

                {/* Questions Performance (conditionally rendered) */}
                {stats.questions_attempted > 0 && (
                     <div className="space-y-4">
                        <h4 className="font-semibold text-center">Question Practice</h4>
                        <div className="grid grid-cols-2 gap-4 text-center">
                             <Card className="p-4">
                                <CardDescription className="flex items-center justify-center gap-2"><Zap className="h-4 w-4" /> Attempted</CardDescription>
                                <CardTitle className="mt-1">{stats.questions_attempted}</CardTitle>
                            </Card>
                             <Card className="p-4">
                                <CardDescription className="flex items-center justify-center gap-2"><Target className="h-4 w-4" /> Accuracy</CardDescription>
                                <CardTitle className="mt-1">{stats.question_accuracy.toFixed(1)}%</CardTitle>
                            </Card>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * Displays a list of positive achievements for the day.
 */
function HighlightsCard({ highlights }: { highlights: string[] }) {
  return (
    <Card className="border-l-4 border-green-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-6 w-6 text-green-500" />
          Today's Highlights
        </CardTitle>
      </CardHeader>
      <CardContent>
        {highlights.length > 0 ? (
          <ul className="space-y-3">
            {highlights.map((item, index) => (
              <li key={index} className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <span className="text-sm">{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Complete activities to see your highlights here!
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Displays a list of areas that need improvement for the day.
 */
function ConcernsCard({ concerns }: { concerns: string[] }) {
  return (
    <Card className="border-l-4 border-orange-400">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-6 w-6 text-orange-400" />
          Areas to Improve
        </CardTitle>
      </CardHeader>
      <CardContent>
        {concerns.length > 0 ? (
          <ul className="space-y-3">
            {concerns.map((item, index) => (
              <li key={index} className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
                <span className="text-sm">{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No concerns for today. Keep up the great work! 🎉
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Renders a line chart showing the user's study trend over the last 7 days.
 */
function WeeklyTrendChart({ data }: { data: WeeklyChartData[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BarChart2 className="h-6 w-6 text-primary" />
                    Weekly Study Trend
                </CardTitle>
                <CardDescription>Your study hours over the last 7 days.</CardDescription>
            </CardHeader>
            <CardContent>
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart
                            data={data}
                            margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <Tooltip
                                content={({ active, payload, label }) =>
                                    active && payload && payload.length ? (
                                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex flex-col">
                                                <span className="text-[0.70rem] uppercase text-muted-foreground">Day</span>
                                                <span className="font-bold text-muted-foreground">{label}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[0.70rem] uppercase text-muted-foreground">Hours</span>
                                                <span className="font-bold">{typeof payload[0].value === 'number' ? payload[0].value.toFixed(1) : payload[0].value}</span>
                                            </div>
                                        </div>
                                    </div>
                                    ) : null
                                }
                            />
                            <Line
                                type="monotone"
                                dataKey="hours"
                                stroke="hsl(var(--primary))"
                                strokeWidth={2}
                                dot={{ r: 4, fill: "hsl(var(--primary))" }}
                                activeDot={{ r: 6, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-[300px] flex flex-col items-center justify-center text-center text-muted-foreground">
                        <BarChart2 className="h-12 w-12" />
                        <p className="mt-4 font-semibold">No study data for the last 7 days.</p>
                        <p className="text-sm">Start studying to see your trends appear here!</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * A skeleton component to show while the page data is loading.
 */
function PageSkeleton() {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-80 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
