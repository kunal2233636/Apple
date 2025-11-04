'use client';

import { supabaseBrowserClient } from '@/lib/supabase';

/**
 * @file This file defines the structure and configuration for all gamification badges,
 * including subject-specific mastery badges and advanced achievement tracking.
 */

export type BadgeType = 'session' | 'streak' | 'hours' | 'topic' | 'subject_mastery' | 'difficulty' | 'speed' | 'consistency' | 'special';

export interface Badge {
  name: string;
  type: BadgeType;
  description: string;
  icon: string;
  requirement: number;
  subject_requirement?: string; // For subject-specific badges
  difficulty_requirement?: 'Easy' | 'Medium' | 'Hard'; // For difficulty-specific badges
  category_requirement?: 'JEE' | 'BOARDS' | 'OTHERS'; // For category-specific badges
}

// Enhanced badge configurations with subject-specific mastery badges
export const BADGES_CONFIG: Badge[] = [
  // Session-based badges
  { name: "First Steps", type: 'session', description: "Complete your first study session.", icon: "🎯", requirement: 1 },
  { name: "Getting Started", type: 'session', description: "Complete 10 study sessions.", icon: "⭐", requirement: 10 },
  { name: "Dedicated Learner", type: 'session', description: "Complete 50 study sessions.", icon: "🏆", requirement: 50 },
  { name: "Session Master", type: 'session', description: "Complete 100 study sessions.", icon: "👑", requirement: 100 },
  
  // Streak badges with milestones
  { name: "Week Warrior", type: 'streak', description: "Maintain a 7-day study streak.", icon: "🔥", requirement: 7 },
  { name: "Streak Champion", type: 'streak', description: "Maintain a 30-day study streak.", icon: "💎", requirement: 30 },
  { name: "Unstoppable", type: 'streak', description: "Maintain a 100-day study streak.", icon: "🌟", requirement: 100 },
  { name: "Century Club", type: 'streak', description: "Maintain a 365-day study streak.", icon: "🚀", requirement: 365 },
  
  // Study time badges
  { name: "Night Owl", type: 'hours', description: "Study for a total of 10 hours.", icon: "🦉", requirement: 10 },
  { name: "Study Beast", type: 'hours', description: "Study for a total of 50 hours.", icon: "💪", requirement: 50 },
  { name: "Knowledge Marathoner", type: 'hours', description: "Study for a total of 200 hours.", icon: "🏃‍♂️", requirement: 200 },
  { name: "Study Legend", type: 'hours', description: "Study for a total of 500 hours.", icon: "🏅", requirement: 500 },
  
  // Topic completion badges
  { name: "Knowledge Hunter", type: 'topic', description: "Complete 25 topics.", icon: "📚", requirement: 25 },
  { name: "Topic Master", type: 'topic', description: "Complete 100 topics.", icon: "🎓", requirement: 100 },
  { name: "Topic Legend", type: 'topic', description: "Complete 500 topics.", icon: "👨‍🎓", requirement: 500 },
  { name: "Topic Emperor", type: 'topic', description: "Complete 1000 topics.", icon: "👑", requirement: 1000 },

  // Physics Subject Mastery Badges
  { name: "Physics Explorer", type: 'subject_mastery', description: "Complete 5 Physics topics.", icon: "🔭", requirement: 5, subject_requirement: "Physics" },
  { name: "Physics Scholar", type: 'subject_mastery', description: "Complete 25 Physics topics.", icon: "📐", requirement: 25, subject_requirement: "Physics" },
  { name: "Physics Master", type: 'subject_mastery', description: "Complete 50 Physics topics.", icon: "⚛️", requirement: 50, subject_requirement: "Physics" },
  { name: "Physics Expert", type: 'subject_mastery', description: "Complete 100 Physics topics.", icon: "🚀", requirement: 100, subject_requirement: "Physics" },
  
  // Chemistry Subject Mastery Badges
  { name: "Chemistry Explorer", type: 'subject_mastery', description: "Complete 5 Chemistry topics.", icon: "🧪", requirement: 5, subject_requirement: "Chemistry" },
  { name: "Chemistry Scholar", type: 'subject_mastery', description: "Complete 25 Chemistry topics.", icon: "🧬", requirement: 25, subject_requirement: "Chemistry" },
  { name: "Chemistry Master", type: 'subject_mastery', description: "Complete 50 Chemistry topics.", icon: "⚗️", requirement: 50, subject_requirement: "Chemistry" },
  { name: "Chemistry Expert", type: 'subject_mastery', description: "Complete 100 Chemistry topics.", icon: "🔬", requirement: 100, subject_requirement: "Chemistry" },
  
  // Mathematics Subject Mastery Badges
  { name: "Math Explorer", type: 'subject_mastery', description: "Complete 5 Math topics.", icon: "📊", requirement: 5, subject_requirement: "Mathematics" },
  { name: "Math Scholar", type: 'subject_mastery', description: "Complete 25 Math topics.", icon: "🧮", requirement: 25, subject_requirement: "Mathematics" },
  { name: "Math Master", type: 'subject_mastery', description: "Complete 50 Math topics.", icon: "🎯", requirement: 50, subject_requirement: "Mathematics" },
  { name: "Math Expert", type: 'subject_mastery', description: "Complete 100 Math topics.", icon: "🧠", requirement: 100, subject_requirement: "Mathematics" },

  // Difficulty-based badges
  { name: "Easy Winner", type: 'difficulty', description: "Complete 50 Easy difficulty topics.", icon: "🟢", requirement: 50, difficulty_requirement: 'Easy' },
  { name: "Challenge Seeker", type: 'difficulty', description: "Complete 30 Medium difficulty topics.", icon: "🟡", requirement: 30, difficulty_requirement: 'Medium' },
  { name: "Hardcore Learner", type: 'difficulty', description: "Complete 20 Hard difficulty topics.", icon: "🔴", requirement: 20, difficulty_requirement: 'Hard' },
  { name: "Master of All", type: 'difficulty', description: "Complete 10 topics of each difficulty.", icon: "🌈", requirement: 30 },

  // Speed and efficiency badges
  { name: "Speed Demon", type: 'speed', description: "Complete 5 topics in under 30 minutes each.", icon: "⚡", requirement: 5 },
  { name: "Flash Learner", type: 'speed', description: "Complete 10 topics in under 25 minutes each.", icon: "💨", requirement: 10 },
  { name: "Lightning Fast", type: 'speed', description: "Complete 20 topics in under 20 minutes each.", icon: "🌩️", requirement: 20 },

  // Consistency badges
  { name: "Early Bird", type: 'consistency', description: "Study before 7 AM for 7 days.", icon: "🌅", requirement: 7 },
  { name: "Night Shift", type: 'consistency', description: "Study after 9 PM for 7 days.", icon: "🌙", requirement: 7 },
  { name: "Perfect Routine", type: 'consistency', description: "Study at the same time for 30 days.", icon: "⏰", requirement: 30 },

  // Special achievement badges
  { name: "Perfectionist", type: 'special', description: "Complete a full week with 100% daily goals.", icon: "💯", requirement: 7 },
  { name: "Marathoner", type: 'special', description: "Study for 6+ hours in a single day.", icon: "🏃‍♂️", requirement: 1 },
  { name: "Revival King", type: 'special', description: "Break a 3+ day streak and continue for 7 more days.", icon: "👑", requirement: 7 },
  { name: "Subject Polymath", type: 'special', description: "Earn mastery badges for 3 different subjects.", icon: "🎭", requirement: 3 },
];

