// Main Chat API Route
// ==================

import { NextRequest, NextResponse } from 'next/server';
import { getChatService } from '@/lib/ai/chat/chat-service';
import { getInitializedChatService } from '@/lib/ai/chat/index';
import { ChatApiRequest, ChatApiResponse } from '@/types/chat';
import type { AIProvider } from '@/types/api-test';

// POST /api/chat - Send a chat message
export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now();
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Parse request body
    const body: ChatApiRequest = await request.json();
    
    // Validate required fields
    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Message is required and must be a string',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTime: Date.now() - startTime,
        },
      }, { status: 400 });
    }

    // Validate provider if specified
    if (body.provider && !['groq', 'cerebras', 'mistral', 'openrouter', 'gemini', 'cohere'].includes(body.provider)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_PROVIDER',
          message: `Unsupported provider: ${body.provider}`,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId,
          processingTime: Date.now() - startTime,
        },
      }, { status: 400 });
    }

    // Get chat service (with auto-initialization)
    const chatService = await getInitializedChatService();
    
    // Convert API request to internal format
    const chatRequest = {
      message: body.message,
      context: body.context,
      preferences: {
        ...body.preferences,
        streamResponses: false, // Force non-streaming for this endpoint
      },
      provider: body.provider as AIProvider,
      sessionId: body.sessionId,
      stream: false,
    };

    // Send message
    const response = await chatService.sendMessage(chatRequest);
    
    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        response,
        sessionId: chatRequest.sessionId || (response as any).sessionId,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId,
        processingTime: Date.now() - startTime,
      },
    });

  } catch (error) {
    const startTime = Date.now();
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.error('Chat API error:', error);
    
    // Determine error type and retryability
    let errorCode = 'INTERNAL_ERROR';
    let errorMessage = 'An unexpected error occurred';
    let statusCode = 500;
    let retryable = false;

    if (error instanceof Error) {
      if (error.message.includes('No healthy providers')) {
        errorCode = 'NO_PROVIDERS_AVAILABLE';
        errorMessage = 'No AI providers are currently available';
        statusCode = 503;
        retryable = true;
      } else if (error.message.includes('API key')) {
        errorCode = 'AUTHENTICATION_ERROR';
        errorMessage = 'Authentication failed';
        statusCode = 401;
        retryable = false;
      } else if (error.message.includes('Rate limit')) {
        errorCode = 'RATE_LIMITED';
        errorMessage = 'Rate limit exceeded';
        statusCode = 429;
        retryable = true;
      } else if (error.message.includes('timeout')) {
        errorCode = 'REQUEST_TIMEOUT';
        errorMessage = 'Request timed out';
        statusCode = 408;
        retryable = true;
      }
    }

    return NextResponse.json({
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        details: error instanceof Error ? error.message : String(error),
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId,
        processingTime: Date.now() - startTime,
      },
    }, { status: statusCode });
  }
}

// GET /api/chat - Get chat service health and capabilities
export async function GET() {
  try {
    // Try to get chat service (will auto-initialize if needed)
    let chatService;
    try {
      chatService = getChatService();
    } catch (error) {
      // Auto-initialize if service not available
      await getInitializedChatService();
      chatService = getChatService();
    }
    
    // Get service configuration
    const config = chatService.getConfig();
    
    // Get provider metrics
    const providerMetrics = chatService.getProviderMetrics();
    
    return NextResponse.json({
      success: true,
      data: {
        service: {
          healthy: true,
          version: '1.0.0',
          config,
        },
        providers: providerMetrics,
        capabilities: {
          streaming: true,
          fallback: true,
          sessionManagement: true,
          studyContext: true,
        },
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Chat service health check error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Chat service is not available',
        details: error instanceof Error ? error.message : String(error),
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    }, { status: 503 });
  }
}