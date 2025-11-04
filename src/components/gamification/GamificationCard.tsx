
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Flame, Trophy, Award, BarChart, Clock, ListChecks, AlertTriangle, PlusCircle, MinusCircle, Star } from 'lucide-react';
import { getCurrentUser, supabaseBrowserClient } from '@/lib/supabase';
import { getUserGamification } from '@/lib/gamification/service';
import { getLevelTitle, LEVEL_SYSTEM } from '@/lib/gamification/levels';
import { getNextAchievements, getAchievementProgress } from '@/lib/gamification/achievement-tracker';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Database } from '@/lib/database.types';

type GamificationData = Database['public']['Tables']['user_gamification']['Row'];
type PointsHistory = Database['public']['Tables']['points_history']['Row'];
type UserPenalties = Database['public']['Tables']['user_penalties']['Row'];
type Block = Database['public']['Tables']['blocks']['Row'];
type AchievementProgress = Awaited<ReturnType<typeof getAchievementProgress>>[0];

type ActivityFeedItem = {
  id: string;
  type: 'reward' | 'penalty';
  points: number;
  description: string;
  timestamp: string;
};

type DailyStats = {
  studyHours: number;
  blocksCompleted: number;
  blocksPlanned: number;
  revisionQueueSize: number;
  pointsEarnedToday: number;
  pointsLostToday: number;
};

// Memoized sub-components to prevent unnecessary re-renders
const LevelProgress = React.memo(({ 
  gamificationData, 
  progress 
}: { 
  gamificationData: GamificationData | null; 
  progress: ReturnType<typeof useProgressCalculation>; 
}) => {
  if (!gamificationData) return null;
  
  return (
    <section className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-3xl font-bold">Level {gamificationData.level || 1}</p>
          <p className="text-lg text-muted-foreground">{getLevelTitle(gamificationData.level || 1)}</p>
        </div>
        <div className="flex items-center gap-3 bg-orange-100 dark:bg-orange-900/50 p-3 rounded-lg">
          <Flame className="h-8 w-8 text-orange-500" />
          <div>
            <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">Current Streak</p>
            <p className="text-2xl font-bold text-orange-800 dark:text-orange-200">{gamificationData.current_streak || 0} Days</p>
          </div>
        </div>
      </div>
      <div>
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-sm font-medium text-muted-foreground">XP Progress</span>
          <span className="text-sm font-bold">{progress.net} / {progress.next}</span>
        </div>
        <Progress value={progress.percentage} className="h-3" />
      </div>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
          <p className="text-xs text-green-700 dark:text-green-300">Total Earned</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">{progress.current}</p>
        </div>
        <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg">
          <p className="text-xs text-red-700 dark:text-red-300">Penalties</p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400">-{progress.penalty}</p>
        </div>
        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
          <p className="text-xs text-blue-700 dark:text-blue-300">Net XP</p>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{progress.net}</p>
        </div>
      </div>
    </section>
  );
});

const DailyProgress = React.memo(({ dailyStats }: { dailyStats: DailyStats }) => (
  <section>
    <h3 className="text-lg font-semibold mb-3">Today's Snapshot</h3>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">Study Hours</p>
        <p className="text-2xl font-bold">{(dailyStats.studyHours || 0).toFixed(1)}h</p>
        <Progress value={(dailyStats.studyHours / 10) * 100} className="h-1 mt-2" />
      </Card>
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">Blocks</p>
        <p className="text-2xl font-bold">{dailyStats.blocksCompleted}/{dailyStats.blocksPlanned}</p>
      </Card>
      <Card className={cn("p-4", dailyStats.revisionQueueSize > 5 && "bg-red-50 dark:bg-red-900/30")}>
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          Revision Queue
          {dailyStats.revisionQueueSize > 5 && <AlertTriangle className="h-4 w-4 text-destructive" />}
        </p>
        <p className="text-2xl font-bold">{dailyStats.revisionQueueSize}</p>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">Points +/-</p>
        <p className="text-2xl font-bold">
          <span className="text-green-500">+{dailyStats.pointsEarnedToday}</span>
          <span className="text-red-500"> -{dailyStats.pointsLostToday}</span>
        </p>
      </Card>
    </div>
  </section>
));

