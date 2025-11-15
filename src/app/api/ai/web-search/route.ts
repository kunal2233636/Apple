import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { AIServiceManager } from '@/lib/ai/ai-service-manager-unified';

interface WebSearchRequestBody {
  query: string;
  searchType?: 'general' | 'academic' | 'news';
  limit?: number;
  userId?: string;
  explain?: boolean;
  maxArticles?: number;
  timeout?: number; // Timeout in milliseconds for article extraction
  options?: {
    safeSearch?: boolean;
    region?: string;
    language?: string;
    dateRange?: string;
  };
}

/**
 * Extract article content from HTML using Cheerio
 */
async function extractArticleContent(url: string, timeoutMs: number = 15000): Promise<{ content: string; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { content: '', error: `Failed to fetch: ${response.status}` };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, iframe, noscript').remove();

    // Try to find main content area
    let content = '';
    const mainSelectors = ['article', 'main', '[role="main"]', '.article-content', '.post-content', '.entry-content'];
    
    for (const selector of mainSelectors) {
      const mainContent = $(selector);
      if (mainContent.length > 0) {
        content = mainContent.text();
        break;
      }
    }

    // Fallback to body if no main content found
    if (!content) {
      content = $('body').text();
    }

    // Clean up whitespace
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();

    // Limit content length to avoid token limits
    const maxLength = 5000;
    if (content.length > maxLength) {
      content = content.substring(0, maxLength) + '...';
    }

    return { content };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check if it's a timeout error
    if (error instanceof Error && error.name === 'AbortError') {
      return { content: '', error: 'Request timeout - article took too long to load' };
    }
    
    return { content: '', error: errorMessage };
  }
}

/**
 * Generate LLM explanation of article content
 */
async function generateArticleExplanation(articleContent: string, query: string, userId: string): Promise<string> {
  try {
    const aiManager = new AIServiceManager();
    
    const response = await aiManager.processQuery({
      userId,
      conversationId: `web-search-${Date.now()}`,
      message: `Based on this article content, explain it in simple terms for a student who searched for "${query}":\n\n${articleContent}`,
      chatType: 'general',
      conversationHistory: [],
      includeAppData: false
    });

    return response.content;
  } catch (error) {
    console.error('Failed to generate article explanation:', error);
    return 'Unable to generate explanation at this time.';
  }
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

    // Process articles if explain or maxArticles is specified
    // Default maxArticles to 1 when explain is true
    const maxArticles = body.maxArticles ?? (body.explain ? 1 : 0);
    const shouldExtractArticles = body.explain || maxArticles > 0;
    const articlesToProcess = shouldExtractArticles ? Math.min(maxArticles, results.length) : 0;
    const articleTimeout = body.timeout || 15000; // Default 15 second timeout
    
    const articlesWithContent = [];
    
    if (articlesToProcess > 0) {
      for (let i = 0; i < articlesToProcess; i++) {
        const result = results[i];
        
        // Extract article content with timeout
        const { content, error } = await extractArticleContent(result.url, articleTimeout);
        
        const articleData: any = {
          ...result,
          fullContent: content || null,
          extractionError: error || null
        };
        
        // Generate explanation if requested and content was extracted
        if (body.explain && content && body.userId) {
          const explanation = await generateArticleExplanation(content, query, body.userId);
          articleData.explanation = explanation;
        }
        
        articlesWithContent.push(articleData);
      }
    }

    const elapsed = Date.now() - started;

    return NextResponse.json({
      success: true,
      data: {
        results,
        totalResults: results.length,
        articles: articlesWithContent.length > 0 ? articlesWithContent : undefined,
        searchInfo: {
          provider: 'serper',
          searchTime: elapsed,
          searchType,
          cached: false,
          articlesProcessed: articlesWithContent.length,
          explanationsGenerated: body.explain ? articlesWithContent.filter(a => a.explanation).length : 0
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