// Study Assistant Send Message API Endpoint
// =======================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Import all the Study Assistant components
import { personalQuestionDetector } from '@/lib/ai/personal-question-detector';
import { studentContextBuilder, determineContextLevel } from '@/lib/ai/student-context-builder';
import { semanticSearch } from '@/lib/ai/semantic-search';
import { memoryExtractor } from '@/lib/ai/memory-extractor';
import { aiServiceManager } from '@/lib/ai/ai-service-manager';
import { ChatQueries, ProfileQueries } from '@/lib/database/queries';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Schema for request validation
const SendMessageSchema = z.object({
  userId: z.string().uuid(),
  conversationId: z.string().uuid(),
  message: z.string().min(1).max(1000),
  chatType: z.enum(['general', 'study_assistant']).default('study_assistant'),
  isPersonalQuery: z.boolean().optional(),
});

// Study Assistant response interface
interface StudyAssistantResponse {
  success: boolean;
  data: {
    response: {
      content: string;
      model_used: string;
      provider_used: string;
      tokens_used: {
        input: number;
        output: number;
      };
      latency_ms: number;
      query_type: string;
      web_search_enabled: boolean;
      fallback_used: boolean;
      cached: boolean;
      isTimeSensitive: boolean;
      language: 'hinglish';
      context_included: boolean;
      memory_references?: Array<{
        content: string;
        similarity: number;
        created_at: string;
      }>;
    };
    conversationId: string;
    timestamp: string;
    metadata: {
      isPersonalQuery: boolean;
      contextLevel: 1 | 2 | 3 | 4;
      memoriesSearched: number;
      insightsExtracted: number;
      cohereUsage: {
        embeddingsGenerated: number;
        monthlyUsage: number;
        monthlyLimit: number;
      };
    };
  };
  error?: string;
}

/**
 * POST /api/chat/study-assistant/send
 * Complete Study Assistant message processing with personalization and memory
 */