/**
 * Represents the user statistics needed to check for new badges.
 */
export interface UserStats {
  sessionsCompleted: number;
  currentStreak: number;
  totalHours: number;
  topicsCompleted: number;
  subjectStats?: {
    [subjectName: string]: {
      topicsCompleted: number;
      easyTopics: number;
      mediumTopics: number;
      hardTopics: number;
      totalStudyMinutes: number;
    };
  };
  dailyStats?: {
    earlyMorning: number;
    lateNight: number;
    routine: number;
    perfectDays: number;
    marathonDays: number;
    streakReboots: number;
  };
  difficultyStats?: {
    easy: number;
    medium: number;
    hard: number;
  };
  speedStats?: {
    fastTopics: number; // topics completed under time targets
  };
  specialStats?: {
    perfectWeeks: number;
    subjectMastery: number;
  };
}

/**
 * Enhanced badge checking system with subject-specific and advanced tracking
 * @param stats - The user's current statistics.
 * @param earnedBadgeNames - An array of names of badges the user has already earned.
 * @returns An array of Badge objects that the user has just earned.
 */
export const checkEarnedBadges = (stats: UserStats, earnedBadgeNames: (string | null)[]): Badge[] => {
  const newlyEarned: Badge[] = [];
  const earnedSet = new Set(earnedBadgeNames.filter(Boolean));

  for (const badge of BADGES_CONFIG) {
    if (earnedSet.has(badge.name)) {
      continue; // Skip already earned badges
    }

    let requirementMet = false;

    switch (badge.type) {
      case 'session':
        requirementMet = stats.sessionsCompleted >= badge.requirement;
        break;
        
      case 'streak':
        requirementMet = stats.currentStreak >= badge.requirement;
        break;
        
      case 'hours':
        requirementMet = stats.totalHours >= badge.requirement;
        break;
        
      case 'topic':
        requirementMet = stats.topicsCompleted >= badge.requirement;
        break;
        
      case 'subject_mastery':
        if (badge.subject_requirement && stats.subjectStats) {
          const subjectData = stats.subjectStats[badge.subject_requirement];
          requirementMet = subjectData ? subjectData.topicsCompleted >= badge.requirement : false;
        }
        break;
        
      case 'difficulty':
        if (badge.difficulty_requirement) {
          const difficultyCount = stats.difficultyStats?.[badge.difficulty_requirement.toLowerCase() as keyof typeof stats.difficultyStats] || 0;
          requirementMet = difficultyCount >= badge.requirement;
        } else if (badge.name === "Master of All") {
          // Check for "Master of All" - 10 topics of each difficulty
          const easy = stats.difficultyStats?.easy || 0;
          const medium = stats.difficultyStats?.medium || 0;
          const hard = stats.difficultyStats?.hard || 0;
          requirementMet = easy >= 10 && medium >= 10 && hard >= 10;
        }
        break;
        
      case 'speed':
        requirementMet = (stats.speedStats?.fastTopics || 0) >= badge.requirement;
        break;
        
      case 'consistency':
        if (badge.name === "Early Bird") {
          requirementMet = (stats.dailyStats?.earlyMorning || 0) >= badge.requirement;
        } else if (badge.name === "Night Shift") {
          requirementMet = (stats.dailyStats?.lateNight || 0) >= badge.requirement;
        } else if (badge.name === "Perfect Routine") {
          requirementMet = (stats.dailyStats?.routine || 0) >= badge.requirement;
        }
        break;
        
      case 'special':
        if (badge.name === "Perfectionist") {
          requirementMet = (stats.specialStats?.perfectWeeks || 0) >= badge.requirement;
        } else if (badge.name === "Marathoner") {
          requirementMet = (stats.dailyStats?.marathonDays || 0) >= badge.requirement;
        } else if (badge.name === "Revival King") {
          requirementMet = (stats.dailyStats?.streakReboots || 0) >= badge.requirement;
        } else if (badge.name === "Subject Polymath") {
          requirementMet = (stats.specialStats?.subjectMastery || 0) >= badge.requirement;
        }
        break;
    }

    if (requirementMet) {
      newlyEarned.push(badge);
    }
  }

  return newlyEarned;
};

