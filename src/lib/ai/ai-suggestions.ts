// AI Feature Suggestions Service
// Generates intelligent study suggestions based on student data
import { google } from 'googleapis';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const genAI = new google.generativeai({ apiKey: GEMINI_API_KEY });

export interface Suggestion {
  id: string;
  type: 'topic' | 'weakness' | 'insight' | 'analysis' | 'recommendation';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  estimatedImpact: number; // 1-10 scale
  reasoning: string;
  actionableSteps: string[];
  relatedTopics?: string[];
  confidenceScore: number; // 0-1
  metadata?: Record<string, any>;
}

export interface StudentProfile {
  userId: string;
  performanceData: {
    subjectScores: Record<string, number>;
    weakAreas: string[];
    strongAreas: string[];
    recentActivities: any[];
    studyTime: number; // minutes per day
    learningStyle: string;
    examTarget: string;
    currentProgress: Record<string, number>;
  };
  historicalData: {
    improvementTrends: Record<string, number>;
    struggleTopics: string[];
    successPatterns: string[];
    timeSpentBySubject: Record<string, number>;
  };
}

// Smart Topic Suggestions
export async function generateSmartTopicSuggestions(profile: StudentProfile): Promise<Suggestion[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
Based on this student profile, suggest 5 specific study topics they should focus on:

Student Profile:
- Current scores by subject: ${JSON.stringify(profile.performanceData.subjectScores)}
- Weak areas: ${profile.performanceData.weakAreas.join(', ')}
- Strong areas: ${profile.performanceData.strongAreas.join(', ')}
- Study time: ${profile.performanceData.studyTime} minutes/day
- Learning style: ${profile.performanceData.learningStyle}
- Exam target: ${profile.performanceData.examTarget}

Provide suggestions in this JSON format:
[
  {
    "title": "Specific topic name",
    "description": "Why this topic is important",
    "priority": "high|medium|low",
    "estimatedImpact": 8,
    "reasoning": "Based on student's current performance and target",
    "actionableSteps": ["Step 1", "Step 2", "Step 3"],
    "relatedTopics": ["Topic 1", "Topic 2"],
    "confidenceScore": 0.85
  }
]

Focus on:
1. Topics that address weak areas
2. Topics relevant to exam target
3. Prerequisite topics for strong areas
4. Current curriculum topics
5. High-impact foundational topics
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const textResponse = response.text();
    
    const jsonMatch = textResponse.match(/\[.*\]/s);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }
    
    const suggestions = JSON.parse(jsonMatch[0]);
    
    return suggestions.map((suggestion: any, index: number) => ({
      id: `topic-suggestion-${index}`,
      type: 'topic' as const,
      title: suggestion.title,
      description: suggestion.description,
      priority: suggestion.priority,
      estimatedImpact: suggestion.estimatedImpact,
      reasoning: suggestion.reasoning,
      actionableSteps: suggestion.actionableSteps,
      relatedTopics: suggestion.relatedTopics,
      confidenceScore: suggestion.confidenceScore
    }));
  } catch (error) {
    console.error('Error generating topic suggestions:', error);
    return [];
  }
}

