'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getCurrentUser, supabaseBrowserClient } from '@/lib/supabase';
import { getUserGamification, getUserBadges } from '@/lib/gamification/service';
import { GamificationCard } from '@/components/gamification/GamificationCard';
import { BADGES_CONFIG, type Badge as BadgeConfig, type UserStats } from '@/lib/gamification/badges';
import { Progress } from '@/components/ui/progress';
import { format, formatDistanceToNow } from 'date-fns';
import { Award, Star, History, TrendingUp, CheckCircle, Target, Trophy, Info } from 'lucide-react';
import { GamificationErrorBoundary, DataLoadingErrorBoundary } from '@/components/gamification/ErrorBoundary';
import type { Database } from '@/lib/database.types';

// Lazy load PointSystemInfo for better performance
const PointSystemInfo = lazy(() => 
  import('@/components/gamification/PointSystemInfo').then(module => ({ default: module.PointSystemInfo }))
);

// Loading fallback for PointSystemInfo
const PointSystemInfoSkeleton = () => (
  <div className="p-2 rounded-lg border bg-background hover:bg-muted/50 transition-colors animate-pulse">
    <div className="h-5 w-5 bg-muted rounded" />
  </div>
);

type UserBadge = Database['public']['Tables']['user_badges']['Row'];
type PointsHistory = Database['public']['Tables']['points_history']['Row'];
type GamificationData = Database['public']['Tables']['user_gamification']['Row'];

// Memoized components to prevent unnecessary re-renders
const MemoizedAllBadges = React.memo(({ earnedBadges }: { earnedBadges: UserBadge[] }) => (
  <DataLoadingErrorBoundary onRetry={() => window.location.reload()}>
    <AllBadges earnedBadges={earnedBadges} />
  </DataLoadingErrorBoundary>
));

const MemoizedPointsHistory = React.memo(({ history }: { history: PointsHistory[] }) => (
  <DataLoadingErrorBoundary onRetry={() => window.location.reload()}>
    <PointsHistoryComponent history={history} />
  </DataLoadingErrorBoundary>
));

const MemoizedAchievementsProgress = React.memo(({ 
  unearnedBadges, 
  userStats 
}: { 
  unearnedBadges: BadgeConfig[]; 
  userStats: UserStats 
}) => (
  <DataLoadingErrorBoundary onRetry={() => window.location.reload()}>
    <AchievementsProgressComponent unearnedBadges={unearnedBadges} userStats={userStats} />
  </DataLoadingErrorBoundary>
));

