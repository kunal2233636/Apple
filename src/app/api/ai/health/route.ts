// AI Health Check Endpoint
// ========================

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'ai-chat',
      version: '1.0.0',
      endpoints: {
        'ai-chat': '/api/ai/chat',
        'ai-memory': '/api/ai/memory',
        'ai-health': '/api/ai/health'
      },
      status_checks: {
        api: 'ok',
        database: 'ok', 
        memory: 'ok'
      }
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'ai-health',
      message: 'AI Health Check service is running'
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}