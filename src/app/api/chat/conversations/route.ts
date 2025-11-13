// Comprehensive Conversation Management API
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { ensureValidUUID } from '@/lib/utils/fixed-uuid';

// Types for conversation management
interface CreateConversationRequest {
  title?: string;
  chat_type?: 'general' | 'study_assistant' | 'tutoring' | 'review';
  metadata?: Record<string, any>;
}

interface UpdateConversationRequest {
  title?: string;
  is_archived?: boolean;
  is_pinned?: boolean;
  metadata?: Record<string, any>;
  status?: 'active' | 'archived' | 'deleted';
}

interface ListConversationsQuery {
  page?: number;
  limit?: number;
  chat_type?: string;
  is_archived?: boolean;
  is_pinned?: boolean;
  status?: string;
  search?: string;
  sort_by?: 'last_activity_at' | 'created_at' | 'title' | 'message_count';
  sort_order?: 'asc' | 'desc';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const query: ListConversationsQuery = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100),
      chat_type: searchParams.get('chat_type') || undefined,
      is_archived: searchParams.get('is_archived') === 'true' ? true :
                  searchParams.get('is_archived') === 'false' ? false : undefined,
      is_pinned: searchParams.get('is_pinned') === 'true' ? true :
                searchParams.get('is_pinned') === 'false' ? false : undefined,
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
      sort_by: (searchParams.get('sort_by') as any) || 'last_activity_at',
      sort_order: (searchParams.get('sort_order') as any) || 'desc'
    };

    // Get authenticated user
    const supabase = getServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build query
    let queryBuilder = supabase
      .from('conversations')
      .select(`
        *,
        conversation_messages(count),
        conversation_settings(*)
      `)
      .eq('user_id', user.id);

    // Apply filters
    if (query.chat_type) {
      queryBuilder = queryBuilder.eq('chat_type', query.chat_type);
    }
    
    if (query.is_archived !== undefined) {
      queryBuilder = queryBuilder.eq('is_archived', query.is_archived);
    }
    
    if (query.is_pinned !== undefined) {
      queryBuilder = queryBuilder.eq('is_pinned', query.is_pinned);
    }
    
    if (query.status) {
      queryBuilder = queryBuilder.eq('status', query.status);
    }
    
    if (query.search) {
      queryBuilder = queryBuilder.ilike('title', `%${query.search}%`);
    }

    // Apply sorting
    queryBuilder = queryBuilder.order(query.sort_by, { ascending: query.sort_order === 'asc' });

    // Apply pagination
    const from = (query.page! - 1) * query.limit!;
    const to = from + query.limit! - 1;
    queryBuilder = queryBuilder.range(from, to);

    // Execute query
    const { data: conversations, error, count } = await queryBuilder;

    if (error) {
      console.error('Error fetching conversations:', error);
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    return NextResponse.json({
      conversations: conversations || [],
      pagination: {
        page: query.page,
        limit: query.limit,
        total: totalCount || 0,
        pages: Math.ceil((totalCount || 0) / query.limit!)
      }
    });

  } catch (error) {
    console.error('Error in GET /api/chat/conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateConversationRequest = await request.json();
    
    // Get authenticated user
    const supabase = getServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate input
    const chatType = body.chat_type || 'general';
    if (!['general', 'study_assistant', 'tutoring', 'review'].includes(chatType)) {
      return NextResponse.json({ error: 'Invalid chat type' }, { status: 400 });
    }

    // Create conversation
    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        title: body.title || 'New Conversation',
        chat_type: chatType,
        metadata: body.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
    }

    // Create default settings for the conversation
    const { error: settingsError } = await supabase
      .from('conversation_settings')
      .insert({
        conversation_id: conversation.id,
        user_id: user.id,
        ai_provider: 'groq',
        ai_model: 'llama-3.1-8b-instant',
        temperature: 0.7,
        max_tokens: 2048,
        stream_responses: true,
        include_memory_context: true,
        include_personal_context: true,
        auto_save: true
      });

    if (settingsError) {
      console.warn('Failed to create conversation settings:', settingsError);
    }

    return NextResponse.json({ conversation }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/chat/conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body: UpdateConversationRequest & { id: string } = await request.json();
    
    if (!body.id) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    // Get authenticated user
    const supabase = getServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString()
    };

    if (body.title !== undefined) updates.title = body.title;
    if (body.is_archived !== undefined) updates.is_archived = body.is_archived;
    if (body.is_pinned !== undefined) updates.is_pinned = body.is_pinned;
    if (body.metadata !== undefined) updates.metadata = body.metadata;
    if (body.status !== undefined) updates.status = body.status;

    // Update conversation
    const { data: conversation, error } = await supabase
      .from('conversations')
      .update(updates)
      .eq('id', body.id)
      .eq('user_id', user.id) // Ensure user can only update their own conversations
      .select()
      .single();

    if (error) {
      console.error('Error updating conversation:', error);
      return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 });
    }

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({ conversation });

  } catch (error) {
    console.error('Error in PUT /api/chat/conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('id');
    
    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    // Get authenticated user
    const supabase = getServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Soft delete conversation (set status to 'deleted')
    const { data: conversation, error } = await supabase
      .from('conversations')
      .update({
        status: 'deleted',
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)
      .eq('user_id', user.id) // Ensure user can only delete their own conversations
      .select()
      .single();

    if (error) {
      console.error('Error deleting conversation:', error);
      return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 });
    }

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Conversation deleted successfully' });

  } catch (error) {
    console.error('Error in DELETE /api/chat/conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Batch operations
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { operation, conversation_ids, updates } = body;
    
    if (!operation || !conversation_ids || !Array.isArray(conversation_ids)) {
      return NextResponse.json({ error: 'Invalid batch operation request' }, { status: 400 });
    }

    // Get authenticated user
    const supabase = getServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let result;
    
    switch (operation) {
      case 'archive':
        result = await supabase
          .from('conversations')
          .update({
            is_archived: true,
            updated_at: new Date().toISOString()
          })
          .in('id', conversation_ids)
          .eq('user_id', user.id);
        break;
        
      case 'unarchive':
        result = await supabase
          .from('conversations')
          .update({
            is_archived: false,
            updated_at: new Date().toISOString()
          })
          .in('id', conversation_ids)
          .eq('user_id', user.id);
        break;
        
      case 'pin':
        result = await supabase
          .from('conversations')
          .update({
            is_pinned: true,
            updated_at: new Date().toISOString()
          })
          .in('id', conversation_ids)
          .eq('user_id', user.id);
        break;
        
      case 'unpin':
        result = await supabase
          .from('conversations')
          .update({
            is_pinned: false,
            updated_at: new Date().toISOString()
          })
          .in('id', conversation_ids)
          .eq('user_id', user.id);
        break;
        
      case 'delete':
        result = await supabase
          .from('conversations')
          .update({
            status: 'deleted',
            updated_at: new Date().toISOString()
          })
          .in('id', conversation_ids)
          .eq('user_id', user.id);
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
    }

    if (result.error) {
      console.error('Error in batch operation:', result.error);
      return NextResponse.json({ error: 'Batch operation failed' }, { status: 500 });
    }

    return NextResponse.json({
      message: `Batch ${operation} completed successfully`,
      affected_rows: result.count
    });

  } catch (error) {
    console.error('Error in PATCH /api/chat/conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}