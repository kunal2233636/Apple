// Cohere API Provider Test (Embeddings)
// =====================================

import type { TestRequest, TestResponse } from '@/types/api-test';

export async function testCohereAPI(request: TestRequest): Promise<TestResponse> {
  const startTime = Date.now();
  const { apiKey, timeout = 10000 } = request;

  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch('https://api.cohere.ai/v1/embed', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'embed-english-v3.0',
        texts: ['API test successful'],
        input_type: 'classification',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      if (response.status === 401) {
        return {
          provider: 'cohere',
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
          provider: 'cohere',
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
          provider: 'cohere',
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
    if (!data.embeddings || !data.embeddings[0] || !Array.isArray(data.embeddings[0].vector)) {
      return {
        provider: 'cohere',
        success: false,
        responseTime,
        status: response.status,
        error: {
          type: 'validation',
          message: 'Invalid response structure from API',
          details: 'Expected embeddings[0].vector array in response',
        },
      };
    }

    const embedding = data.embeddings[0].vector;
    
    // Validate embedding dimensions (should be 1536 for embed-english-v3.0)
    if (embedding.length !== 1536) {
      return {
        provider: 'cohere',
        success: false,
        responseTime,
        status: response.status,
        error: {
          type: 'validation',
          message: `Unexpected embedding dimensions: ${embedding.length}`,
          details: 'Expected 1536 dimensions for embed-english-v3.0 model',
        },
      };
    }
    
    return {
      provider: 'cohere',
      success: true,
      responseTime,
      status: response.status,
      data: {
        embedding,
        dimensions: embedding.length,
      },
    };

  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    if (error.name === 'AbortError') {
      return {
        provider: 'cohere',
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
        provider: 'cohere',
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
      provider: 'cohere',
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

export const cohereConfig = {
  name: 'Cohere',
  apiKeyEnv: 'COHERE_API_KEY',
  endpoint: 'api.cohere.ai',
  model: 'embed-english-v3.0',
  timeout: 10000,
  testType: 'embedding' as const,
  expectedDimensions: 1536,
};