import { NextRequest, NextResponse } from 'next/server';

interface WebSearchRequestBody {
  query: string;
  searchType?: 'general' | 'academic' | 'news';
  limit?: number;
  userId?: string;
  options?: {
    safeSearch?: boolean;
    region?: string;
    language?: string;
    dateRange?: string;
  };
}

export async function POST(request: NextRequest) {
  const started = Date.now();

  try {
    const body = (await request.json()) as WebSearchRequestBody;
    const query = body?.query?.trim();

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required field: query',
          },
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_API_KEY',
            message: 'SERPER_API_KEY is not configured on the server',
          },
        },
        { status: 500 }
      );
    }

    const searchType = body.searchType || 'general';
    const limit = Math.min(Math.max(body.limit ?? 8, 1), 20);

    // Map our searchType to Serper endpoint path
    let serperPath = '/search';
    if (searchType === 'news') {
      serperPath = '/news';
    } else if (searchType === 'academic') {
      // Serper has /scholar, but if unavailable this will still perform a normal search
      serperPath = '/search';
    }

    const serperUrl = `https://google.serper.dev${serperPath}`;

    const payload: Record<string, any> = {
      q: query,
      num: limit,
    };

    const language = body.options?.language || 'en';
    const region = body.options?.region || 'us';

    payload.hl = language;
    payload.gl = region;

    const serperResponse = await fetch(serperUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!serperResponse.ok) {
      const text = await serperResponse.text().catch(() => '');
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SERPER_ERROR',
            message: `Serper API error: ${serperResponse.status} ${serperResponse.statusText}`,
            details: text || undefined,
          },
        },
        { status: 502 }
      );
    }

    const data: any = await serperResponse.json();

    const organic = Array.isArray(data.organic) ? data.organic : [];

    const results = organic.slice(0, limit).map((item: any, index: number) => {
      const url: string = item.link || item.url || '';
      let source = 'web';
      try {
        if (url) {
          const u = new URL(url);
          source = u.hostname.replace('www.', '');
        }
      } catch {
        // ignore URL parse errors
      }

      return {
        title: item.title || item.titleSnippet || 'Untitled result',
        snippet: item.snippet || item.content || '',
        url,
        source,
        relevanceScore: typeof item.position === 'number' ? 1 / (1 + item.position) : 1 - index * 0.05,
      };
    });

    const elapsed = Date.now() - started;

    return NextResponse.json({
      success: true,
      data: {
        results,
        totalResults: results.length,
        searchInfo: {
          provider: 'serper',
          searchTime: elapsed,
          searchType,
          cached: false,
        },
        suggestions: Array.isArray(data.relatedSearches)
          ? data.relatedSearches
              .map((s: any) => s.query) 
              .filter((q: any) => typeof q === 'string')
          : [],
      },
    });
  } catch (error) {
    console.error('Web search endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to perform web search',
          details: error instanceof Error ? error.message : String(error),
        },
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'health') {
    const hasApiKey = !!process.env.SERPER_API_KEY;
    return NextResponse.json({
      success: true,
      data: {
        status: hasApiKey ? 'AI Web Search (Serper) is operational' : 'AI Web Search configured but missing SERPER_API_KEY',
        provider: 'serper',
        apiKeyConfigured: hasApiKey,
        timestamp: new Date().toISOString(),
      },
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      endpoint: '/api/ai/web-search',
      provider: 'serper',
      methods: ['POST', 'GET?action=health'],
    },
  });
}