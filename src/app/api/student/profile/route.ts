// Student Profile API Endpoint
// ==========================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { studentContextBuilder } from '@/lib/ai/student-context-builder';
import { ProfileQueries } from '@/lib/database/queries';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Schema for request validation
const GetProfileSchema = z.object({
  userId: z.string().uuid(),
});

// Response interface
interface ProfileResponse {
  success: boolean;
  data: {
    profileText: string;
    strongSubjects: string[];
    weakSubjects: string[];
    examTarget?: string;
    studyProgress: {
      totalTopics: number;
      completedTopics: number;
      accuracy: number;
    };
    currentData: {
      streak: number;
      level: number;
      points: number;
      revisionQueue: number;
    };
    lastUpdated: string;
  };
  error?: string;
}

/**
 * GET /api/student/profile
 * Get student profile for Study Buddy display
 */
export async function GET(request: NextRequest): Promise<NextResponse<ProfileResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'userId parameter is required',
          data: {
            profileText: 'Student profile loading...',
            strongSubjects: [],
            weakSubjects: [],
            studyProgress: {
              totalTopics: 0,
              completedTopics: 0,
              accuracy: 0
            },
            currentData: {
              streak: 0,
              level: 1,
              points: 0,
              revisionQueue: 0
            },
            lastUpdated: new Date().toISOString()
          }
        },
        { status: 400 }
      );
    }

    // Validate userId format
    GetProfileSchema.parse({ userId });

    try {
      // Build comprehensive student context
      const studentContext = await studentContextBuilder.buildFullAIContext(userId, 3);

      // Try to get existing profile from database
      let databaseProfile = null;
      try {
        databaseProfile = await ProfileQueries.getProfile(userId);
      } catch (error) {
        console.warn('Failed to fetch database profile:', error);
        // Continue with context-based profile
      }

      // Prepare response data
      const responseData = {
        profileText: studentContext.profileText,
        strongSubjects: studentContext.strongSubjects,
        weakSubjects: studentContext.weakSubjects,
        examTarget: studentContext.examTarget,
        studyProgress: {
          totalTopics: studentContext.studyProgress.totalTopics,
          completedTopics: studentContext.studyProgress.completedTopics,
          accuracy: studentContext.studyProgress.accuracy
        },
        currentData: {
          streak: studentContext.currentData.streak,
          level: studentContext.currentData.level,
          points: studentContext.currentData.points,
          revisionQueue: studentContext.currentData.revisionQueue
        },
        lastUpdated: new Date().toISOString()
      };

      // Update database profile if we have good context data
      if (studentContext.profileText && studentContext.profileText.length > 0) {
        try {
          await ProfileQueries.upsertProfile(userId, {
            profile_text: studentContext.profileText,
            strong_subjects: studentContext.strongSubjects,
            weak_subjects: studentContext.weakSubjects,
            learning_style: studentContext.learningStyle,
            exam_target: studentContext.examTarget
          });
        } catch (error) {
          console.warn('Failed to update database profile:', error);
          // Don't fail the request if profile update fails
        }
      }

      const response: ProfileResponse = {
        success: true,
        data: responseData
      };

      return NextResponse.json(response);

    } catch (error) {
      console.error('Failed to build student context:', error);
      
      // Return fallback profile
      const fallbackResponse: ProfileResponse = {
        success: true,
        data: {
          profileText: 'Profile data temporarily unavailable. Please try again later.',
          strongSubjects: [],
          weakSubjects: [],
          studyProgress: {
            totalTopics: 0,
            completedTopics: 0,
            accuracy: 0
          },
          currentData: {
            streak: 0,
            level: 1,
            points: 0,
            revisionQueue: 0
          },
          lastUpdated: new Date().toISOString()
        }
      };

      return NextResponse.json(fallbackResponse);

    }

  } catch (error) {
    console.error('Student profile API error:', error);

    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        data: {
          profileText: 'Error loading profile',
          strongSubjects: [],
          weakSubjects: [],
          studyProgress: {
            totalTopics: 0,
            completedTopics: 0,
            accuracy: 0
          },
          currentData: {
            streak: 0,
            level: 1,
            points: 0,
            revisionQueue: 0
          },
          lastUpdated: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}