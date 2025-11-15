// AI Memory Operations Endpoint
// =============================
// Combined endpoint for storing and retrieving memories (GET: Search, POST: Store)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logError, logInfo } from '@/lib/error-logger-server-safe';
import { createHash } from 'crypto';
import { MemoryQueries } from '@/lib/database/queries';
import { semanticSearch, generateQueryEmbedding } from '@/lib/ai/semantic-search';
import type { AIProvider } from '@/types/api-test';

// Server-side Supabase client for direct database operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Request/Response interfaces for memory storage
interface MemoryStorageRequest {
  userId: string;
  message: string;
 response: string;
 conversationId?: string;
  memory_type?: 'session' | 'universal'; // Dual-layer memory type
  metadata?: {
    memoryType?: 'user_query' | 'ai_response' | 'learning_interaction' | 'feedback' | 'correction' | 'insight';
    priority?: 'low' | 'medium' | 'high' | 'critical';
    retention?: 'session' | 'short_term' | 'long_term' | 'permanent';
    topic?: string;
    subject?: string;
    learningObjective?: string;
    provider?: string;
    model?: string;
    tokensUsed?: number;
    processingTime?: number;
    confidenceScore?: number;
    tags?: string[];
    context?: Record<string, any>;
    sessionId?: string;
  };
}

// Request interface for memory updates
interface MemoryUpdateRequest {
  userId: string;
  memoryId: string;
  message?: string;
  response?: string;
  metadata?: {
    memoryType?: 'user_query' | 'ai_response' | 'learning_interaction' | 'feedback' | 'correction' | 'insight';
    priority?: 'low' | 'medium' | 'high' | 'critical';
    topic?: string;
    subject?: string;
    tags?: string[];
    context?: Record<string, any>;
  };
}

interface MemoryStorageResponse {
  success: boolean;
  data?: {
    memoryId: string;
    qualityScore: number;
    relevanceScore: number;
    storedAt: string;
    memoryType: string;
  };
  error?: {
    code: string;
    message: string;
    details?: string;
  };
  metadata?: {
    requestId: string;
    processingTime: number;
    timestamp: string;
  };
}

// Request/Response interfaces for memory search
interface SemanticSearchRequest {
  userId: string;
  query: string;
  limit?: number;
  minSimilarity?: number;
  tags?: string[];
  importanceScore?: number;
  contextLevel?: 'light' | 'balanced' | 'comprehensive';
  preferredProvider?: AIProvider;
  searchType?: 'vector' | 'text' | 'hybrid';
}

interface SemanticSearchResult {
  memories: Array<{
    id: string;
    content: string;
    similarity: number;
    relevanceScore: number;
    qualityScore: number;
    tags: string[];
    created_at: string;
    updated_at: string;
    interaction_data: any;
    metadata: {
      memoryType?: string;
      priority?: string;
      topic?: string;
      subject?: string;
      conversationId?: string;
      sessionId?: string;
    };
  }>;
  searchStats: {
    totalFound: number;
    searchTimeMs: number;
    searchType: string;
    minSimilarityApplied: number;
    averageSimilarity: number;
    tagsFilter?: string[];
    contextLevel?: string;
    embeddingGenerated: boolean;
    fallbackUsed: boolean;
  };
  metadata: {
    requestId: string;
    processingTime: number;
    timestamp: string;
  };
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: string;
  };
  metadata: {
    requestId: string;
    processingTime: number;
    timestamp: string;
  };
}

/**
 * Calculate quality score for stored memory
 */
function calculateQualityScore(interactionData: any): number {
  let score = 0.5;

  if (interactionData.content && interactionData.content.length > 10) score += 0.1;
  if (interactionData.complexity === 'complex') score += 0.1;
  if (interactionData.sentiment === 'positive') score += 0.1;
  
  if (interactionData.response) {
    score += 0.2;
    if (interactionData.confidenceScore && interactionData.confidenceScore > 0.8) {
      score += 0.1;
    }
  }

  if (interactionData.learningObjective) score += 0.1;
  if (interactionData.topic) score += 0.05;

  if (interactionData.processingTime && interactionData.processingTime < 5000) score += 0.05;
  if (interactionData.tokensUsed && interactionData.tokensUsed < 1000) score += 0.05;

  return Math.min(1.0, Math.max(0.0, score));
}

