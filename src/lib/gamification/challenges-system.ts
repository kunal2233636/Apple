'use server';

import { supabaseBrowserClient } from '@/lib/supabase';
import type { Database } from '../database.types';

type UserGamification = Database['public']['Tables']['user_gamification']['Row'];
type ActivityLogInsert = Database['public']['Tables']['activity_logs']['Insert'];

export type ChallengeType = 'daily' | 'weekly' | 'monthly' | 'special';
export type ChallengeCategory = 'study_time' | 'topics_completed' | 'streak' | 'subject_specific' | 'speed_study';

export interface ChallengeConfig {
  id: string;
  name: string;
  description: string;
  type: ChallengeType;
  category: ChallengeCategory;
  target_value: number;
  reward_points: number;
  icon: string;
  difficulty: 'easy' | 'medium' | 'hard';
  requirements?: {
    min_level?: number;
    min_streak?: number;
    required_subjects?: string[];
  };
}

// Challenge configurations for different time periods
export const CHALLENGE_CONFIGS: ChallengeConfig[] = [
  // Daily Challenges
  { id: 'daily_study_2h', name: 'Early Bird', description: 'Study for 2+ hours today', type: 'daily', category: 'study_time', target_value: 120, reward_points: 100, icon: '🌅', difficulty: 'easy' },
  { id: 'daily_topics_5', name: 'Topic Hunter', description: 'Complete 5 topics today', type: 'daily', category: 'topics_completed', target_value: 5, reward_points: 150, icon: '🎯', difficulty: 'medium' },
  { id: 'daily_early_start', name: 'Perfect Morning', description: 'Start your first block before 7 AM', type: 'daily', category: 'study_time', target_value: 1, reward_points: 75, icon: '⏰', difficulty: 'easy' },
  
  // Weekly Challenges
  { id: 'weekly_study_30h', name: 'Marathon Week', description: 'Study 30+ hours this week', type: 'weekly', category: 'study_time', target_value: 1800, reward_points: 500, icon: '🏃‍♂️', difficulty: 'hard' },
  { id: 'weekly_streak_7', name: 'Week Warrior', description: 'Maintain a 7-day study streak', type: 'weekly', category: 'streak', target_value: 7, reward_points: 400, icon: '🔥', difficulty: 'medium' },
  { id: 'weekly_topics_25', name: 'Knowledge Seeker', description: 'Complete 25 topics this week', type: 'weekly', category: 'topics_completed', target_value: 25, reward_points: 600, icon: '📚', difficulty: 'hard' },
  
  // Subject-Specific Weekly Challenges
  { id: 'physics_week', name: 'Physics Focus', description: 'Complete 10 Physics topics this week', type: 'weekly', category: 'subject_specific', target_value: 10, reward_points: 300, icon: '⚛️', difficulty: 'medium', requirements: { required_subjects: ['Physics'] } },
  { id: 'chemistry_week', name: 'Chemistry Champion', description: 'Complete 10 Chemistry topics this week', type: 'weekly', category: 'subject_specific', target_value: 10, reward_points: 300, icon: '🧪', difficulty: 'medium', requirements: { required_subjects: ['Chemistry'] } },
  { id: 'math_week', name: 'Math Master', description: 'Complete 10 Math topics this week', type: 'weekly', category: 'subject_specific', target_value: 10, reward_points: 300, icon: '📐', difficulty: 'medium', requirements: { required_subjects: ['Mathematics'] } },
  
  // Special Challenges
  { id: 'perfect_day', name: 'Perfect Study Day', description: 'Complete all planned blocks today', type: 'special', category: 'study_time', target_value: 1, reward_points: 250, icon: '⭐', difficulty: 'hard' },
  { id: 'speed_study', name: 'Speed Demon', description: 'Complete 3 topics in one hour', type: 'special', category: 'speed_study', target_value: 3, reward_points: 200, icon: '⚡', difficulty: 'hard' },
];

export interface UserChallenge {
  user_id: string;
  challenge_config_id: string;
  challenge_name: string;
  challenge_type: ChallengeType;
  target_value: number;
  current_value: number;
  reward_points: number;
  status: 'active' | 'completed' | 'expired';
  started_at: string;
  expires_at: string;
  completed_at?: string;
}

