'use client';

import { questionStorage, type QuestionSet } from './question-storage';
import { generateBoardQuestions, type BoardQuestion } from './gemini-questions';

/**
 * Enhanced question manager that handles retrieval, storage, and merging
 */
export class QuestionManager {
  /**
   * Load questions for a chapter, checking persistence first
   * @param chapterName Name of the chapter
   * @param subjectName Name of the subject
   * @param forceNewGeneration Whether to skip existing questions and generate new ones
   * @returns Object containing questions and metadata about their source
   */
  async loadQuestions(
    chapterName: string,
    subjectName: string,
    forceNewGeneration: boolean = false
  ): Promise<{
    questions: BoardQuestion[];
    source: 'storage' | 'generated';
    questionSet?: QuestionSet;
    isExisting: boolean;
    totalQuestions: number;
    generatedAt?: string;
    generationCount?: number;
  }> {
    try {
      // If forcing new generation, skip storage check
      if (!forceNewGeneration) {
        // Check if questions exist in storage
        const existingQuestionSet = await questionStorage.getQuestionSet(chapterName, subjectName);
        
        if (existingQuestionSet) {
          console.log('[QuestionManager] Using existing questions from storage');
          return {
            questions: existingQuestionSet.questions,
            source: 'storage',
            questionSet: existingQuestionSet,
            isExisting: true,
            totalQuestions: existingQuestionSet.total_questions,
            generatedAt: existingQuestionSet.generated_at,
            generationCount: existingQuestionSet.generation_count,
          };
        }
      }

      // Generate new questions if none exist or force new generation
      console.log('[QuestionManager] Generating new questions');
      const generatedQuestions = await generateBoardQuestions({ chapterName, subjectName });
      
      // Save to storage
      const savedQuestionSet = await questionStorage.saveQuestionSet(
        chapterName,
        subjectName,
        generatedQuestions
      );

      return {
        questions: generatedQuestions,
        source: 'generated',
        questionSet: savedQuestionSet,
        isExisting: false,
        totalQuestions: generatedQuestions.length,
        generatedAt: savedQuestionSet.generated_at,
        generationCount: savedQuestionSet.generation_count,
      };
    } catch (error: any) {
      console.error('[QuestionManager] Error loading questions:', error);
      throw new Error(`Failed to load questions: ${error.message}`);
    }
  }

  /**
   * Add additional questions to an existing question set
   * @param chapterName Name of the chapter
   * @param subjectName Name of the subject
   * @param numberOfAdditionalQuestions How many extra questions to generate
   * @returns Updated question set with additional questions
   */
  async addExtraQuestions(
    chapterName: string,
    subjectName: string,
    numberOfAdditionalQuestions: number = 5
  ): Promise<{
    questions: BoardQuestion[];
    source: 'storage';
    questionSet: QuestionSet;
    addedCount: number;
    totalQuestions: number;
  }> {
    try {
      // First, get existing questions
      const existingQuestionSet = await questionStorage.getQuestionSet(chapterName, subjectName);
      
      if (!existingQuestionSet) {
        throw new Error('No existing question set found. Generate questions first.');
      }

      // Generate additional questions
      const additionalQuestions = await generateBoardQuestions({ 
        chapterName, 
        subjectName 
      });

      // Take only the requested number of additional questions
      const selectedAdditionalQuestions = additionalQuestions.slice(0, numberOfAdditionalQuestions);

      // Add to existing set
      const updatedQuestionSet = await questionStorage.addQuestionsToSet(
        chapterName,
        subjectName,
        selectedAdditionalQuestions
      );

      console.log('[QuestionManager] Added extra questions:', {
        chapterName,
        subjectName,
        addedCount: selectedAdditionalQuestions.length,
        totalCount: updatedQuestionSet.total_questions,
      });

      return {
        questions: updatedQuestionSet.questions,
        source: 'storage',
        questionSet: updatedQuestionSet,
        addedCount: selectedAdditionalQuestions.length,
        totalQuestions: updatedQuestionSet.total_questions,
      };
    } catch (error: any) {
      console.error('[QuestionManager] Error adding extra questions:', error);
      throw new Error(`Failed to add extra questions: ${error.message}`);
    }
  }

  /**
   * Check if questions exist for a chapter-subject combination
   * @param chapterName Name of the chapter
   * @param subjectName Name of the subject
   * @returns Information about existing questions
   */
  async checkQuestionAvailability(
    chapterName: string,
    subjectName: string
  ): Promise<{
    exists: boolean;
    questionCount: number;
    lastGenerated: string | null;
    generationCount: number;
    subjectStats?: {
      totalSets: number;
      totalQuestions: number;
      averageQuestionsPerSet: number;
      lastGenerated: string | null;
    };
  }> {
    try {
      const existingQuestionSet = await questionStorage.getQuestionSet(chapterName, subjectName);
      
      if (existingQuestionSet) {
        // Get subject statistics
        const subjectStats = await questionStorage.getQuestionStats(subjectName);
        
        return {
          exists: true,
          questionCount: existingQuestionSet.total_questions,
          lastGenerated: existingQuestionSet.last_modified,
          generationCount: existingQuestionSet.generation_count,
          subjectStats,
        };
      }

      // Get subject statistics even if no questions exist for this chapter
      const subjectStats = await questionStorage.getQuestionStats(subjectName);
      
      return {
        exists: false,
        questionCount: 0,
        lastGenerated: null,
        generationCount: 0,
        subjectStats,
      };
    } catch (error: any) {
      console.error('[QuestionManager] Error checking question availability:', error);
      return {
        exists: false,
        questionCount: 0,
        lastGenerated: null,
        generationCount: 0,
      };
    }
  }

