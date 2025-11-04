'use server';

import { supabaseBrowserClient } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

// Type definitions for centralized AI data
export interface AIUserProfile {
  userId: string;
  basicInfo: {
    email: string;
    fullName: string | null;
    createdAt: string;
    lastActiveAt: string;
  };
  gamification: {
    currentStreak: number;
    longestStreak: number;
    currentLevel: number;
    totalPoints: number;
    badgesEarned: string[];
    totalTopicsCompleted: number;
  };
  subjects: {
    id: number;
    name: string;
    color: string;
    category: string;
    totalChapters: number;
    completedChapters: number;
    totalTopics: number;
    completedTopics: number;
    inProgressTopics: number;
  }[];
  recentActivity: {
    date: string;
    studyMinutes: number;
    blocksCompleted: number;
    topicsStudied: number;
    pointsEarned: number;
    pointsLost: number;
    highlights: string[];
    concerns: string[];
  }[];
  studyPatterns: {
    mostProductiveTime: string;
    favoriteSubject: string;
    averageSessionDuration: number;
    studyStreak: number;
  };
  revisionQueue: {
    overdueCount: number;
    dueTodayCount: number;
    highPriorityCount: number;
    topicsDue: {
      id: number;
      name: string;
      dueDate: string;
      priority: string;
      subject: string;
    }[];
  };
  performanceMetrics: {
    weeklyStudyHours: number;
    monthlyTopicsCompleted: number;
    questionAccuracy: number;
    studyConsistency: number;
  };
}

export interface AIContextOptions {
  includeDetailedPatterns?: boolean;
  includePersonalization?: boolean;
  timeRange?: 'today' | 'week' | 'month' | 'quarter';
  focusAreas?: string[];
}

/**
 * Centralized AI Data Aggregation Service
 * Provides a single point of access for all AI-related data queries
 */
export class AICentralizedDataService {
  private static instance: AICentralizedDataService;
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static getInstance(): AICentralizedDataService {
    if (!AICentralizedDataService.instance) {
      AICentralizedDataService.instance = new AICentralizedDataService();
    }
    return AICentralizedDataService.instance;
  }

  private getCacheKey(userId: string, type: string, options?: AIContextOptions): string {
    return `${userId}:${type}:${JSON.stringify(options || {})}`;
  }