export default function GamificationPage() {
  const [gamificationData, setGamificationData] = useState<GamificationData | null>(null);
  const [earnedBadges, setEarnedBadges] = useState<UserBadge[]>([]);
  const [pointsHistory, setPointsHistory] = useState<PointsHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Memoized data loading with better error handling and caching
  const loadPageData = useCallback(async () => {
    setIsLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Use Promise.all for parallel data fetching
      const [gamificationRes, badgesRes, historyRes] = await Promise.all([
        getUserGamification(user.id),
        getUserBadges(user.id),
        supabaseBrowserClient
          .from('points_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)
      ]);

      if (gamificationRes.data) setGamificationData(gamificationRes.data);
      if (badgesRes.data) setEarnedBadges(badgesRes.data);
      if (historyRes.data) setPointsHistory(historyRes.data);
    } catch (error) {
      console.error('Error loading gamification data:', error);
      // Error will be caught by the error boundary
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  // Memoized unearned badges calculation
  const unearnedBadges = useMemo(() => {
    const earnedNames = new Set(earnedBadges.map(b => b.badge_name));
    return BADGES_CONFIG.filter(badge => !earnedNames.has(badge.name));
  }, [earnedBadges]);

  // Memoized user stats calculation
  const userStats: UserStats = useMemo(() => {
    return {
      sessionsCompleted: gamificationData ? Math.floor((gamificationData.total_points_earned || 0) / 75) : 0,
      currentStreak: gamificationData?.current_streak || 0,
      totalHours: gamificationData ? Math.floor((gamificationData.total_points_earned || 0) / 100) : 0,
      topicsCompleted: gamificationData ? Math.floor((gamificationData.total_points_earned || 0) / 40) : 0,
    };
  }, [gamificationData]);

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <GamificationErrorBoundary 
      level="page"
      onReset={loadPageData}
    >
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div></div>
          <Suspense fallback={<PointSystemInfoSkeleton />}>
            <GamificationErrorBoundary level="component">
              <PointSystemInfo>
                <button 
                  className="p-2 rounded-lg border bg-background hover:bg-muted/50 transition-all duration-200 hover:scale-105"
                  aria-label="View Point System Information"
                >
                  <Info className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                </button>
              </PointSystemInfo>
            </GamificationErrorBoundary>
          </Suspense>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <GamificationErrorBoundary level="section">
              <GamificationCard />
            </GamificationErrorBoundary>
          </div>
          <div className="lg:col-span-2">
            <MemoizedAchievementsProgress unearnedBadges={unearnedBadges} userStats={userStats} />
          </div>
        </div>
        
        <MemoizedAllBadges earnedBadges={earnedBadges} />
        <MemoizedPointsHistory history={pointsHistory} />
      </div>
    </GamificationErrorBoundary>
  );
}

function AllBadges({ earnedBadges }: { earnedBadges: UserBadge[] }) {
  if (earnedBadges.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" />
            All Earned Badges
          </CardTitle>
          <CardDescription>Your collection of achievements. Keep up the great work!</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No badges earned yet. Your journey begins!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-6 w-6 text-primary" />
          All Earned Badges
        </CardTitle>
        <CardDescription>Your collection of achievements. Keep up the great work!</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {earnedBadges.map((badge) => (
            <Card 
              key={badge.id} 
              className="p-4 flex items-start gap-4 bg-muted/50 hover:bg-muted/70 transition-colors duration-200"
            >
              <span className="text-4xl mt-1 flex-shrink-0">{badge.badge_icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{badge.badge_name}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{badge.badge_description}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Earned on {format(new Date(badge.earned_at), 'MMM d, yyyy')}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PointsHistoryComponent({ history }: { history: PointsHistory[] }) {
  const reasonIcons: { [key: string]: React.ElementType } = {
    session_completion: CheckCircle,
    streak_bonus: Star,
    default: History,
  };

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            Points History
          </CardTitle>
          <CardDescription>A log of your recently earned experience points.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No points history yet. Complete a session to start earning!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-6 w-6 text-primary" />
          Points History
        </CardTitle>
        <CardDescription>A log of your recently earned experience points.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {history.map((item) => {
            const Icon = reasonIcons[item.reason || 'default'] || History;
            return (
              <div 
                key={item.id} 
                className="flex items-center justify-between p-3 rounded-md bg-muted/50 text-sm hover:bg-muted/70 transition-colors duration-200"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium capitalize">{(item.reason || 'activity').replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <p className="font-bold text-green-600 dark:text-green-400">+{item.points_awarded} XP</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function AchievementsProgressComponent({ unearnedBadges, userStats }: { unearnedBadges: BadgeConfig[], userStats: UserStats }) {
  const getProgress = useCallback((badge: BadgeConfig) => {
    let current = 0;
    switch (badge.type) {
      case 'session': current = userStats.sessionsCompleted; break;
      case 'streak': current = userStats.currentStreak; break;
      case 'hours': current = userStats.totalHours; break;
      case 'topic': current = userStats.topicsCompleted; break;
      default: current = 0;
    }
    const percentage = Math.min((current / badge.requirement) * 100, 100);
    return { current, percentage };
  }, [userStats]);

  if (unearnedBadges.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Achievements Progress
          </CardTitle>
          <CardDescription>Track your progress towards unlocking new badges.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
            <Trophy className="h-10 w-10 text-yellow-500" />
            <p className="font-semibold">You've collected all the badges!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-6 w-6 text-primary" />
          Achievements Progress
        </CardTitle>
        <CardDescription>Track your progress towards unlocking new badges.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {unearnedBadges.slice(0, 4).map((badge) => {
            const { current, percentage } = getProgress(badge);
            return (
              <div key={badge.name} className="p-3 rounded-md bg-muted/50 hover:bg-muted/70 transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl flex-shrink-0">{badge.icon}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{badge.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{badge.description}</p>
                    </div>
                  </div>
                  <p className="text-xs font-bold flex-shrink-0">{current}/{badge.requirement}</p>
                </div>
                <Progress value={percentage} className="mt-2 h-1" />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex justify-end">
        <div className="p-2 rounded-lg border bg-background w-10 h-10" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>
        <div className="lg:col-span-2">
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  );
}