/**
 * Calculate relevance score for stored memory
 */
function calculateRelevanceScore(memoryData: any): number {
  let score = 0.3;

  const priorityScores = { low: 0.1, medium: 0.2, high: 0.3, critical: 0.4 };
  score += priorityScores[(memoryData.priority as keyof typeof priorityScores) || 'medium'] || 0.2;

  if (memoryData.message) score += 0.2;
  if (memoryData.topic) score += 0.1;
  if (memoryData.tags && memoryData.tags.length > 0) score += 0.1;

  const typeScores: Record<string, number> = {
    user_query: 0.2,
    ai_response: 0.15,
    learning_interaction: 0.25,
    feedback: 0.2,
    correction: 0.3,
    insight: 0.35
  };
  score += typeScores[memoryData.memoryType || 'user_query'] || 0.1;

  return Math.min(1.0, score);
}

/**
 * Calculate expiration date based on retention policy
 */
function calculateExpirationDate(retention: string): Date {
  const now = new Date();
  
  switch (retention) {
    case 'session':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case 'short_term':
      return new Date(now.getTime() + 7 * 24 * 60 * 1000);
    case 'long_term':
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    case 'permanent':
      return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() + 30 * 24 * 60 * 1000);
  }
}

/**
 * Generate a simple UUID v4 format
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate memory ID
 */
function generateMemoryId(): string {
  return generateUUID(); // Use proper UUID format
}

/**
 * Generate checksum for content validation
 */
function generateChecksum(content: string): string {
  return createHash('sha256').update(content + 'ai-memory-storage').digest('hex');
}

/**
 * Extract content from memory for text-based search
 */
function extractMemoryContent(memory: any): string {
  // Try multiple fields to get the actual content
  if (memory.interaction_data?.content) {
    return memory.interaction_data.content;
  }
 if (memory.interaction_data?.message) {
    return memory.interaction_data.message;
  }
  if (memory.content) {
    return memory.content;
 }
  if (memory.message) {
    return memory.message;
  }
 if (memory.response) {
    return memory.response;
  }
 return '';
}

/**
 * Calculate text similarity score for fallback search
 */
function calculateTextSimilarity(query: string, content: string): number {
  if (!query || !content) return 0;
  
  const queryLower = query.toLowerCase();
  const contentLower = content.toLowerCase();
  
  // Exact match gets highest score
  if (contentLower.includes(queryLower)) {
    return 0.9;
  }
  
  // Check for word overlap
 const queryWords = queryLower.split(/\s+/);
  const contentWords = contentLower.split(/\s+/);
  const matches = queryWords.filter(word => contentWords.some(cword => cword.includes(word)));
  
  if (matches.length === 0) return 0;
  
  // Calculate similarity based on word matches and position
  const matchRatio = matches.length / queryWords.length;
  const positionBonus = queryWords[0] && contentLower.indexOf(queryWords[0]) !== -1 ? 0.1 : 0;
  
  return Math.min(0.8, matchRatio * 0.7 + positionBonus);
}

/**
 * Retrieve session-specific memories for a conversation
 */