const NextAchievements = React.memo(({ nextAchievements }: { nextAchievements: AchievementProgress[] }) => (
  <section>
    <h3 className="text-lg font-semibold mb-3">Next Achievements</h3>
    {nextAchievements.length > 0 ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {nextAchievements.map(ach => (
          <Card key={ach.id} className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl flex-shrink-0">{ach.icon}</span>
              <p className="font-semibold text-sm flex-1 line-clamp-1">{ach.name}</p>
            </div>
            <Progress value={ach.progress_percentage || 0} className="h-1" />
            <div className="text-xs text-muted-foreground flex justify-between">
              <span>{ach.progress_percentage?.toFixed(0)}%</span>
              <span>+{ach.points_reward} XP</span>
            </div>
          </Card>
        ))}
      </div>
    ) : (
      <div className="text-center py-4 text-muted-foreground">
        <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No new achievements to track right now.</p>
      </div>
    )}
  </section>
));

const RecentActivity = React.memo(({ activityFeed }: { activityFeed: ActivityFeedItem[] }) => (
  <section>
    <h3 className="text-lg font-semibold mb-3">Recent Activity</h3>
    {activityFeed.length > 0 ? (
      <div className="space-y-2">
        {activityFeed.map((item) => {
          const isReward = item.type === 'reward';
          return (
            <div 
              key={item.id} 
              className="flex items-center justify-between p-3 rounded-md bg-muted/50 text-sm hover:bg-muted/70 transition-colors duration-200"
            >
              <div className="flex items-center gap-3">
                {isReward ? <PlusCircle className="h-5 w-5 text-green-500" /> : <MinusCircle className="h-5 w-5 text-destructive" />}
                <div className="min-w-0">
                  <p className="font-medium capitalize">{item.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <p className={cn("font-bold flex-shrink-0", isReward ? "text-green-600 dark:text-green-400" : "text-destructive")}>
                {isReward ? `+${item.points}` : `${item.points}`} XP
              </p>
            </div>
          );
        })}
      </div>
    ) : (
      <div className="text-center py-4 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No recent activity.</p>
      </div>
    )}
  </section>
));

// Custom hooks for data fetching and calculations
function useProgressCalculation(gamificationData: GamificationData | null) {
  return useMemo(() => {
    if (!gamificationData) return { percentage: 0, current: 0, next: 100, net: 0, penalty: 0 };

    const currentLevelInfo = LEVEL_SYSTEM.find(l => l.level === gamificationData.level);
    const nextLevelInfo = LEVEL_SYSTEM.find(l => l.level === (gamificationData.level || 0) + 1);
    
    const currentLevelXP = currentLevelInfo ? currentLevelInfo.xp : 0;
    const nextLevelXP = nextLevelInfo ? nextLevelInfo.xp : currentLevelXP + 100;
    
    const totalPoints = gamificationData.total_points_earned || 0;
    const penaltyPoints = gamificationData.total_penalty_points || 0;
    const netPoints = totalPoints - penaltyPoints;
    
    const xpIntoLevel = netPoints - currentLevelXP;
    const xpForLevel = nextLevelXP - currentLevelXP;

    if (xpForLevel <= 0) return { percentage: 100, current: totalPoints, next: nextLevelXP, net: netPoints, penalty: penaltyPoints };

    return {
      percentage: (xpIntoLevel / xpForLevel) * 100,
      current: totalPoints,
      next: nextLevelXP,
      net: netPoints,
      penalty: penaltyPoints
    };
  }, [gamificationData]);
}

export function GamificationCard() {
  const [gamificationData, setGamificationData] = useState<GamificationData | null>(null);
  const [nextAchievements, setNextAchievements] = useState<AchievementProgress[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([]);
  const [dailyStatsState, setDailyStatsState] = useState({
    studyHours: 0,
    blocksCompleted: 0,
    blocksPlanned: 0,
    revisionQueueSize: 0,
    pointsEarnedToday: 0,
    pointsLostToday: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Memoized data loading with better error handling
  const loadAllGamificationData = useCallback(async () => {
    setIsLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const todayString = new Date().toISOString().split('T')[0];

      // Use Promise.all for parallel data fetching
      const [
        gamificationRes, 
        nextAchievementsRes, 
        pointsHistoryRes, 
        penaltiesRes,
        dailyBlocksRes,
        revisionQueueRes
      ] = await Promise.all([
        getUserGamification(user.id),
        getNextAchievements(user.id),
        supabaseBrowserClient.from('points_history').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabaseBrowserClient.from('user_penalties').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabaseBrowserClient.from('blocks').select('id, duration', { count: 'exact' }).eq('user_id', user.id).eq('date', todayString),
        supabaseBrowserClient.from('topics').select('id', { count: 'exact' }).eq('user_id', user.id).eq('is_in_spare', true).lt('revision_count', 5).lte('next_revision_date', todayString),
      ]);
      
      // Main Gamification Data
      setGamificationData(gamificationRes?.data || null);

      // Next Achievements
      setNextAchievements(nextAchievementsRes || []);

      // Daily Stats
      const dailyBlocks = dailyBlocksRes.data as Block[] || [];
      const { data: completedSessions } = await supabaseBrowserClient.from('sessions').select('block_id').in('block_id', dailyBlocks.map(b => b.id));
      const totalMinutes = dailyBlocks.reduce((acc, block) => acc + block.duration, 0);
      
      const { data: pointsToday } = await supabaseBrowserClient.from('points_history').select('points_awarded').eq('user_id', user.id).gte('created_at', todayString);
      const { data: penaltiesToday } = await supabaseBrowserClient.from('user_penalties').select('points_deducted').eq('user_id', user.id).gte('created_at', todayString);
      
      setDailyStatsState({
        studyHours: totalMinutes / 60,
        blocksCompleted: completedSessions?.length || 0,
        blocksPlanned: dailyBlocksRes.count || 0,
        revisionQueueSize: revisionQueueRes.count || 0,
        pointsEarnedToday: (pointsToday || []).reduce((sum, item) => sum + (item.points_awarded || 0), 0),
        pointsLostToday: (penaltiesToday || []).reduce((sum, item) => sum + (item.points_deducted || 0), 0),
      });

      // Activity Feed
      const rewardsFeed: ActivityFeedItem[] = (pointsHistoryRes.data || []).map(p => ({
        id: `rew-${p.id}`,
        type: 'reward',
        points: p.points_awarded || 0,
        description: (p.reason || 'Activity').replace(/_/g, ' '),
        timestamp: p.created_at,
      }));
      const penaltiesFeed: ActivityFeedItem[] = (penaltiesRes.data || []).map(p => ({
        id: `pen-${p.id}`,
        type: 'penalty',
        points: p.points_deducted || 0,
        description: p.reason,
        timestamp: p.created_at,
      }));
      
      const combinedFeed = [...rewardsFeed, ...penaltiesFeed]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);
      setActivityFeed(combinedFeed);

    } catch (error) {
      console.error("Error loading full gamification dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllGamificationData();
  }, [loadAllGamificationData]);

  // Memoized calculations
  const progress = useProgressCalculation(gamificationData);

  if (isLoading) {
    return <Skeleton className="h-[600px] w-full" />;
  }
  
  if (!gamificationData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Your Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Initialize gamification by completing your first session!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          Gamification Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <LevelProgress gamificationData={gamificationData} progress={progress} />
        <DailyProgress dailyStats={dailyStatsState} />
        <NextAchievements nextAchievements={nextAchievements} />
        <RecentActivity activityFeed={activityFeed} />
      </CardContent>
    </Card>
  );
}