// Weak Area Identification
export async function identifyWeakAreas(profile: StudentProfile): Promise<Suggestion[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
Analyze this student's performance data to identify specific weak areas and provide improvement strategies:

Student Performance Data:
- Subject scores: ${JSON.stringify(profile.performanceData.subjectScores)}
- Weak areas: ${profile.performanceData.weakAreas.join(', ')}
- Study patterns: ${JSON.stringify(profile.historicalData.improvementTrends)}

Identify 4-5 specific weak areas with improvement strategies:

[
  {
    "title": "Specific weak area",
    "description": "Detailed analysis of the weakness",
    "priority": "high|medium|low",
    "estimatedImpact": 9,
    "reasoning": "Why this is a critical weakness",
    "actionableSteps": [
      "Step-by-step improvement plan",
      "Specific resources or methods",
      "Timeline for improvement"
    ],
    "confidenceScore": 0.9
  }
]

Focus on:
1. Core concept gaps
2. Application weaknesses
3. Speed/accuracy issues
4. Knowledge retention problems
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const textResponse = response.text();
    
    const jsonMatch = textResponse.match(/\[.*\]/s);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }
    
    const suggestions = JSON.parse(jsonMatch[0]);
    
    return suggestions.map((suggestion: any, index: number) => ({
      id: `weakness-${index}`,
      type: 'weakness' as const,
      title: suggestion.title,
      description: suggestion.description,
      priority: suggestion.priority,
      estimatedImpact: suggestion.estimatedImpact,
      reasoning: suggestion.reasoning,
      actionableSteps: suggestion.actionableSteps,
      confidenceScore: suggestion.confidenceScore
    }));
  } catch (error) {
    console.error('Error identifying weak areas:', error);
    return [];
  }
}

// Performance Insights
export async function generatePerformanceInsights(profile: StudentProfile): Promise<Suggestion[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
Generate data-driven performance insights for this student:

Performance Data:
- Current scores: ${JSON.stringify(profile.performanceData.subjectScores)}
- Improvement trends: ${JSON.stringify(profile.historicalData.improvementTrends)}
- Study time by subject: ${JSON.stringify(profile.historicalData.timeSpentBySubject)}

Generate 3-4 key insights in this format:
[
  {
    "title": "Insight about performance pattern",
    "description": "What the data shows",
    "priority": "high|medium|low",
    "estimatedImpact": 7,
    "reasoning": "Data-based reasoning",
    "actionableSteps": [
      "How to act on this insight",
      "Specific recommendations"
    ],
    "confidenceScore": 0.8
  }
]

Focus on:
1. Performance patterns
2. Study efficiency insights
3. Subject correlations
4. Improvement opportunities
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const textResponse = response.text();
    
    const jsonMatch = textResponse.match(/\[.*\]/s);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }
    
    const suggestions = JSON.parse(jsonMatch[0]);
    
    return suggestions.map((suggestion: any, index: number) => ({
      id: `insight-${index}`,
      type: 'insight' as const,
      title: suggestion.title,
      description: suggestion.description,
      priority: suggestion.priority,
      estimatedImpact: suggestion.estimatedImpact,
      reasoning: suggestion.reasoning,
      actionableSteps: suggestion.actionableSteps,
      confidenceScore: suggestion.confidenceScore
    }));
  } catch (error) {
    console.error('Error generating performance insights:', error);
    return [];
  }
}

// Performance Analysis
export async function generatePerformanceAnalysis(profile: StudentProfile): Promise<Suggestion[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
Provide comprehensive performance analysis for this student:

Student Data:
- Scores by subject: ${JSON.stringify(profile.performanceData.subjectScores)}
- Learning style: ${profile.performanceData.learningStyle}
- Study time: ${profile.performanceData.studyTime} minutes/day
- Exam target: ${profile.performanceData.examTarget}

Generate 2-3 comprehensive analysis reports:
[
  {
    "title": "Overall performance analysis",
    "description": "Comprehensive analysis of student's performance",
    "priority": "high|medium|low",
    "estimatedImpact": 8,
    "reasoning": "Analysis methodology and findings",
    "actionableSteps": [
      "Strategic recommendations",
      "Resource allocation suggestions",
      "Timeline for implementation"
    ],
    "confidenceScore": 0.85
  }
]

Include:
1. Overall performance assessment
2. Subject-specific analysis
3. Study strategy recommendations
4. Exam preparation insights
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const textResponse = response.text();
    
    const jsonMatch = textResponse.match(/\[.*\]/s);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }
    
    const suggestions = JSON.parse(jsonMatch[0]);
    
    return suggestions.map((suggestion: any, index: number) => ({
      id: `analysis-${index}`,
      type: 'analysis' as const,
      title: suggestion.title,
      description: suggestion.description,
      priority: suggestion.priority,
      estimatedImpact: suggestion.estimatedImpact,
      reasoning: suggestion.reasoning,
      actionableSteps: suggestion.actionableSteps,
      confidenceScore: suggestion.confidenceScore
    }));
  } catch (error) {
    console.error('Error generating performance analysis:', error);
    return [];
  }
}

