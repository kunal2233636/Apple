// Settings Types for Phase 3: Settings Panel
// Complete user preference and configuration management

export interface UserSettings {
  id: string;
  userId: string;
  aiModel: AIModelSettings;
  features: FeaturePreferences;
  notifications: NotificationSettings;
  privacy: PrivacyControls;
  usage: UsageMonitoring;
  studyBuddy: StudyBuddySettings;
  createdAt: string;
  updatedAt: string;
}

// Tab 1: AI Model Selection & Rate Limits
export interface AIModelSettings {
  preferredProviders: string[]; // ['gemini', 'mistral', 'groq', etc.]
  fallbackOrder: string[];
  rateLimits: {
    dailyRequests: number;
    hourlyRequests: number;
    concurrentRequests: number;
  };
  modelPreferences: {
    primaryModel: string;
    fallbackModel: string;
    imageAnalysisModel: string;
    reasoningModel: string;
  };
  qualitySettings: {
    responseQuality: 'fast' | 'balanced' | 'high';
    temperature: number;
    maxTokens: number;
    timeout: number;
  };
}

// Tab 2: Feature Preferences & Overrides
export interface FeaturePreferences {
  aiSuggestions: {
    enabled: boolean;
    frequency: 'real-time' | 'hourly' | 'daily' | 'manual';
    categories: {
      scheduling: boolean;
      predictions: boolean;
      motivation: boolean;
      weaknesses: boolean;
      insights: boolean;
    };
    overrides: {
      skipMotivational: boolean;
      aggressiveScheduling: boolean;
      focusWeakAreas: boolean;
    };
  };
  studyModes: {
    primaryMode: 'test-prep' | 'concept-learning' | 'revision' | 'problem-solving';
    sessionLength: number; // minutes
    breakInterval: number; // minutes
    difficultyAdaptation: boolean;
  };
  interface: {
    theme: 'light' | 'dark' | 'system';
    compactMode: boolean;
    showAdvancedFeatures: boolean;
    defaultView: 'dashboard' | 'chat' | 'analytics';
  };
}

// Tab 3: Notification & Alert Settings
export interface NotificationSettings {
  pushNotifications: {
    enabled: boolean;
    studyReminders: boolean;
    achievementAlerts: boolean;
    revisionAlerts: boolean;
    streakReminders: boolean;
  };
  emailNotifications: {
    enabled: boolean;
    dailySummary: boolean;
    weeklyReports: boolean;
    studyTips: boolean;
    systemUpdates: boolean;
  };
  inAppAlerts: {
    enabled: boolean;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
    showOnLockScreen: boolean;
  };
  schedulingNotifications: {
    sessionStart: boolean;
    breakReminders: boolean;
    sessionEnd: boolean;
    scheduleConflicts: boolean;
  };
}

// Tab 4: Privacy & Data Controls
export interface PrivacyControls {
  dataCollection: {
    anonymousAnalytics: boolean;
    studyPatternTracking: boolean;
    errorReporting: boolean;
    usageStatistics: boolean;
  };
  aiDataProcessing: {
    allowImageAnalysis: boolean;
    allowTextAnalysis: boolean;
    storeConversations: boolean;
    improveAI: boolean;
  };
  sharingControls: {
    shareProgress: boolean;
    allowAnonymousResearch: boolean;
    publicLeaderboards: boolean;
  };
  dataRetention: {
    deleteAfterDays: number;
    automaticCleanup: boolean;
    exportData: boolean;
    deleteAllData: boolean;
  };
}

// Tab 5: Usage Monitoring & Statistics
export interface UsageMonitoring {
  displayOptions: {
    showTokenUsage: boolean;
    showApiCosts: boolean;
    showPerformanceMetrics: boolean;
    showComparisons: boolean;
  };
  tracking: {
    enableDetailedTracking: boolean;
    trackStudyPatterns: boolean;
    trackAIEfficiency: boolean;
    trackGoalProgress: boolean;
  };
  reports: {
    generateWeeklyReports: boolean;
    generateMonthlyReports: boolean;
    generateProgressReports: boolean;
    autoEmailReports: boolean;
  };
  dataVisualization: {
    preferredChartType: 'bar' | 'line' | 'pie' | 'area';
    timeRange: 'day' | 'week' | 'month' | 'year';
    showTrends: boolean;
    showPredictions: boolean;
  };
}

