'use server';

import { aiDataService, type AIUserProfile, type AIContextOptions } from './ai-data-centralization';
import { format, parseISO } from 'date-fns';

export type ContextType = 'minimal' | 'standard' | 'comprehensive';

/**
 * Enhanced AI Context Builder using Centralized Data Service
 * Replaces the previous context builder that made multiple individual queries
 */
export class EnhancedAIContextBuilder {
  /**
   * Build comprehensive AI context using centralized data service
   */
  static async buildFullAIContext(
    userId: string, 
    contextType: ContextType = 'standard',
    options: AIContextOptions = {}
  ): Promise<string> {
    try {
      console.log(`[EnhancedAIContextBuilder] Building ${contextType} context for user: ${userId}`);
      
      // Get the comprehensive user profile in a single call
      const aiProfile = await aiDataService.getAIUserProfile(userId, options);
      
      if (!aiProfile) {
        return "# AI Context\n- Unable to fetch user profile data.\n";
      }

      const today = new Date();
      const contextParts: string[] = [];

      // Minimal context (always included)
      contextParts.push(this.buildBasicInfoContext(aiProfile));
      contextParts.push(this.buildDailyContext(aiProfile, today));
      contextParts.push(this.buildGamificationContext(aiProfile));

      if (contextType === 'standard' || contextType === 'comprehensive') {
        contextParts.push(this.buildSubjectProgressContext(aiProfile));
        contextParts.push(this.buildStudyPatternsContext(aiProfile));
        contextParts.push(this.buildRevisionQueueContext(aiProfile));
        contextParts.push(this.buildPerformanceMetricsContext(aiProfile));
      }

      if (contextType === 'comprehensive') {
        contextParts.push(this.buildDetailedActivityContext(aiProfile));
        contextParts.push(this.buildPersonalizationContext(aiProfile));
      }

      return contextParts.filter(part => part.length > 0).join('\n\n');

    } catch (error) {
      console.error('[EnhancedAIContextBuilder] Error building context:', error);
      return "# AI Context\n- Error loading user data.\n";
    }
  }

  /**
   * Build minimal context for quick AI responses
   */
  static async buildMinimalContext(userId: string): Promise<string> {
    const options: AIContextOptions = { timeRange: 'today' };
    const aiProfile = await aiDataService.getAIUserProfile(userId, options);
    
    if (!aiProfile) return "# Minimal Context\n- No data available.\n";

    return [
      `# User Overview`,
      `Name: ${aiProfile.basicInfo.fullName || 'Student'}`,
      `Level: ${aiProfile.gamification.currentLevel} (${aiProfile.gamification.currentStreak} day streak)`,
      `Points: ${aiProfile.gamification.totalPoints}`,
      `Subjects: ${aiProfile.subjects.length} active`,
      '',
      `# Today's Activity`,
      `Recent study time and progress data would be displayed here.`,
      '',
      `# Quick Suggestions`,
      `Based on your current study patterns and goals.`
    ].join('\n');
  }

  /**
   * Get context for specific AI use case
   */
  static async buildStudyPlanContext(userId: string): Promise<string> {
    const options: AIContextOptions = { 
      includeDetailedPatterns: true,
      timeRange: 'month',
      focusAreas: ['study_planning', 'revision_management']
    };

    const context = await this.buildFullAIContext(userId, 'comprehensive', options);
    
    return `${context}\n\n# Study Plan Specific Context\n- Focus areas: optimal study scheduling, difficulty progression, subject prioritization\n- Consider: available time slots, energy patterns, exam preparation timelines\n- Include: learning style preferences, weak areas identification, strength building`;
  }

  static async buildPerformanceAnalysisContext(userId: string): Promise<string> {
    const options: AIContextOptions = { 
      includePersonalization: true,
      timeRange: 'month'
    };

    const context = await this.buildFullAIContext(userId, 'comprehensive', options);
    
    return `${context}\n\n# Performance Analysis Context\n- Analyze: study efficiency, learning speed, retention rates\n- Compare: performance trends, peer benchmarks, historical data\n- Identify: improvement opportunities, learning bottlenecks, optimization strategies`;
  }

