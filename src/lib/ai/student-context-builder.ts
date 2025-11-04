// Student Context Builder with Ultra-Profile Compression
// ====================================================

import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type Subject = Database['public']['Tables']['subjects']['Row'];
type Topic = Database['public']['Tables']['topics']['Row'];
type Block = Database['public']['Tables']['blocks']['Row'];
type DailyActivity = Database['public']['Tables']['daily_activity_summary']['Row'];
type UserGamification = Database['public']['Tables']['user_gamification']['Row'];
type RevisionTopic = Database['public']['Tables']['revision_topics']['Row'];
type ActivityLog = Database['public']['Tables']['activity_logs']['Row'];

export interface StudentStudyContext {
  userId: string;
  profileText: string; // Ultra-compressed profile (max 200 chars)
  strongSubjects: string[];
  weakSubjects: string[];
  recentActivity: {
    lastStudySession?: Date;
    questionsAnswered: number;
    correctAnswers: number;
    topicsStruggled: string[];
    topicsStrong: string[];
  };
  studyProgress: {
    totalTopics: number;
    completedTopics: number;
    accuracy: number;
    subjectsStudied: string[];
    timeSpent: number; // in hours
  };
  preferences: {
    difficulty: 'Easy' | 'Medium' | 'Hard';
    subjects: string[];
    studyGoals: string[];
  };
  currentData: {
    streak: number;
    level: number;
    points: number;
    revisionQueue: number;
    pendingTopics: string[];
  };
  examTarget?: string;
  learningStyle?: string;
}

export interface ContextLevel {
  level: 1 | 2 | 3 | 4;
  name: 'Light' | 'Recent' | 'Selective' | 'Full';
  tokenEstimate: number;
  description: string;
}

/**
 * Student Context Builder Service
 * Fetches comprehensive student data and creates ultra-compressed profiles for AI context
 */
export class StudentContextBuilder {
  private static readonly ULTRA_PROFILE_MAX_LENGTH = 200;
  private static readonly CONTEXT_LEVELS: ContextLevel[] = [
    { level: 1, name: 'Light', tokenEstimate: 20, description: 'Basic student profile only' },
    { level: 2, name: 'Recent', tokenEstimate: 75, description: 'Profile + this week summary' },
    { level: 3, name: 'Selective', tokenEstimate: 150, description: 'Profile + recent memories' },
    { level: 4, name: 'Full', tokenEstimate: 300, description: 'Complete context with all data' }
  ];

  /**
   * Main function to build full AI context for a student
   */
  async buildFullAIContext(userId?: string, level: 1 | 2 | 3 | 4 = 2): Promise<StudentStudyContext> {
    const targetUserId = userId || await this.getCurrentUserId();
    
    if (!targetUserId) {
      throw new Error('No authenticated user found');
    }

    // Fetch all student data in parallel
    const [
      subjects,
      topics,
      dailyActivity,
      gamification,
      revisionTopics,
      recentBlocks,
      activityLogs
    ] = await Promise.all([
      this.fetchSubjects(targetUserId),
      this.fetchTopics(targetUserId),
      this.fetchDailyActivity(targetUserId),
      this.fetchGamification(targetUserId),
      this.fetchRevisionTopics(targetUserId),
      this.fetchRecentBlocks(targetUserId),
      this.fetchActivityLogs(targetUserId)
    ]);

    // Analyze and compress data
    const studyProgress = this.analyzeStudyProgress(topics, recentBlocks);
    const strongWeakSubjects = this.analyzeStrongWeakSubjects(topics, subjects);
    const recentActivity = this.analyzeRecentActivity(recentBlocks, activityLogs, topics);
    const currentData = this.analyzeCurrentData(gamification, revisionTopics);

    // Generate ultra-compressed profile
    const profileText = this.generateUltraProfile(
      studyProgress,
      strongWeakSubjects,
      currentData,
      recentActivity
    );

    return {
      userId: targetUserId,
      profileText,
      strongSubjects: strongWeakSubjects.strong,
      weakSubjects: strongWeakSubjects.weak,
      recentActivity,
      studyProgress,
      preferences: this.analyzePreferences(subjects, topics),
      currentData,
      examTarget: this.detectExamTarget(subjects),
      learningStyle: this.detectLearningStyle(activityLogs, recentBlocks)
    };
  }

