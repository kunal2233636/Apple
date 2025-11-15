// AI EMBEDDING ENDPOINT - Multi-Mode Embedding Service
// Supports: embed, search, and RAG modes

import { NextRequest, NextResponse } from 'next/server';
import { unifiedEmbeddingService } from '@/lib/ai/unified-embedding-service';
import type { AIProvider } from '@/types/api-test';

// Request interfaces
interface EmbedModeRequest {
  mode: 'embed';
  texts: string[];
  provider?: AIProvider;
  model?: string;
}

interface SearchModeRequest {
  mode: 'search';
  query: string;
  userId: string;
  conversationId?: string;
  limit?: number;
  minSimilarity?: number;
  provider?: AIProvider;
  model?: string;
}

interface RAGModeRequest {
  mode: 'rag';
  query: string;
  userId: string;
  conversationId?: string;
  generateAnswer?: boolean;
  limit?: number;
  provider?: AIProvider;
  model?: string;
}

type EmbeddingRequest = EmbedModeRequest | SearchModeRequest | RAGModeRequest;

// Response interfaces
interface EmbedModeResponse {
  success: true;
  mode: 'embed';
  data: {
    embeddings: number[][];
    provider: AIProvider;
    model: string;
    dimensions: number;
    count: number;
  };
}

interface SearchModeResponse {
  success: true;
  mode: 'search';
  data: {
    memories: Array<{
      id: string;
      content: string;
      response: string;
      similarity: number;
      created_at: string;
    }>;
    count: number;
    query: string;
  };
}

interface RAGModeResponse {
  success: true;
  mode: 'rag';
  data: {
    context: Array<{
      content: string;
      source: string;
      relevance: number;
    }>;
    answer?: string;
    sources: string[];
  };
}

/**
 * POST /api/ai/embedding - Multi-mode embedding endpoint
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `embedding-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

  try {
    console.log('🚀 Embedding API request received', { requestId });

    const body = await request.json() as EmbeddingRequest;
    const mode = body.mode || 'embed';

    console.log('📋 Request mode:', mode);

    // Route to appropriate handler based on mode
    switch (mode) {
      case 'embed':
        return await handleEmbedMode(body as EmbedModeRequest, requestId, startTime);
      
      case 'search':
        return await handleSearchMode(body as SearchModeRequest, requestId, startTime);
      
      case 'rag':
        return await handleRAGMode(body as RAGModeRequest, requestId, startTime);
      
      default:
        return NextResponse.json({
          success: false,
          error: {
            code: 'INVALID_MODE',
            message: `Invalid mode: ${mode}. Supported modes: embed, search, rag`
          }
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Embedding API error:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Embedding API request failed',
        details: error instanceof Error ? error.message : String(error)
      },
      metadata: {
        requestId,
        processingTime: Date.now() - startTime
      }
    }, { status: 500 });
  }
}

/**
 * Handle embed mode - Generate embeddings for texts
 */
async function handleEmbedMode(
  body: EmbedModeRequest,
  requestId: string,
  startTime: number
): Promise<NextResponse> {
  try {
    const { texts, provider, model } = body;

    // Validation
    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'texts array is required and must not be empty'
        }
      }, { status: 400 });
    }

    console.log('🔢 Generating embeddings for', texts.length, 'texts');

    // Generate embeddings using unified service
    const result = await unifiedEmbeddingService.generateEmbeddings({
      texts,
      provider,
      model
    });

    console.log('✅ Embeddings generated successfully');

    return NextResponse.json({
      success: true,
      mode: 'embed',
      data: {
        embeddings: result.embeddings,
        provider: result.provider,
        model: result.model,
        dimensions: result.dimensions,
        count: result.embeddings.length
      },
      metadata: {
        requestId,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Embed mode error:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'EMBED_FAILED',
        message: 'Failed to generate embeddings',
        details: error instanceof Error ? error.message : String(error)
      },
      metadata: {
        requestId,
        processingTime: Date.now() - startTime
      }
    }, { status: 500 });
  }
}

/**
 * Handle search mode - Semantic search over conversation memory
 */
