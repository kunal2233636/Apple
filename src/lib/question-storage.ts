'use client';

import { supabaseBrowserClient } from './supabase';
import { BoardQuestion } from './gemini-questions';

// Enhanced question storage format with metadata
export interface QuestionSet {
  id: string; // chapterName_subjectName
  chapter_name: string;
  subject_name: string;
  generated_at: string; // ISO timestamp
  cbse_year: '2026';
  questions: BoardQuestion[];
  total_questions: number;
  generation_count: number;
  last_modified: string; // ISO timestamp
  created_at?: string;
  updated_at?: string;
}

// Storage service for questions
export class QuestionStorageService {
  private tableName = 'cbse_question_sets';

  /**
   * Initialize the table if it doesn't exist
   */
  private async initializeTable() {
    try {
      // Check if table exists by trying to query it
      const { error } = await supabaseBrowserClient
        .from(this.tableName)
        .select('id')
        .limit(1);

      // If table doesn't exist, we would need to create it via SQL
      // For now, we'll assume it exists or can be created via migration
    } catch (error) {
      console.warn('[QuestionStorage] Table might not exist yet. Please run migration.');
    }
  }

  /**
   * Generate a unique ID for question sets based on chapter and subject
   */
  private generateQuestionSetId(chapterName: string, subjectName: string): string {
    return `${chapterName.toLowerCase().replace(/\s+/g, '_')}_${subjectName.toLowerCase().replace(/\s+/g, '_')}`;
  }

  /**
   * Save a new question set to Supabase
   */
  async saveQuestionSet(
    chapterName: string,
    subjectName: string,
    questions: BoardQuestion[]
  ): Promise<QuestionSet> {
    try {
      await this.initializeTable();
      
      const id = this.generateQuestionSetId(chapterName, subjectName);
      const now = new Date().toISOString();
      
      const questionSet = {
        id,
        chapter_name: chapterName,
        subject_name: subjectName,
        generated_at: now,
        cbse_year: '2026' as const,
        questions,
        total_questions: questions.length,
        generation_count: 1,
        last_modified: now,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await supabaseBrowserClient
        .from(this.tableName)
        .insert([questionSet])
        .select()
        .single();

      if (error) {
        console.error('[QuestionStorage] Supabase error:', error);
        throw new Error(`Failed to save question set: ${error.message}`);
      }
      
      console.log('[QuestionStorage] Saved question set:', { id, questionCount: questions.length });
      return data as QuestionSet;
    } catch (error: any) {
      console.error('[QuestionStorage] Error saving question set:', error);
      throw new Error(`Failed to save question set: ${error.message}`);
    }
  }

  /**
   * Add additional questions to an existing question set
   */
  async addQuestionsToSet(
    chapterName: string,
    subjectName: string,
    newQuestions: BoardQuestion[]
  ): Promise<QuestionSet> {
    try {
      await this.initializeTable();
      
      const id = this.generateQuestionSetId(chapterName, subjectName);
      
      // First, get the existing question set
      const existingSet = await this.getQuestionSet(chapterName, subjectName);
      const now = new Date().toISOString();

      if (existingSet) {
        // Merge with existing questions
        const mergedQuestions = [...existingSet.questions, ...newQuestions];
        
        // Avoid duplicates by question text similarity
        const uniqueQuestions = this.removeDuplicateQuestions(mergedQuestions);
        
        const updatedQuestionSet = {
          questions: uniqueQuestions,
          total_questions: uniqueQuestions.length,
          generation_count: existingSet.generation_count + 1,
          last_modified: now,
          updated_at: now,
        };

        const { data, error } = await supabaseBrowserClient
          .from(this.tableName)
          .update(updatedQuestionSet)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('[QuestionStorage] Supabase update error:', error);
          throw new Error(`Failed to update question set: ${error.message}`);
        }

        console.log('[QuestionStorage] Updated question set:', { 
          id, 
          previousCount: existingSet.questions.length,
          newCount: uniqueQuestions.length,
          added: newQuestions.length 
        });
        return data as QuestionSet;
      } else {
        // Create new set if it doesn't exist
        return await this.saveQuestionSet(chapterName, subjectName, newQuestions);
      }
    } catch (error: any) {
      console.error('[QuestionStorage] Error adding questions to set:', error);
      throw new Error(`Failed to add questions to existing set: ${error.message}`);
    }
  }