  /**
   * Build context for specific context level
   */
  async buildContextByLevel(userId: string, level: 1 | 2 | 3 | 4): Promise<string> {
    const context = await this.buildFullAIContext(userId, level);
    
    switch (level) {
      case 1:
        return this.buildLightContext(context);
      case 2:
        return this.buildRecentContext(context);
      case 3:
        return this.buildSelectiveContext(context);
      case 4:
        return this.buildFullContext(context);
      default:
        return this.buildRecentContext(context);
    }
  }

  /**
   * Determine optimal context level based on question complexity
   */
  determineOptimalContextLevel(question: string, hasMemoryContext: boolean = false): 1 | 2 | 3 | 4 {
    const personalIndicators = ['mera', 'my', 'performance', 'progress', 'kaise chal raha'];
    const analysisIndicators = ['analysis', 'trend', 'compare', 'vs', 'over time'];
    const complexIndicators = ['detailed', 'complete', 'thorough', 'comprehensive'];
    
    const isPersonal = personalIndicators.some(indicator => 
      question.toLowerCase().includes(indicator)
    );
    
    const needsAnalysis = analysisIndicators.some(indicator => 
      question.toLowerCase().includes(indicator)
    );
    
    const isComplex = complexIndicators.some(indicator => 
      question.toLowerCase().includes(indicator)
    );

    if (isComplex || (needsAnalysis && hasMemoryContext)) {
      return 4; // Full context
    } else if (needsAnalysis || isPersonal) {
      return 3; // Selective context
    } else if (isPersonal) {
      return 2; // Recent context
    } else {
      return 1; // Light context
    }
  }

