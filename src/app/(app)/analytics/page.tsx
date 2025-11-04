
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabaseBrowserClient, getCurrentUser } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { subDays, format, startOfWeek } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Loader2, BarChart3, Clock, CheckCircle2, TrendingUp, Zap, Users, Target, Activity, Flame } from 'lucide-react';
import RetentionChart from './components/retention-chart';
import TopicMasteryChart from './components/topic-mastery-chart';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';

type TimePeriod = 'daily' | 'weekly' | 'monthly';

type Session = {
  id: string;
  created_at: string;
  total_study_time_seconds: number | null;
  subject_name?: string; 
  questions_count?: number; 
  completed?: boolean; 
};

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--muted-foreground))'];

const TEMP_FAKE_DATA = {
  stats: {
    totalHours: 42,
    totalSessions: 15,
    avgDaily: 85,
    currentStreak: 7,
  },
  chartData: [
    { date: 'Mon', hours: 1.5 },
    { date: 'Tue', hours: 2.0 },
    { date: 'Wed', hours: 1.8 },
    { date: 'Thu', hours: 2.2 },
    { date: 'Fri', hours: 1.6 },
    { date: 'Sat', hours: 2.5 },
    { date: 'Sun', hours: 1.4 },
  ],
  subjectDistribution: [
      { name: 'Physics', value: 40 },
      { name: 'Chemistry', value: 30 },
      { name: 'Maths', value: 30 },
  ],
  questionsData: [
      { subject: 'Physics', questions: 50 },
      { subject: 'Chemistry', questions: 35 },
      { subject: 'Maths', questions: 60 },
  ],
  topicMastery: [
      { topic: 'Physics', mastered: 60, inProgress: 30, needsReview: 10 },
      { topic: 'Chemistry', mastered: 40, inProgress: 40, needsReview: 20 },
      { topic: 'Math', mastered: 70, inProgress: 20, needsReview: 10 },
  ],
};


