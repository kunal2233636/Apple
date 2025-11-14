
import type { UserFeedback, LearningPattern, PersonalizationProfile } from '@/types/study-buddy';

export type StudyBuddyState = {
  isAtBottom: boolean;
  showScrollButton: boolean;
  showFeedbackDialog: boolean;
  showLearningInsights: boolean;
  userFeedback: UserFeedback[];
  learningPatterns: LearningPattern[];
  personalizationProfile: PersonalizationProfile | null;
  feedbackCollectionEnabled: boolean;
  quickFeedback: 'positive' | 'negative' | null;
  interactionCount: number;
  sessionMetrics: {
    startTime: Date;
    messageCount: number;
    corrections: number;
    timeSpent: number;
    averageResponseTime: number;
    satisfactionScore: number;
    engagementLevel: number;
  };
};

export const initialState: StudyBuddyState = {
  isAtBottom: true,
  showScrollButton: false,
  showFeedbackDialog: false,
  showLearningInsights: false,
  userFeedback: [],
  learningPatterns: [],
  personalizationProfile: null,
  feedbackCollectionEnabled: true,
  quickFeedback: null,
  interactionCount: 0,
  sessionMetrics: {
    startTime: new Date(),
    messageCount: 0,
    corrections: 0,
    timeSpent: 0,
    averageResponseTime: 0,
    satisfactionScore: 0,
    engagementLevel: 0,
  },
};

export type StudyBuddyAction =
  | { type: 'SET_IS_AT_BOTTOM'; payload: boolean }
  | { type: 'SET_SHOW_SCROLL_BUTTON'; payload: boolean }
  | { type: 'SET_SHOW_FEEDBACK_DIALOG'; payload: boolean }
  | { type: 'SET_SHOW_LEARNING_INSIGHTS'; payload: boolean }
  | { type: 'ADD_USER_FEEDBACK'; payload: UserFeedback }
  | { type: 'SET_LEARNING_PATTERNS'; payload: LearningPattern[] }
  | { type: 'SET_PERSONALIZATION_PROFILE'; payload: PersonalizationProfile | null }
  | { type: 'SET_FEEDBACK_COLLECTION_ENABLED'; payload: boolean }
  | { type: 'SET_QUICK_FEEDBACK'; payload: 'positive' | 'negative' | null }
  | { type: 'INCREMENT_INTERACTION_COUNT' }
  | { type: 'UPDATE_SESSION_METRICS'; payload: Partial<StudyBuddyState['sessionMetrics']> };

export function studyBuddyReducer(state: StudyBuddyState, action: StudyBuddyAction): StudyBuddyState {
  switch (action.type) {
    case 'SET_IS_AT_BOTTOM':
      return { ...state, isAtBottom: action.payload };
    case 'SET_SHOW_SCROLL_BUTTON':
      return { ...state, showScrollButton: action.payload };
    case 'SET_SHOW_FEEDBACK_DIALOG':
      return { ...state, showFeedbackDialog: action.payload };
    case 'SET_SHOW_LEARNING_INSIGHTS':
      return { ...state, showLearningInsights: action.payload };
    case 'ADD_USER_FEEDBACK':
      return { ...state, userFeedback: [...state.userFeedback, action.payload] };
    case 'SET_LEARNING_PATTERNS':
      return { ...state, learningPatterns: action.payload };
    case 'SET_PERSONALIZATION_PROFILE':
      return { ...state, personalizationProfile: action.payload };
    case 'SET_FEEDBACK_COLLECTION_ENABLED':
      return { ...state, feedbackCollectionEnabled: action.payload };
    case 'SET_QUICK_FEEDBACK':
      return { ...state, quickFeedback: action.payload };
    case 'INCREMENT_INTERACTION_COUNT':
      return { ...state, interactionCount: state.interactionCount + 1 };
    case 'UPDATE_SESSION_METRICS':
      return {
        ...state,
        sessionMetrics: { ...state.sessionMetrics, ...action.payload },
      };
    default:
      return state;
  }
}