export class ChallengesSystem {
  private static instance: ChallengesSystem;
  
  private constructor() {}
  
  static getInstance(): ChallengesSystem {
    if (!ChallengesSystem.instance) {
      ChallengesSystem.instance = new ChallengesSystem();
    }
    return ChallengesSystem.instance;
  }

  /**
   * Get all available challenges for a user
   */
  async getAvailableChallenges(userId: string): Promise<ChallengeConfig[]> {
    const user = await this.getUserProfile(userId);
    if (!user) return [];

    return CHALLENGE_CONFIGS.filter(config => {
      // Check if user meets requirements
      if (config.requirements?.min_level && user.current_level < config.requirements.min_level) {
        return false;
      }
      if (config.requirements?.min_streak && user.current_streak < config.requirements.min_streak) {
        return false;
      }
      return true;
    });
  }

  /**
   * Get user's active challenges from activity logs
   */
  async getActiveChallenges(userId: string): Promise<UserChallenge[]> {
    // In this simplified version, we'll use activity_logs to store challenge data
    const { data: challengeLogs, error } = await (supabaseBrowserClient as any)
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('activity_type', 'challenge_started')
      .gte('details->expires_at', new Date().toISOString());

    if (error || !challengeLogs) {
      return [];
    }

    return challengeLogs.map((log: any) => ({
      user_id: log.user_id,
      challenge_config_id: log.details?.challenge_config_id || '',
      challenge_name: log.details?.challenge_name || '',
      challenge_type: log.details?.challenge_type || 'daily',
      target_value: log.details?.target_value || 0,
      current_value: log.details?.current_value || 0,
      reward_points: log.details?.reward_points || 0,
      status: log.details?.status || 'active',
      started_at: log.details?.started_at || log.created_at,
      expires_at: log.details?.expires_at || '',
      completed_at: log.details?.completed_at || undefined,
    }));
  }

