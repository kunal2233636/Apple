
/**
 * @file This file defines a comprehensive gamification points system, including both
 * rewards for positive actions and penalties for negative ones.
 */

// Object containing all positive point values for user achievements.
export const POINTS_REWARD = {
  BLOCK_COMPLETED: 30, // Base points for completing any block
  STUDY_HOUR: 50, // For every hour of study
  STUDY_30_MIN: 25, // For 30 minutes of study
  TOPIC_COMPLETED: 15,
  QUESTION_SOLVED: 3, // Per question
  REVISION_COMPLETED: 25, // Per revision topic
  DAILY_GOAL_MET: 200, // When user studies 10+ hours in a day
  DAILY_STREAK: 100,
  WEEKLY_GOAL_MET: 500,
  EARLY_RISER_BONUS: 50, // Starting first block before 7 AM
  NIGHT_OWL_PENALTY_AVOIDED: 30, // Finishing all blocks before 11 PM
};

// Object containing all negative point values (penalties).
export const POINTS_PENALTY = {
  STUDY_BELOW_10_HOURS: -10000, // If daily study is less than 10 hours
  REVISION_QUEUE_OVERFLOW: -2000, // For each topic in revision queue older than 24 hours
  WRONG_ANSWER: -50, // For each wrong answer in questions
  BLOCK_SKIPPED: -1500, // If user skips a planned block
  TIME_EXCEEDED_PENALTY: -1, // -1 point per second of excess time over planned total duration
  LATE_START: -1000, // If first block starts after 8 AM
  LATE_START_DELAY: -10, // -10 points per second of delay when starting a block late
  INCOMPLETE_DAY: -5000, // If less than 5 blocks completed in a day
  ZERO_REVISION: -3000, // If revision queue not cleared for 2+ days
  BOARD_BLOCK_INSUFFICIENT: -5000, // If studying less than 2 hours of boards block in a day
};

// Example type for daily user statistics
export interface DailyUserStats {
  studyHours: number;
  topicsCompleted: number;
  questionsSolved: number;
  questionsWrong: number;
  revisionsCompleted: number;
  revisionQueueOverflowCount: number;
  blocksSkipped: number;
  breaksExceeded: number;
  firstBlockStartTime: string; // e.g., "06:30"
  lastBlockEndTime: string; // e.g., "22:00"
  totalBlocksCompleted: number;
  revisionQueueCleared: boolean;
}

/**
 * Calculates total reward points based on daily stats.
 * @param stats - The user's statistics for the day.
 * @returns The total positive points earned.
 */
export function calculateDailyRewards(stats: DailyUserStats): number {
  let totalRewards = 0;

  totalRewards += stats.totalBlocksCompleted * POINTS_REWARD.BLOCK_COMPLETED;
  totalRewards += Math.floor(stats.studyHours) * POINTS_REWARD.STUDY_HOUR;

  totalRewards += stats.topicsCompleted * POINTS_REWARD.TOPIC_COMPLETED;

  totalRewards += stats.questionsSolved * POINTS_REWARD.QUESTION_SOLVED;
  totalRewards += stats.revisionsCompleted * POINTS_REWARD.REVISION_COMPLETED;

  if (stats.studyHours >= 10) {
    totalRewards += POINTS_REWARD.DAILY_GOAL_MET;
  }

  const [firstStartHour] = stats.firstBlockStartTime.split(':').map(Number);
  if (firstStartHour < 7) {
    totalRewards += POINTS_REWARD.EARLY_RISER_BONUS;
  }

  const [lastEndHour] = stats.lastBlockEndTime.split(':').map(Number);
  if (lastEndHour < 23) {
    totalRewards += POINTS_REWARD.NIGHT_OWL_PENALTY_AVOIDED;
  }

  // Assuming streak and weekly goals are managed elsewhere and passed in
  // totalRewards += POINTS_REWARD.DAILY_STREAK;
  // totalRewards += POINTS_REWARD.WEEKLY_GOAL_MET;

  return totalRewards;
}

/**
 * Calculates total penalty points based on daily stats.
 * @param stats - The user's statistics for the day.
 * @returns The total negative points.
 */
export function calculateDailyPenalties(stats: DailyUserStats): number {
  let totalPenalties = 0;

  if (stats.studyHours < 10) {
    totalPenalties += POINTS_PENALTY.STUDY_BELOW_10_HOURS;
  }

  totalPenalties += stats.revisionQueueOverflowCount * POINTS_PENALTY.REVISION_QUEUE_OVERFLOW;
  totalPenalties += stats.questionsWrong * POINTS_PENALTY.WRONG_ANSWER;
  totalPenalties += stats.blocksSkipped * POINTS_PENALTY.BLOCK_SKIPPED;
  // Note: Time exceeded penalty is now handled separately in penalty-service.ts

  const [firstStartHour] = stats.firstBlockStartTime.split(':').map(Number);
  if (firstStartHour >= 8) {
    totalPenalties += POINTS_PENALTY.LATE_START;
  }

  if (stats.totalBlocksCompleted < 5) {
    totalPenalties += POINTS_PENALTY.INCOMPLETE_DAY;
  }

  if (!stats.revisionQueueCleared) {
      // Assuming a check for 2+ days is done elsewhere
      // totalPenalties += POINTS_PENALTY.ZERO_REVISION;
  }

  return totalPenalties;
}