  // Private helper methods
  private static buildBasicInfoContext(aiProfile: AIUserProfile): string {
    return [
      `# User Profile`,
      `**Name:** ${aiProfile.basicInfo.fullName || 'Student'}`,
      `**Email:** ${aiProfile.basicInfo.email}`,
      `**Member Since:** ${format(parseISO(aiProfile.basicInfo.createdAt), 'MMM dd, yyyy')}`,
      `**Last Active:** ${format(parseISO(aiProfile.basicInfo.lastActiveAt), 'MMM dd, HH:mm')}`
    ].join('\n');
  }

  private static buildDailyContext(aiProfile: AIUserProfile, today: Date): string {
    const todayActivity = aiProfile.recentActivity.find(a => a.date === today.toISOString().split('T')[0]);
    
    return [
      `# Today's Summary - ${format(today, 'EEEE, MMMM dd, yyyy')}`,
      `**Study Time:** ${todayActivity ? (todayActivity.studyMinutes / 60).toFixed(1) : '0'} hours`,
      `**Blocks Completed:** ${todayActivity ? todayActivity.blocksCompleted : 0}`,
      `**Topics Studied:** ${todayActivity ? todayActivity.topicsStudied : 0}`,
      `**Points Net:** ${todayActivity ? (todayActivity.pointsEarned - todayActivity.pointsLost) : 0}`,
      '',
      todayActivity?.highlights?.length ? 
        `**Highlights:**\n${todayActivity.highlights.map(h => `- ${h}`).join('\n')}` : 
        '**Highlights:** None recorded',
      '',
      todayActivity?.concerns?.length ? 
        `**Areas for Improvement:**\n${todayActivity.concerns.map(c => `- ${c}`).join('\n')}` : 
        '**Areas for Improvement:** None identified'
    ].join('\n');
  }

  private static buildGamificationContext(aiProfile: AIUserProfile): string {
    return [
      `# Gamification Status`,
      `**Current Level:** ${aiProfile.gamification.currentLevel}`,
      `**Current Streak:** ${aiProfile.gamification.currentStreak} days`,
      `**Longest Streak:** ${aiProfile.gamification.longestStreak} days`,
      `**Total Points:** ${aiProfile.gamification.totalPoints}`,
      `**Topics Completed:** ${aiProfile.gamification.totalTopicsCompleted}`,
      `**Badges Earned:** ${aiProfile.gamification.badgesEarned.length > 0 ? aiProfile.gamification.badgesEarned.join(', ') : 'None yet'}`
    ].join('\n');
  }

  private static buildSubjectProgressContext(aiProfile: AIUserProfile): string {
    if (aiProfile.subjects.length === 0) {
      return `# Subject Progress\n- No subjects added yet.`;
    }

    const subjectBreakdown = aiProfile.subjects.map(subject => {
      const completionRate = subject.totalTopics > 0 
        ? Math.round((subject.completedTopics / subject.totalTopics) * 100) 
        : 0;
      
      return [
        `**${subject.name}** (${subject.category})`,
        `  - Progress: ${subject.completedTopics}/${subject.totalTopics} topics (${completionRate}%)`,
        `  - Chapters: ${subject.completedChapters}/${subject.totalChapters} completed`,
        `  - Currently studying: ${subject.inProgressTopics} topics`,
        ''
      ].join('\n');
    }).join('');

    return [
      `# Subject Progress Overview`,
      subjectBreakdown,
      `**Total Subjects:** ${aiProfile.subjects.length} | **Overall Completion:** ${this.calculateOverallProgress(aiProfile.subjects)}%`
    ].join('\n');
  }

  private static buildStudyPatternsContext(aiProfile: AIUserProfile): string {
    return [
      `# Study Patterns & Preferences`,
      `**Most Productive Time:** ${aiProfile.studyPatterns.mostProductiveTime}`,
      `**Favorite Subject:** ${aiProfile.studyPatterns.favoriteSubject}`,
      `**Average Session:** ${aiProfile.studyPatterns.averageSessionDuration} minutes`,
      `**Study Consistency:** ${aiProfile.performanceMetrics.studyConsistency}%`,
      '',
      `**Weekly Study Hours:** ${aiProfile.performanceMetrics.weeklyStudyHours}h`,
      `**Monthly Topics Completed:** ${aiProfile.performanceMetrics.monthlyTopicsCompleted}`
    ].join('\n');
  }

