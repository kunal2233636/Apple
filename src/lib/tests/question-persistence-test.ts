'use client';

// Test script for Question Persistence System
// This file contains comprehensive tests for the CBSE question persistence system

import { questionManager } from '../question-manager';
import { questionStorage } from '../question-storage';
import { generateBoardQuestions, type BoardQuestion } from '../gemini-questions';

/**
 * Test suite for the Question Persistence System
 */
export class QuestionPersistenceTester {
  
  /**
   * Test 1: Basic question storage and retrieval
   */
  async testBasicStorage() {
    console.log('🧪 Testing Basic Question Storage...');
    
    const testChapter = 'Test Chapter';
    const testSubject = 'Test Subject';
    
    try {
      // Generate test questions
      const testQuestions: BoardQuestion[] = [
        {
          questionNumber: 1,
          questionText: 'What is the basic concept of $x^2 + y^2 = r^2$?',
          questionType: 'Short Answer',
          marks: 2,
          difficulty: 'Medium',
          keyConceptsTested: ['Basic Algebra', 'Geometry'],
          isPYQ: false,
          correctAnswerPoints: ['Circle equation', 'Radius concept'],
          fullAnswerCBSE: 'This represents the equation of a circle with radius r.',
          commonMistakes: ['Confusing with ellipse', 'Wrong radius formula']
        }
      ];
      
      // Save questions
      const savedSet = await questionStorage.saveQuestionSet(
        testChapter, 
        testSubject, 
        testQuestions
      );
      
      console.log('✅ Questions saved successfully:', savedSet.id);
      
      // Retrieve questions
      const retrievedSet = await questionStorage.getQuestionSet(
        testChapter, 
        testSubject
      );
      
      if (retrievedSet && retrievedSet.questions.length === 1) {
        console.log('✅ Questions retrieved successfully');
        return true;
      } else {
        console.log('❌ Failed to retrieve questions');
        return false;
      }
    } catch (error: any) {
      console.error('❌ Basic storage test failed:', error);
      return false;
    }
  }
  
  /**
   * Test 2: Question manager workflow
   */
  async testQuestionManager() {
    console.log('🧪 Testing Question Manager Workflow...');
    
    const testChapter = 'Manager Test Chapter';
    const testSubject = 'Manager Test Subject';
    
    try {
      // Test first load (should generate new questions)
      const firstLoad = await questionManager.loadQuestions(
        testChapter, 
        testSubject
      );
      
      console.log('✅ First load completed:', {
        source: firstLoad.source,
        isExisting: firstLoad.isExisting,
        totalQuestions: firstLoad.totalQuestions
      });
      
      // Test second load (should use existing questions)
      const secondLoad = await questionManager.loadQuestions(
        testChapter, 
        testSubject
      );
      
      console.log('✅ Second load completed:', {
        source: secondLoad.source,
        isExisting: secondLoad.isExisting,
        totalQuestions: secondLoad.totalQuestions
      });
      
      // Verify persistence worked
      if (firstLoad.source !== secondLoad.source) {
        console.log('❌ Question manager persistence failed');
        return false;
      }
      
      console.log('✅ Question manager persistence working correctly');
      return true;
    } catch (error: any) {
      console.error('❌ Question manager test failed:', error);
      return false;
    }
  }
  
  /**
   * Test 3: Add extra questions functionality
   */
  async testAddExtraQuestions() {
    console.log('🧪 Testing Add Extra Questions...');
    
    const testChapter = 'Extra Questions Chapter';
    const testSubject = 'Extra Questions Subject';
    
    try {
      // First, generate initial questions
      const initialLoad = await questionManager.loadQuestions(
        testChapter, 
        testSubject
      );
      
      const initialCount = initialLoad.totalQuestions;
      console.log(`📊 Initial questions count: ${initialCount}`);
      
      // Add extra questions
      const extendedLoad = await questionManager.addExtraQuestions(
        testChapter, 
        testSubject, 
        3
      );
      
      const finalCount = extendedLoad.totalQuestions;
      console.log(`📊 Final questions count: ${finalCount}`);
      
      // Verify questions were added
      if (finalCount > initialCount && extendedLoad.addedCount > 0) {
        console.log('✅ Extra questions added successfully');
        return true;
      } else {
        console.log('❌ Failed to add extra questions');
        return false;
      }
    } catch (error: any) {
      console.error('❌ Add extra questions test failed:', error);
      return false;
    }
  }
  
  /**
   * Run all tests
   */
  async runAllTests(): Promise<{
    passed: number;
    total: number;
    results: string[];
  }> {
    console.log('🚀 Starting Question Persistence System Tests\n');
    
    const tests = [
      { name: 'Basic Storage', test: () => this.testBasicStorage() },
      { name: 'Question Manager', test: () => this.testQuestionManager() },
      { name: 'Add Extra Questions', test: () => this.testAddExtraQuestions() }
    ];
    
    const results: string[] = [];
    let passed = 0;
    
    for (const { name, test } of tests) {
      console.log(`\n--- Running ${name} Test ---`);
      try {
        const result = await test();
        if (result) {
          results.push(`✅ ${name} Test: PASSED`);
          passed++;
        } else {
          results.push(`❌ ${name} Test: FAILED`);
        }
      } catch (error: any) {
        results.push(`💥 ${name} Test: ERROR - ${error.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🎯 TEST RESULTS SUMMARY');
    console.log('='.repeat(50));
    results.forEach(result => console.log(result));
    console.log(`\n📊 Final Score: ${passed}/${tests.length} tests passed`);
    
    if (passed === tests.length) {
      console.log('🎉 ALL TESTS PASSED! Question Persistence System is working correctly.');
    } else {
      console.log('⚠️ Some tests failed. Please check the implementation.');
    }
    
    return { passed, total: tests.length, results };
  }
}

/**
 * Test runner function
 * Call this function to test the question persistence system
 */
export async function runQuestionPersistenceTests() {
  const tester = new QuestionPersistenceTester();
  return await tester.runAllTests();
}

/**
 * Quick smoke test for basic functionality
 */
export async function runQuickSmokeTest() {
  console.log('🔍 Running Quick Smoke Test...');
  
  try {
    // Test basic question loading
    const result = await questionManager.loadQuestions(
      'Quick Test Chapter',
      'Quick Test Subject'
    );
    
    console.log('✅ Smoke test passed:', {
      questionsLoaded: result.questions.length > 0,
      source: result.source
    });
    
    return true;
  } catch (error: any) {
    console.error('❌ Smoke test failed:', error);
    return false;
  }
}

// Export for use in development/testing
if (typeof window !== 'undefined') {
  (window as any).runQuestionPersistenceTests = runQuestionPersistenceTests;
  (window as any).runQuickSmokeTest = runQuickSmokeTest;
}