// Tab 6: Study Buddy AI Endpoint Configuration
export interface StudyBuddySettings {
  endpoints: {
    chat: EndpointConfig;
    embeddings: EndpointConfig;
    memoryStorage: EndpointConfig;
    orchestrator: EndpointConfig;
    personalized: EndpointConfig;
    semanticSearch: EndpointConfig;
    webSearch: EndpointConfig;
    summary: EndpointConfig;
  };
  globalDefaults: {
    provider: string;
    model: string;
  };
  testAllEndoints: boolean;
  enableHealthMonitoring: boolean;
}

export interface EndpointConfig {
  enabled: boolean;
  provider: string;
  model: string;
  timeout: number;
  retryAttempts: number;
  fallbackProvider?: string;
  fallbackModel?: string;
  lastTested?: string;
  testStatus?: 'success' | 'failed' | 'pending';
  error?: string;
}

export interface EndpointTestResult {
  endpoint: string;
  success: boolean;
  responseTime: number;
  error?: string;
  timestamp: string;
}

export interface BulkTestResult {
  results: EndpointTestResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
  };
  timestamp: string;
}

// API Response Types
export interface SettingsResponse {
  success: boolean;
  data?: UserSettings;
  error?: string;
}

export interface SettingsUpdateRequest {
  tab?: string;
  settings: Partial<UserSettings>;
}

export interface SettingsExportResponse {
  success: boolean;
  data: {
    exportDate: string;
    settings: UserSettings;
    statistics: UsageStatistics;
  };
  error?: string;
}

// Usage Statistics for Tab 5
export interface UsageStatistics {
  totalSessions: number;
  totalStudyTime: number; // minutes
  averageSessionLength: number;
  aiRequestsMade: number;
  tokenUsage: {
    total: number;
    byProvider: Record<string, number>;
    cost: number;
  };
  featureUsage: Record<string, number>;
  goalAchievements: {
    completed: number;
    total: number;
    percentage: number;
  };
  studyStreak: {
    current: number;
    longest: number;
    totalDays: number;
  };
  subjectProgress: Record<string, {
    timeSpent: number;
    topicsCompleted: number;
    scoreImprovement: number;
  }>;
}

