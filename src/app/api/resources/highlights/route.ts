import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { aiServiceManager } from '@/lib/ai/ai-service-manager-unified';
import { ensureValidUUID } from '@/lib/utils/fixed-uuid';
import type { AIServiceManagerRequest } from '@/types/ai-service-manager';

interface SaveHighlightRequest {
  userId?: string;
  type: 'message' | 'conversation';
  highlightText: string;
  fullText: string;
  title?: string;
  provider?: string;
  model?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SaveHighlightRequest;
    const { userId: bodyUserId, type, highlightText, fullText, title, provider, model } = body;

    if (!type || !highlightText || !fullText) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required fields: type, highlightText, fullText',
          },
        },
        { status: 400 },
      );
    }

    // Authenticate user via Supabase (do not trust userId from body for DB writes)
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User must be signed in to save highlights',
          },
        },
        { status: 401 },
      );
    }

    const userId = authData.user.id;
    const safeUserId = ensureValidUUID(userId);

    const trimmedHighlight = highlightText.trim();
    const trimmedFull = fullText.trim();

    // Build summarization prompt for non-highlighted content
    // If full text is very short, we can skip AI and just echo the non-highlighted part.
    let summary = '';
    if (trimmedFull.length > trimmedHighlight.length + 20) {
      const summarizationPrompt = [
        'You are a study assistant summarization model.',
        'The user highlighted the following important text from a StudyBuddy conversation between themselves and an AI tutor.',
        'Your job is to briefly summarize the rest of the conversation (the non-highlighted content)',
        'so the user can quickly recall the surrounding context later.',
        '',
        'Requirements:',
        '- Focus only on the non-highlighted parts, but keep the highlighted text in mind as context.',
        '- 3-5 sentences, plain text, no bullet points or markdown headings.',
        '- Be concrete and study-oriented (key ideas, formulas, strategies, or mistakes).',
        '',
        'HIGHLIGHTED TEXT:',
        trimmedHighlight,
        '',
        'FULL CONVERSATION TEXT:',
        trimmedFull,
      ].join('\n');

      try {
        const aiRequest: AIServiceManagerRequest = {
          userId: safeUserId,
          message: summarizationPrompt,
          conversationId: undefined,
          chatType: 'general',
          includeAppData: false,
          provider,
          model,
          isPersonalQuery: false,
          studyContext: undefined,
          profileData: null,
          relevantMemories: '',
          conversationHistory: [],
          webSearchResults: null,
        };

        const aiResult = await aiServiceManager.processQuery(aiRequest);
        if (aiResult?.content && typeof aiResult.content === 'string') {
          summary = aiResult.content.trim();
        }
      } catch (aiError) {
        console.error('Highlight summarization failed, falling back to simple summary:', aiError);
        // Fallback: simple substring-based summary (first 400 chars of non-highlighted text)
        const nonHighlighted = trimmedFull.replace(trimmedHighlight, '').trim();
        summary = nonHighlighted.slice(0, 400);
      }
    }

    // Prepare content for resources table
    const finalTitle = (title || trimmedHighlight || 'StudyBuddy Highlight').slice(0, 120);

    const contentParts: string[] = [];
    contentParts.push(`Highlight:\n\n${trimmedHighlight}`);
    if (summary) {
      contentParts.push('\n\nSummary of the rest:\n\n' + summary);
    }
    const contentToStore = contentParts.join('');

    // Insert into resources table (re-used by Resources page)
    const { data: inserted, error: dbError } = await supabase
      .from('resources')
      .insert({
        user_id: userId,
        type: 'note',
        title: finalTitle,
        content: contentToStore,
        description:
          type === 'conversation'
            ? 'Saved StudyBuddy conversation (highlight + AI summary).'
            : 'Saved StudyBuddy message highlight (with AI summary).',
        url: null,
        category: 'Other',
        subject: null,
        tags: ['ai-highlight'],
        is_favorite: false,
        file_path: null,
        file_name: null,
        file_size: null,
      })
      .select('*')
      .single();

    if (dbError) {
      console.error('Error inserting highlight into resources table:', dbError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to save highlight to resources.',
          },
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        resource: inserted,
        summary,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/resources/highlights:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to save highlight.',
        },
      },
      { status: 500 },
    );
  }
}