// Personalized Recommendations
export async function generatePersonalizedRecommendations(profile: StudentProfile): Promise<Suggestion[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
Generate personalized study recommendations for this student:

Student Profile:
- Learning style: ${profile.performanceData.learningStyle}
- Current performance: ${JSON.stringify(profile.performanceData.subjectScores)}
- Weak areas: ${profile.performanceData.weakAreas.join(', ')}
- Study time: ${profile.performanceData.studyTime} minutes/day
- Exam target: ${profile.performanceData.examTarget}

Generate 4-5 personalized recommendations:
[
  {
    "title": "Personalized recommendation",
    "description": "Tailored suggestion for this student",
    "priority": "high|medium|low",
    "estimatedImpact": 8,
    "reasoning": "Why this recommendation fits this student",
    "actionableSteps": [
      "Personalized action plan",
      "Custom resource suggestions",
      "Adaptation to learning style"
    ],
    "confidenceScore": 0.9
  }
]

Focus on:
1. Learning style adaptations
2. Study schedule optimization
3. Resource recommendations
4. Technique suggestions
5. Motivation strategies
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const textResponse = response.text();
    
    const jsonMatch = textResponse.match(/\[.*\]/s);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }
    
    const suggestions = JSON.parse(jsonMatch[0]);
    
    return suggestions.map((suggestion: any, index: number) => ({
      id: `recommendation-${index}`,
      type: 'recommendation' as const,
      title: suggestion.title,
      description: suggestion.description,
      priority: suggestion.priority,
      estimatedImpact: suggestion.estimatedImpact,
      reasoning: suggestion.reasoning,
      actionableSteps: suggestion.actionableSteps,
      confidenceScore: suggestion.confidenceScore
    }));
  } catch (error) {
    console.error('Error generating personalized recommendations:', error);
    return [];
  }
}

// Main function to generate all suggestions
export async function generateAllSuggestions(profile: StudentProfile): Promise<Suggestion[]> {
  try {
    const [
      topicSuggestions,
      weaknessSuggestions,
      insightSuggestions,
      analysisSuggestions,
      recommendationSuggestions
    ] = await Promise.all([
      generateSmartTopicSuggestions(profile),
      identifyWeakAreas(profile),
      generatePerformanceInsights(profile),
      generatePerformanceAnalysis(profile),
      generatePersonalizedRecommendations(profile)
    ]);

    // Combine and sort by priority and impact
    const allSuggestions = [
      ...topicSuggestions,
      ...weaknessSuggestions,
      ...insightSuggestions,
      ...analysisSuggestions,
      ...recommendationSuggestions
    ];

    // Sort by priority and estimated impact
    return allSuggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aScore = priorityOrder[a.priority] * a.estimatedImpact * a.confidenceScore;
      const bScore = priorityOrder[b.priority] * b.estimatedImpact * b.confidenceScore;
      return bScore - aScore;
    });
  } catch (error) {
    console.error('Error generating all suggestions:', error);
    return [];
  }
}

// Cache management
const suggestionCache = new Map<string, { suggestions: Suggestion[], timestamp: number }>();
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

export function getCachedSuggestions(userId: string): Suggestion[] | null {
  const cached = suggestionCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.suggestions;
  }
  return null;
}

export function cacheSuggestions(userId: string, suggestions: Suggestion[]): void {
  suggestionCache.set(userId, {
    suggestions,
    timestamp: Date.now()
  });
}
