// Student Profile Refresh Job
// ============================

import { supabase } from '../supabase';
import type { JobResult } from './scheduler';

interface StudentProfileData {
  user_id: string;
  studyProgress: {
    totalBlocks: number;
    completedBlocks: number;
    accuracy: number;
    subjectsStudied: string[];
    timeSpent: number;
  };
  recentActivity: {
    lastStudySession: Date;
    questionsAnswered: number;
    correctAnswers: number;
    topicsStruggled: string[];
    topicsStrong: string[];
  };
  preferences: {
    difficulty: 'Easy' | 'Medium' | 'Hard';
    subjects: string[];
    studyGoals: string[];
  };
}

interface ProfileRefreshResult {
  studentsProcessed: number;
  profilesUpdated: number;
  errors: number;
  averageUpdateTime: number;
}

/**
 * Student Profile Refresh Job
 * Purpose: Keep student profiles updated with latest data
 * Schedule: Daily at 04:00 UTC
 */
export async function executeProfileRefresh(): Promise<JobResult> {
  const startTime = Date.now();
  console.log('👥 Starting student profile refresh job...');

  try {
    // Get students who were active yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = yesterday.toISOString();

    console.log(`🔍 Finding students active on ${yesterdayISO.split('T')[0]}...`);

    // Get students with recent activity
    const { data: activeStudents, error: studentsError } = await supabase
      .from('activity_logs')
      .select('user_id')
      .gte('created_at', yesterdayISO)
      .order('created_at', { ascending: false });

    if (studentsError) {
      throw new Error(`Failed to fetch active students: ${studentsError.message}`);
    }

    if (!activeStudents || activeStudents.length === 0) {
      return {
        success: true,
        message: 'Profile refresh completed - no active students found',
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
        data: {
          studentsProcessed: 0,
          profilesUpdated: 0,
          errors: 0,
          averageUpdateTime: 0
        }
      };
    }

    // Get unique user IDs
    const uniqueUserIds = [...new Set(activeStudents.map(s => s.user_id))];
    console.log(`📊 Found ${uniqueUserIds.length} active students`);

    if (uniqueUserIds.length === 0) {
      return {
        success: true,
        message: 'Profile refresh completed - no unique active students',
        executionTime: Date.now() - startTime,
        timestamp: new Date(),
        data: {
          studentsProcessed: 0,
          profilesUpdated: 0,
          errors: 0,
          averageUpdateTime: 0
        }
      };
    }

    // Process profiles in batches
    const batchSize = 50;
    let processedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const updateTimes: number[] = [];

    for (let i = 0; i < uniqueUserIds.length; i += batchSize) {
      const batch = uniqueUserIds.slice(i, i + batchSize);
      const batchStartTime = Date.now();

      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} students)...`);

      // Process each student in the batch
      for (const userId of batch) {
        try {
          const studentProfileData = await fetchStudentProfileData(userId);
          
          if (studentProfileData) {
            await updateStudentProfile(userId, studentProfileData);
            updatedCount++;
          }
          
          processedCount++;

        } catch (error) {
          errorCount++;
          console.error(`❌ Failed to refresh profile for student ${userId}:`, error);
        }
      }

      const batchTime = Date.now() - batchStartTime;
      updateTimes.push(batchTime);
      
      console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} completed in ${batchTime}ms`);
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Log profile refresh activity
    await logProfileRefreshActivity({
      studentsProcessed: processedCount,
      profilesUpdated: updatedCount,
      errors: errorCount,
      averageUpdateTime: updateTimes.length > 0 ? updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length : 0
    });

    const executionTime = Date.now() - startTime;
    const successMessage = `Refreshed profiles for ${updatedCount} active students`;

    console.log(`✅ ${successMessage}`);

    return {
      success: true,
      message: successMessage,
      executionTime,
      timestamp: new Date(),
      data: {
        studentsProcessed: processedCount,
        profilesUpdated: updatedCount,
        errors: errorCount,
        averageUpdateTime: Math.round(updateTimes.reduce((a, b) => a + b, 0) / updateTimes.length),
        successRate: Math.round((updatedCount / processedCount) * 100)
      }
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('💥 Student profile refresh failed:', error);

    await logProfileRefreshActivity({
      studentsProcessed: 0,
      profilesUpdated: 0,
      errors: 1,
      averageUpdateTime: 0,
      errorMessage
    });

    return {
      success: false,
      message: `Student profile refresh failed: ${errorMessage}`,
      executionTime,
      timestamp: new Date()
    };
  }
}