  /**
   * Fetch student subjects
   */
  private async fetchSubjects(userId: string): Promise<Subject[]> {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to fetch subjects: ${error.message}`);
    return data || [];
  }

  /**
   * Fetch student topics with performance data
   */
  private async fetchTopics(userId: string): Promise<Topic[]> {
    const { data, error } = await supabase
      .from('topics')
      .select(`
        *,
        subjects(name, color, category),
        chapters(name, category)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch topics: ${error.message}`);
    return data || [];
  }

  /**
   * Fetch recent daily activity summary
   */
  private async fetchDailyActivity(userId: string): Promise<DailyActivity[]> {
    const { data, error } = await supabase
      .from('daily_activity_summary')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(7); // Last 7 days

    if (error) throw new Error(`Failed to fetch daily activity: ${error.message}`);
    return data || [];
  }

  /**
   * Fetch user gamification data
   */
  private async fetchGamification(userId: string): Promise<UserGamification | null> {
    const { data, error } = await supabase
      .from('user_gamification')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch gamification: ${error.message}`);
    }
    return data;
  }

  /**
   * Fetch revision topics
   */
  private async fetchRevisionTopics(userId: string): Promise<RevisionTopic[]> {
    const { data, error } = await supabase
      .from('revision_topics')
      .select('*')
      .eq('user_id', userId)
      .eq('is_completed', false)
      .order('due_date', { ascending: true });

    if (error) throw new Error(`Failed to fetch revision topics: ${error.message}`);
    return data || [];
  }

  /**
   * Fetch recent study blocks
   */
  private async fetchRecentBlocks(userId: string): Promise<Block[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabase
      .from('blocks')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(20);

    if (error) throw new Error(`Failed to fetch recent blocks: ${error.message}`);
    return data || [];
  }

  /**
   * Fetch activity logs
   */
  private async fetchActivityLogs(userId: string): Promise<ActivityLog[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new Error(`Failed to fetch activity logs: ${error.message}`);
    return data || [];
  }

  /**
   * Analyze study progress from topics and blocks
   */
  private analyzeStudyProgress(topics: Topic[], blocks: Block[]) {
    const totalTopics = topics.length;
    const completedTopics = topics.filter(t => t.status === 'completed').length;
    const totalStudyMinutes = blocks.reduce((sum, block) => sum + (block.duration || 0), 0);
    const timeSpentHours = Math.round(totalStudyMinutes / 60);

    // Calculate accuracy based on completion vs creation ratio
    const accuracy = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    // Get unique subjects studied
    const subjectsStudied = [...new Set(
      topics
        .filter(t => t.status === 'completed')
        .map(t => (t.subjects as any)?.name)
        .filter(Boolean)
    )];

    return {
      totalTopics,
      completedTopics,
      accuracy,
      subjectsStudied,
      timeSpent: timeSpentHours
    };
  }

  /**
   * Analyze strong and weak subjects based on performance
   */
  private analyzeStrongWeakSubjects(topics: Topic[], subjects: Subject[]) {
    const subjectPerformance: Record<string, { completed: number; total: number }> = {};

    topics.forEach(topic => {
      const subjectName = (topic.subjects as any)?.name;
      if (!subjectName) return;

      if (!subjectPerformance[subjectName]) {
        subjectPerformance[subjectName] = { completed: 0, total: 0 };
      }

      subjectPerformance[subjectName].total++;
      if (topic.status === 'completed') {
        subjectPerformance[subjectName].completed++;
      }
    });

    // Calculate performance percentage for each subject
    const subjectPercentages = Object.entries(subjectPerformance).map(([subject, data]) => ({
      subject,
      percentage: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0
    }));

    // Sort by performance
    subjectPercentages.sort((a, b) => b.percentage - a.percentage);

    // Define strong (top 40%) and weak (bottom 40%)
    const strongThreshold = Math.ceil(subjectPercentages.length * 0.4);
    const weakThreshold = Math.floor(subjectPercentages.length * 0.6);

    const strong = subjectPercentages.slice(0, strongThreshold).map(s => s.subject);
    const weak = subjectPercentages.slice(weakThreshold).map(s => s.subject);

    return { strong, weak };
  }

  /**
   * Analyze recent activity patterns
   */
  private analyzeRecentActivity(blocks: Block[], activityLogs: ActivityLog[], topics: Topic[]) {
    const lastBlock = blocks[0];
    const lastStudySession = lastBlock ? new Date(`${lastBlock.date}T${lastBlock.start_time}`) : undefined;

    // Count questions answered (blocks of type 'Question')
    const questionBlocks = blocks.filter(b => b.type === 'Question');
    const questionsAnswered = questionBlocks.length;

    // Estimate correct answers based on completed topics
    const recentTopics = topics.filter(t => {
      const createdDate = new Date(t.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return createdDate >= weekAgo;
    });

    const correctAnswers = recentTopics.filter(t => t.status === 'completed').length;

    // Identify topics struggled with (high difficulty, not completed)
    const topicsStruggled = recentTopics
      .filter(t => t.status !== 'completed' && t.difficulty === 'Hard')
      .slice(0, 3)
      .map(t => t.name);

    // Identify topics strong in (completed, good difficulty handling)
    const topicsStrong = recentTopics
      .filter(t => t.status === 'completed')
      .slice(0, 3)
      .map(t => t.name);

    return {
      lastStudySession,
      questionsAnswered,
      correctAnswers,
      topicsStruggled,
      topicsStrong
    };
  }

  /**
   * Analyze current gamification data
   */
  private analyzeCurrentData(gamification: UserGamification | null, revisionTopics: RevisionTopic[]) {
    return {
      streak: gamification?.current_streak || 0,
      level: gamification?.level || 1,
      points: gamification?.experience_points || 0,
      revisionQueue: revisionTopics.length,
      pendingTopics: revisionTopics.slice(0, 5).map(rt => rt.topic_name)
    };
  }

  /**
   * Analyze student preferences and learning style
   */
  private analyzePreferences(subjects: Subject[], topics: Topic[]) {
    const difficultyCounts = topics.reduce((acc, topic) => {
      if (topic.difficulty) {
        acc[topic.difficulty] = (acc[topic.difficulty] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Determine preferred difficulty
    const difficulty = Object.entries(difficultyCounts).reduce((a, b) => 
      difficultyCounts[a[0]] > difficultyCounts[b[0]] ? a : b
    )?.[0] as 'Easy' | 'Medium' | 'Hard' || 'Medium';

    return {
      difficulty,
      subjects: subjects.map(s => s.name),
      studyGoals: ['Exam preparation', 'Concept clarity'] // Default goals
    };
  }

  /**
   * Detect exam target from subject categories
   */
  private detectExamTarget(subjects: Subject[]): string | undefined {
    const jeeSubjects = subjects.filter(s => s.category === 'JEE').length;
    const boardSubjects = subjects.filter(s => s.category === 'BOARDS').length;

    if (jeeSubjects > boardSubjects && jeeSubjects >= 2) {
      return 'JEE 2025';
    } else if (boardSubjects > jeeSubjects && boardSubjects >= 2) {
      return 'Board Exams 2025';
    }
    return undefined;
  }

  /**
   * Detect learning style from activity patterns
   */
  private detectLearningStyle(activityLogs: ActivityLog[], blocks: Block[]): string | undefined {
    const studyBlocks = blocks.filter(b => b.type === 'Study');
    const avgSessionDuration = studyBlocks.length > 0 
      ? studyBlocks.reduce((sum, b) => sum + (b.duration || 0), 0) / studyBlocks.length
      : 0;

    if (avgSessionDuration >= 90) {
      return 'Deep Focus';
    } else if (avgSessionDuration >= 45) {
      return 'Balanced';
    } else {
      return 'Quick Learning';
    }
  }

  /**
   * Generate ultra-compressed profile (max 200 characters)
   */
  private generateUltraProfile(
    studyProgress: any,
    strongWeakSubjects: { strong: string[]; weak: string[] },
    currentData: any,
    recentActivity: any
  ): string {
    const parts: string[] = [];

    // Exam target
    if (studyProgress.subjectsStudied.length > 0) {
      parts.push('JEE 2025');
    }

    // Subject performance
    if (strongWeakSubjects.strong.length > 0) {
      const strongText = strongWeakSubjects.strong.slice(0, 2).join(', ');
      parts.push(`Strong: ${strongText}`);
    }

    if (strongWeakSubjects.weak.length > 0) {
      const weakText = strongWeakSubjects.weak.slice(0, 2).join(', ');
      parts.push(`Weak: ${weakText}`);
    }

    // Progress stats
    parts.push(`Progress: ${studyProgress.completedTopics}/${studyProgress.totalTopics} topics`);

    // Study habits
    if (currentData.streak > 0) {
      parts.push(`${currentData.streak} day streak`);
    }

    if (studyProgress.timeSpent > 0) {
      parts.push(`${studyProgress.timeSpent}h study time`);
    }

    if (currentData.revisionQueue > 0) {
      parts.push(`${currentData.revisionQueue} topics pending revision`);
    }

    // Join and compress
    let profile = parts.join('. ');
    
    if (profile.length > StudentContextBuilder.ULTRA_PROFILE_MAX_LENGTH) {
      // Prioritize most important information
      const prioritizedParts = [
        'JEE 2025',
        `Progress: ${studyProgress.completedTopics}/${studyProgress.totalTopics}`,
        strongWeakSubjects.strong.length > 0 ? `Strong: ${strongWeakSubjects.strong[0]}` : '',
        strongWeakSubjects.weak.length > 0 ? `Weak: ${strongWeakSubjects.weak[0]}` : '',
        currentData.streak > 0 ? `${currentData.streak} day streak` : ''
      ].filter(Boolean);

      profile = prioritizedParts.join('. ');
      
      // Final trim if still too long
      if (profile.length > StudentContextBuilder.ULTRA_PROFILE_MAX_LENGTH) {
        profile = profile.substring(0, StudentContextBuilder.ULTRA_PROFILE_MAX_LENGTH - 3) + '...';
      }
    }

    return profile;
  }

  /**
   * Build context for each level
   */
  private buildLightContext(context: StudentStudyContext): string {
    return `Student Profile: ${context.profileText}`;
  }

  private buildRecentContext(context: StudentStudyContext): string {
    return `Student Profile: ${context.profileText}

Recent Activity:
- Last study: ${context.recentActivity.lastStudySession?.toLocaleDateString() || 'Not available'}
- Questions answered this week: ${context.recentActivity.questionsAnswered}
- Strong topics: ${context.recentActivity.topicsStrong.join(', ') || 'None'}
- Topics to improve: ${context.recentActivity.topicsStruggled.join(', ') || 'None'}`;
  }

  private buildSelectiveContext(context: StudentStudyContext): string {
    return `Student Profile: ${context.profileText}

Detailed Progress:
- Completed: ${context.studyProgress.completedTopics}/${context.studyProgress.totalTopics} topics
- Accuracy: ${context.studyProgress.accuracy}%
- Time spent: ${context.studyProgress.timeSpent} hours
- Current streak: ${context.currentData.streak} days
- Level: ${context.currentData.level}

Strong Areas: ${context.strongSubjects.join(', ') || 'None identified'}
Weak Areas: ${context.weakSubjects.join(', ') || 'None identified'}
Pending Revisions: ${context.currentData.revisionQueue} topics`;
  }

  private buildFullContext(context: StudentStudyContext): string {
    return `Complete Student Context:

PROFILE: ${context.profileText}

ACADEMIC PROGRESS:
- Total Topics: ${context.studyProgress.totalTopics}
- Completed: ${context.studyProgress.completedTopics} (${context.studyProgress.accuracy}%)
- Subjects Studied: ${context.studyProgress.subjectsStudied.join(', ')}
- Time Investment: ${context.studyProgress.timeSpent} hours

PERFORMANCE ANALYSIS:
- Strong Subjects: ${context.strongSubjects.join(', ') || 'Building up'}
- Weak Subjects: ${context.weakSubjects.join(', ') || 'None identified'}
- Learning Style: ${context.learningStyle || 'Developing'}
- Exam Target: ${context.examTarget || 'General improvement'}

RECENT ACTIVITY (7 days):
- Last Study Session: ${context.recentActivity.lastStudySession?.toLocaleDateString() || 'No recent activity'}
- Questions Attempted: ${context.recentActivity.questionsAnswered}
- Correct Answers: ${context.recentActivity.correctAnswers}
- Strong Performance: ${context.recentActivity.topicsStrong.join(', ') || 'Developing'}
- Areas Needing Work: ${context.recentActivity.topicsStruggled.join(', ') || 'None'}

CURRENT STATUS:
- Study Streak: ${context.currentData.streak} days
- Current Level: ${context.currentData.level}
- Experience Points: ${context.currentData.points}
- Pending Revisions: ${context.currentData.revisionQueue}
- Next Topics: ${context.currentData.pendingTopics.join(', ') || 'None scheduled'}

PREFERENCES:
- Preferred Difficulty: ${context.preferences.difficulty}
- Focus Subjects: ${context.preferences.subjects.join(', ')}
- Study Goals: ${context.preferences.studyGoals.join(', ')}`;
  }

  /**
   * Get current authenticated user ID
   */
  private async getCurrentUserId(): Promise<string> {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }
    return user.id;
  }

  /**
   * Get available context levels
   */
  getContextLevels(): ContextLevel[] {
    return StudentContextBuilder.CONTEXT_LEVELS;
  }

  /**
   * Get ultra-profile maximum length
   */
  getUltraProfileMaxLength(): number {
    return StudentContextBuilder.ULTRA_PROFILE_MAX_LENGTH;
  }
}

// Export singleton instance
export const studentContextBuilder = new StudentContextBuilder();

// Convenience functions
export const buildStudentContext = (userId?: string, level?: 1 | 2 | 3 | 4) => 
  studentContextBuilder.buildFullAIContext(userId, level);

export const buildContextByLevel = (userId: string, level: 1 | 2 | 3 | 4) =>
  studentContextBuilder.buildContextByLevel(userId, level);

export const determineContextLevel = (question: string, hasMemoryContext?: boolean) =>
  studentContextBuilder.determineOptimalContextLevel(question, hasMemoryContext);