  /**
   * Get question statistics for a subject
   * @param subjectName Name of the subject
   * @returns Comprehensive statistics about question generation for the subject
   */
  async getSubjectQuestionStats(subjectName: string): Promise<{
    totalSets: number;
    totalQuestions: number;
    averageQuestionsPerSet: number;
    lastGenerated: string | null;
    questionSets: Array<{
      chapterName: string;
      questionCount: number;
      lastModified: string;
      generationCount: number;
    }>;
  }> {
    try {
      const questionSets = await questionStorage.getQuestionSetsBySubject(subjectName);
      
      const totalSets = questionSets.length;
      const totalQuestions = questionSets.reduce((sum, set) => sum + set.total_questions, 0);
      const averageQuestionsPerSet = totalSets > 0 ? totalQuestions / totalSets : 0;
      
      const lastGenerated = questionSets.length > 0 
        ? questionSets.sort((a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime())[0].last_modified
        : null;

      const formattedSets = questionSets.map(set => ({
        chapterName: set.chapter_name,
        questionCount: set.total_questions,
        lastModified: set.last_modified,
        generationCount: set.generation_count,
      }));

      return {
        totalSets,
        totalQuestions,
        averageQuestionsPerSet: Math.round(averageQuestionsPerSet * 10) / 10,
        lastGenerated,
        questionSets: formattedSets,
      };
    } catch (error: any) {
      console.error('[QuestionManager] Error getting subject stats:', error);
      return {
        totalSets: 0,
        totalQuestions: 0,
        averageQuestionsPerSet: 0,
        lastGenerated: null,
        questionSets: [],
      };
    }
  }

  /**
   * Get recent question generation activity
   * @param limit Number of recent activities to retrieve
   * @returns Recent question generation activity
   */
  async getRecentActivity(limit: number = 10): Promise<Array<{
    chapterName: string;
    subjectName: string;
    questionCount: number;
    lastModified: string;
    generationCount: number;
  }>> {
    try {
      const recentSets = await questionStorage.getRecentGenerationActivity(limit);
      
      return recentSets.map(set => ({
        chapterName: set.chapter_name,
        subjectName: set.subject_name,
        questionCount: set.total_questions,
        lastModified: set.last_modified,
        generationCount: set.generation_count,
      }));
    } catch (error: any) {
      console.error('[QuestionManager] Error getting recent activity:', error);
      return [];
    }
  }

  /**
   * Generate questions with enhanced error handling and fallback
   * @param chapterName Name of the chapter
   * @param subjectName Name of the subject
   * @param options Additional options for generation
   * @returns Generated questions with metadata
   */
  async generateQuestionsWithFallback(
    chapterName: string,
    subjectName: string,
    options: {
      useSampleOnFailure?: boolean;
      maxRetries?: number;
    } = {}
  ): Promise<{
    questions: BoardQuestion[];
    source: 'generated' | 'sample';
    error?: string;
    questionSet?: QuestionSet;
  }> {
    const { useSampleOnFailure = true, maxRetries = 2 } = options;
    
    try {
      // First try to use existing questions
      const existingResult = await this.loadQuestions(chapterName, subjectName);
      if (existingResult.isExisting) {
        return {
          questions: existingResult.questions,
          source: 'generated', // Mark as generated since they were generated previously
          questionSet: existingResult.questionSet,
        };
      }

      // Try generating new questions
      let lastError: any;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[QuestionManager] Generation attempt ${attempt}/${maxRetries}`);
          const generatedQuestions = await generateBoardQuestions({ chapterName, subjectName });
          
          // Save to storage
          const savedQuestionSet = await questionStorage.saveQuestionSet(
            chapterName,
            subjectName,
            generatedQuestions
          );

          return {
            questions: generatedQuestions,
            source: 'generated',
            questionSet: savedQuestionSet,
          };
        } catch (error: any) {
          console.error(`[QuestionManager] Generation attempt ${attempt} failed:`, error);
          lastError = error;
          
          if (attempt < maxRetries) {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }

      // All generation attempts failed
      if (useSampleOnFailure) {
        console.log('[QuestionManager] All generation attempts failed, falling back to sample questions');
        // Import sample questions
        const { sampleQuestions } = await import('./sample-questions');
        
        return {
          questions: sampleQuestions as BoardQuestion[],
          source: 'sample',
          error: lastError?.message,
        };
      }

      throw lastError;
    } catch (error: any) {
      console.error('[QuestionManager] Error in generateQuestionsWithFallback:', error);
      return {
        questions: [],
        source: 'sample',
        error: error.message,
      };
    }
  }
}

// Export singleton instance
export const questionManager = new QuestionManager();