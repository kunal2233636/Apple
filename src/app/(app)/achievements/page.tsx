
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, CheckCircle, Star, Trophy } from 'lucide-react';
import { getCurrentUser } from '@/lib/supabase';
import { getAchievementProgress } from '@/lib/gamification/achievement-tracker';
import { ACHIEVEMENTS, type Achievement, type AchievementCategory } from '@/lib/gamification/achievements-advanced';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Database } from '@/lib/database.types';
import { useRouter } from 'next/navigation';

type AchievementWithProgress = Achievement & {
  current_value: number;
  is_completed: boolean;
  completed_at: string | null;
  progress_percentage: number;
};

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<AchievementWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadAchievements() {
      setIsLoading(true);
      const user = await getCurrentUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      
      const progressData = await getAchievementProgress(user.id);
      setAchievements(progressData as AchievementWithProgress[]);
      setIsLoading(false);
    }
    loadAchievements();
  }, [router]);

  const unlockedCount = useMemo(() => achievements.filter(a => a.is_completed).length, [achievements]);
  const totalCount = ACHIEVEMENTS.length;

  const achievementsByCategory = useMemo(() => {
    return achievements.reduce((acc, ach) => {
      if (!acc[ach.category]) {
        acc[ach.category] = [];
      }
      acc[ach.category].push(ach);
      return acc;
    }, {} as Record<AchievementCategory, AchievementWithProgress[]>);
  }, [achievements]);

  const stats = useMemo(() => {
    const unlocked = achievements.filter(a => a.is_completed);
    const totalPoints = unlocked.reduce((sum, ach) => sum + ach.points_reward, 0);
    const completionPercentage = totalCount > 0 ? (unlocked.length / totalCount) * 100 : 0;
    
    // Find rarest achievement (placeholder logic, could be improved with global stats)
    const rarest = unlocked.sort((a,b) => a.points_reward - b.points_reward)[0];

    const inProgress = achievements.filter(a => !a.is_completed);
    inProgress.sort((a, b) => b.progress_percentage - a.progress_percentage);
    const nextClosest = inProgress[0];

    return { totalPoints, completionPercentage, rarest, nextClosest };
  }, [achievements, totalCount]);


  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-3xl">
            <Trophy className="h-8 w-8 text-primary" />
            Achievements & Progress
          </CardTitle>
          <CardDescription className="text-lg">
            You've unlocked {unlockedCount} of {totalCount} achievements.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-auto md:flex md:w-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress</TabsTrigger>
          <TabsTrigger value="unlocked">Unlocked</TabsTrigger>
          <TabsTrigger value="category-study">Study Time</TabsTrigger>
          <TabsTrigger value="category-blocks">Blocks</TabsTrigger>
          <TabsTrigger value="category-revision">Revision</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <AchievementGrid achievements={achievements} />
        </TabsContent>
        <TabsContent value="in-progress">
          <AchievementGrid achievements={achievements.filter(a => !a.is_completed)} />
        </TabsContent>
        <TabsContent value="unlocked">
          <AchievementGrid achievements={achievements.filter(a => a.is_completed)} />
        </TabsContent>
        <TabsContent value="category-study">
            <AchievementGrid achievements={achievementsByCategory['Study Time'] || []} />
        </TabsContent>
         <TabsContent value="category-blocks">
            <AchievementGrid achievements={achievementsByCategory['Block Completion'] || []} />
        </TabsContent>
         <TabsContent value="category-revision">
            <AchievementGrid achievements={achievementsByCategory['Revision'] || []} />
        </TabsContent>
      </Tabs>
      
      <StatsSummary stats={stats} />

    </div>
  );
}

const AchievementGrid = ({ achievements }: { achievements: AchievementWithProgress[] }) => {
  if (achievements.length === 0) {
    return <div className="text-center py-16 text-muted-foreground">No achievements in this category.</div>
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
      {achievements.map(ach => (
        <AchievementCard key={ach.id} achievement={ach} />
      ))}
    </div>
  );
};

const AchievementCard = ({ achievement }: { achievement: AchievementWithProgress }) => {
    const isCompleted = achievement.is_completed;
    return (
        <Card className={cn(
            "flex flex-col text-center transition-all hover:shadow-lg",
            isCompleted ? "border-green-500/50 bg-green-50/50 dark:bg-green-900/20" : "bg-muted/30"
        )}>
            <CardHeader className="items-center pb-4">
                <div className={cn(
                    "flex h-20 w-20 items-center justify-center rounded-full mb-4 text-5xl",
                    isCompleted ? "bg-green-100 dark:bg-green-900/50" : "bg-muted"
                )}>
                   {achievement.icon}
                </div>
                <CardTitle className="text-xl">{achievement.name}</CardTitle>
                <CardDescription className="text-sm min-h-[40px]">{achievement.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-end">
                {isCompleted ? (
                    <div className="space-y-2">
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                            <CheckCircle className="mr-2 h-4 w-4" /> Unlocked
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                            Earned on {format(new Date(achievement.completed_at!), 'MMM d, yyyy')}
                        </p>
                        <p className="font-semibold text-green-700 dark:text-green-300">
                            Earned: {achievement.points_reward} XP
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <Progress value={achievement.progress_percentage} className="h-2" />
                        <div className="flex justify-between text-xs font-medium text-muted-foreground">
                            <span>{achievement.current_value.toLocaleString()} / {achievement.target_value.toLocaleString()}</span>
                            <span>{achievement.progress_percentage.toFixed(0)}%</span>
                        </div>
                        <p className="font-semibold text-primary">
                            Reward: {achievement.points_reward} XP
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

function StatsSummary({ stats }: { stats: any }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Achievements Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                <Card className="p-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Points Earned</p>
                    <p className="text-3xl font-bold text-primary">{stats.totalPoints.toLocaleString()} XP</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm font-medium text-muted-foreground">Completion</p>
                    <p className="text-3xl font-bold">{stats.completionPercentage.toFixed(1)}%</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm font-medium text-muted-foreground">Rarest Unlocked</p>
                    <p className="text-lg font-bold">{stats.rarest?.name || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground">{stats.rarest?.icon || ''}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm font-medium text-muted-foreground">Next Up</p>
                    <p className="text-lg font-bold">{stats.nextClosest?.name || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground">{stats.nextClosest?.progress_percentage?.toFixed(0) || '0'}% complete</p>
                </Card>
            </CardContent>
        </Card>
    );
}

function PageSkeleton() {
    return (
        <div className="space-y-8">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-12 w-full max-w-lg" />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
            </div>
        </div>
    )
}