async function getSessionMemories(
  userId: string, 
  conversationId: string, 
  limit: number = 10
): Promise<any[]> {
  logInfo('Retrieving session memories', {
    componentName: 'AI Memory',
    userId,
    conversationId,
    limit
  });

  try {
    const { data: memories, error } = await supabase
      .from('conversation_memory')
      .select('*')
      .eq('user_id', userId)
      .eq('conversation_id', conversationId)
      .eq('memory_type', 'session')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Session memory retrieval failed: ${error.message}`);
    }

    logInfo('Session memories retrieved', {
      componentName: 'AI Memory',
      userId,
      conversationId,
      count: memories?.length || 0
    });

    return memories || [];

  } catch (error) {
    logError(new Error(`Session memory retrieval failed: ${error instanceof Error ? error.message : String(error)}`), {
      componentName: 'AI Memory',
      userId,
      conversationId,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Retrieve universal memories using semantic search
 */
async function getUniversalMemories(
  userId: string,
  query: string,
  options: {
    limit?: number;
    minSimilarity?: number;
    preferredProvider?: AIProvider;
  } = {}
): Promise<any[]> {
  logInfo('Retrieving universal memories with semantic search', {
    componentName: 'AI Memory',
    userId,
    query: query.substring(0, 100),
    limit: options.limit,
    minSimilarity: options.minSimilarity
  });

  try {
    // Generate embedding for the query
    const { embedding } = await generateQueryEmbedding(query, options.preferredProvider);

    // Perform vector search on universal memories only
    const { data: memories, error } = await supabase.rpc('find_similar_memories', {
      p_user_id: userId,
      p_embedding: embedding,
      p_limit: options.limit || 5,
      p_min_similarity: options.minSimilarity || 0.5
    });

    if (error) {
      logInfo('Vector search failed, falling back to text search for universal memories', {
        componentName: 'AI Memory',
        userId,
        error: error.message
      });

      // Fallback to text-based search with memory_type filter
      const { data: fallbackMemories, error: fallbackError } = await supabase
        .from('conversation_memory')
        .select('*')
        .eq('user_id', userId)
        .eq('memory_type', 'universal')
        .order('memory_relevance_score', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(options.limit || 5);

      if (fallbackError) {
        throw new Error(`Universal memory retrieval failed: ${fallbackError.message}`);
      }

      const results = (fallbackMemories || []).map(memory => ({
        ...memory,
        similarity: memory.memory_relevance_score || 0.5
      }));

      logInfo('Universal memories retrieved (text fallback)', {
        componentName: 'AI Memory',
        userId,
        count: results.length
      });

      return results;
    }

    // Filter by memory_type='universal' from vector search results
    const universalMemories = (memories || []).filter(
      (memory: any) => memory.memory_type === 'universal'
    );

    // Sort by relevance score (combination of similarity and importance)
    const rankedMemories = universalMemories.map((memory: any) => {
      const importanceWeight = (memory.importance_score || 3) / 5; // Normalize to 0-1
      const similarityWeight = memory.similarity || 0.5;
      const relevanceScore = (similarityWeight * 0.7) + (importanceWeight * 0.3);
      
      return {
        ...memory,
        relevanceScore
      };
    }).sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);

    logInfo('Universal memories retrieved', {
      componentName: 'AI Memory',
      userId,
      count: rankedMemories.length
    });

    return rankedMemories;

  } catch (error) {
    logError(new Error(`Universal memory retrieval failed: ${error instanceof Error ? error.message : String(error)}`), {
      componentName: 'AI Memory',
      userId,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Text-based fallback search when vector search fails
 */
async function performTextSearch(userId: string, query: string, options: any): Promise<any[]> {
  logInfo('Performing text-based fallback search', {
    componentName: 'AI Memory',
    userId,
    query: query.substring(0, 100),
    limit: options.limit,
    minSimilarity: options.min_similarity
  });

  try {
    // Get memories with text content for the user
    const { data: memories, error } = await supabase
      .from('conversation_memory')
      .select('*')
      .eq('user_id', userId)
      .order('memory_relevance_score', { ascending: false })
      .limit((options.limit || 5) * 3); // Get more to filter

    if (error) {
      throw new Error(`Text search failed: ${error.message}`);
    }

    // Calculate text similarity scores
    const scoredMemories = (memories || []).map(memory => {
      const content = extractMemoryContent(memory);
      const similarity = calculateTextSimilarity(query, content);
      
      return {
        ...memory,
        similarity,
        searchType: 'text'
      };
    });

    // Filter by minimum similarity
    let filtered = scoredMemories.filter(memory => 
      memory.similarity >= (options.min_similarity || 0.1)
    );

    // Apply tag filter if specified
    if (options.tags && options.tags.length > 0) {
      filtered = filtered.filter(memory => {
        const memoryTags = memory.interaction_data?.tags || memory.tags || [];
        return options.tags.some((tag: string) => memoryTags.includes(tag));
      });
    }

    // Apply importance score filter if specified
    if (options.importance_score) {
      filtered = filtered.filter(memory => 
        (memory.importance_score || 0.5) >= options.importance_score
      );
    }

    // Sort by similarity score and limit results
    const sortedResults = filtered
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, options.limit || 5);

    logInfo('Text-based search completed', {
      componentName: 'AI Memory',
      totalRetrieved: memories?.length || 0,
      totalFiltered: filtered.length,
      finalResults: sortedResults.length
    });

    return sortedResults;

  } catch (error) {
    logError(new Error(`Text search failed: ${error instanceof Error ? error.message : String(error)}`), {
      componentName: 'AI Memory',
      userId,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Handle memory update operation
 */
async function handleMemoryUpdate(
  body: MemoryUpdateRequest,
  startTime: number,
  requestId: string
): Promise<NextResponse> {
  // Validate required fields
  if (!body.userId || !body.memoryId) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: 'Missing required fields: userId, memoryId'
      },
      metadata: {
        requestId,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    }, { status: 400 });
  }

  try {
    // First, fetch the existing memory to verify ownership
    const { data: existingMemory, error: fetchError } = await supabase
      .from('conversation_memory')
      .select('*')
      .eq('id', body.memoryId)
      .eq('user_id', body.userId)
      .single();

    if (fetchError || !existingMemory) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MEMORY_NOT_FOUND',
          message: 'Memory not found or access denied'
        },
        metadata: {
          requestId,
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      }, { status: 404 });
    }

    // Prepare updated interaction_data
    const updatedAt = new Date();
    const existingInteractionData = existingMemory.interaction_data || {};
    
    const updatedInteractionData = {
      ...existingInteractionData,
      content: body.message || existingInteractionData.content,
      response: body.response || existingInteractionData.response,
      memoryType: body.metadata?.memoryType || existingInteractionData.memoryType,
      priority: body.metadata?.priority || existingInteractionData.priority,
      topic: body.metadata?.topic || existingInteractionData.topic,
      subject: body.metadata?.subject || existingInteractionData.subject,
      tags: body.metadata?.tags || existingInteractionData.tags,
      context: body.metadata?.context || existingInteractionData.context,
      metadata: {
        ...existingInteractionData.metadata,
        action: 'updated',
        updatedAt: updatedAt.toISOString(),
        previousUpdate: existingInteractionData.metadata?.updatedAt || existingMemory.created_at
      }
    };

    // Update the memory
    const { data: updatedMemory, error: updateError } = await supabase
      .from('conversation_memory')
      .update({
        interaction_data: updatedInteractionData,
        updated_at: updatedAt.toISOString()
      })
      .eq('id', body.memoryId)
      .eq('user_id', body.userId)
      .select('id, updated_at')
      .single();

    if (updateError) {
      logError(new Error(`Memory update failed: ${updateError.message}`), {
        componentName: 'AI Memory',
        requestId,
        userId: body.userId,
        memoryId: body.memoryId,
        error: updateError.message
      });

      return NextResponse.json({
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to update memory',
          details: updateError.message
        },
        metadata: {
          requestId,
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      }, { status: 500 });
    }

    const processingTime = Date.now() - startTime;

    logInfo('Memory updated successfully', {
      componentName: 'AI Memory',
      requestId,
      userId: body.userId,
      memoryId: body.memoryId,
      processingTime
    });

    return NextResponse.json({
      success: true,
      data: {
        memoryId: updatedMemory.id,
        updatedAt: updatedMemory.updated_at,
        message: 'Memory updated successfully'
      },
      metadata: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logError(new Error(`Memory update failed: ${errorMessage}`), {
      componentName: 'AI Memory',
      requestId,
      userId: body.userId,
      memoryId: body.memoryId,
      error: errorMessage
    });

    return NextResponse.json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'An error occurred while updating memory',
        details: errorMessage
      },
      metadata: {
        requestId,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

/**
 * POST /api/ai/memory - Store AI conversation memory
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `ai-memory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    logInfo('AI memory storage request received', {
      componentName: 'AI Memory',
      requestId
    });

    // Parse request body
    const body = await request.json();

    // Check operation type based on fields
    if (body.memoryId && body.userId) {
      // This is a memory update request
      return await handleMemoryUpdate(body, startTime, requestId);
    } else if (body.message && body.response) {
      // This is a memory storage request
      return await handleMemoryStorage(body, startTime, requestId);
    } else if (body.query) {
      // This is a search request
      return await handleMemorySearch(body, startTime, requestId);
    } else {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Request must contain either (memoryId and userId) for update, (message and response) for storage, or (query) for search'
        },
        metadata: {
          requestId,
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logError(new Error(`AI memory operation failed: ${errorMessage}`), {
      componentName: 'AI Memory',
      requestId,
      userId: 'unknown',
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred during memory operation',
        details: errorMessage
      },
      metadata: {
        requestId,
        processingTime,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

/**
 * Handle memory storage operation
 */
async function handleMemoryStorage(
  body: MemoryStorageRequest, 
  startTime: number, 
  requestId: string
): Promise<NextResponse> {
  // Validate required fields for storage
  if (!body.userId || !body.message || !body.response) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: 'Missing required fields: userId, message, response'
      },
      metadata: {
        requestId,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    }, { status: 400 });
  }

  // Validate userId format - allow both real UUIDs and test IDs
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const testUserRegex = /^[0-9a-z-]+$/i; // Allow alphanumeric and dashes for test users
  if (!uuidRegex.test(body.userId) && !testUserRegex.test(body.userId)) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'INVALID_USER_ID',
        message: 'userId must be a valid UUID or test user ID'
      },
      metadata: {
        requestId,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    }, { status: 400 });
  }

  // Prepare memory data
 const memoryId = generateMemoryId();
  const memoryType = body.metadata?.memoryType || 'ai_response';
  const priority = body.metadata?.priority || 'medium';
  const retention = body.metadata?.retention || 'long_term';
  const expiresAt = calculateExpirationDate(retention);
  const createdAt = new Date();
  
  // Determine memory_type (session or universal) - defaults to session
  const memoryTypeLayer = body.memory_type || 'session';

  // Calculate scores
  const interactionData = {
    content: body.message,
    response: body.response,
    intent: body.metadata?.learningObjective,
    context: body.metadata?.context,
    sentiment: 'neutral' as const,
    complexity: 'moderate' as const,
    subject: body.metadata?.subject,
    topic: body.metadata?.topic,
    learningObjective: body.metadata?.learningObjective,
    sessionId: body.metadata?.sessionId,
    timestamp: createdAt,
    modelUsed: body.metadata?.model,
    provider: body.metadata?.provider,
    processingTime: body.metadata?.processingTime,
    tokensUsed: body.metadata?.tokensUsed,
    confidenceScore: body.metadata?.confidenceScore,
    tags: body.metadata?.tags || []
  };

  const qualityScore = calculateQualityScore(interactionData);
  const relevanceScore = calculateRelevanceScore({
    message: body.message,
    topic: body.metadata?.topic,
    tags: body.metadata?.tags,
    priority,
    memoryType
  });

  // Prepare conversation_id as proper UUID
  const conversationId = body.conversationId || generateUUID();
  
  // Prepare database insert payload
 const insertPayload = {
   id: memoryId,
   user_id: body.userId,
   conversation_id: conversationId,
   memory_type: memoryTypeLayer, // Add memory_type for dual-layer system
   interaction_data: {
     ...interactionData,
     memoryType,
     priority,
     retention,
     metadata: {
       source: 'ai_response',
       version: 1,
       compressionApplied: false,
       validationStatus: 'valid',
       accessCount: 0,
       lastAccessed: createdAt,
       linkedToKnowledgeBase: false,
       crossConversationLinked: false
     }
   },
   quality_score: qualityScore,
   user_satisfaction: null,
   feedback_collected: false,
   memory_relevance_score: relevanceScore,
   created_at: createdAt.toISOString(),
   updated_at: createdAt.toISOString(),
   expires_at: expiresAt.toISOString()
 };

 logInfo('Inserting memory into database', {
   componentName: 'AI Memory',
   requestId,
   userId: body.userId,
   memoryId,
   memoryType,
   memoryTypeLayer, // Log the dual-layer memory type
   priority,
   retention,
   qualityScore,
   relevanceScore
 });

 // Insert into conversation_memory table
 const { data, error } = await supabase
   .from('conversation_memory')
   .insert([insertPayload])
   .select('id, created_at')
   .single();

 if (error) {
   logError(new Error(`Database insert failed: ${error.message}`), {
     componentName: 'AI Memory',
     requestId,
     userId: body.userId,
     error: error.message,
     details: error.details,
     hint: error.hint
   });

   return NextResponse.json({
     success: false,
     error: {
       code: 'DATABASE_ERROR',
       message: 'Failed to store memory in database',
       details: error.message
     },
     metadata: {
       requestId,
       processingTime: Date.now() - startTime,
       timestamp: new Date().toISOString()
     }
   }, { status: 500 });
 }

 const processingTime = Date.now() - startTime;

 logInfo('AI memory storage successful', {
   componentName: 'AI Memory',
   requestId,
   userId: body.userId,
   memoryId: data.id,
   processingTime,
   qualityScore,
   relevanceScore
 });

 // Return success response
