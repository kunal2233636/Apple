// Study Buddy API Proxy - Forwards to main AI chat endpoint
// This maintains backward compatibility while using the enhanced AI chat endpoint

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Extract URL parameters
    const url = new URL(request.url);
    const isStream = url.searchParams.get('stream') === 'true';
    
    // Get the original request body
    const rawBody = await request.text();
    let body: any = {};
    
    if (rawBody.trim()) {
      try {
        body = JSON.parse(rawBody);
      } catch (parseError) {
        // If parsing fails, pass through the raw body as JSON
        return NextResponse.json(
          { error: 'Invalid JSON in request body' },
          { status: 400 }
        );
      }
    }
    
    // Determine target endpoint based on stream parameter
    const targetEndpoint = isStream ? '/api/ai/chat?stream=true' : '/api/ai/chat';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    // Forward the request to the main AI chat endpoint
    const aiResponse = await fetch(`${baseUrl}${targetEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
        'User-Agent': request.headers.get('User-Agent') || 'StudyBuddy-Proxy/1.0'
      },
      body: rawBody
    });
    
    if (!aiResponse.ok) {
      const errorData = await aiResponse.json().catch(() => ({}));
      return NextResponse.json(
        { 
          success: false,
          error: errorData.error || `AI service error: ${aiResponse.status}`
        },
        { status: aiResponse.status }
      );
    }
    
    // For streaming responses, pass through the stream
    if (isStream) {
      return new Response(aiResponse.body, {
        status: aiResponse.status,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });
    }
    
    // For JSON responses, return as JSON
    const aiResponseData = await aiResponse.json();
    return NextResponse.json(aiResponseData);
    
  } catch (error) {
    console.error('Study Buddy proxy error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PROXY_ERROR',
          message: 'Error forwarding request to AI service',
          details: error instanceof Error ? error.message : String(error)
        }
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Health check for Study Buddy proxy
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'health') {
      // Test the target endpoint
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      try {
        const healthResponse = await fetch(`${baseUrl}/api/ai/chat?action=health`, {
          method: 'GET',
          headers: {
            'User-Agent': 'StudyBuddy-Proxy/1.0'
          }
        });
        
        if (healthResponse.ok) {
          return NextResponse.json({
            success: true,
            data: {
              status: 'Study Buddy proxy is operational',
              version: '2.0.0',
              timestamp: new Date().toISOString(),
              target: 'ai/chat',
              targetStatus: 'healthy'
            }
          });
        } else {
          return NextResponse.json({
            success: false,
            error: {
              code: 'TARGET_UNHEALTHY',
              message: 'Target endpoint is not healthy'
            }
          }, { status: 502 });
        }
      } catch (healthError) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'HEALTH_CHECK_FAILED',
            message: 'Unable to reach target endpoint',
            details: healthError instanceof Error ? healthError.message : String(healthError)
          }
        }, { status: 502 });
      }
    }
    
    // Default: Return API information
    return NextResponse.json({
      success: true,
      data: {
        endpoint: 'Study Buddy Proxy',
        description: 'Proxy endpoint that forwards to main AI chat endpoint',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        target: '/api/ai/chat',
        features: [
          'Backward compatibility',
          'Streaming support',
          'Request forwarding',
          'Health checks'
        ]
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error processing health check',
          details: error instanceof Error ? error.message : String(error)
        }
      },
      { status: 500 }
    );
  }
}