/**
 * Fetch comprehensive student profile data
 */
async function fetchStudentProfileData(userId: string): Promise<StudentProfileData | null> {
  try {
    // Fetch study progress from various tables
    const [
      blocksProgress,
      performanceStats,
      recentActivity,
      subjects
    ] = await Promise.all([
      getStudyBlocksProgress(userId),
      getPerformanceStatistics(userId),
      getRecentActivity(userId),
      getUserSubjects(userId)
    ]);

    if (!blocksProgress) {
      return null; // No data available for this student
    }

    // Calculate strong and struggling topics
    const { topicsStruggled, topicsStrong } = analyzeTopicPerformance(userId);

    // Compress profile into ultra-format (max 200 characters)
    const ultraProfile = generateUltraProfile({
      totalBlocks: blocksProgress.total,
      completedBlocks: blocksProgress.completed,
      accuracy: performanceStats?.accuracy || 0,
      strongTopics: topicsStrong,
      strugglingTopics: topicsStruggled,
      recentSubjects: subjects.slice(0, 3)
    });

    return {
      user_id: userId,
      studyProgress: {
        totalBlocks: blocksProgress.total,
        completedBlocks: blocksProgress.completed,
        accuracy: performanceStats?.accuracy || 0,
        subjectsStudied: subjects,
        timeSpent: performanceStats?.timeSpent || 0
      },
      recentActivity: {
        lastStudySession: recentActivity?.lastSession || new Date(),
        questionsAnswered: performanceStats?.questionsAnswered || 0,
        correctAnswers: performanceStats?.correctAnswers || 0,
        topicsStruggled,
        topicsStrong
      },
      preferences: {
        difficulty: determinePreferredDifficulty(topicsStrong, topicsStruggled),
        subjects: subjects.slice(0, 3), // Top 3 subjects
        studyGoals: ['Exam preparation', 'Concept clarity']
      },
      ultraProfile
    } as any;

  } catch (error) {
    console.error(`Failed to fetch profile data for student ${userId}:`, error);
    return null;
  }
}

/**
 * Get study blocks progress
 */
async function getStudyBlocksProgress(userId: string): Promise<{ total: number; completed: number } | null> {
  try {
    const { count: totalCount, error: totalError } = await supabase
      .from('blocks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: completedCount, error: completedError } = await supabase
      .from('blocks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (totalError || completedError) {
      throw new Error('Failed to fetch blocks progress');
    }

    return {
      total: totalCount || 0,
      completed: completedCount || 0
    };

  } catch (error) {
    console.warn(`Failed to get blocks progress for ${userId}:`, error);
    return null;
  }
}

/**
 * Get performance statistics
 */
async function getPerformanceStatistics(userId: string): Promise<{
  accuracy: number;
  questionsAnswered: number;
  correctAnswers: number;
  timeSpent: number;
} | null> {
  try {
    // Get from user_gamification table
    const { data: gamificationData, error: gamError } = await supabase
      .from('user_gamification')
      .select('current_level, total_topics_completed')
      .eq('user_id', userId)
      .single();

    if (gamError) {
      console.warn(`No gamification data for ${userId}:`, gamError);
    }

    // Calculate accuracy based on topics completed vs total
    const topicsCompleted = gamificationData?.total_topics_completed || 0;
    const totalQuestions = topicsCompleted * 10; // Estimate
    const correctAnswers = Math.floor(topicsCompleted * 8.5); // Estimate 85% accuracy
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    return {
      accuracy,
      questionsAnswered: totalQuestions,
      correctAnswers,
      timeSpent: topicsCompleted * 30 // Estimate 30 minutes per topic
    };

  } catch (error) {
    console.warn(`Failed to get performance stats for ${userId}:`, error);
    return null;
  }
}

/**
 * Get recent activity
 */
async function getRecentActivity(userId: string): Promise<{ lastSession: Date } | null> {
  try {
    const { data: activityData, error } = await supabase
      .from('activity_logs')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.warn(`No recent activity for ${userId}:`, error);
      return null;
    }

    return {
      lastSession: new Date(activityData.created_at)
    };

  } catch (error) {
    console.warn(`Failed to get recent activity for ${userId}:`, error);
    return null;
  }
}

