import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { aiServiceManager } from '@/lib/ai/ai-service-manager';
import { z } from 'zod';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Schema for request validation
const SendMessageSchema = z.object({
  userId: z.string().uuid(),
  conversationId: z.string().uuid(),
  message: z.string().min(1).max(500),
  chatType: z.enum(['general', 'study_assistant']).default('general'),
});

// Function to detect Hinglish (Devanagari script)
function isDevanagariOnly(text: string): boolean {
  // Match Devanagari Unicode range
  const devanagariRegex = /[\u0900-\u097F]/;
  return devanagariRegex.test(text) && !/[a-zA-Z0-9\s.,!?;:'"()[\]{}]/.test(text);
}

// Function to validate Hinglish response
async function validateHinglishResponse(response: string): Promise<{ isValid: boolean; message: string }> {
  if (isDevanagariOnly(response)) {
    return {
      isValid: false,
      message: "Response contains only Devanagari script. Please respond only in Hinglish (Roman script)."
    };
  }
  return { isValid: true, message: "" };
}

// Auto-generate conversation title from first message
async function generateConversationTitle(firstMessage: string, conversationId: string): Promise<void> {
  let title = firstMessage;
  if (title.length > 50) {
    title = title.substring(0, 47) + "...";
  }
  
  const { error } = await supabase
    .from('chat_conversations')
    .update({ title: title })
    .eq('id', conversationId);

  if (error) {
    console.error('Error updating conversation title:', error);
  }
}

// POST /api/chat/general/send - Send message to AI
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { userId, conversationId, message, chatType } = SendMessageSchema.parse(body);

    // Get conversation info to check if this is the first message
    const { data: conversation } = await supabase
      .from('chat_conversations')
      .select('id, title, created_at')
      .eq('id', conversationId)
      .single();

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Check if this is the first message to generate title
    const { data: existingMessages } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .limit(1);

    const isFirstMessage = !existingMessages || existingMessages.length === 0;

    // Store user message first
    const { error: userMessageError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      });

    if (userMessageError) {
      console.error('Error storing user message:', userMessageError);
    }

    // Call AI Service Manager
    const aiResponse = await aiServiceManager.processQuery({
      userId,
      message,
      conversationId,
      chatType,
      includeAppData: chatType === 'study_assistant'
    });

    // Validate Hinglish response
    const validation = await validateHinglishResponse(aiResponse.content);
    
    if (!validation.isValid) {
      // Retry with explicit Hinglish instruction
      const retryResponse = await aiServiceManager.processQuery({
        userId,
        message: `${message}\n\nIMPORTANT: ${validation.message}`,
        conversationId,
        chatType,
        includeAppData: chatType === 'study_assistant'
      });

      const retryValidation = await validateHinglishResponse(retryResponse.content);
      
      if (!retryValidation.isValid) {
        return NextResponse.json(
          { 
            error: 'Unable to process request. Please try different wording.',
            details: 'AI response validation failed'
          },
          { status: 422 }
        );
      }

      // Use retry response
      Object.assign(aiResponse, retryResponse);
    }

    // Calculate latency
    const latency = Date.now() - startTime;
    aiResponse.latency_ms = latency;

    // Store AI response in database
    const { error: aiMessageError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: aiResponse.content,
        model_used: aiResponse.model_used,
        provider_used: aiResponse.provider,
        tokens_used: aiResponse.tokens_used.input + aiResponse.tokens_used.output,
        latency_ms: aiResponse.latency_ms,
        timestamp: new Date().toISOString()
      });

    if (aiMessageError) {
      console.error('Error storing AI message:', aiMessageError);
    }

    // Update conversation's updated_at timestamp
    await supabase
      .from('chat_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    // Generate title from first message if needed
    if (isFirstMessage && chatType === 'general') {
      await generateConversationTitle(message, conversationId);
    }

    return NextResponse.json({
      success: true,
      data: {
        response: {
          content: aiResponse.content,
          model_used: aiResponse.model_used,
          provider_used: aiResponse.provider,
          tokens_used: aiResponse.tokens_used,
          latency_ms: aiResponse.latency_ms,
          query_type: aiResponse.query_type,
          web_search_enabled: aiResponse.web_search_enabled,
          fallback_used: aiResponse.fallback_used,
          cached: aiResponse.cached,
          isTimeSensitive: aiResponse.query_type === 'time_sensitive',
          language: 'hinglish' // Always Hinglish for this system
        },
        conversationId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in POST /api/chat/general/send:', error);
    
    const latency = Date.now() - startTime;
    
    // Handle different error types
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    // Rate limiting
    if (error instanceof Error && error.message.includes('rate limit')) {
      return NextResponse.json(
        { 
          error: 'Rate limit reached. Please wait before sending another message.',
          retryAfter: 60,
          latency 
        },
        { status: 429 }
      );
    }

    // AI Service unavailable
    if (error instanceof Error && error.message.includes('service unavailable')) {
      return NextResponse.json(
        { 
          error: 'AI service is temporarily unavailable. Please try again later.',
          retryAfter: 30,
          latency 
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        latency 
      },
      { status: 500 }
    );
  }
}