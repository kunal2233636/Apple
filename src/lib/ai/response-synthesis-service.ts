// Response Synthesis Service - Combines Multiple AI Model Outputs
// ================================================================

import { createOpenRouterClient } from './providers/openrouter-client';
import { createGroqClient } from './providers/groq-client';
import { createGeminiClient } from './providers/gemini-client';
import type { AIProvider } from '@/types/api-test';

// ===========================
// TYPE DEFINITIONS
// ===========================

export interface SynthesisInput {
  originalQuery: string;
  userId: string;
  
  // Data from different services
  chatResponse?: {
    content: string;
    provider: string;
    model: string;
    confidence?: number;
  };
  
  memories?: Array<{
    content: string;
    relevance: number;
    timestamp: string;
  }>;
  
  webResults?: Array<{
    title: string;
    snippet: string;
    url: string;
    relevance: number;
  }>;
  
  userData?: {
    studyLevel?: string;
    preferences?: any;
    recentActivity?: string[];
  };
  
  // Synthesis options
  options?: {
    provider?: AIProvider;
    model?: string;
    strategy?: 'simple' | 'balanced' | 'comprehensive';
    tone?: 'casual' | 'professional' | 'educational';
    maxLength?: number;
  };
}

export interface SynthesisOutput {
  content: string;
  metadata: {
    synthesisModel: string;
    synthesisProvider: string;
    strategy: string;
    sourcesUsed: {
      chat: boolean;
      memories: boolean;
      web: boolean;
      userData: boolean;
    };
    processingTime: number;
    confidence: number;
  };
}

// ===========================
// CONFIGURATION
// ===========================

const SYNTHESIS_CONFIG = {
  defaultProvider: 'groq' as AIProvider,  // Fast & free for most cases
  defaultModel: 'llama-3.1-8b-instant',
  
  // Premium synthesis (better quality, slower)
  premiumProvider: 'openrouter' as AIProvider,
  premiumModel: 'anthropic/claude-3.5-sonnet',
  
  // Fallback
  fallbackProvider: 'gemini' as AIProvider,
  fallbackModel: 'gemini-2.0-flash-exp',
  
  timeout: 15000,  // 15 seconds max
};

// ===========================
// MAIN SYNTHESIS CLASS
// ===========================

export class ResponseSynthesisService {
  
  /**
   * Main synthesis function - combines all data into one response
   */
  async synthesize(input: SynthesisInput): Promise<SynthesisOutput> {
    const startTime = Date.now();
    
    try {
      // Determine synthesis strategy
      const strategy = input.options?.strategy || this.determineStrategy(input);
      
      // Build synthesis prompt
      const synthesisPrompt = this.buildSynthesisPrompt(input, strategy);
      
      // Get model configuration
      const provider = input.options?.provider || SYNTHESIS_CONFIG.defaultProvider;
      const model = input.options?.model || SYNTHESIS_CONFIG.defaultModel;
      
      // Call synthesis model
      const synthesisResult = await this.callSynthesisModel(
        synthesisPrompt,
        provider,
        model
      );
      
      // Calculate metadata
      const sourcesUsed = {
        chat: !!input.chatResponse,
        memories: !!input.memories && input.memories.length > 0,
        web: !!input.webResults && input.webResults.length > 0,
        userData: !!input.userData
      };
      
      return {
        content: synthesisResult.content,
        metadata: {
          synthesisModel: model,
          synthesisProvider: provider,
          strategy,
          sourcesUsed,
          processingTime: Date.now() - startTime,
          confidence: synthesisResult.confidence || 0.85
        }
      };
      
    } catch (error) {
      console.error('❌ Synthesis failed:', error);
      
      // Fallback: Return chat response or simple message
      if (input.chatResponse) {
        return {
          content: input.chatResponse.content,
          metadata: {
            synthesisModel: 'fallback',
            synthesisProvider: 'none',
            strategy: 'direct',
            sourcesUsed: { chat: true, memories: false, web: false, userData: false },
            processingTime: Date.now() - startTime,
            confidence: 0.6
          }
        };
      }
      
      throw error;
    }
  }
  
  /**
   * Determine which synthesis strategy to use
   */
  private determineStrategy(input: SynthesisInput): string {
    const hasMultipleSources = [
      !!input.chatResponse,
      !!input.memories && input.memories.length > 0,
      !!input.webResults && input.webResults.length > 0,
      !!input.userData
    ].filter(Boolean).length;
    
    if (hasMultipleSources >= 3) return 'comprehensive';
    if (hasMultipleSources === 2) return 'balanced';
    return 'simple';
  }
  
