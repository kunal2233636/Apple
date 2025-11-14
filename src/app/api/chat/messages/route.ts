// Conversation Messages Management API
// =====================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Types for message management
interface CreateMessageRequest {
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model_used?: string;
  provider_used?: string;
  tokens_used?: number;
  latency_ms?: number;
  context_included?: boolean;
  metadata?: Record<string, any>;
  attachments?: any[];
}

interface UpdateMessageRequest {
  id: string;
  content?: string;
  metadata?: Record<string, any>;
  is_deleted?: boolean;
}

interface ListMessagesQuery {
  conversation_id?: string;
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
  since?: string;
  until?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const query: ListMessagesQuery = {
      conversation_id: searchParams.get('conversation_id') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '50'), 200),
      role: searchParams.get('role') || undefined,
      search: searchParams.get('search') || undefined,
      since: searchParams.get('since') || undefined,
      until: searchParams.get('until') || undefined
    };

    // Get authenticated user
    const supabase = supabase;
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!query.conversation_id) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    // Verify user has access to this conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', query.conversation_id)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 404 });
    }

    // Build query
    let queryBuilder = supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', query.conversation_id);

    // Apply filters
    if (query.role) {
      queryBuilder = queryBuilder.eq('role', query.role);
    }
    
    if (query.search) {
      queryBuilder = queryBuilder.ilike('content', `%${query.search}%`);
    }
    
    if (query.since) {
      queryBuilder = queryBuilder.gte('created_at', query.since);
    }
    
    if (query.until) {
      queryBuilder = queryBuilder.lte('created_at', query.until);
    }

    // Exclude deleted messages by default
    queryBuilder = queryBuilder.eq('is_deleted', false);

    // Apply sorting (newest first by default)
    queryBuilder = queryBuilder.order('created_at', { ascending: false });

    // Apply pagination
    const from = (query.page! - 1) * query.limit!;
    const to = from + query.limit! - 1;
    queryBuilder = queryBuilder.range(from, to);

    // Execute query
    const { data: messages, error } = await queryBuilder;

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('conversation_messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', query.conversation_id)
      .eq('is_deleted', false);

    return NextResponse.json({
      messages: (messages || []).reverse(), // Return in chronological order
      pagination: {
        page: query.page,
        limit: query.limit,
        total: totalCount || 0,
        pages: Math.ceil((totalCount || 0) / query.limit!)
      }
    });

  } catch (error) {
    console.error('Error in GET /api/chat/messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateMessageRequest = await request.json();
    
    // Validate required fields
    if (!body.conversation_id || !body.role || !body.content) {
      return NextResponse.json({ 
        error: 'Missing required fields: conversation_id, role, content' 
      }, { status: 400 });
    }

    if (!['user', 'assistant', 'system'].includes(body.role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Get authenticated user
    const supabase = supabase;
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', body.conversation_id)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 404 });
    }

    // Create message
    const { data: message, error } = await supabase
      .from('conversation_messages')
      .insert({
        conversation_id: body.conversation_id,
        role: body.role,
        content: body.content,
        model_used: body.model_used,
        provider_used: body.provider_used,
        tokens_used: body.tokens_used || 0,
        latency_ms: body.latency_ms,
        context_included: body.context_included || false,
        metadata: body.metadata || {},
        attachments: body.attachments || [],
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating message:', error);
      return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
    }

    // Update conversation's last activity
    await supabase
      .from('conversations')
      .update({ 
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', body.conversation_id);

    return NextResponse.json({ message }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/chat/messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body: UpdateMessageRequest = await request.json();
    
    if (!body.id) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    // Get authenticated user
    const supabase = supabase;
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to the conversation containing this message
    const { data: message, error: msgError } = await supabase
      .from('conversation_messages')
      .select(`
        id,
        conversation_id,
        conversations!inner(user_id)
      `)
      .eq('id', body.id)
      .single();

    if (msgError || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (message.conversations.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString()
    };

    if (body.content !== undefined) updates.content = body.content;
    if (body.metadata !== undefined) updates.metadata = body.metadata;
    if (body.is_deleted !== undefined) updates.is_deleted = body.is_deleted;

    // Update message
    const { data: updatedMessage, error } = await supabase
      .from('conversation_messages')
      .update(updates)
      .eq('id', body.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating message:', error);
      return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
    }

    return NextResponse.json({ message: updatedMessage });

  } catch (error) {
    console.error('Error in PUT /api/chat/messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('id');
    
    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    // Get authenticated user
    const supabase = supabase;
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to the conversation containing this message
    const { data: message, error: msgError } = await supabase
      .from('conversation_messages')
      .select(`
        id,
        conversation_id,
        conversations!inner(user_id)
      `)
      .eq('id', messageId)
      .single();

    if (msgError || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (message.conversations.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Soft delete message
    const { error } = await supabase
      .from('conversation_messages')
      .update({ 
        is_deleted: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId);

    if (error) {
      console.error('Error deleting message:', error);
      return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Message deleted successfully' });

  } catch (error) {
    console.error('Error in DELETE /api/chat/messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Bulk operations for messages
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { operation, message_ids, conversation_id, updates } = body;
    
    if (!operation || !message_ids || !Array.isArray(message_ids) || !conversation_id) {
      return NextResponse.json({ error: 'Invalid bulk operation request' }, { status: 400 });
    }

    // Get authenticated user
    const supabase = supabase;
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversation_id)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 404 });
    }

    let result;
    
    switch (operation) {
      case 'delete':
        result = await supabase
          .from('conversation_messages')
          .update({ 
            is_deleted: true,
            updated_at: new Date().toISOString()
          })
          .in('id', message_ids)
          .eq('conversation_id', conversation_id);
        break;
        
      case 'restore':
        result = await supabase
          .from('conversation_messages')
          .update({ 
            is_deleted: false,
            updated_at: new Date().toISOString()
          })
          .in('id', message_ids)
          .eq('conversation_id', conversation_id);
        break;
        
      case 'update_metadata':
        if (!updates || typeof updates !== 'object') {
          return NextResponse.json({ error: 'Updates object is required for metadata operation' }, { status: 400 });
        }
        result = await supabase
          .from('conversation_messages')
          .update({ 
            metadata: updates,
            updated_at: new Date().toISOString()
          })
          .in('id', message_ids)
          .eq('conversation_id', conversation_id);
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
    }

    if (result.error) {
      console.error('Error in bulk message operation:', result.error);
      return NextResponse.json({ error: 'Bulk operation failed' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: `Bulk ${operation} completed successfully`,
      affected_rows: result.count
    });

  } catch (error) {
    console.error('Error in PATCH /api/chat/messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}