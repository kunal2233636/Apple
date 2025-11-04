
/**
 * @file This file defines the point values for various user activities
 * and provides functions to calculate XP earned.
 */

// Defines the point values for different activities in the gamification system.
export const POINTS_SYSTEM = {
  // Session & Block Completion
  completeStudySession: 50,
  firstSessionOfDay: 25,
  completePomodoroCycle: 10,
  
  // Topic & Question Related
  completeTopic: 20,
  solveQuestion: 5,

  // Revision
  completeRevision: 30,

  // Streaks
  dailyStreakBonus: 100,
  weeklyStreakBonus: 500,
  monthlyStreakBonus: 2000,
};

/**
 * Represents the data from a user's study session needed to calculate points.
 */
export interface SessionData {
  topicsCompleted: number;
  questionsSolved: number;
  pomodorosCompleted: number;
  isFirstSessionOfDay?: boolean;
}

/**
 * Calculates the total points earned for a given study session based on user's accomplishments.
 * @param sessionData - An object containing the user's achievements during the session.
 * @returns The total number of points earned.
 */
export const calculateSessionPoints = (sessionData: SessionData): number => {
  let totalPoints = 0;

  // Points for completing the session itself
  if (sessionData.topicsCompleted > 0 || sessionData.questionsSolved > 0) {
    totalPoints += POINTS_SYSTEM.completeStudySession;
  }
  
  if (sessionData.isFirstSessionOfDay) {
    totalPoints += POINTS_SYSTEM.firstSessionOfDay;
  }

  // Points per topic completed
  totalPoints += sessionData.topicsCompleted * POINTS_SYSTEM.completeTopic;

  // Points for questions solved
  totalPoints += sessionData.questionsSolved * POINTS_SYSTEM.solveQuestion;

  // Points for Pomodoro cycles
  totalPoints += sessionData.pomodorosCompleted * POINTS_SYSTEM.completePomodoroCycle;

  return totalPoints;
};
