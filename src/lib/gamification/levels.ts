
type Level = {
  level: number;
  xp: number;
  title: string;
};

/**
 * Defines the progression system for user levels based on XP.
 */
export const LEVEL_SYSTEM: Level[] = [
  { level: 1, xp: 0, title: "Beginner" },
  { level: 2, xp: 100, title: "Learner" },
  { level: 3, xp: 250, title: "Scholar" },
  { level: 4, xp: 500, title: "Expert" },
  { level: 5, xp: 1000, title: "Master" },
  { level: 6, xp: 2000, title: "Champion" },
  { level: 7, xp: 4000, title: "Legend" },
  { level: 8, xp: 8000, title: "Hero" },
  { level: 9, xp: 15000, title: "Elite" },
  { level: 10, xp: 30000, title: "Grandmaster" },
];

/**
 * Calculates a user's current level based on their total XP.
 * It finds the highest level threshold the user has surpassed.
 * @param totalXp The user's total experience points.
 * @returns The user's current level number.
 */
export const calculateLevel = (totalXp: number): number => {
  if (totalXp < 0) return 1;
  let currentLevel = 1;
  for (let i = LEVEL_SYSTEM.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_SYSTEM[i].xp) {
      currentLevel = LEVEL_SYSTEM[i].level;
      break;
    }
  }
  return currentLevel;
};

/**
 * Gets the total XP required to reach the next level.
 * If the user is at the maximum level, it returns the XP for the max level.
 * @param currentLevel The user's current level.
 * @returns The total XP needed for the next level.
 */
export const getNextLevelXP = (currentLevel: number): number => {
  const nextLevel = LEVEL_SYSTEM.find(l => l.level === currentLevel + 1);
  if (nextLevel) {
    return nextLevel.xp;
  }
  // If at max level, return the XP for the max level
  return LEVEL_SYSTEM[LEVEL_SYSTEM.length - 1].xp;
};

/**
 * Retrieves the title for a given level number.
 * @param level The level number.
 * @returns The title of the level, or an empty string if not found.
 */
export const getLevelTitle = (level: number): string => {
  const levelData = LEVEL_SYSTEM.find(l => l.level === level);
  return levelData ? levelData.title : "";
};
