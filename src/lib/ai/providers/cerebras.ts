// Cerebras API Provider Test
// ==========================

import type { TestRequest, TestResponse } from '@/types/api-test';

export async function testCerebrasAPI(request: TestRequest): Promise<TestResponse> {
  const startTime = Date.now();
  const { apiKey, timeout = 3000 } = request;

  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llm-3.3-70b',
        messages: [
          {
            role: 'user',
            content: 'Say "API test successful" in exactly these words.'
          }
        ],
        max_tokens: 50,
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      if (response.status === 401) {
        return {
          provider: 'cerebras',
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
          provider: 'cerebras',
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
          provider: 'cerebras',
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
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return {
        provider: 'cerebras',
        success: false,
        responseTime,
        status: response.status,
        error: {
          type: 'validation',
          message: 'Invalid response structure from API',
          details: 'Expected choices[0].message.content in response',
        },
      };
    }

    const content = data.choices[0].message.content;
    
    return {
      provider: 'cerebras',
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
        provider: 'cerebras',
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
        provider: 'cerebras',
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
      provider: 'cerebras',
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

export const cerebrasConfig = {
  name: 'Cerebras',
  apiKeyEnv: 'CEREBRAS_API_KEY',
  endpoint: 'api.cerebras.ai',
  model: 'llm-3.3-70b',
  timeout: 3000,
  testType: 'completion' as const,
};