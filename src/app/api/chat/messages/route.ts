import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Schema for request validation
const GetMessagesSchema = z.object({
  conversationId: z.string().uuid()
});

// GET /api/chat/messages - Get all messages for a conversation
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      );
    }

    // Get conversation metadata
    const { data: conversation } = await supabase
      .from('chat_conversations')
      .select('id, title, chat_type, created_at, updated_at')
      .eq('id', conversationId)
      .single();

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Get all messages for this conversation
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select(`
        id,
        role,
        content,
        model_used,
        provider_used,
        tokens_used,
        latency_ms,
        context_included,
        timestamp
      `)
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    // Transform messages for frontend consumption
    const transformedMessages = (messages || []).map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      provider: msg.provider_used,
      model: msg.model_used,
      tokensUsed: msg.tokens_used,
      latencyMs: msg.latency_ms,
      contextIncluded: msg.context_included,
      isTimeSensitive: false, // Will be determined on message creation
      language: msg.role === 'assistant' ? 'hinglish' : undefined // All AI responses are Hinglish
    }));

    return NextResponse.json({
      success: true,
      data: {
        conversation: {
          id: conversation.id,
          title: conversation.title,
          chatType: conversation.chat_type,
          createdAt: conversation.created_at,
          updatedAt: conversation.updated_at,
          messageCount: transformedMessages.length
        },
        messages: transformedMessages
      }
    });

  } catch (error) {
    console.error('Error in GET /api/chat/messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}