async function handleSearchMode(
  body: SearchModeRequest,
  requestId: string,
  startTime: number
): Promise<NextResponse> {
  try {
    const { query, userId, conversationId, limit = 10, minSimilarity = 0.7, provider, model } = body;

    // Validation
    if (!query || !userId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'query and userId are required'
        }
      }, { status: 400 });
    }

    console.log('🔍 Performing semantic search for user:', userId);

    // Generate query embedding
    const embeddingResult = await unifiedEmbeddingService.generateEmbeddings({
      texts: [query],
      provider,
      model
    });

    const queryEmbedding = embeddingResult.embeddings[0];

    // Import Supabase client dynamically
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Build query
    let dbQuery = supabase
      .from('conversation_memory')
      .select('id, interaction_data, created_at, embedding')
      .eq('user_id', userId);

    if (conversationId) {
      dbQuery = dbQuery.eq('conversation_id', conversationId);
    }

    const { data: memories, error } = await dbQuery
      .order('created_at', { ascending: false })
      .limit(100); // Get more for filtering

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    // Calculate similarity scores and filter
    const results = (memories || [])
      .map(memory => {
        const memoryEmbedding = memory.embedding;
        let similarity = 0;

        if (memoryEmbedding && Array.isArray(memoryEmbedding)) {
          // Calculate cosine similarity
          similarity = cosineSimilarity(queryEmbedding, memoryEmbedding);
        }

        return {
          id: memory.id,
          content: memory.interaction_data?.content || '',
          response: memory.interaction_data?.response || '',
          similarity,
          created_at: memory.created_at
        };
      })
      .filter(result => result.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    console.log('✅ Found', results.length, 'relevant memories');

    return NextResponse.json({
      success: true,
      mode: 'search',
      data: {
        memories: results,
        count: results.length,
        query
      },
      metadata: {
        requestId,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        embeddingProvider: embeddingResult.provider,
        embeddingModel: embeddingResult.model
      }
    });

  } catch (error) {
    console.error('❌ Search mode error:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'SEARCH_FAILED',
        message: 'Failed to perform semantic search',
        details: error instanceof Error ? error.message : String(error)
      },
      metadata: {
        requestId,
        processingTime: Date.now() - startTime
      }
    }, { status: 500 });
  }
}

/**
 * Handle RAG mode - Retrieve context and optionally generate answer
 */
async function handleRAGMode(
  body: RAGModeRequest,
  requestId: string,
  startTime: number
): Promise<NextResponse> {
  try {
    const { query, userId, conversationId, generateAnswer = false, limit = 5, provider, model } = body;

    // Validation
    if (!query || !userId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'query and userId are required'
        }
      }, { status: 400 });
    }

    console.log('📚 Performing RAG retrieval for user:', userId);

    // First, perform semantic search to get relevant context
    const searchResponse = await handleSearchMode(
      {
        mode: 'search',
        query,
        userId,
        conversationId,
        limit,
        minSimilarity: 0.6,
        provider,
        model
      },
      requestId,
      startTime
    );

    const searchData = await searchResponse.json();

    if (!searchData.success) {
      throw new Error('Failed to retrieve context');
    }

    // Format context
    const context = searchData.data.memories.map((memory: any) => ({
      content: memory.content,
      source: 'conversation_memory',
      relevance: memory.similarity
    }));

    const sources = context.map((c: any) => c.source);

    let answer: string | undefined;

    // Optionally generate answer using LLM
    if (generateAnswer && context.length > 0) {
      console.log('🤖 Generating answer with LLM');
      
      // Import AI service manager
      const { aiServiceManager } = await import('@/lib/ai/ai-service-manager-unified');
      
      // Build context string
      const contextString = context
        .map((c: any, i: number) => `[${i + 1}] ${c.content}`)
        .join('\n\n');

      // Generate answer
      const aiResponse = await aiServiceManager.processQuery({
        userId,
        message: `Based on the following context, answer this question: ${query}\n\nContext:\n${contextString}`,
        conversationId: conversationId || `rag-${Date.now()}`,
        chatType: 'general',
        includeAppData: false
      });

      answer = aiResponse.content;
    }

    console.log('✅ RAG retrieval completed');

    return NextResponse.json({
      success: true,
      mode: 'rag',
      data: {
        context,
        answer,
        sources
      },
      metadata: {
        requestId,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        contextCount: context.length
      }
    });

  } catch (error) {
    console.error('❌ RAG mode error:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'RAG_FAILED',
        message: 'Failed to perform RAG retrieval',
        details: error instanceof Error ? error.message : String(error)
      },
      metadata: {
        requestId,
        processingTime: Date.now() - startTime
      }
    }, { status: 500 });
  }
}

/**
 * GET /api/ai/embedding - Health check
 */
export async function GET() {
  try {
    console.log('🏥 Health check requested');

    // Perform health check on embedding service
    const healthStatus = await unifiedEmbeddingService.performHealthCheck();
    const usageStats = unifiedEmbeddingService.getUsageStatistics();

    return NextResponse.json({
      success: true,
      data: {
        status: 'healthy',
        endpoint: '/api/ai/embedding',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        modes: ['embed', 'search', 'rag'],
        providers: healthStatus,
        usage: usageStats
      }
    });

  } catch (error) {
    console.error('❌ Health check failed:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Health check failed',
        details: error instanceof Error ? error.message : String(error)
      }
    }, { status: 500 });
  }
}

// Helper function: Calculate cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}
