// Streaming Chat API Route
// =======================

import { NextRequest } from 'next/server';
import { getChatService } from '@/lib/ai/chat/chat-service';
import { ChatApiRequest } from '@/types/chat';
import type { AIProvider } from '@/types/api-test';

// POST /api/chat/stream - Stream a chat message
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  try {
    // Parse request body
    const body: ChatApiRequest = await request.json();
    
    // Validate required fields
    if (!body.message || typeof body.message !== 'string') {
      return new Response(
        encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          error: {
            code: 'INVALID_REQUEST',
            message: 'Message is required and must be a string',
          }
        })}\n\n`),
        {
          status: 400,
          headers: {
            'Content-Type': 'text/plain',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    }

    // Get chat service
    const chatService = getChatService();
    
    // Convert API request to internal format
    const chatRequest = {
      message: body.message,
      context: body.context,
      preferences: {
        ...body.preferences,
        streamResponses: true, // Enable streaming
      },
      provider: body.provider as AIProvider,
      sessionId: body.sessionId,
      stream: true,
    };

    // Create readable stream
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Send initial metadata
          const initialChunk = {
            type: 'start',
            data: {
              sessionId: chatRequest.sessionId,
              provider: chatRequest.provider || 'auto',
              timestamp: new Date().toISOString(),
            }
          };
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialChunk)}\n\n`));
          
          // Stream the response
          const stream = chatService.streamMessage(chatRequest);
          
          for await (const chunk of stream) {
            const chunkData = {
              type: chunk.type,
              data: chunk.data,
              timestamp: chunk.timestamp.toISOString(),
              id: chunk.id,
            };
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunkData)}\n\n`));
          }
          
          // Send completion signal
          const endChunk = {
            type: 'end',
            data: {
              message: 'Stream completed successfully',
              timestamp: new Date().toISOString(),
            }
          };
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(endChunk)}\n\n`));
          controller.close();
          
        } catch (error) {
          console.error('Streaming error:', error);
          
          // Send error chunk
          const errorChunk = {
            type: 'error',
            error: {
              code: 'STREAMING_ERROR',
              message: error instanceof Error ? error.message : 'Streaming failed',
              details: error instanceof Error ? error.stack : String(error),
            },
            timestamp: new Date().toISOString(),
          };
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Chat stream API error:', error);
    
    const errorResponse = {
      type: 'error',
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : String(error),
      },
      timestamp: new Date().toISOString(),
    };
    
    return new Response(
      encoder.encode(`data: ${JSON.stringify(errorResponse)}\n\n`),
      {
        status: 500,
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      }
    );
  }
}

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}