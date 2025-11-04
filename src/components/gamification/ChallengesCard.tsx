'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Target, Clock, Star, Plus, CheckCircle, X, Calendar, Zap } from 'lucide-react';
import { getCurrentUser } from '@/lib/supabase';
import { challengesSystem, CHALLENGE_CONFIGS, type ChallengeConfig } from '@/lib/gamification/challenges-system';
import { cn } from '@/lib/utils';

interface Challenge {
  user_id: string;
  challenge_config_id: string;
  challenge_name: string;
  challenge_type: string;
  target_value: number;
  current_value: number;
  reward_points: number;
  status: 'active' | 'completed' | 'expired';
  started_at: string;
  expires_at: string;
  completed_at?: string;
}

export function ChallengesCard() {
  const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);
  const [availableChallenges, setAvailableChallenges] = useState<ChallengeConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState<string | null>(null);

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    setIsLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const [active, available] = await Promise.all([
        challengesSystem.getActiveChallenges(user.id),
        challengesSystem.generateDailyChallenges(user.id)
      ]);

      setActiveChallenges(active);
      setAvailableChallenges(available);
    } catch (error) {
      console.error('Error loading challenges:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startChallenge = async (challengeConfig: ChallengeConfig) => {
    setIsStarting(challengeConfig.id);
    try {
      const user = await getCurrentUser();
      if (!user) return;

      await challengesSystem.startChallenge(user.id, challengeConfig);
      await loadChallenges(); // Refresh challenges
    } catch (error) {
      console.error('Error starting challenge:', error);
    } finally {
      setIsStarting(null);
    }
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getChallengeTypeColor = (type: string) => {
    switch (type) {
      case 'daily': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'weekly': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'monthly': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
      case 'special': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 dark:text-green-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'hard': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-6 w-6 text-blue-500" />
            Challenges
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
          <Target className="h-6 w-6 text-blue-500" />
          Challenges
        </CardTitle>
        <CardDescription>
          Complete challenges to earn extra XP and unlock achievements!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Active Challenges */}
        {activeChallenges.length > 0 && (
          <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Active Challenges
            </h3>
            <div className="space-y-3">
              {activeChallenges.map((challenge) => {
                const progress = challenge.target_value > 0 ? Math.min((challenge.current_value / challenge.target_value) * 100, 100) : 0;
                const isCompleted = challenge.current_value >= challenge.target_value;
                const isExpired = new Date(challenge.expires_at) < new Date();
                
                return (
                  <div key={challenge.challenge_config_id} className="p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{challenge.challenge_name}</h4>
                          <Badge className={getChallengeTypeColor(challenge.challenge_type)}>
                            {challenge.challenge_type}
                          </Badge>
                          {isCompleted && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                          {isExpired && !isCompleted && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              <X className="h-3 w-3 mr-1" />
                              Expired
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {challenge.current_value} / {challenge.target_value} • {challenge.reward_points} XP
                        </p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 inline mr-1" />
                        {formatTimeRemaining(challenge.expires_at)}
                      </div>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Available Challenges */}
        <section>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Available Challenges
          </h3>
          {availableChallenges.length > 0 ? (
            <div className="space-y-3">
              {availableChallenges.map((challenge) => {
                const isActive = activeChallenges.some(active => active.challenge_config_id === challenge.id);
                
                return (
                  <div key={challenge.id} className="p-4 border rounded-lg hover:bg-muted/20 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl">{challenge.icon}</span>
                          <h4 className="font-semibold">{challenge.name}</h4>
                          <Badge className={getChallengeTypeColor(challenge.type)}>
                            {challenge.type}
                          </Badge>
                          <span className={cn("text-xs font-medium", getDifficultyColor(challenge.difficulty))}>
                            {challenge.difficulty}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {challenge.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Target: {challenge.target_value}</span>
                          <span>Reward: {challenge.reward_points} XP</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => startChallenge(challenge)}
                        disabled={isStarting === challenge.id || isActive}
                        className="ml-4"
                      >
                        {isStarting === challenge.id ? (
                          <div className="flex items-center gap-1">
                            <div className="animate-spin h-3 w-3 border border-white border-t-transparent rounded-full"></div>
                            Starting...
                          </div>
                        ) : isActive ? (
                          'Active'
                        ) : (
                          'Start'
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              {activeChallenges.length > 0 
                ? "No new challenges available right now. Check back later!"
                : "No challenges available. Start completing study sessions to unlock challenges!"
              }
            </p>
          )}
        </section>

        {/* Challenge Statistics */}
        <section>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Challenge Stats
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {activeChallenges.filter(c => c.status === 'completed').length}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">Completed</p>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {activeChallenges.filter(c => c.status === 'active').length}
              </p>
              <p className="text-xs text-green-700 dark:text-green-300">Active</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {activeChallenges.reduce((sum, c) => sum + (c.current_value >= c.target_value ? c.reward_points : 0), 0)}
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">Earned XP</p>
            </div>
            <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {Math.round(activeChallenges.reduce((sum, c) => sum + (c.current_value / Math.max(c.target_value, 1) * 100), 0) / Math.max(activeChallenges.length, 1))}%
              </p>
              <p className="text-xs text-purple-700 dark:text-purple-300">Avg Progress</p>
            </div>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}