// Default Settings
export const defaultUserSettings: UserSettings = {
  id: '',
  userId: '',
  aiModel: {
    preferredProviders: ['gemini', 'mistral'],
    fallbackOrder: ['groq', 'cerebras', 'openrouter'],
    rateLimits: {
      dailyRequests: 1000,
      hourlyRequests: 100,
      concurrentRequests: 5
    },
    modelPreferences: {
      primaryModel: 'gemini:gemini-2.5-flash',
      fallbackModel: 'mistral:mistral-medium-latest',
      imageAnalysisModel: 'pixtral-12b',
      reasoningModel: 'mistral-large-latest'
    },
    qualitySettings: {
      responseQuality: 'balanced',
      temperature: 0.7,
      maxTokens: 2048,
      timeout: 30
    }
  },
  features: {
    aiSuggestions: {
      enabled: true,
      frequency: 'hourly',
      categories: {
        scheduling: true,
        predictions: true,
        motivation: true,
        weaknesses: true,
        insights: true
      },
      overrides: {
        skipMotivational: false,
        aggressiveScheduling: false,
        focusWeakAreas: true
      }
    },
    studyModes: {
      primaryMode: 'test-prep',
      sessionLength: 25,
      breakInterval: 5,
      difficultyAdaptation: true
    },
    interface: {
      theme: 'system',
      compactMode: false,
      showAdvancedFeatures: true,
      defaultView: 'dashboard'
    }
  },
  notifications: {
    pushNotifications: {
      enabled: true,
      studyReminders: true,
      achievementAlerts: true,
      revisionAlerts: true,
      streakReminders: true
    },
    emailNotifications: {
      enabled: true,
      dailySummary: true,
      weeklyReports: false,
      studyTips: true,
      systemUpdates: false
    },
    inAppAlerts: {
      enabled: true,
      soundEnabled: true,
      vibrationEnabled: true,
      showOnLockScreen: false
    },
    schedulingNotifications: {
      sessionStart: true,
      breakReminders: true,
      sessionEnd: true,
      scheduleConflicts: true
    }
  },
  privacy: {
    dataCollection: {
      anonymousAnalytics: true,
      studyPatternTracking: true,
      errorReporting: true,
      usageStatistics: true
    },
    aiDataProcessing: {
      allowImageAnalysis: true,
      allowTextAnalysis: true,
      storeConversations: false,
      improveAI: true
    },
    sharingControls: {
      shareProgress: false,
      allowAnonymousResearch: false,
      publicLeaderboards: false
    },
    dataRetention: {
      deleteAfterDays: 365,
      automaticCleanup: true,
      exportData: true,
      deleteAllData: false
    }
  },
  usage: {
    displayOptions: {
      showTokenUsage: true,
      showApiCosts: true,
      showPerformanceMetrics: true,
      showComparisons: true
    },
    tracking: {
      enableDetailedTracking: true,
      trackStudyPatterns: true,
      trackAIEfficiency: true,
      trackGoalProgress: true
    },
    reports: {
      generateWeeklyReports: true,
      generateMonthlyReports: false,
      generateProgressReports: true,
      autoEmailReports: false
    },
    dataVisualization: {
      preferredChartType: 'bar',
      timeRange: 'week',
      showTrends: true,
      showPredictions: true
    }
  },
  studyBuddy: {
    endpoints: {
      chat: {
        enabled: true,
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        timeout: 30,
        retryAttempts: 3,
        fallbackProvider: 'mistral',
        fallbackModel: 'mistral-medium-latest'
      },
      embeddings: {
        enabled: true,
        provider: 'cohere',
        model: 'embed-english-v3.0',
        timeout: 30,
        retryAttempts: 3,
        fallbackProvider: 'openrouter',
        fallbackModel: 'nomic-embed-text-v1.5'
      },
      memoryStorage: {
        enabled: true,
        provider: 'groq',
        model: 'llama-3.1-8b-instant',
        timeout: 30,
        retryAttempts: 3,
        fallbackProvider: 'mistral',
        fallbackModel: 'mistral-small-latest'
      },
      orchestrator: {
        enabled: true,
        provider: 'mistral',
        model: 'mistral-large-latest',
        timeout: 30,
        retryAttempts: 3,
        fallbackProvider: 'gemini',
        fallbackModel: 'gemini-2.0-flash'
      },
      personalized: {
        enabled: true,
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        timeout: 30,
        retryAttempts: 3,
        fallbackProvider: 'mistral',
        fallbackModel: 'mistral-large-latest'
      },
      semanticSearch: {
        enabled: true,
        provider: 'cohere',
        model: 'embed-english-v3.0',
        timeout: 30,
        retryAttempts: 3,
        fallbackProvider: 'openrouter',
        fallbackModel: 'nomic-embed-text-v1.5'
      },
      webSearch: {
        enabled: true,
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        timeout: 30,
        retryAttempts: 3,
        fallbackProvider: 'mistral',
        fallbackModel: 'mistral-medium-latest'
      },
      summary: {
        enabled: true,
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        timeout: 30,
        retryAttempts: 3,
        fallbackProvider: 'mistral',
        fallbackModel: 'mistral-medium-latest'
      }
    },
    globalDefaults: {
      provider: 'gemini',
      model: 'gemini-2.0-flash'
    },
    testAllEndoints: true,
    enableHealthMonitoring: true
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};