  private static buildRevisionQueueContext(aiProfile: AIUserProfile): string {
    const urgentTopics = aiProfile.revisionQueue.topicsDue.slice(0, 5);
    
    return [
      `# Revision Queue Status`,
      `**Overdue:** ${aiProfile.revisionQueue.overdueCount} topics`,
      `**Due Today:** ${aiProfile.revisionQueue.dueTodayCount} topics`,
      `**High Priority:** ${aiProfile.revisionQueue.highPriorityCount} topics`,
      '',
      urgentTopics.length > 0 ? [
        `**Next Up:**`,
        ...urgentTopics.map(topic => 
          `- ${topic.name} (${topic.subject}) - ${topic.priority} priority`
        )
      ].join('\n') : '**No urgent revisions pending**'
    ].join('\n');
  }

  private static buildPerformanceMetricsContext(aiProfile: AIUserProfile): string {
    return [
      `# Performance Metrics`,
      `**Study Consistency:** ${aiProfile.performanceMetrics.studyConsistency}%`,
      `**Weekly Study Hours:** ${aiProfile.performanceMetrics.weeklyStudyHours}`,
      `**Topics This Month:** ${aiProfile.performanceMetrics.monthlyTopicsCompleted}`,
      `**Question Accuracy:** ${aiProfile.performanceMetrics.questionAccuracy}%`
    ].join('\n');
  }

  private static buildDetailedActivityContext(aiProfile: AIUserProfile): string {
    const recentDays = aiProfile.recentActivity.slice(0, 5);
    
    const activityBreakdown = recentDays.map(day => 
      `[${format(parseISO(day.date), 'MMM dd')}] ${(day.studyMinutes / 60).toFixed(1)}h | ${day.blocksCompleted} blocks | ${day.topicsStudied} topics | ${day.pointsEarned - day.pointsLost} points`
    ).join('\n');

    return [
      `# Recent Activity (Last 5 Days)`,
      activityBreakdown
    ].join('\n');
  }

  private static buildPersonalizationContext(aiProfile: AIUserProfile): string {
    const strengths = aiProfile.subjects
      .filter(s => s.totalTopics > 0 && (s.completedTopics / s.totalTopics) > 0.7)
      .map(s => s.name);

    const improvementAreas = aiProfile.subjects
      .filter(s => s.totalTopics > 0 && (s.completedTopics / s.totalTopics) < 0.3)
      .map(s => s.name);

    return [
      `# Personalization Insights`,
      `**Strengths:** ${strengths.length > 0 ? strengths.join(', ') : 'Building foundation'}`,
      `**Focus Areas:** ${improvementAreas.length > 0 ? improvementAreas.join(', ') : 'Diversified approach'}`,
      `**Learning Style:** ${aiProfile.studyPatterns.mostProductiveTime} schedule preference`,
      `**Engagement Level:** ${aiProfile.gamification.currentStreak > 7 ? 'High' : aiProfile.gamification.currentStreak > 3 ? 'Moderate' : 'Building'}`
    ].join('\n');
  }

  private static calculateOverallProgress(subjects: AIUserProfile['subjects']): number {
    if (subjects.length === 0) return 0;
    
    const totalTopics = subjects.reduce((sum, s) => sum + s.totalTopics, 0);
    const completedTopics = subjects.reduce((sum, s) => sum + s.completedTopics, 0);
    
    return totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
  }
}

// Export the main function
export async function buildFullAIContext(userId: string, contextType: ContextType = 'standard'): Promise<string> {
  return EnhancedAIContextBuilder.buildFullAIContext(userId, contextType);
}

// Export specialized context builders
export async function buildStudyPlanContext(userId: string): Promise<string> {
  return EnhancedAIContextBuilder.buildStudyPlanContext(userId);
}

export async function buildPerformanceAnalysisContext(userId: string): Promise<string> {
  return EnhancedAIContextBuilder.buildPerformanceAnalysisContext(userId);
}

export async function buildMinimalContext(userId: string): Promise<string> {
  return EnhancedAIContextBuilder.buildMinimalContext(userId);
}