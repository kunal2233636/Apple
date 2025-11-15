// Google/Vertex AI Embeddings Provider
// ====================================

import type { AIProvider } from '@/types/api-test';

export interface GoogleEmbeddingRequest {
  model?: string;
  texts: string[];
}

export interface GoogleEmbeddingResponse {
  predictions: Array<{
    embeddings: {
      values: number[];
    };
  }>;
}

export class GoogleEmbeddingProvider {
  private readonly provider: AIProvider = 'google';
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  private readonly defaultModel = 'gemini-embedding-001';
  private readonly vertexBaseUrl = 'https://us-central1-aiplatform.googleapis.com/v1';

  constructor(
    private apiKey?: string,
    private projectId?: string,
    private location: string = 'us-central1'
  ) {
    if (!apiKey && !projectId) {
      console.warn('Google Embeddings: No API key or project ID provided. Using placeholders.');
    }
  }

  /**
   * Generate embeddings using Vertex AI (preferred method)
   */
  private async generateWithVertexAI(params: {
    texts: string[];
    model?: string;
    timeout?: number;
  }): Promise<number[][]> {
    const { texts, model, timeout = 30000 } = params;
    
    if (!this.projectId) {
      throw new Error('Project ID is required for Vertex AI. Set GOOGLE_CLOUD_PROJECT_ID.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Vertex AI requires service account authentication
      // For now, we'll use a placeholder implementation
      // In production, you would use the Google Cloud SDK with service account
      
      const endpoint = `${this.vertexBaseUrl}/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${model || this.defaultModel}:predict`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer placeholder-token', // Service account token
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: texts.map(text => ({ content: text })),
          parameters: {
            outputDimensionality: 768,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Vertex AI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Validate response structure
      if (!data.predictions || !Array.isArray(data.predictions)) {
        throw new Error('Invalid response structure from Vertex AI');
      }

      const embeddings = data.predictions.map((prediction: any) => {
        if (!prediction.embeddings || !prediction.embeddings.values) {
          throw new Error('Invalid embedding format in response');
        }
        return prediction.embeddings.values;
      });

      return embeddings;

    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Generate embeddings using Google Generative AI (fallback method)
   */
  private async generateWithGenerativeAI(params: {
    texts: string[];
    model?: string;
    timeout?: number;
  }): Promise<number[][]> {
    const { texts, model, timeout = 30000 } = params;
    
    if (!this.apiKey) {
      throw new Error('API key is required for Generative AI. Set GOOGLE_API_KEY.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.baseUrl}/models/${model || this.defaultModel}:generateEmbeddings?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: `models/${model || this.defaultModel}`,
          content: {
            parts: texts.map(text => ({ text }))
          },
          outputDimensionality: 768,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Google Generative AI error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      // Validate response structure
      if (!data.embedding || !Array.isArray(data.embedding)) {
        throw new Error('Invalid response structure from Google Generative AI');
      }

      return [data.embedding];

    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Generate embeddings for text(s) - try both methods
   */
  async generateEmbeddings(params: {
    texts: string[];
    model?: string;
    timeout?: number;
  }): Promise<number[][]> {
    const { texts, model, timeout } = params;
    
    if (!texts || texts.length === 0) {
      throw new Error('Texts array cannot be empty');
    }

    // Try Vertex AI first if project ID is available
    if (this.projectId) {
      try {
        return await this.generateWithVertexAI({ texts, model, timeout });
      } catch (error) {
        console.warn('Vertex AI failed, trying Generative AI:', error);
      }
    }

    // Fallback to Generative AI
    if (this.apiKey) {
      try {
        return await this.generateWithGenerativeAI({ texts, model, timeout });
      } catch (error) {
        console.warn('Generative AI failed:', error);
      }
    }

    throw new Error('No valid authentication method available. Set either GOOGLE_CLOUD_PROJECT_ID or GOOGLE_API_KEY');
  }

  /**
   * Health check for Google embeddings
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    responseTime: number;
    error?: string;
    method?: 'vertex' | 'generative';
  }> {
    const startTime = Date.now();

    try {
      // Try Vertex AI first
      if (this.projectId) {
        try {
          await this.generateEmbeddings({
            texts: ['test'],
            timeout: 5000
          });
          return {
            healthy: true,
            responseTime: Date.now() - startTime,
            method: 'vertex',
          };
        } catch (error) {
          console.warn('Vertex AI health check failed:', error);
        }
      }

      // Try Generative AI
      if (this.apiKey) {
        try {
          await this.generateEmbeddings({
            texts: ['test'],
            timeout: 5000
          });
          return {
            healthy: true,
            responseTime: Date.now() - startTime,
            method: 'generative',
          };
        } catch (error) {
          console.warn('Generative AI health check failed:', error);
        }
      }

      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        error: 'No authentication method available',
      };

    } catch (error) {
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get available embedding models
   */
  getAvailableModels(): string[] {
    return [
      'gemini-embedding-001',  // Latest Gemini embedding model, 768 dimensions
      'text-embedding-004',    // Previous model, 768 dimensions
      'text-embedding-003',    // Older model, 768 dimensions  
      'text-multilingual-embedding-002', // Multilingual support
    ];
  }

  /**
   * Get provider information
   */
  getProviderInfo() {
    return {
      name: 'Google/Vertex AI',
      provider: this.provider,
      models: this.getAvailableModels(),
      capabilities: {
        supportsEmbeddings: true,
        maxTextLength: 3072,
        dimensions: 768,
      },
      pricing: {
        costPerToken: 0.00001, // Very cost-effective
      },
      authentication: {
        vertex: !!this.projectId,
        generative: !!this.apiKey,
      }
    };
  }

  /**
   * Check if provider is properly configured
   */
  isConfigured(): boolean {
    return !!(this.apiKey || this.projectId);
  }
}

/**
 * Factory function to create Google provider
 */
export function createGoogleEmbeddingProvider(
  apiKey?: string,
  projectId?: string,
  location?: string
): GoogleEmbeddingProvider {
  const key = apiKey || process.env.GOOGLE_API_KEY;
  const project = projectId || process.env.GOOGLE_CLOUD_PROJECT_ID;
  const loc = location || process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

  return new GoogleEmbeddingProvider(key, project, loc);
}

// Export singleton instance
export const googleEmbeddingProvider = new GoogleEmbeddingProvider(
  process.env.GOOGLE_API_KEY,
  process.env.GOOGLE_CLOUD_PROJECT_ID,
  process.env.GOOGLE_CLOUD_LOCATION
);