  /**
   * Start a new challenge for user
   */
  async startChallenge(userId: string, challengeConfig: ChallengeConfig): Promise<UserChallenge | null> {
    const now = new Date();
    let expiresAt: Date;

    // Set expiration based on challenge type
    switch (challengeConfig.type) {
      case 'daily':
        expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
        break;
      case 'weekly':
        expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
        break;
      case 'monthly':
        expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
        break;
      default:
        expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }

    const challengeData: UserChallenge = {
      user_id: userId,
      challenge_config_id: challengeConfig.id,
      challenge_name: challengeConfig.name,
      challenge_type: challengeConfig.type,
      target_value: challengeConfig.target_value,
      current_value: 0,
      reward_points: challengeConfig.reward_points,
      status: 'active',
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    // Store challenge in activity_logs
    const logEntry: ActivityLogInsert = {
      user_id: userId,
      activity_type: 'challenge_started',
      summary: `Started challenge: ${challengeConfig.name}`,
      details: challengeData as any
    };

    const { error } = await (supabaseBrowserClient as any)
      .from('activity_logs')
      .insert(logEntry);

    if (error) {
      console.error('Error starting challenge:', error);
      return null;
    }

    return challengeData;
  }

  /**
   * Update challenge progress
   */
  async updateChallengeProgress(userId: string, challengeConfigId: string, increment: number = 1): Promise<void> {
    // Find the active challenge log
    const { data: challengeLogs, error } = await (supabaseBrowserClient as any)
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('activity_type', 'challenge_started')
      .eq('details->challenge_config_id', challengeConfigId)
      .eq('details->status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !challengeLogs || challengeLogs.length === 0) {
      return; // Challenge not found
    }

    const challengeLog = challengeLogs[0];
    const challengeData = challengeLog.details as UserChallenge;
    const newValue = (challengeData.current_value || 0) + increment;
    const isCompleted = newValue >= challengeData.target_value;

    challengeData.current_value = newValue;
    if (isCompleted) {
      challengeData.status = 'completed';
      challengeData.completed_at = new Date().toISOString();
    }

    // Update the challenge data in activity_logs
    const { error: updateError } = await (supabaseBrowserClient as any)
      .from('activity_logs')
      .update({ details: challengeData as any })
      .eq('id', challengeLog.id);

    if (updateError) {
      console.error('Error updating challenge progress:', updateError);
      return;
    }

    // If completed, award points
    if (isCompleted) {
      await this.awardChallengeReward(userId, challengeData.reward_points, challengeData.challenge_name);
    }
  }

  /**
   * Award challenge completion rewards
   */
  private async awardChallengeReward(userId: string, rewardPoints: number, challengeName: string): Promise<void> {
    try {
      // Update user gamification
      const { data: userGamification, error: fetchError } = await (supabaseBrowserClient as any)
        .from('user_gamification')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError || !userGamification) {
        return;
      }

      const newExperiencePoints = (userGamification.experience_points || 0) + rewardPoints;
      const newTotalPoints = (userGamification.total_points_earned || 0) + rewardPoints;

      const { error: updateError } = await (supabaseBrowserClient as any)
        .from('user_gamification')
        .update({
          experience_points: newExperiencePoints,
          total_points_earned: newTotalPoints,
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating user gamification:', updateError);
        return;
      }

      // Log the reward in activity_logs
      const rewardLog: ActivityLogInsert = {
        user_id: userId,
        activity_type: 'challenge_completed',
        summary: `🎉 Challenge Completed: ${challengeName} (+${rewardPoints} XP)`,
        details: {
          challenge_name: challengeName,
          reward_points: rewardPoints,
          completion_time: new Date().toISOString()
        } as any
      };

      await (supabaseBrowserClient as any)
        .from('activity_logs')
        .insert(rewardLog);

    } catch (error) {
      console.error('Error awarding challenge reward:', error);
    }
  }

  /**
   * Generate daily challenges for user
   */
  async generateDailyChallenges(userId: string): Promise<ChallengeConfig[]> {
    const availableChallenges = await this.getAvailableChallenges(userId);
    const dailyChallenges = availableChallenges.filter(c => c.type === 'daily');
    
    // Return 2-3 random daily challenges
    const shuffled = dailyChallenges.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  }

  /**
   * Clean up expired challenges
   */
  async cleanupExpiredChallenges(): Promise<void> {
    const { error } = await (supabaseBrowserClient as any)
      .from('activity_logs')
      .update({
        details: {
          status: 'expired'
        } as any
      })
      .eq('activity_type', 'challenge_started')
      .lt('details->expires_at', new Date().toISOString())
      .eq('details->status', 'active');

    if (error) {
      console.error('Error cleaning up expired challenges:', error);
    }
  }

  /**
   * Get user profile for challenge requirements
   */
  private async getUserProfile(userId: string): Promise<UserGamification | null> {
    const { data, error } = await supabaseBrowserClient
      .from('user_gamification')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  }

  /**
   * Check if user completed all daily challenges
   */
  async checkDailyChallengeCompletion(userId: string): Promise<boolean> {
    const { data: challengeLogs, error } = await supabaseBrowserClient
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('activity_type', 'challenge_started')
      .eq('details->challenge_type', 'daily')
      .eq('details->status', 'active');

    if (error || !challengeLogs || challengeLogs.length === 0) {
      return false;
    }

    return challengeLogs.every((log: any) => {
      const challengeData = log.details as UserChallenge;
      return (challengeData.current_value || 0) >= challengeData.target_value;
    });
  }

  /**
   * Get challenge progress for display
   */
  async getChallengeProgress(userId: string, challengeConfigId: string): Promise<{ current: number; target: number; percentage: number; completed: boolean }> {
    const activeChallenges = await this.getActiveChallenges(userId);
    const challenge = activeChallenges.find(c => c.challenge_config_id === challengeConfigId);
    
    if (!challenge) {
      return { current: 0, target: 0, percentage: 0, completed: false };
    }

    const current = challenge.current_value || 0;
    const target = challenge.target_value || 0;
    const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
    const completed = current >= target;

    return { current, target, percentage, completed };
  }
}

export const challengesSystem = ChallengesSystem.getInstance();