/**
 * Get user subjects
 */
async function getUserSubjects(userId: string): Promise<string[]> {
  try {
    const { data: subjectsData, error } = await supabase
      .from('subjects')
      .select('name')
      .eq('user_id', userId);

    if (error) {
      console.warn(`Failed to get subjects for ${userId}:`, error);
      return [];
    }

    return subjectsData?.map(s => s.name) || [];

  } catch (error) {
    console.warn(`Failed to get subjects for ${userId}:`, error);
    return [];
  }
}

/**
 * Analyze topic performance to identify strong/struggling areas
 */
async function analyzeTopicPerformance(userId: string): Promise<{ topicsStruggled: string[]; topicsStrong: string[] }> {
  try {
    // Get topics with performance data
    const { data: topicsData, error } = await supabase
      .from('topics')
      .select('name, difficulty, status, revision_count')
      .eq('user_id', userId);

    if (error) {
      console.warn(`Failed to analyze topic performance for ${userId}:`, error);
      return { topicsStruggled: [], topicsStrong: [] };
    }

    const topicsStruggled: string[] = [];
    const topicsStrong: string[] = [];

    topicsData?.forEach(topic => {
      // Logic to determine if topic is strong or struggling
      if (topic.status === 'completed' && topic.revision_count >= 3) {
        topicsStrong.push(topic.name);
      } else if (topic.status === 'pending' && topic.difficulty === 'Hard') {
        topicsStruggled.push(topic.name);
      }
    });

    return {
      topicsStruggled: topicsStruggled.slice(0, 5), // Top 5
      topicsStrong: topicsStrong.slice(0, 5) // Top 5
    };

  } catch (error) {
    console.warn(`Failed to analyze topic performance for ${userId}:`, error);
    return { topicsStruggled: [], topicsStrong: [] };
  }
}

/**
 * Generate ultra-compressed profile (max 200 characters)
 */
function generateUltraProfile(data: {
  totalBlocks: number;
  completedBlocks: number;
  accuracy: number;
  strongTopics: string[];
  strugglingTopics: string[];
  recentSubjects: string[];
}): string {
  const completionRate = data.totalBlocks > 0 ? Math.round((data.completedBlocks / data.totalBlocks) * 100) : 0;
  
  const profile = [
    `Blocks:${completionRate}%`,
    `Acc:${data.accuracy}%`,
    `Strong:${data.strongTopics.slice(0, 2).join(',')}`,
    `Weak:${data.strugglingTopics.slice(0, 2).join(',')}`,
    `Subjects:${data.recentSubjects.slice(0, 2).join(',')}`
  ].join(' | ');

  // Truncate if too long (should be well under 200 chars)
  return profile.length > 200 ? profile.substring(0, 197) + '...' : profile;
}

/**
 * Determine preferred difficulty level
 */
function determinePreferredDifficulty(strongTopics: string[], strugglingTopics: string[]): 'Easy' | 'Medium' | 'Hard' {
  if (strongTopics.length > strugglingTopics.length) {
    return 'Hard';
  } else if (strugglingTopics.length > strongTopics.length) {
    return 'Easy';
  } else {
    return 'Medium';
  }
}

/**
 * Update student AI profile in database
 */
