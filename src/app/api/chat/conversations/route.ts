import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { aiServiceManager } from '@/lib/ai/ai-service-manager';
import { z } from 'zod';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Schema for request validation
const CreateConversationSchema = z.object({
  userId: z.string().uuid(),
  chatType: z.enum(['general', 'study_assistant']).default('general')
});

const GetConversationsSchema = z.object({
  userId: z.string().uuid(),
  chatType: z.enum(['general', 'study_assistant']).default('general')
});

// POST /api/chat/conversations - Create new conversation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, chatType } = CreateConversationSchema.parse(body);

    // Auto-generate title from conversation type if needed
    const title = chatType === 'general' 
      ? `General Chat - ${new Date().toLocaleDateString()}`
      : `Study Assistant - ${new Date().toLocaleDateString()}`;

    // Create conversation in database
    const { data: conversation, error } = await supabase
      .from('chat_conversations')
      .insert({
        user_id: userId,
        title: title,
        chat_type: chatType,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return NextResponse.json(
        { error: 'Failed to create conversation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        conversationId: conversation.id,
        title: conversation.title,
        chatType: conversation.chat_type,
        created_at: conversation.created_at,
      }
    });

  } catch (error) {
    console.error('Error in POST /api/chat/conversations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/chat/conversations - List user's conversations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const chatType = searchParams.get('chatType') as 'general' | 'study_assistant' | null;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from('chat_conversations')
      .select('id, title, chat_type, created_at, updated_at')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false });

    if (chatType) {
      query = query.eq('chat_type', chatType);
    }

    const { data: conversations, error } = await query;

    if (error) {
      console.error('Error fetching conversations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch conversations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: conversations || []
    });

  } catch (error) {
    console.error('Error in GET /api/chat/conversations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}