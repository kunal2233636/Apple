
'use server';

import { supabaseBrowserClient } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type TestResult = {
  testName: string;
  success: boolean;
  message: string;
  data?: any;
};

/**
 * Runs a series of tests to verify the activity logging system is working correctly.
 * @param userId - The ID of the user to run tests for.
 * @returns An object containing the overall success status, a summary message, and detailed test results.
 */
export async function testActivityLogging(userId: string): Promise<{
  success: boolean;
  message: string;
  testResults: TestResult[];
}> {
  const testResults: TestResult[] = [];
  let overallSuccess = true;

  // --- Test 1: Check if table exists ---
  let tableExists = false;
  try {
    const { error } = await supabaseBrowserClient
      .from('activity_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .limit(1);

    if (error && error.code === '42P01') { // '42P01' is 'undefined_table' in PostgreSQL
      throw new Error('Table `activity_logs` does not exist.');
    } else if (error) {
      throw error;
    }
    
    tableExists = true;
    testResults.push({
      testName: 'Table Existence Check',
      success: true,
      message: '`activity_logs` table found and is accessible.',
    });
  } catch (error: any) {
    overallSuccess = false;
    testResults.push({
      testName: 'Table Existence Check',
      success: false,
      message: error.message,
    });
  }

  if (!tableExists) {
    return {
      success: false,
      message: 'Initial check failed: `activity_logs` table not found. Aborting further tests.',
      testResults,
    };
  }

  // --- Test 2: Insert a test log ---
  const testActivityId = `test-${Date.now()}`;
  let insertedLogId: number | null = null;
  
  try {
    const testLog = {
      user_id: userId,
      activity_type: 'test_activity',
      category: 'study' as const,
      summary: `This is a test activity log entry with ID: ${testActivityId}`,
      context_tags: ['test'],
      is_positive: true,
      importance_level: 1,
    };
    
    const { data, error } = await supabaseBrowserClient
      .from('activity_logs')
      .insert(testLog)
      .select('id')
      .single();

    if (error) throw error;
    
    insertedLogId = data.id;
    testResults.push({
      testName: 'Insert Test Log',
      success: true,
      message: `Successfully inserted test log with ID: ${insertedLogId}`,
      data: { id: insertedLogId }
    });
  } catch (error: any) {
    overallSuccess = false;
    testResults.push({
      testName: 'Insert Test Log',
      success: false,
      message: `Failed to insert test log: ${error.message}`,
    });
  }

  // --- Test 3: Read back the test log ---
  if (insertedLogId !== null) {
    try {
      const { data, error } = await supabaseBrowserClient
        .from('activity_logs')
        .select('*')
        .eq('id', insertedLogId)
        .single();
      
      if (error) throw error;
      if (!data) throw new Error('Inserted log not found.');

      if (data.summary.includes(testActivityId)) {
        testResults.push({
          testName: 'Read Back Test Log',
          success: true,
          message: 'Successfully read back the inserted test log.',
          data: data,
        });
      } else {
        throw new Error('Mismatch in read-back data.');
      }
      
      // Cleanup the test log
      await supabaseBrowserClient.from('activity_logs').delete().eq('id', insertedLogId);

    } catch (error: any) {
      overallSuccess = false;
      testResults.push({
        testName: 'Read Back Test Log',
        success: false,
        message: `Failed to read back test log: ${error.message}`,
      });
    }
  } else {
     overallSuccess = false;
     testResults.push({
        testName: 'Read Back Test Log',
        success: false,
        message: 'Skipped because insert failed.',
     });
  }

  return {
    success: overallSuccess,
    message: overallSuccess ? 'All logger tests passed successfully!' : 'Some logger tests failed.',
    testResults,
  };
}