/**
 * Fetch comprehensive user statistics for badge checking
 */
export async function fetchUserStats(userId: string): Promise<UserStats> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Fetch gamification data
    const { data: gamificationData } = await supabaseBrowserClient
      .from('user_gamification')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Fetch topics data with subject information
    const { data: topicsData } = await supabaseBrowserClient
      .from('topics')
      .select(`
        id, 
        difficulty, 
        status,
        studied_count,
        chapters!inner(
          subject:subjects!inner(name)
        )
      `)
      .eq('user_id', userId);

    // Fetch sessions data
    const { data: sessionsData } = await supabaseBrowserClient
      .from('sessions')
      .select('*')
      .eq('user_id', userId);

    // Fetch blocks data for time analysis
    const { data: blocksData } = await supabaseBrowserClient
      .from('blocks')
      .select('*')
      .eq('user_id', userId)
      .gte('date', oneWeekAgo);

    // Process subject statistics
    const subjectStats: UserStats['subjectStats'] = {};
    const difficultyStats: UserStats['difficultyStats'] = { easy: 0, medium: 0, hard: 0 };
    
    if (topicsData) {
      topicsData.forEach(topic => {
        const subjectName = topic.chapters?.subject?.name || 'Unknown';
        
        // Initialize subject stats
        if (!subjectStats[subjectName]) {
          subjectStats[subjectName] = {
            topicsCompleted: 0,
            easyTopics: 0,
            mediumTopics: 0,
            hardTopics: 0,
            totalStudyMinutes: 0
          };
        }
        
        // Count completed topics
        if (topic.status === 'completed') {
          subjectStats[subjectName].topicsCompleted++;
          
          // Count by difficulty
          if (topic.difficulty === 'Easy') {
            subjectStats[subjectName].easyTopics++;
            difficultyStats.easy++;
          } else if (topic.difficulty === 'Medium') {
            subjectStats[subjectName].mediumTopics++;
            difficultyStats.medium++;
          } else if (topic.difficulty === 'Hard') {
            subjectStats[subjectName].hardTopics++;
            difficultyStats.hard++;
          }
        }
      });
    }

    // Calculate study time
    const totalHours = sessionsData?.reduce((total, session) => {
      return total + (session.duration_minutes || 0);
    }, 0) ? (sessionsData?.reduce((total, session) => total + (session.duration_minutes || 0), 0) || 0) / 60 : 0;

    // Calculate daily consistency stats
    const dailyStats: UserStats['dailyStats'] = {
      earlyMorning: 0,
      lateNight: 0,
      routine: 0,
      perfectDays: 0,
      marathonDays: 0,
      streakReboots: 0
    };

    if (blocksData) {
      blocksData.forEach(block => {
        const hour = parseInt(block.start_time.split(':')[0]);
        if (hour < 7) dailyStats.earlyMorning++;
        if (hour >= 21) dailyStats.lateNight++;
        
        // Check for marathon days (6+ hours)
        const dayBlocks = blocksData.filter(b => b.date === block.date);
        const dayTotalMinutes = dayBlocks.reduce((sum, b) => sum + b.duration, 0);
        if (dayTotalMinutes >= 360) dailyStats.marathonDays++;
      });
    }

    // Calculate special stats
    const specialStats: UserStats['specialStats'] = {
      perfectWeeks: 0,
      subjectMastery: 0
    };

    // Count subject mastery (subjects with 25+ topics)
    Object.values(subjectStats).forEach(subject => {
      if (subject.topicsCompleted >= 25) {
        specialStats.subjectMastery++;
      }
    });

    return {
      sessionsCompleted: gamificationData?.sessions_completed || 0,
      currentStreak: gamificationData?.current_streak || 0,
      totalHours,
      topicsCompleted: Object.values(subjectStats).reduce((sum, subject) => sum + subject.topicsCompleted, 0),
      subjectStats,
      difficultyStats,
      dailyStats,
      speedStats: { fastTopics: 0 }, // TODO: Implement speed tracking
      specialStats
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return {
      sessionsCompleted: 0,
      currentStreak: 0,
      totalHours: 0,
      topicsCompleted: 0
    };
  }
}
