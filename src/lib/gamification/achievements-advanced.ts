
/**
 * @file This file defines a comprehensive achievement system based on specific study metrics.
 */

export type AchievementCategory =
  | 'Study Time'
  | 'Block Completion'
  | 'Revision'
  | 'Question Practice'
  | 'Difficulty'
  | 'Streaks'
  | 'Penalty Avoidance';

export interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  target_value: number;
  points_reward: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  // --- STUDY TIME ACHIEVEMENTS ---
  {
    id: 1,
    name: "Morning Warrior",
    description: "Study for 3 hours before 9 AM in a single day.",
    icon: "🌅",
    category: 'Study Time',
    target_value: 180, // minutes
    points_reward: 100,
  },
  {
    id: 2,
    name: "Study Marathon",
    description: "Complete 12 hours of study in a single day.",
    icon: "🏃",
    category: 'Study Time',
    target_value: 720, // minutes
    points_reward: 500,
  },
  {
    id: 3,
    name: "Consistent Scholar",
    description: "Study for 10+ hours daily for 7 days straight.",
    icon: "📚",
    category: 'Study Time',
    target_value: 7, // days
    points_reward: 750,
  },
  {
    id: 4,
    name: "Study Beast",
    description: "Complete 100 total study hours.",
    icon: "💪",
    category: 'Study Time',
    target_value: 6000, // minutes
    points_reward: 1000,
  },
  {
    id: 5,
    name: "Dedicated Grinder",
    description: "Complete 500 total study hours.",
    icon: "🔥",
    category: 'Study Time',
    target_value: 30000, // minutes
    points_reward: 5000,
  },

  // --- BLOCK COMPLETION ACHIEVEMENTS ---
  {
    id: 6,
    name: "Block Master",
    description: "Complete 5 blocks in a single day.",
    icon: "✅",
    category: 'Block Completion',
    target_value: 5, // blocks
    points_reward: 150,
  },
  {
    id: 7,
    name: "Schedule King",
    description: "Complete all planned blocks for 10 different days.",
    icon: "👑",
    category: 'Block Completion',
    target_value: 10, // days
    points_reward: 400,
  },
  {
    id: 8,
    name: "Perfect Week",
    description: "Complete 35+ blocks in a single week.",
    icon: "⭐",
    category: 'Block Completion',
    target_value: 35, // blocks
    points_reward: 1000,
  },

  // --- REVISION ACHIEVEMENTS ---
  {
    id: 9,
    name: "Revision Hero",
    description: "Clear your revision queue for 5 consecutive days.",
    icon: "🎯",
    category: 'Revision',
    target_value: 5, // days
    points_reward: 300,
  },
  {
    id: 10,
    name: "Never Forget",
    description: "Complete 100 total revision topics using SpaRE.",
    icon: "🧠",
    category: 'Revision',
    target_value: 100, // revisions
    points_reward: 800,
  },
  {
    id: 11,
    name: "Quick Learner",
    description: "Complete same-day revisions for 10 topics.",
    icon: "⚡",
    category: 'Revision',
    target_value: 10, // topics
    points_reward: 200,
  },

  // --- QUESTION PRACTICE ACHIEVEMENTS ---
  {
    id: 12,
    name: "Question Solver",
    description: "Solve a total of 100 questions.",
    icon: "📝",
    category: 'Question Practice',
    target_value: 100, // questions
    points_reward: 250,
  },
  {
    id: 13,
    name: "Problem Master",
    description: "Solve a total of 500 questions.",
    icon: "🎓",
    category: 'Question Practice',
    target_value: 500, // questions
    points_reward: 1200,
  },
  {
    id: 14,
    name: "Accuracy King",
    description: "Maintain an 80%+ accuracy rate on a block of 50 questions.",
    icon: "🎯",
    category: 'Question Practice',
    target_value: 50, // questions
    points_reward: 600,
  },

  // --- DIFFICULTY ACHIEVEMENTS ---
  {
    id: 15,
    name: "Hard Worker",
    description: "Successfully complete 20 'Hard' difficulty topics.",
    icon: "💎",
    category: 'Difficulty',
    target_value: 20, // topics
    points_reward: 1000,
  },
  {
    id: 16,
    name: "Challenge Accepted",
    description: "Successfully complete 100 'Medium' or 'Hard' difficulty topics.",
    icon: "🏆",
    category: 'Difficulty',
    target_value: 100, // topics
    points_reward: 1500,
  },

  // --- STREAK ACHIEVEMENTS ---
  {
    id: 17,
    name: "Week Warrior",
    description: "Maintain a 7-day study streak.",
    icon: "🔥",
    category: 'Streaks',
    target_value: 7, // days
    points_reward: 500,
  },
  {
    id: 18,
    name: "Month Champion",
    description: "Maintain a 30-day study streak.",
    icon: "💯",
    category: 'Streaks',
    target_value: 30, // days
    points_reward: 2500,
  },
  {
    id: 19,
    name: "Unstoppable",
    description: "Maintain a 100-day study streak.",
    icon: "🌟",
    category: 'Streaks',
    target_value: 100, // days
    points_reward: 10000,
  },

  // --- PENALTY AVOIDANCE ACHIEVEMENTS ---
  {
    id: 20,
    name: "Perfect Day",
    description: "Complete a full study day with zero penalties.",
    icon: "✨",
    category: 'Penalty Avoidance',
    target_value: 1, // day
    points_reward: 200,
  },
  {
    id: 21,
    name: "Clean Week",
    description: "Complete an entire week with zero penalties.",
    icon: "🏅",
    category: 'Penalty Avoidance',
    target_value: 7, // days
    points_reward: 1500,
  },
];

/**
 * Placeholder for user stats. In a real implementation, this would be fetched from a database.
 */
interface UserMetrics {
  total_study_minutes: number;
  consecutive_10h_days: number;
  // ... other metrics
}

/**
 * Checks if a user has earned new achievements based on their latest metrics.
 * This is a placeholder function and would need a proper implementation.
 * @param userId - The ID of the user.
 * @param userMetrics - The current tracked metrics for the user.
 * @returns A promise that resolves to an array of newly earned achievements.
 */
export async function checkAchievementProgress(userId: string, userMetrics: UserMetrics): Promise<Achievement[]> {
  console.log("Checking achievements for user:", userId, "with metrics:", userMetrics);
  // In a real implementation, you would:
  // 1. Fetch the user's currently earned achievements from the database.
  // 2. Filter out achievements they already have from the main ACHIEVEMENTS list.
  // 3. Iterate through the remaining unearned achievements.
  // 4. For each achievement, check if the userMetrics meet the target_value.
  // 5. Return an array of achievements that have been newly earned.
  return [];
}

/**
 * Awards an achievement to a user and grants the associated points reward.
 * This is a placeholder function.
 * @param userId - The ID of the user.
 * @param achievement - The achievement object to award.
 * @returns A promise that resolves when the operation is complete.
 */
export async function awardAchievement(userId: string, achievement: Achievement): Promise<void> {
    console.log(`Awarding achievement "${achievement.name}" to user ${userId}.`);
    // In a real implementation, you would:
    // 1. Save the earned achievement to a 'user_achievements' table in your database.
    // 2. Add the 'achievement.points_reward' to the user's total experience points.
    // 3. Potentially trigger a notification to the user.
    return Promise.resolve();
}
