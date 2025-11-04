import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// DELETE /api/chat/conversations/:id - Delete conversation and all messages
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id;

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    // Verify conversation exists and belongs to user
    const { data: conversation, error: checkError } = await supabase
      .from('chat_conversations')
      .select('id, user_id, title')
      .eq('id', conversationId)
      .single();

    if (checkError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Delete all messages for this conversation
    const { error: messagesError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('conversation_id', conversationId);

    if (messagesError) {
      console.error('Error deleting messages:', messagesError);
      return NextResponse.json(
        { error: 'Failed to delete messages' },
        { status: 500 }
      );
    }

    // Delete the conversation
    const { error: deleteError } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('id', conversationId);

    if (deleteError) {
      console.error('Error deleting conversation:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete conversation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Conversation deleted successfully',
        deletedConversationId: conversationId,
        deletedTitle: conversation.title
      }
    });

  } catch (error) {
    console.error('Error in DELETE /api/chat/conversations/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}