  /**
   * Build the synthesis prompt based on strategy
   */
  private buildSynthesisPrompt(input: SynthesisInput, strategy: string): string {
    const tone = input.options?.tone || 'professional';
    
    let prompt = `You are an AI assistant that synthesizes information from multiple sources into a coherent response.\n\n`;
    
    // Add tone instruction
    if (tone === 'casual') {
      prompt += `Use a friendly, conversational tone.\n\n`;
    } else if (tone === 'educational') {
      prompt += `Explain concepts clearly as if teaching a student. Use simple language and examples.\n\n`;
    }
    
    // Add original query
    prompt += `USER'S QUESTION:\n${input.originalQuery}\n\n`;
    
    // Add data sources
    prompt += `AVAILABLE INFORMATION:\n\n`;
    
    if (input.chatResponse) {
      prompt += `AI RESPONSE:\n${input.chatResponse.content}\n\n`;
    }
    
    if (input.memories && input.memories.length > 0) {
      prompt += `RELEVANT MEMORIES (${input.memories.length}):\n`;
      input.memories.slice(0, 3).forEach((mem, i) => {
        prompt += `${i + 1}. ${mem.content} (relevance: ${(mem.relevance * 100).toFixed(0)}%)\n`;
      });
      prompt += `\n`;
    }
    
    if (input.webResults && input.webResults.length > 0) {
      prompt += `WEB SEARCH RESULTS (${input.webResults.length}):\n`;
      input.webResults.slice(0, 3).forEach((result, i) => {
        prompt += `${i + 1}. ${result.title}\n   ${result.snippet}\n   Source: ${result.url}\n\n`;
      });
    }
    
    if (input.userData) {
      prompt += `USER CONTEXT:\n`;
      if (input.userData.studyLevel) {
        prompt += `Study Level: ${input.userData.studyLevel}\n`;
      }
      if (input.userData.recentActivity) {
        prompt += `Recent Activity: ${input.userData.recentActivity.join(', ')}\n`;
      }
      prompt += `\n`;
    }
    
    // Add synthesis instructions based on strategy
    if (strategy === 'simple') {
      prompt += `TASK: Provide a clear, direct answer to the user's question using the available information. Keep it concise.\n`;
    } else if (strategy === 'balanced') {
      prompt += `TASK: Synthesize the information from different sources into a well-structured response. Mention when different sources provide complementary information.\n`;
    } else {  // comprehensive
      prompt += `TASK: Create a comprehensive response that:\n`;
      prompt += `1. Directly answers the question\n`;
      prompt += `2. Integrates information from all available sources\n`;
      prompt += `3. Highlights any contradictions or uncertainties\n`;
      prompt += `4. Provides proper context and citations\n`;
    }
    
    return prompt;
  }
  
  /**
   * Call the synthesis model (with fallback)
   */
  private async callSynthesisModel(
    prompt: string,
    provider: AIProvider,
    model: string
  ): Promise<{ content: string; confidence: number }> {
    
    try {
      let client;
      
      // Select provider
      if (provider === 'openrouter') {
        client = createOpenRouterClient();
      } else if (provider === 'groq') {
        client = createGroqClient();
      } else if (provider === 'gemini') {
        client = createGeminiClient();
      } else {
        throw new Error(`Unsupported synthesis provider: ${provider}`);
      }
      
      // Call model
      const response = await Promise.race([
        client.chat([{ role: 'user', content: prompt }], { model }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Synthesis timeout')), SYNTHESIS_CONFIG.timeout)
        )
      ]) as any;
      
      return {
        content: response.content || response.message?.content || '',
        confidence: 0.9
      };
      
    } catch (error) {
      console.warn(`⚠️ Synthesis with ${provider} failed, trying fallback...`);
      
      // Fallback to Gemini
      if (provider !== SYNTHESIS_CONFIG.fallbackProvider) {
        const geminiClient = createGeminiClient();
        const response = await geminiClient.chat(
          [{ role: 'user', content: prompt }],
          { model: SYNTHESIS_CONFIG.fallbackModel }
        );
        
        return {
          content: response.content,
          confidence: 0.75
        };
      }
      
      throw error;
    }
  }
}

// ===========================
// SINGLETON EXPORT
// ===========================

export const responseSynthesisService = new ResponseSynthesisService();

// ===========================
// CONVENIENCE FUNCTIONS
// ===========================

/**
 * Quick synthesis function for simple use cases
 */
export async function synthesizeResponse(input: SynthesisInput): Promise<SynthesisOutput> {
  return responseSynthesisService.synthesize(input);
}

/**
 * Synthesize with premium model (Claude)
 */
export async function synthesizeWithPremium(input: SynthesisInput): Promise<SynthesisOutput> {
  return responseSynthesisService.synthesize({
    ...input,
    options: {
      ...input.options,
      provider: SYNTHESIS_CONFIG.premiumProvider,
      model: SYNTHESIS_CONFIG.premiumModel
    }
  });
}