export default function AnalyticsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  
  const [summaryData, setSummaryData] = useState({
    totalHours: 0,
    totalSessions: 0,
    avgDailyMinutes: 0,
    currentStreak: 0,
  });
  const [timeSeriesData, setTimeSeriesData] = useState<{ date: string; hours: number }[]>([]);
  const [subjectDistributionData, setSubjectDistributionData] = useState<{ name: string; value: number }[]>([]);
  const [questionsData, setQuestionsData] = useState<{ subject: string; questions: number }[]>([]);
  const [topicMasteryData, setTopicMasteryData] = useState<{ topic: string; mastered: number; inProgress: number; needsReview: number; }[]>([]);


  // Use fake data for now
  useEffect(() => {
    async function checkUserAndLoadData() {
        setLoading(true);
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            router.push('/auth');
            return;
        }
        setUser(currentUser);
        
        try {
            // In the future, this will fetch from daily_activity_summary
            // For now, we check if any sessions exist to decide if we show real data or empty state
            const { data: sessionData, error } = await supabaseBrowserClient
                .from('sessions')
                .select('id, total_study_time_seconds, created_at')
                .eq('user_id', currentUser.id)
                .limit(1);

            if (error) throw error;
            
            if (sessionData && sessionData.length > 0) {
                 setSessions(sessionData as Session[]);
                 setSummaryData({
                    totalHours: TEMP_FAKE_DATA.stats.totalHours,
                    totalSessions: TEMP_FAKE_DATA.stats.totalSessions,
                    avgDailyMinutes: TEMP_FAKE_DATA.stats.avgDaily,
                    currentStreak: TEMP_FAKE_DATA.stats.currentStreak,
                });
                setTimeSeriesData(TEMP_FAKE_DATA.chartData);
                setSubjectDistributionData(TEMP_FAKE_DATA.subjectDistribution);
                setQuestionsData(TEMP_FAKE_DATA.questionsData);
                setTopicMasteryData(TEMP_FAKE_DATA.topicMastery);
            } else {
                setSessions([]);
            }
        } catch (e: any) {
            console.error("Failed to load analytics data:", e);
            // Don't crash, just show empty state
            setSessions([]);
        } finally {
            setLoading(false);
        }
    }
    checkUserAndLoadData();
  }, [router]);
  

  if (loading) {
    return <PageSkeleton />;
  }

  if (sessions.length === 0) {
    return (
        <div className="p-4 md:p-6 lg:p-8 bg-background min-h-screen">
            <h1 className="text-4xl font-bold mb-2">Analytics</h1>
            <p className="text-lg text-muted-foreground mb-8">Track your study progress and insights.</p>
            <Alert className="mb-6">
                <Info className="h-4 w-4" />
                <AlertTitle>Analytics Scope</AlertTitle>
                <AlertDescription>
                    Showing analytics for JEE and OTHERS categories. View BOARDS analytics in the Boards section.
                </AlertDescription>
            </Alert>
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)] text-muted-foreground text-center bg-muted/50 rounded-lg py-16">
                <div className="text-6xl mb-4">📊</div>
                <h2 className="text-xl font-semibold mb-2">No Data Yet</h2>
                <p className="text-sm max-w-sm">Complete your first study session to see your progress and unlock powerful analytics here.</p>
            </div>
        </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8">
      <div>
          <h1 className="text-4xl font-bold mb-2">Analytics</h1>
          <p className="text-lg text-muted-foreground">Your study progress and insights for the last 30 days.</p>
      </div>

      <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Analytics Scope</AlertTitle>
          <AlertDescription>
              Showing analytics for JEE and OTHERS categories. View BOARDS analytics in the Boards section.
          </AlertDescription>
      </Alert>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <KpiCard title="Total Study Hours" value={summaryData.totalHours.toFixed(1)} unit="hrs" icon={Clock} trend="+5%" />
        <KpiCard title="Sessions Completed" value={summaryData.totalSessions.toString()} icon={CheckCircle2} trend="+10%" />
        <KpiCard title="Avg. Daily Study" value={summaryData.avgDailyMinutes.toString()} unit="min" icon={TrendingUp} trend="+2%" />
        <KpiCard title="Current Streak" value={summaryData.currentStreak.toString()} unit="days" icon={Flame} trend="N/A" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Charts */}
        <Card className="xl:col-span-2">
            <CardHeader>
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <Activity />
                  Study Activity
                </CardTitle>
                <CardDescription>Your study hours over the last 30 days.</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={timeSeriesData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                        <Tooltip
                          content={({ active, payload, label }) =>
                            active && payload?.length ? (
                              <div className="bg-card p-3 border rounded-lg shadow-lg">
                                <p className="font-medium text-sm mb-1">{label}</p>
                                <p className="text-sm text-primary">{`${payload[0].value} hours`}</p>
                              </div>
                            ) : null
                          }
                        />
                        <Line
                            type="monotone"
                            dataKey="hours"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--card))' }}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <Users />
              Subject Distribution
            </CardTitle>
             <CardDescription>How you've allocated your study time.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                <Pie
                    data={subjectDistributionData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={60}
                    dataKey="value"
                    nameKey="name"
                    labelLine={false}
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return (percent * 100) > 5 ? (
                          <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-medium">
                            {`${(percent * 100).toFixed(0)}%`}
                          </text>
                        ) : null;
                    }}
                >
                    {subjectDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="focus:outline-none" />
                    ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${(value as number).toFixed(1)}%`, name]} />
                <Legend iconSize={10} />
                </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <Zap />
              Questions Solved
            </CardTitle>
            <CardDescription>Number of questions solved per subject.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={questionsData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))', radius: 4 }} />
                <Bar dataKey="questions" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <Target />
              Topic Mastery
            </CardTitle>
            <CardDescription>Your progress across different topics.</CardDescription>
          </CardHeader>
          <CardContent>
            <TopicMasteryChart data={topicMasteryData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ title, value, unit, icon: Icon, trend }: {
  title: string;
  value: string;
  unit?: string;
  icon: React.ElementType;
  trend: string;
}) {
  const isPositive = trend.startsWith('+');
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex flex-col space-y-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">{value}</span>
              {unit && <span className="text-lg text-muted-foreground">{unit}</span>}
            </div>
          </div>
          <div className="h-10 w-10 flex items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
         <Badge variant="outline" className={cn(
             "border-opacity-50",
             isPositive ? "text-green-600 border-green-200" : "text-red-600 border-red-200",
             trend === "N/A" && "text-muted-foreground border-muted"
         )}>
            {trend}
        </Badge>
      </CardContent>
    </Card>
  );
}

function PageSkeleton() {
    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-8">
            <div className="space-y-2">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-5 w-1/2" />
            </div>

            <Skeleton className="h-16 w-full" />
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <Skeleton className="h-36 w-full" />
                <Skeleton className="h-36 w-full" />
                <Skeleton className="h-36 w-full" />
                <Skeleton className="h-36 w-full" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <Skeleton className="xl:col-span-2 h-96 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
            
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Skeleton className="h-80 w-full" />
                <Skeleton className="h-80 w-full" />
            </div>
        </div>
    )
}
    