  /**
   * Retrieve an existing question set
   */
  async getQuestionSet(chapterName: string, subjectName: string): Promise<QuestionSet | null> {
    try {
      await this.initializeTable();
      
      const id = this.generateQuestionSetId(chapterName, subjectName);
      
      const { data, error } = await supabaseBrowserClient
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          console.log('[QuestionStorage] No existing question set found for:', { chapterName, subjectName });
          return null;
        }
        console.error('[QuestionStorage] Supabase error:', error);
        throw new Error(`Failed to retrieve question set: ${error.message}`);
      }
      
      console.log('[QuestionStorage] Retrieved question set:', { id, questionCount: data?.total_questions });
      return data as QuestionSet;
    } catch (error: any) {
      console.error('[QuestionStorage] Error retrieving question set:', error);
      return null;
    }
  }

  /**
   * Check if a question set exists for the given chapter and subject
   */
  async hasQuestionSet(chapterName: string, subjectName: string): Promise<boolean> {
    try {
      const questionSet = await this.getQuestionSet(chapterName, subjectName);
      return questionSet !== null;
    } catch (error) {
      console.error('[QuestionStorage] Error checking question set existence:', error);
      return false;
    }
  }

  /**
   * Get all question sets for a subject
   */
  async getQuestionSetsBySubject(subjectName: string): Promise<QuestionSet[]> {
    try {
      await this.initializeTable();
      
      const { data, error } = await supabaseBrowserClient
        .from(this.tableName)
        .select('*')
        .eq('subject_name', subjectName)
        .order('last_modified', { ascending: false });

      if (error) {
        console.error('[QuestionStorage] Supabase error:', error);
        throw new Error(`Failed to retrieve question sets: ${error.message}`);
      }
      
      console.log('[QuestionStorage] Retrieved question sets for subject:', { 
        subjectName, 
        count: data?.length || 0 
      });
      return (data || []) as QuestionSet[];
    } catch (error: any) {
      console.error('[QuestionStorage] Error retrieving question sets by subject:', error);
      return [];
    }
  }

  /**
   * Get recent question generation activity
   */
  async getRecentGenerationActivity(limitCount: number = 10): Promise<QuestionSet[]> {
    try {
      await this.initializeTable();
      
      const { data, error } = await supabaseBrowserClient
        .from(this.tableName)
        .select('*')
        .order('last_modified', { ascending: false })
        .limit(limitCount);

      if (error) {
        console.error('[QuestionStorage] Supabase error:', error);
        throw new Error(`Failed to retrieve recent activity: ${error.message}`);
      }
      
      return (data || []) as QuestionSet[];
    } catch (error: any) {
      console.error('[QuestionStorage] Error retrieving recent activity:', error);
      return [];
    }
  }

  /**
   * Remove duplicate questions based on question text similarity
   */
  private removeDuplicateQuestions(questions: BoardQuestion[]): BoardQuestion[] {
    const uniqueQuestions: BoardQuestion[] = [];
    
    for (const question of questions) {
      const isDuplicate = uniqueQuestions.some(existing => 
        this.calculateTextSimilarity(
          existing.questionText.toLowerCase(),
          question.questionText.toLowerCase()
        ) > 0.8
      );
      
      if (!isDuplicate) {
        uniqueQuestions.push(question);
      }
    }
    
    return uniqueQuestions;
  }

  /**
   * Calculate simple text similarity (Jaccard similarity for words)
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * Get question statistics for a subject
   */
  async getQuestionStats(subjectName: string): Promise<{
    totalSets: number;
    totalQuestions: number;
    averageQuestionsPerSet: number;
    lastGenerated: string | null;
  }> {
    try {
      const questionSets = await this.getQuestionSetsBySubject(subjectName);
      
      const totalSets = questionSets.length;
      const totalQuestions = questionSets.reduce((sum, set) => sum + set.total_questions, 0);
      const averageQuestionsPerSet = totalSets > 0 ? totalQuestions / totalSets : 0;
      
      const lastGenerated = questionSets.length > 0 
        ? questionSets.sort((a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime())[0].last_modified
        : null;

      return {
        totalSets,
        totalQuestions,
        averageQuestionsPerSet: Math.round(averageQuestionsPerSet * 10) / 10,
        lastGenerated,
      };
    } catch (error) {
      console.error('[QuestionStorage] Error getting question stats:', error);
      return {
        totalSets: 0,
        totalQuestions: 0,
        averageQuestionsPerSet: 0,
        lastGenerated: null,
      };
    }
  }
}

// Export singleton instance
export const questionStorage = new QuestionStorageService();