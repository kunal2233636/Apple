// Chat API Endpoints - Phase 3: General Chat Integration
// ====================================================

import { NextRequest, NextResponse } from 'next/server';
import { aiServiceManager } from '@/lib/ai/ai-service-manager';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { userId, conversationId, message, chatType } = await request.json();

    if (!userId || !message || !chatType) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, message, chatType' },
        { status: 400 }
      );
    }

    // If no conversationId provided, create new conversation
    let finalConversationId = conversationId;
    if (!finalConversationId) {
      const { data: newConversation, error } = await supabase
        .from('chat_conversations')
        .insert({
          user_id: userId,
          title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
          chat_type: chatType,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create conversation: ${error.message}`);
      }

      finalConversationId = newConversation.id;
    }

    // Store user message
    const { error: userMessageError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: finalConversationId,
        role: 'user',
        content: message,
        context_included: false
      });

    if (userMessageError) {
      throw new Error(`Failed to store user message: ${userMessageError.message}`);
    }

    // Call AI Service Manager
    const aiResponse = await aiServiceManager.processQuery({
      userId,
      conversationId: finalConversationId,
      message,
      chatType,
      includeAppData: false
    });

    // Store AI response
    const { error: aiMessageError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: finalConversationId,
        role: 'assistant',
        content: aiResponse.content,
        model_used: aiResponse.model_used,
        provider_used: aiResponse.provider,
        tokens_used: aiResponse.tokens_used.input + aiResponse.tokens_used.output,
        latency_ms: aiResponse.latency_ms,
        context_included: aiResponse.web_search_enabled
      });

    if (aiMessageError) {
      throw new Error(`Failed to store AI message: ${aiMessageError.message}`);
    }

    // Update conversation timestamp
    await supabase
      .from('chat_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', finalConversationId);

    return NextResponse.json({
      response: aiResponse,
      conversationId: finalConversationId
    });

  } catch (error) {
    console.error('Chat send error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}