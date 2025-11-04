// Gemini API Provider Test
// ========================

import type { TestRequest, TestResponse } from '@/types/api-test';

export async function testGeminiAPI(request: TestRequest): Promise<TestResponse> {
  const startTime = Date.now();
  const { apiKey, timeout = 5000 } = request;

  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: 'Say "API test successful" in exactly these words.'
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 50,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return {
          provider: 'gemini',
          success: false,
          responseTime,
          status: response.status,
          error: {
            type: 'authentication',
            message: 'Invalid API key or authentication failed',
            details: `Status ${response.status}: ${response.statusText}`,
          },
        };
      } else if (response.status === 429) {
        return {
          provider: 'gemini',
          success: false,
          responseTime,
          status: response.status,
          error: {
            type: 'rate_limit',
            message: 'Rate limit exceeded',
            details: 'Too many requests. Please wait before retrying.',
          },
        };
      } else {
        return {
          provider: 'gemini',
          success: false,
          responseTime,
          status: response.status,
          error: {
            type: 'unknown',
            message: `HTTP error ${response.status}`,
            details: response.statusText,
          },
        };
      }
    }

    const data = await response.json();
    
    // Validate response structure
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      return {
        provider: 'gemini',
        success: false,
        responseTime,
        status: response.status,
        error: {
          type: 'validation',
          message: 'Invalid response structure from API',
          details: 'Expected candidates[0].content.parts[0].text in response',
        },
      };
    }

    const content = data.candidates[0].content.parts[0].text;
    
    return {
      provider: 'gemini',
      success: true,
      responseTime,
      status: response.status,
      data: {
        text: content,
      },
    };

  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    if (error.name === 'AbortError') {
      return {
        provider: 'gemini',
        success: false,
        responseTime,
        error: {
          type: 'timeout',
          message: 'Request timed out',
          details: `Request exceeded ${timeout}ms timeout`,
        },
      };
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return {
        provider: 'gemini',
        success: false,
        responseTime,
        error: {
          type: 'network',
          message: 'Network connectivity issue',
          details: error.message,
        },
      };
    }

    return {
      provider: 'gemini',
      success: false,
      responseTime,
      error: {
        type: 'unknown',
        message: 'Unexpected error occurred',
        details: error.message,
      },
    };
  }
}

export const geminiConfig = {
  name: 'Gemini',
  apiKeyEnv: 'GEMINI_API_KEY',
  endpoint: 'generativelanguage.googleapis.com',
  model: 'gemini-2.0-flash-lite',
  timeout: 5000,
  testType: 'completion' as const,
};