'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge as UIBadge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Trophy, 
  Star, 
  Crown, 
  Flame, 
  Target, 
  Clock, 
  Zap, 
  BookOpen, 
  TrendingUp,
  Award,
  CheckCircle,
  Lock,
  Info
} from 'lucide-react';
import { getCurrentUser, supabaseBrowserClient } from '@/lib/supabase';
import { 
  BADGES_CONFIG, 
  fetchUserStats, 
  checkEarnedBadges, 
  type UserStats,
  type Badge 
} from '@/lib/gamification/badges';
import { cn } from '@/lib/utils';

interface BadgeWithProgress extends Badge {
  earned: boolean;
  progress: number;
  progressText: string;
  nextLevelRequirement?: number;
}

export function AchievementsCard() {
  const [userBadges, setUserBadges] = useState<any[]>([]);
  const [badgeProgress, setBadgeProgress] = useState<BadgeWithProgress[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    setIsLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) return;

      // Fetch user's earned badges
      const { data: earnedBadges, error } = await (supabaseBrowserClient as any)
        .from('user_badges')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching user badges:', error);
        return;
      }

      setUserBadges(earnedBadges || []);
      
      // Fetch user statistics
      const stats = await fetchUserStats(user.id);
      setUserStats(stats);
      
      // Calculate badge progress
      const earnedBadgeNames = earnedBadges?.map((b: any) => b.badge_name) || [];
      const badgesWithProgress = calculateBadgeProgress(stats, earnedBadgeNames);
      setBadgeProgress(badgesWithProgress);

    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateBadgeProgress = (stats: UserStats, earnedBadgeNames: string[]): BadgeWithProgress[] => {
    return BADGES_CONFIG.map(badge => {
      const earned = earnedBadgeNames.includes(badge.name);
      let progress = 0;
      let progressText = '';
      let nextLevelRequirement: number | undefined;

      // Calculate progress for different badge types
      switch (badge.type) {
        case 'session':
          progress = Math.min((stats.sessionsCompleted / badge.requirement) * 100, 100);
          progressText = `${stats.sessionsCompleted}/${badge.requirement} sessions`;
          break;
          
        case 'streak':
          progress = Math.min((stats.currentStreak / badge.requirement) * 100, 100);
          progressText = `${stats.currentStreak}/${badge.requirement} days streak`;
          break;
          
        case 'hours':
          progress = Math.min((stats.totalHours / badge.requirement) * 100, 100);
          progressText = `${Math.round(stats.totalHours * 10) / 10}/${badge.requirement} hours`;
          break;
          
        case 'topic':
          progress = Math.min((stats.topicsCompleted / badge.requirement) * 100, 100);
          progressText = `${stats.topicsCompleted}/${badge.requirement} topics`;
          break;
          
        case 'subject_mastery':
          if (badge.subject_requirement && stats.subjectStats) {
            const subjectData = stats.subjectStats[badge.subject_requirement];
            const completed = subjectData ? subjectData.topicsCompleted : 0;
            progress = Math.min((completed / badge.requirement) * 100, 100);
            progressText = `${completed}/${badge.requirement} ${badge.subject_requirement} topics`;
          }
          break;
          
        case 'difficulty':
          if (badge.difficulty_requirement) {
            const difficultyCount = stats.difficultyStats?.[badge.difficulty_requirement.toLowerCase() as keyof typeof stats.difficultyStats] || 0;
            progress = Math.min((difficultyCount / badge.requirement) * 100, 100);
            progressText = `${difficultyCount}/${badge.requirement} ${badge.difficulty_requirement} topics`;
          } else if (badge.name === "Master of All") {
            const easy = stats.difficultyStats?.easy || 0;
            const medium = stats.difficultyStats?.medium || 0;
            const hard = stats.difficultyStats?.hard || 0;
            const minCount = Math.min(easy, medium, hard);
            progress = Math.min((minCount / 10) * 100, 100);
            progressText = `${minCount}/10 of each difficulty`;
          }
          break;
          
        case 'consistency':
          if (badge.name === "Early Bird") {
            progress = Math.min(((stats.dailyStats?.earlyMorning || 0) / badge.requirement) * 100, 100);
            progressText = `${stats.dailyStats?.earlyMorning || 0}/${badge.requirement} early mornings`;
          } else if (badge.name === "Night Shift") {
            progress = Math.min(((stats.dailyStats?.lateNight || 0) / badge.requirement) * 100, 100);
            progressText = `${stats.dailyStats?.lateNight || 0}/${badge.requirement} late nights`;
          } else if (badge.name === "Perfect Routine") {
            progress = Math.min(((stats.dailyStats?.routine || 0) / badge.requirement) * 100, 100);
            progressText = `${stats.dailyStats?.routine || 0}/${badge.requirement} routine days`;
          }
          break;
          
        case 'special':
          if (badge.name === "Perfectionist") {
            progress = Math.min(((stats.specialStats?.perfectWeeks || 0) / badge.requirement) * 100, 100);
            progressText = `${stats.specialStats?.perfectWeeks || 0}/${badge.requirement} perfect weeks`;
          } else if (badge.name === "Marathoner") {
            progress = Math.min(((stats.dailyStats?.marathonDays || 0) / badge.requirement) * 100, 100);
            progressText = `${stats.dailyStats?.marathonDays || 0}/${badge.requirement} marathon days`;
          } else if (badge.name === "Subject Polymath") {
            progress = Math.min(((stats.specialStats?.subjectMastery || 0) / badge.requirement) * 100, 100);
            progressText = `${stats.specialStats?.subjectMastery || 0}/${badge.requirement} subject masteries`;
          }
          break;
      }

      return {
        ...badge,
        earned,
        progress,
        progressText,
        nextLevelRequirement
      };
    });
  };

  const getBadgeCategoryColor = (type: string) => {
    switch (type) {
      case 'session': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'streak': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'hours': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'topic': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'subject_mastery': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
      case 'difficulty': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'consistency': return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300';
      case 'special': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getBadgeIcon = (type: string) => {
    switch (type) {
      case 'session': return <Star className="h-4 w-4" />;
      case 'streak': return <Flame className="h-4 w-4" />;
      case 'hours': return <Clock className="h-4 w-4" />;
      case 'topic': return <BookOpen className="h-4 w-4" />;
      case 'subject_mastery': return <Award className="h-4 w-4" />;
      case 'difficulty': return <TrendingUp className="h-4 w-4" />;
      case 'consistency': return <Target className="h-4 w-4" />;
      case 'special': return <Crown className="h-4 w-4" />;
      default: return <Trophy className="h-4 w-4" />;
    }
  };

  const filteredBadges = selectedCategory === 'all' 
    ? badgeProgress 
    : badgeProgress.filter(badge => badge.type === selectedCategory);

  const earnedBadges = badgeProgress.filter(b => b.earned);
  const unlockedBadges = badgeProgress.filter(b => !b.earned && b.progress > 0);
  const lockedBadges = badgeProgress.filter(b => !b.earned && b.progress === 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          Achievements & Badges
        </CardTitle>
        <CardDescription>
          Track your progress and unlock prestigious badges as you study!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Achievement Statistics */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Trophy className="h-6 w-6 text-yellow-600" />
              </div>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {earnedBadges.length}
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">Earned Badges</p>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {unlockedBadges.length}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">In Progress</p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Lock className="h-6 w-6 text-gray-600" />
              </div>
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                {lockedBadges.length}
              </p>
              <p className="text-xs text-gray-700 dark:text-gray-300">Locked</p>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {Math.round((earnedBadges.length / badgeProgress.length) * 100)}%
              </p>
              <p className="text-xs text-purple-700 dark:text-purple-300">Completion</p>
            </div>
          </div>
        </section>

        {/* Category Filter */}
        <section>
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              size="sm"
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('all')}
            >
              All
            </Button>
            {['session', 'streak', 'hours', 'topic', 'subject_mastery', 'difficulty', 'consistency', 'special'].map(type => (
              <Button
                key={type}
                size="sm"
                variant={selectedCategory === type ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(type)}
                className="flex items-center gap-1"
              >
                {getBadgeIcon(type)}
                {type.replace('_', ' ')}
              </Button>
            ))}
          </div>
        </section>

        {/* Earned Badges */}
        {earnedBadges.length > 0 && (
          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Earned Badges
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {earnedBadges.map((badge) => (
                <div key={badge.name} className="p-4 border rounded-lg bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{badge.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">{badge.name}</h4>
                        <UIBadge className={getBadgeCategoryColor(badge.type)}>
                          {badge.type.replace('_', ' ')}
                        </UIBadge>
                      </div>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
                        {badge.description}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                        <CheckCircle className="h-3 w-3" />
                        Earned
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* In Progress & Locked Badges */}
        <section>
          <h3 className="text-lg font-semibold mb-3">
            {selectedCategory === 'all' ? 'All Achievements' : `${selectedCategory.replace('_', ' ')} Badges`}
          </h3>
          <div className="space-y-3">
            {filteredBadges.map((badge) => (
              <div 
                key={badge.name} 
                className={cn(
                  "p-4 border rounded-lg transition-all",
                  badge.earned 
                    ? "bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-800"
                    : badge.progress > 0
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                    : "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="text-2xl">{badge.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={cn(
                          "font-semibold",
                          badge.earned 
                            ? "text-yellow-800 dark:text-yellow-200"
                            : badge.progress > 0
                            ? "text-blue-800 dark:text-blue-200"
                            : "text-gray-800 dark:text-gray-200"
                        )}>
                          {badge.name}
                        </h4>
                        <UIBadge className={getBadgeCategoryColor(badge.type)}>
                          {badge.type.replace('_', ' ')}
                        </UIBadge>
                        {badge.earned && (
                          <UIBadge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Earned
                          </UIBadge>
                        )}
                        {!badge.earned && badge.progress === 0 && (
                          <UIBadge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                            <Lock className="h-3 w-3 mr-1" />
                            Locked
                          </UIBadge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {badge.description}
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">{badge.progressText}</span>
                          {badge.earned ? (
                            <span className="text-green-600 font-medium">Completed!</span>
                          ) : (
                            <span className="text-blue-600 font-medium">{Math.round(badge.progress)}%</span>
                          )}
                        </div>
                        {!badge.earned && (
                          <Progress value={badge.progress} className="h-2" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {filteredBadges.length === 0 && (
          <p className="text-center py-8 text-muted-foreground">
            No badges found for this category.
          </p>
        )}
      </CardContent>
    </Card>
  );
}