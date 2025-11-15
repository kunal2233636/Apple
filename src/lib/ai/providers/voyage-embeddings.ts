// Voyage AI Embeddings Provider
// ==============================

import type { AIProvider } from '@/types/api-test';

export interface VoyageEmbeddingRequest {
  model?: string;
  texts: string[];
}

export interface VoyageEmbeddingResponse {
  object: string;
  data: Array<{
    object: string;
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    total_tokens: number;
  };
}

export class VoyageEmbeddingProvider {
  private readonly provider: AIProvider = 'voyage' as AIProvider;
  private readonly baseUrl = 'https://api.voyageai.com/v1';
  private readonly defaultModel = 'voyage-multilingual-2';

  constructor(private apiKey: string) {
    if (!apiKey) {
      throw new Error('VOYAGE_API_KEY is required');
    }
  }

  /**
   * Generate embeddings for text(s) using Voyage AI
   */
  async generateEmbeddings(params: {
    texts: string[];
    model?: string;
    timeout?: number;
  }): Promise<number[][]> {
    const { texts, model, timeout = 30000 } = params;
    
    if (!texts || texts.length === 0) {
      throw new Error('Texts array cannot be empty');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || this.defaultModel,
          input: texts,
          input_type: 'document', // Can be 'document' or 'query'
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Voyage API error: ${response.status} ${response.statusText} - ${errorData.message || 'Unknown error'}`);
      }

      const data: VoyageEmbeddingResponse = await response.json();
      
      // Validate response structure
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid response structure from Voyage API');
      }

      // Extract embeddings in order
      const embeddings = data.data
        .sort((a, b) => a.index - b.index)
        .map(item => {
          if (!item.embedding || !Array.isArray(item.embedding)) {
            throw new Error('Invalid embedding format in response');
          }
          return item.embedding;
        });

      return embeddings;

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timed out after ${timeout}ms`);
        }
        throw error;
      }
      
      throw new Error(`Unknown error: ${error}`);
    }
  }

  /**
   * Health check for Voyage embeddings
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      await this.generateEmbeddings({
        texts: ['test'],
        timeout: 5000
      });

      return {
        healthy: true,
        responseTime: Date.now() - startTime,
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
      'voyage-multilingual-2',  // Multilingual, 1024 dimensions
      'voyage-large-2',         // English, 1536 dimensions
      'voyage-code-2',          // Code embeddings, 1536 dimensions
      'voyage-2',               // General purpose, 1024 dimensions
    ];
  }

  /**
   * Get provider information
   */
  getProviderInfo() {
    return {
      name: 'Voyage AI',
      provider: this.provider,
      models: this.getAvailableModels(),
      capabilities: {
        supportsEmbeddings: true,
        maxTextLength: 16000, // Voyage supports up to 16k tokens
        dimensions: 1024, // voyage-multilingual-2 default
      },
      pricing: {
        costPerToken: 0.00012, // Estimated per 1M tokens
      }
    };
  }

  /**
   * Check if provider is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

/**
 * Factory function to create Voyage provider
 */
export function createVoyageEmbeddingProvider(apiKey?: string): VoyageEmbeddingProvider | null {
  const key = apiKey || process.env.VOYAGE_API_KEY;
  if (!key) {
    return null; // Return null instead of throwing error for optional provider
  }
  return new VoyageEmbeddingProvider(key);
}

// Lazy-loaded singleton instance
let _voyageEmbeddingProvider: VoyageEmbeddingProvider | null | undefined = undefined;

export function getVoyageEmbeddingProvider(): VoyageEmbeddingProvider | null {
  if (_voyageEmbeddingProvider === undefined) {
    _voyageEmbeddingProvider = createVoyageEmbeddingProvider();
  }
  return _voyageEmbeddingProvider;
}

// Export singleton instance (lazy-loaded)
export const voyageEmbeddingProvider = getVoyageEmbeddingProvider();