export async function POST(request: NextRequest): Promise<NextResponse<StudyAssistantResponse>> {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { userId, conversationId, message, chatType, isPersonalQuery } = SendMessageSchema.parse(body);

    // Step 1: Detect if this is a personal question
    const personalDetection = personalQuestionDetector.detectPersonalQuestion(message);
    const finalIsPersonal = isPersonalQuery !== undefined ? isPersonalQuery : personalDetection.isPersonal;

    // Step 2: Determine optimal context level based on question complexity
    const hasMemoryContext = false; // Will be updated after memory search
    const contextLevel = determineContextLevel(message, hasMemoryContext);

    console.log(`Study Assistant - Personal: ${finalIsPersonal}, Context Level: ${contextLevel}`);

    // Step 3: If personal query, fetch student context and search memories
    let studentContext = '';
    let memoryReferences: Array<{ content: string; similarity: number; created_at: string }> = [];
    let memoriesSearched = 0;

    if (finalIsPersonal) {
      try {
        // Build student context
        studentContext = await studentContextBuilder.buildContextByLevel(userId, contextLevel);
        
        // Search relevant memories using semantic search
        const searchResult = await semanticSearch.searchMemories({
          userId,
          query: message,
          limit: 3,
          minSimilarity: 0.7,
          contextLevel: contextLevel === 1 ? 'light' : contextLevel === 2 ? 'balanced' : 'comprehensive'
        });

        memoriesSearched = searchResult.memories.length;
        
        // Format memory references for response
        memoryReferences = searchResult.memories.map(memory => ({
          content: memory.content,
          similarity: memory.similarity || 0,
          created_at: memory.created_at
        }));

        console.log(`Found ${memoriesSearched} relevant memories`);

      } catch (error) {
        console.warn('Failed to fetch student context or memories:', error);
        // Continue without context - don't fail the request
      }
    }

    // Step 4: Prepare enhanced message for AI Service Manager
    let enhancedMessage = message;
    
    if (finalIsPersonal && studentContext) {
      enhancedMessage = `${message}\n\nStudent Context:\n${studentContext}`;
      
      // Add memory context if available
      if (memoryReferences.length > 0) {
        const memoryContext = memoryReferences
          .map((ref, index) => `Memory ${index + 1}: ${ref.content}`)
          .join('\n');
        enhancedMessage += `\n\nRelevant Past Conversations:\n${memoryContext}`;
      }
    }

    // Step 5: Call AI Service Manager with enhanced context
    const aiResponse = await aiServiceManager.processQuery({
      userId,
      message: enhancedMessage,
      conversationId,
      chatType: 'study_assistant',
      includeAppData: finalIsPersonal
    });

    // Step 6: Extract and store insights as memories (only for personal queries)
    let insightsExtracted = 0;
    if (finalIsPersonal && chatType === 'study_assistant') {
      try {
        const extractionResult = await memoryExtractor.extractAndStoreMemories({
          userId,
          conversationId,
          userMessage: message,
          aiResponse: aiResponse.content,
          isPersonalQuery: finalIsPersonal,
          contextLevel: contextLevel === 1 ? 'light' : contextLevel === 2 ? 'balanced' : 'comprehensive'
        });

        insightsExtracted = extractionResult.memoriesCreated;
        console.log(`Extracted ${insightsExtracted} insights from conversation`);

      } catch (error) {
        console.warn('Failed to extract and store memories:', error);
        // Don't fail the request if memory extraction fails
      }
    }

    // Step 7: Store the conversation in database
    try {
      // Store user message
      await ChatQueries.addMessage(conversationId, 'user', message, {
        context_included: finalIsPersonal
      });

      // Store AI response with metadata
      await ChatQueries.addMessage(conversationId, 'assistant', aiResponse.content, {
        model_used: aiResponse.model_used,
        provider_used: aiResponse.provider,
        tokens_used: aiResponse.tokens_used.input + aiResponse.tokens_used.output,
        latency_ms: aiResponse.latency_ms,
        context_included: finalIsPersonal
      });

    } catch (error) {
      console.warn('Failed to store messages in database:', error);
      // Don't fail the request if database storage fails
    }

    // Step 8: Prepare response
    const latency = Date.now() - startTime;
    const response: StudyAssistantResponse = {
      success: true,
      data: {
        response: {
          content: aiResponse.content,
          model_used: aiResponse.model_used,
          provider_used: aiResponse.provider,
          tokens_used: aiResponse.tokens_used,
          latency_ms: latency,
          query_type: aiResponse.query_type,
          web_search_enabled: aiResponse.web_search_enabled,
          fallback_used: aiResponse.fallback_used,
          cached: aiResponse.cached,
          isTimeSensitive: aiResponse.query_type === 'time_sensitive',
          language: 'hinglish',
          context_included: finalIsPersonal,
          memory_references: memoryReferences.length > 0 ? memoryReferences : undefined
        },
        conversationId,
        timestamp: new Date().toISOString(),
        metadata: {
          isPersonalQuery: finalIsPersonal,
          contextLevel,
          memoriesSearched,
          insightsExtracted,
          cohereUsage: {
            embeddingsGenerated: finalIsPersonal ? 1 : 0,
            monthlyUsage: semanticSearch.getUsageStatistics().monthlyRequestCount,
            monthlyLimit: 1000
          }
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Study Assistant send message failed:', error);
    
    const latency = Date.now() - startTime;
    
    // Handle different error types
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid request data', 
          data: {
            response: {
              content: 'Sorry, there was an issue with your request. Please try again.',
              model_used: 'error_handler',
              provider_used: 'system',
              tokens_used: { input: 0, output: 0 },
              latency_ms: latency,
              query_type: 'general',
              web_search_enabled: false,
              fallback_used: false,
              cached: false,
              isTimeSensitive: false,
              language: 'hinglish',
              context_included: false
            },
            conversationId: '',
            timestamp: new Date().toISOString(),
            metadata: {
              isPersonalQuery: false,
              contextLevel: 1,
              memoriesSearched: 0,
              insightsExtracted: 0,
              cohereUsage: {
                embeddingsGenerated: 0,
                monthlyUsage: 0,
                monthlyLimit: 1000
              }
            }
          }
        },
        { status: 400 }
      );
    }

    // Rate limiting
    if (error instanceof Error && error.message.includes('rate limit')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Rate limit reached. Please wait before sending another message.',
          data: {
            response: {
              content: 'I\'m a bit busy right now. Please wait a moment and try again!',
              model_used: 'rate_limited',
              provider_used: 'system',
              tokens_used: { input: 0, output: 0 },
              latency_ms: latency,
              query_type: 'general',
              web_search_enabled: false,
              fallback_used: false,
              cached: false,
              isTimeSensitive: false,
              language: 'hinglish',
              context_included: false
            },
            conversationId: '',
            timestamp: new Date().toISOString(),
            metadata: {
              isPersonalQuery: false,
              contextLevel: 1,
              memoriesSearched: 0,
              insightsExtracted: 0,
              cohereUsage: {
                embeddingsGenerated: 0,
                monthlyUsage: 0,
                monthlyLimit: 1000
              }
            }
          }
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        data: {
          response: {
            content: 'I apologize, but I\'m experiencing technical difficulties. Please try again later.',
            model_used: 'error_handler',
            provider_used: 'system',
            tokens_used: { input: 0, output: 0 },
            latency_ms: latency,
            query_type: 'general',
            web_search_enabled: false,
            fallback_used: false,
            cached: false,
            isTimeSensitive: false,
            language: 'hinglish',
            context_included: false
          },
          conversationId: '',
          timestamp: new Date().toISOString(),
          metadata: {
            isPersonalQuery: false,
            contextLevel: 1,
            memoriesSearched: 0,
            insightsExtracted: 0,
            cohereUsage: {
              embeddingsGenerated: 0,
              monthlyUsage: 0,
              monthlyLimit: 1000
            }
          }
        }
      },
      { status: 500 }
    );
  }
}