  private setCache(key: string, data: any, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_CACHE_TTL
    });
  }

  private getCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Get comprehensive user profile for AI analysis
   */
  async getAIUserProfile(userId: string, options: AIContextOptions = {}): Promise<AIUserProfile | null> {
    const cacheKey = this.getCacheKey(userId, 'userProfile', options);
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      // Use a single optimized query with joins
      const { data: profileData, error } = await supabaseBrowserClient
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          created_at,
          user_gamification:user_gamification!inner(
            current_streak,
            longest_streak,
            current_level,
            total_points_earned,
            badges_earned,
            total_topics_completed,
            last_activity_date
          ),
          subjects:subjects(
            id,
            name,
            color,
            category,
            chapters:chapters(
              id,
              topics:topics(
                id,
                status
              )
            )
          ),
          daily_summaries:daily_activity_summary(
            date,
            total_study_minutes,
            blocks_completed_count,
            points_earned,
            highlights,
            concerns
          )
        `)
        .eq('id', userId)
        .single();

      if (error || !profileData) {
        console.error('[AICentralizedDataService] Error fetching user profile:', error);
        return null;
      }

      // Process and structure the data
      const aiProfile: AIUserProfile = {
        userId,
        basicInfo: {
          email: profileData.email,
          fullName: profileData.full_name,
          createdAt: profileData.created_at,
          lastActiveAt: profileData.user_gamification?.last_activity_date || profileData.created_at
        },
        gamification: {
          currentStreak: profileData.user_gamification?.current_streak || 0,
          longestStreak: profileData.user_gamification?.longest_streak || 0,
          currentLevel: profileData.user_gamification?.current_level || 1,
          totalPoints: profileData.user_gamification?.total_points_earned || 0,
          badgesEarned: Array.isArray(profileData.user_gamification?.badges_earned) 
            ? profileData.user_gamification.badges_earned as string[] 
            : [],
          totalTopicsCompleted: profileData.user_gamification?.total_topics_completed || 0
        },
        subjects: this.processSubjectsData(profileData.subjects || []),
        recentActivity: this.processRecentActivity(profileData.daily_summaries || []),
        studyPatterns: await this.getStudyPatterns(userId, options.timeRange || 'month'),
        revisionQueue: await this.getRevisionQueueData(userId),
        performanceMetrics: await this.getPerformanceMetrics(userId, options.timeRange || 'month')
      };

      this.setCache(cacheKey, aiProfile);
      return aiProfile;

    } catch (error) {
      console.error('[AICentralizedDataService] Error in getAIUserProfile:', error);
      return null;
    }
  }

  /**
   * Get daily context for AI with single query
   */
  async getDailyAIContext(userId: string, date: Date): Promise<any> {
    const cacheKey = this.getCacheKey(userId, 'dailyContext', { timeRange: 'today' });
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabaseBrowserClient
        .from('daily_activity_summary')
        .select(`
          *,
          activity_logs:activity_logs(
            summary,
            activity_type,
            created_at
          )
        `)
        .eq('user_id', userId)
        .eq('date', date.toISOString().split('T')[0])
        .single();

      if (error || !data) {
        return {
          date: date.toISOString().split('T')[0],
          studyTime: 0,
          blocksCompleted: 0,
          topicsStudied: 0,
          activities: [],
          highlights: [],
          concerns: []
        };
      }

      const dailyContext = {
        date: data.date,
        studyTime: data.total_study_minutes,
        blocksCompleted: data.blocks_completed_count,
        currentStreak: data.current_streak,
        pointsEarned: data.points_earned,
        activities: (data.activity_logs || []).map((log: any) => ({
          type: log.activity_type,
          summary: log.summary,
          timestamp: log.created_at
        })),
        highlights: Array.isArray(data.highlights) ? data.highlights : [],
        concerns: Array.isArray(data.concerns) ? data.concerns : []
      };

      this.setCache(cacheKey, dailyContext);
      return dailyContext;

    } catch (error) {
      console.error('[AICentralizedDataService] Error in getDailyAIContext:', error);
      return null;
    }
  }

  /**
   * Get study patterns analysis with optimized queries
   */
  async getStudyPatterns(userId: string, timeRange: string = 'month'): Promise<any> {
    try {
      const daysBack = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const { data: blocks, error } = await supabaseBrowserClient
        .from('blocks')
        .select(`
          start_time,
          duration,
          subject:subjects(name),
          status
        `)
        .eq('user_id', userId)
        .gte('date', startDate.toISOString())
        .eq('status', 'completed');

      if (error || !blocks) {
        return {
          mostProductiveTime: 'Unknown',
          favoriteSubject: 'None',
          averageSessionDuration: 0,
          studyStreak: 0
        };
      }

      // Analyze patterns
      const timeOfDayCounts: Record<string, number> = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };
      const subjectCounts: Record<string, number> = {};
      let totalDuration = 0;

      blocks.forEach((block: any) => {
        const hour = parseInt(block.start_time.split(':')[0], 10);
        if (hour >= 6 && hour < 12) timeOfDayCounts.Morning++;
        else if (hour >= 12 && hour < 17) timeOfDayCounts.Afternoon++;
        else if (hour >= 17 && hour < 21) timeOfDayCounts['Evening']++;
        else timeOfDayCounts['Night']++;

        if (block.subject?.name) {
          subjectCounts[block.subject.name] = (subjectCounts[block.subject.name] || 0) + 1;
        }

        totalDuration += block.duration;
      });

      return {
        mostProductiveTime: Object.entries(timeOfDayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown',
        favoriteSubject: Object.entries(subjectCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None',
        averageSessionDuration: blocks.length > 0 ? Math.round(totalDuration / blocks.length) : 0,
        studyStreak: await this.calculateStudyStreak(userId)
      };

    } catch (error) {
      console.error('[AICentralizedDataService] Error in getStudyPatterns:', error);
      return null;
    }
  }

  /**
   * Get revision queue data with priority sorting
   */
  async getRevisionQueueData(userId: string): Promise<any> {
    try {
      const { data: revisionTopics, error } = await supabaseBrowserClient
        .from('revision_topics')
        .select(`
          *,
          topic:topics(
            name,
            chapter:chapters(
              subject:subjects(name)
            )
          )
        `)
        .eq('user_id', userId)
        .eq('is_completed', false)
        .order('priority', { ascending: false })
        .order('due_date', { ascending: true });

      if (error || !revisionTopics) {
        return {
          overdueCount: 0,
          dueTodayCount: 0,
          highPriorityCount: 0,
          topicsDue: []
        };
      }

      const today = new Date().toISOString().split('T')[0];
      const overdueCount = revisionTopics.filter(rt => rt.due_date < today).length;
      const dueTodayCount = revisionTopics.filter(rt => rt.due_date === today).length;
      const highPriorityCount = revisionTopics.filter(rt => rt.priority === 'high' || rt.priority === 'critical').length;

      return {
        overdueCount,
        dueTodayCount,
        highPriorityCount,
        topicsDue: revisionTopics.slice(0, 10).map(rt => ({
          id: rt.topic_id,
          name: rt.topic?.name || 'Unknown Topic',
          dueDate: rt.due_date,
          priority: rt.priority,
          subject: rt.topic?.chapter?.subject?.name || 'Unknown Subject'
        }))
      };

    } catch (error) {
      console.error('[AICentralizedDataService] Error in getRevisionQueueData:', error);
      return null;
    }
  }

  /**
   * Get performance metrics for AI analysis
   */
  async getPerformanceMetrics(userId: string, timeRange: string): Promise<any> {
    try {
      const daysBack = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const { data: dailyData, error } = await supabaseBrowserClient
        .from('daily_activity_summary')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate.toISOString());

      if (error || !dailyData) {
        return {
          weeklyStudyHours: 0,
          monthlyTopicsCompleted: 0,
          questionAccuracy: 0,
          studyConsistency: 0
        };
      }

      const totalStudyMinutes = dailyData.reduce((sum, day) => sum + (day.total_study_minutes || 0), 0);
      const weeklyStudyHours = totalStudyMinutes / 60;
      const activeDays = dailyData.filter(day => (day.total_study_minutes || 0) > 0).length;
      const studyConsistency = (activeDays / dailyData.length) * 100;

      // Get topics completed in the period
      const { data: completedTopics, error: topicsError } = await supabaseBrowserClient
        .from('topics')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('updated_at', startDate.toISOString());

      return {
        weeklyStudyHours: Math.round(weeklyStudyHours * 10) / 10,
        monthlyTopicsCompleted: completedTopics?.length || 0,
        questionAccuracy: 0, // Would need question attempt data
        studyConsistency: Math.round(studyConsistency)
      };

    } catch (error) {
      console.error('[AICentralizedDataService] Error in getPerformanceMetrics:', error);
      return null;
    }
  }

  // Helper methods
  private processSubjectsData(subjects: any[]): AIUserProfile['subjects'] {
    return subjects.map(subject => {
      const totalChapters = subject.chapters?.length || 0;
      const completedChapters = subject.chapters?.filter((ch: any) => 
        ch.topics?.every((t: any) => t.status === 'completed')
      ).length || 0;
      
      const allTopics = subject.chapters?.flatMap((ch: any) => ch.topics || []) || [];
      const completedTopics = allTopics.filter((t: any) => t.status === 'completed').length;
      const inProgressTopics = allTopics.filter((t: any) => t.status === 'in_progress').length;

      return {
        id: subject.id,
        name: subject.name,
        color: subject.color,
        category: subject.category,
        totalChapters,
        completedChapters,
        totalTopics: allTopics.length,
        completedTopics,
        inProgressTopics
      };
    });
  }

  private processRecentActivity(summaries: any[]): AIUserProfile['recentActivity'] {
    return summaries
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 7)
      .map(summary => ({
        date: summary.date,
        studyMinutes: summary.total_study_minutes || 0,
        blocksCompleted: summary.blocks_completed_count || 0,
        topicsStudied: summary.topics_studied_count || 0,
        pointsEarned: summary.points_earned || 0,
        pointsLost: summary.points_lost || 0,
        highlights: Array.isArray(summary.highlights) ? summary.highlights : [],
        concerns: Array.isArray(summary.concerns) ? summary.concerns : []
      }));
  }

  private async calculateStudyStreak(userId: string): Promise<number> {
    // Simplified streak calculation - would need more complex logic for accurate results
    const { data: gamification } = await supabaseBrowserClient
      .from('user_gamification')
      .select('current_streak')
      .eq('user_id', userId)
      .single();

    return gamification?.current_streak || 0;
  }

  /**
   * Invalidate cache for a user
   */
  invalidateUserCache(userId: string): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.startsWith(userId + ':')) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const aiDataService = AICentralizedDataService.getInstance();