return NextResponse.json({
   success: true,
   data: {
     memoryId: data.id,
     qualityScore,
     relevanceScore,
     storedAt: data.created_at,
     memoryType
   },
   metadata: {
     requestId,
     processingTime,
     timestamp: new Date().toISOString()
   }
 });
}

/**
 * Handle memory search operation
 */
async function handleMemorySearch(
  body: SemanticSearchRequest, 
 startTime: number, 
  requestId: string
): Promise<NextResponse> {
  // Validate required fields for search
  if (!body.userId || !body.query) {
    const response: ErrorResponse = {
      error: {
        code: 'INVALID_REQUEST',
        message: 'Missing required fields: userId, query'
      },
      metadata: {
        requestId,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    };
    return NextResponse.json(response, { status: 400 });
  }

  // Validate userId format - allow both real UUIDs and test IDs
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const testUserRegex = /^[0-9a-z-]+$/i; // Allow alphanumeric and dashes for test users
  if (!uuidRegex.test(body.userId) && !testUserRegex.test(body.userId)) {
    const response: ErrorResponse = {
      error: {
        code: 'INVALID_USER_ID',
        message: 'userId must be a valid UUID or test user ID'
      },
      metadata: {
        requestId,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    };
    return NextResponse.json(response, { status: 400 });
  }

  // Set default options
  const searchOptions = {
    limit: Math.min(body.limit || 5, 20), // Cap at 20
    min_similarity: Math.max(0.1, Math.min(body.minSimilarity || 0.5, 1.0)), // Lower threshold for faster results
    tags: body.tags || [],
    importance_score: body.importanceScore
  };

  const searchType = body.searchType || 'hybrid';
  let memories: any[] = [];
  let embeddingGenerated = false;
  let fallbackUsed = false;

  logInfo('Starting memory search', {
    componentName: 'AI Memory',
    requestId,
    userId: body.userId,
    query: body.query.substring(0, 100),
    searchType,
    ...searchOptions
  });

  try {
    if (searchType === 'vector' || searchType === 'hybrid') {
      try {
        // Try vector-based semantic search
        const { embedding } = await generateQueryEmbedding(body.query, body.preferredProvider);
        embeddingGenerated = true;

        memories = await MemoryQueries.findSimilarMemories(
          body.userId, 
          embedding, 
          searchOptions
        );

        logInfo('Vector search successful', {
          componentName: 'AI Memory',
          requestId,
          resultsFound: memories.length
        });

      } catch (vectorError) {
        if (searchType === 'vector') {
          throw vectorError; // Re-throw if vector-only search failed
        }

        logInfo('Vector search failed, falling back to text search', {
          componentName: 'AI Memory',
          requestId,
          error: vectorError instanceof Error ? vectorError.message : String(vectorError)
        });

        fallbackUsed = true;
        memories = await performTextSearch(body.userId, body.query, searchOptions);
      }
    } else {
      // Text-only search
      memories = await performTextSearch(body.userId, body.query, searchOptions);
    }

 } catch (searchError) {
    logError(new Error(`Search failed: ${searchError instanceof Error ? searchError.message : String(searchError)}`), {
      componentName: 'AI Memory',
      requestId,
      userId: body.userId,
      searchType,
      error: searchError instanceof Error ? searchError.message : String(searchError)
    });

    const response: ErrorResponse = {
      error: {
        code: 'SEARCH_FAILED',
        message: 'Failed to search memories',
        details: searchError instanceof Error ? searchError.message : String(searchError)
      },
      metadata: {
        requestId,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    };
    return NextResponse.json(response, { status: 500 });
  }

  // Process and format results
  const processedMemories = memories.map(memory => {
    const content = extractMemoryContent(memory);
    const interactionData = memory.interaction_data || {};
    
    return {
      id: memory.id,
      content,
      similarity: memory.similarity || memory.memory_relevance_score || 0.5,
      relevanceScore: memory.memory_relevance_score || 0.5,
      qualityScore: memory.quality_score || 0.5,
      tags: interactionData.tags || memory.tags || [],
      created_at: memory.created_at,
      updated_at: memory.updated_at,
      interaction_data: memory.interaction_data,
      metadata: {
        memoryType: interactionData.memoryType,
        priority: interactionData.priority,
        topic: interactionData.topic,
        subject: interactionData.subject,
        conversationId: memory.conversation_id,
        sessionId: interactionData.sessionId
      }
    };
  });

  // Apply context level filtering if specified
  let filteredMemories = processedMemories;
  if (body.contextLevel) {
    const contextLevel = body.contextLevel;
    switch (contextLevel) {
      case 'light':
        filteredMemories = processedMemories.slice(0, 2);
        break;
      case 'balanced':
        // Take top 3-4 with diversity
        const topResults = processedMemories.slice(0, 4);
        const uniqueTopics = new Set<string>();
        const diverseResults: any[] = [];
        
        for (const memory of topResults) {
          const topicKey = memory.metadata.topic || 'general';
          if (!uniqueTopics.has(topicKey) || diverseResults.length < 2) {
            uniqueTopics.add(topicKey);
            diverseResults.push(memory);
          }
        }
        filteredMemories = diverseResults.length > 0 ? diverseResults : topResults;
        break;
      case 'comprehensive':
        // Return all (already limited by searchOptions.limit)
        filteredMemories = processedMemories;
        break;
      default:
        filteredMemories = processedMemories.slice(0, 3);
    }
  }

  // Calculate search statistics
  const searchTimeMs = Date.now() - startTime;
  const similarities = filteredMemories.map(m => m.similarity);
  const averageSimilarity = similarities.length > 0 
    ? similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length 
    : 0;

  const result: SemanticSearchResult = {
    memories: filteredMemories,
    searchStats: {
      totalFound: filteredMemories.length,
      searchTimeMs,
      searchType,
      minSimilarityApplied: searchOptions.min_similarity,
      averageSimilarity,
      tagsFilter: body.tags || undefined,
      contextLevel: body.contextLevel,
      embeddingGenerated,
      fallbackUsed
    },
    metadata: {
      requestId,
      processingTime: searchTimeMs,
      timestamp: new Date().toISOString()
    }
  };

  logInfo('AI memory search completed successfully', {
    componentName: 'AI Memory',
    requestId,
    userId: body.userId,
    resultsFound: filteredMemories.length,
    searchTimeMs,
    searchType,
    embeddingGenerated,
    fallbackUsed
 });

  return NextResponse.json(result);
}

/**
 * GET /api/ai/memory - Search memories using semantic search
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const query = searchParams.get('query');
    const limit = searchParams.get('limit');
    const minSimilarity = searchParams.get('minSimilarity');
    const action = searchParams.get('action');

    // If action is 'health', perform health check
    if (action === 'health') {
      // Test database connectivity
      const { error: dbError } = await supabase
        .from('conversation_memory')
        .select('id')
        .limit(1);

      const dbHealthy = !dbError;
      
      return NextResponse.json({
        success: true,
        data: {
          status: 'AI Memory API is operational',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          system: {
            database: {
              connected: dbHealthy,
              table: 'conversation_memory',
              error: dbError?.message
            },
            search_modes: {
              vector: true,
              text: true,
              hybrid: true
            },
            storage: {
              mode: 'direct_server_access',
              bypass_rls: true,
              service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY
            }
          }
        }
      });
    }

    // If we have query parameters, treat as search request
    if (userId && query) {
      const searchRequest: SemanticSearchRequest = {
        userId,
        query,
        limit: limit ? parseInt(limit) : undefined,
        minSimilarity: minSimilarity ? parseFloat(minSimilarity) : undefined
      };

      const startTime = Date.now();
      const requestId = `ai-memory-search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      return await handleMemorySearch(searchRequest, startTime, requestId);
    }

    // Default: Return API information
    return NextResponse.json({
      success: true,
      data: {
        endpoint: 'AI Memory Operations',
        description: 'Combined endpoint for storing and retrieving memories (GET: Search, POST: Store)',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        usage: {
          'GET /api/ai/memory': {
            description: 'Search memories',
            parameters: {
              userId: 'UUID string (required)',
              query: 'Search query (required)',
              limit: 'Optional: number of results (default: 5, max: 20)',
              minSimilarity: 'Optional: minimum similarity score (0.1-1.0, default: 0.5)',
              action: 'Optional: health for health check'
            }
          },
          'POST /api/ai/memory': {
            description: 'Store memories (if body has message and response), update (if body has memoryId), or search (if body has query)',
            body: {
              store: {
                userId: 'UUID string (required)',
                message: 'User message (required)',
                response: 'AI response (required)',
                conversationId: 'Optional conversation identifier',
                memory_type: 'Optional: session|universal (default: session)',
                metadata: {
                  memoryType: 'Optional: user_query|ai_response|learning_interaction|feedback|correction|insight',
                  priority: 'Optional: low|medium|high|critical',
                  retention: 'Optional: session|short_term|long_term|permanent',
                  topic: 'Optional topic',
                  subject: 'Optional subject',
                  provider: 'Optional AI provider',
                  model: 'Optional model used',
                  tags: 'Optional array of tags'
                }
              },
              update: {
                userId: 'UUID string (required)',
                memoryId: 'UUID string (required)',
                message: 'Optional: Updated user message',
                response: 'Optional: Updated AI response',
                metadata: {
                  memoryType: 'Optional: user_query|ai_response|learning_interaction|feedback|correction|insight',
                  priority: 'Optional: low|medium|high|critical',
                  topic: 'Optional topic',
                  subject: 'Optional subject',
                  tags: 'Optional array of tags'
                }
              },
              search: {
                userId: 'UUID string (required)',
                query: 'Search query (required)',
                limit: 'Optional: number of results (default: 5, max: 20)',
                minSimilarity: 'Optional: minimum similarity score (0.1-1.0, default: 0.5)',
                tags: 'Optional: array of tags to filter by',
                searchType: 'Optional: vector|text|hybrid (default: hybrid)'
              }
            }
          }
        }
      }
    });

  } catch (error) {
    logError(new Error(`GET request failed: ${error instanceof Error ? error.message : String(error)}`), {
      componentName: 'AI Memory',
      operation: 'search'
    });

    return NextResponse.json({
      success: false,
      error: {
        code: 'MEMORY_OPERATION_FAILED',
        message: 'Failed to perform memory operation',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 });
  }
}