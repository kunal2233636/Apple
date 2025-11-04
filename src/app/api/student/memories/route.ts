// Student Memories API Endpoint
// ============================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { MemoryQueries } from '@/lib/database/queries';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Schema for request validation
const GetMemoriesSchema = z.object({
  userId: z.string().uuid(),
  limit: z.number().min(1).max(50).optional().default(10),
  minImportance: z.number().min(1).max(5).optional(),
  tags: z.string().optional(),
});

// Response interface
interface MemoriesResponse {
  success: boolean;
  data: {
    memories: Array<{
      id: string;
      content: string;
      importance_score: number;
      tags: string[];
      created_at: string;
      expires_at: string;
      category?: string;
    }>;
    total: number;
    filters: {
      limit: number;
      minImportance?: number;
      tags?: string;
    };
  };
  error?: string;
}

/**
 * GET /api/student/memories
 * Get student memories for debugging/analysis
 */
export async function GET(request: NextRequest): Promise<NextResponse<MemoriesResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = searchParams.get('limit');
    const minImportance = searchParams.get('minImportance');
    const tags = searchParams.get('tags');

    if (!userId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'userId parameter is required',
          data: {
            memories: [],
            total: 0,
            filters: {
              limit: 10
            }
          }
        },
        { status: 400 }
      );
    }

    // Parse and validate parameters
    const params = GetMemoriesSchema.parse({
      userId,
      limit: limit ? parseInt(limit) : undefined,
      minImportance: minImportance ? parseInt(minImportance) : undefined,
      tags: tags || undefined
    });

    try {
      // Fetch memories directly from database using Supabase
      let query = supabase
        .from('study_chat_memory')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('importance_score', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(params.limit);

      // Apply filters
      if (params.minImportance) {
        query = query.gte('importance_score', params.minImportance);
      }

      if (params.tags) {
        const tagArray = params.tags.split(',').map(tag => tag.trim());
        query = query.overlaps('tags', tagArray);
      }

      const { data: memories, error, count } = await query;

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      // Transform memories for response
      const transformedMemories = (memories || []).map(memory => ({
        id: memory.id,
        content: memory.content,
        importance_score: memory.importance_score,
        tags: memory.tags || [],
        created_at: memory.created_at,
        expires_at: memory.expires_at,
        category: memory.tags?.[0] || 'general'
      }));

      const response: MemoriesResponse = {
        success: true,
        data: {
          memories: transformedMemories,
          total: count || transformedMemories.length,
          filters: {
            limit: params.limit,
            minImportance: params.minImportance,
            tags: params.tags
          }
        }
      };

      return NextResponse.json(response);

    } catch (error) {
      console.error('Failed to fetch student memories:', error);
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to fetch memories from database',
          data: {
            memories: [],
            total: 0,
            filters: {
              limit: params.limit,
              minImportance: params.minImportance,
              tags: params.tags
            }
          }
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Student memories API error:', error);

    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        data: {
          memories: [],
          total: 0,
          filters: {
            limit: 10
          }
        }
      },
      { status: 500 }
    );
  }
}