async function updateStudentProfile(userId: string, profileData: StudentProfileData): Promise<void> {
  try {
    const { error } = await supabase
      .from('student_ai_profile')
      .upsert({
        user_id: userId,
        study_progress: profileData.studyProgress,
        recent_activity: profileData.recentActivity,
        preferences: profileData.preferences,
        ultra_profile: (profileData as any).ultraProfile,
        last_updated: new Date().toISOString(),
        created_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id' 
      });

    if (error) {
      throw error;
    }

    console.log(`✅ Updated profile for student ${userId}`);

  } catch (error) {
    throw new Error(`Failed to update profile for ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Log profile refresh activity
 */
async function logProfileRefreshActivity(params: {
  studentsProcessed: number;
  profilesUpdated: number;
  errors: number;
  averageUpdateTime: number;
  errorMessage?: string;
}): Promise<void> {
  try {
    const { studentsProcessed, profilesUpdated, errors, averageUpdateTime, errorMessage } = params;
    
    const activitySummary = errorMessage
      ? `Profile refresh failed: ${errorMessage}`
      : `Profile refresh completed: ${profilesUpdated}/${studentsProcessed} profiles updated successfully`;

    const details = {
      studentsProcessed,
      profilesUpdated,
      errors,
      averageUpdateTime,
      successRate: studentsProcessed > 0 ? Math.round((profilesUpdated / studentsProcessed) * 100) : 0,
      errorRate: studentsProcessed > 0 ? Math.round((errors / studentsProcessed) * 100) : 0,
      jobType: 'profile-refresh',
      executionTime: new Date().toISOString()
    };

    console.log('Profile refresh activity logged:', activitySummary, details);

  } catch (error) {
    console.error('Failed to log profile refresh activity:', error);
  }
}

/**
 * Get profile refresh statistics
 */
export async function getProfileRefreshStats() {
  try {
    // Get recent profile updates
    const { data: recentProfiles, error } = await supabase
      .from('student_ai_profile')
      .select('user_id, last_updated')
      .gte('last_updated', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('last_updated', { ascending: false });

    if (error) {
      throw error;
    }

    // Get total profiles
    const { count: totalProfiles } = await supabase
      .from('student_ai_profile')
      .select('*', { count: 'exact', head: true });

    return {
      profilesUpdatedToday: recentProfiles?.length || 0,
      totalProfiles: totalProfiles || 0,
      lastRefresh: recentProfiles?.[0]?.last_updated || null,
      updateRate: totalProfiles ? Math.round(((recentProfiles?.length || 0) / totalProfiles) * 100) : 0,
      nextRefresh: getNextRefreshTime()
    };

  } catch (error) {
    console.error('Failed to get profile refresh stats:', error);
    return null;
  }
}

/**
 * Get next refresh time (daily at 04:00 UTC)
 */
function getNextRefreshTime(): string {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  tomorrow.setUTCHours(4, 0, 0, 0); // 04:00 UTC
  return tomorrow.toISOString();
}

/**
 * Force refresh all student profiles
 */
export async function forceRefreshAllProfiles(): Promise<{
  success: boolean;
  message: string;
  refreshed: number;
}> {
  try {
    console.log('🔧 Starting forced refresh of all student profiles...');
    
    // Get all users with profiles
    const { data: allProfiles, error } = await supabase
      .from('student_ai_profile')
      .select('user_id');

    if (error) throw error;

    const userIds = allProfiles?.map(p => p.user_id) || [];
    let refreshedCount = 0;

    // Refresh each profile
    for (const userId of userIds) {
      try {
        const profileData = await fetchStudentProfileData(userId);
        if (profileData) {
          await updateStudentProfile(userId, profileData);
          refreshedCount++;
        }
      } catch (error) {
        console.error(`Failed to refresh profile for ${userId}:`, error);
      }
    }

    return {
      success: true,
      message: `Force refresh completed: ${refreshedCount}/${userIds.length} profiles refreshed`,
      refreshed: refreshedCount
    };

  } catch (error) {
    return {
      success: false,
      message: `Force refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      refreshed: 0
    };
  }
}