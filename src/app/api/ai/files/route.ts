// Cloudflare R2 File Retrieval API for RAG
// =========================================

import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { unifiedEmbeddingService } from '@/lib/ai/unified-embedding-service';
import { r2FileCache } from '@/lib/cache/r2-file-cache';

// Initialize R2 client (S3-compatible)
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'study-buddy-knowledge';

interface FileSearchRequest {
  mode: 'search' | 'get' | 'list';
  query?: string;
  path?: string;
  maxResults?: number;
  provider?: string;
}

interface FileSearchResult {
  files: Array<{
    path: string;
    content: string;
    relevanceScore?: number;
    metadata?: {
      size: number;
      lastModified: string;
    };
  }>;
  provider?: string;
  model?: string;
  timestamp: string;
}

/**
 * GET /api/ai/files - Health check
 */
export async function GET() {
  try {
    // Check R2 connection
    const listCommand = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      MaxKeys: 1,
    });

    await r2Client.send(listCommand);

    return NextResponse.json({
      status: 'healthy',
      service: 'R2 File Retrieval',
      bucket: R2_BUCKET_NAME,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('R2 health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

/**
 * POST /api/ai/files - File operations
 */
export async function POST(request: NextRequest) {
  try {
    const body: FileSearchRequest = await request.json();
    const { mode, query, path, maxResults = 5, provider } = body;

    if (!mode) {
      return NextResponse.json(
        { error: 'Mode parameter is required (search, get, or list)' },
        { status: 400 }
      );
    }

    switch (mode) {
      case 'list':
        return await handleListFiles(maxResults);
      
      case 'get':
        if (!path) {
          return NextResponse.json(
            { error: 'Path parameter is required for get mode' },
            { status: 400 }
          );
        }
        return await handleGetFile(path);
      
      case 'search':
        if (!query) {
          return NextResponse.json(
            { error: 'Query parameter is required for search mode' },
            { status: 400 }
          );
        }
        return await handleSemanticSearch(query, maxResults, provider);
      
      default:
        return NextResponse.json(
          { error: `Invalid mode: ${mode}. Use 'search', 'get', or 'list'` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('File operation error:', error);
    return NextResponse.json(
      {
        error: 'File operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * List markdown files in R2 bucket
 */
async function handleListFiles(maxResults: number): Promise<NextResponse> {
  try {
    const files = await listMarkdownFiles(maxResults);
    
    return NextResponse.json({
      files: files.map(f => ({
        path: f.path,
        metadata: f.metadata,
      })),
      count: files.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('List files error:', error);
    return NextResponse.json(
      {
        error: 'Failed to list files',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Get specific file content
 */
async function handleGetFile(path: string): Promise<NextResponse> {
  try {
    const content = await getFileContent(path);
    
    return NextResponse.json({
      path,
      content,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get file error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Perform semantic search over file contents
 */
async function handleSemanticSearch(
  query: string,
  maxResults: number,
  provider?: string
): Promise<NextResponse> {
  try {
    // Step 1: List all markdown files
    const files = await listMarkdownFiles(100); // Get more files for better search
    
    if (files.length === 0) {
      return NextResponse.json({
        files: [],
        message: 'No markdown files found in R2 bucket',
        timestamp: new Date().toISOString(),
      });
    }

    // Step 2: Get content for all files
    const filesWithContent = await Promise.all(
      files.map(async (file) => {
        try {
          const content = await getFileContent(file.path);
          return { ...file, content };
        } catch (error) {
          console.warn(`Failed to get content for ${file.path}:`, error);
          return null;
        }
      })
    );

    const validFiles = filesWithContent.filter((f): f is NonNullable<typeof f> => f !== null);

    if (validFiles.length === 0) {
      return NextResponse.json({
        files: [],
        message: 'Failed to retrieve file contents',
        timestamp: new Date().toISOString(),
      });
    }

    // Step 3: Generate embeddings for query and file contents
    const queryEmbeddingResponse = await unifiedEmbeddingService.generateEmbeddings({
      texts: [query],
      provider: provider as any,
    });

    const queryEmbedding = queryEmbeddingResponse.embeddings[0];

    const fileTexts = validFiles.map(f => f.content);
    const fileEmbeddingsResponse = await unifiedEmbeddingService.generateEmbeddings({
      texts: fileTexts,
      provider: provider as any,
    });

    // Step 4: Calculate similarity scores
    const filesWithScores = validFiles.map((file, index) => {
      const fileEmbedding = fileEmbeddingsResponse.embeddings[index];
      const similarity = cosineSimilarity(queryEmbedding, fileEmbedding);
      
      return {
        path: file.path,
        content: file.content,
        relevanceScore: similarity,
        metadata: file.metadata,
      };
    });

    // Step 5: Sort by relevance and return top results
    const sortedFiles = filesWithScores
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults);

    const result: FileSearchResult = {
      files: sortedFiles,
      provider: queryEmbeddingResponse.provider,
      model: queryEmbeddingResponse.model,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Semantic search error:', error);
    return NextResponse.json(
      {
        error: 'Semantic search failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * List markdown files from R2 bucket
 */
async function listMarkdownFiles(maxKeys: number = 100): Promise<Array<{
  path: string;
  metadata: {
    size: number;
    lastModified: string;
  };
}>> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      MaxKeys: maxKeys,
    });

    const response = await r2Client.send(command);
    
    if (!response.Contents) {
      return [];
    }

    // Filter for markdown files only
    const markdownFiles = response.Contents
      .filter(obj => obj.Key && (obj.Key.endsWith('.md') || obj.Key.endsWith('.markdown')))
      .map(obj => ({
        path: obj.Key!,
        metadata: {
          size: obj.Size || 0,
          lastModified: obj.LastModified?.toISOString() || new Date().toISOString(),
        },
      }));

    return markdownFiles;
  } catch (error) {
    console.error('Error listing markdown files:', error);
    throw new Error(`Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get file content from R2
 */
async function getFileContent(path: string): Promise<string> {
  try {
    // Check cache first
    const cached = r2FileCache.get(path);
    if (cached) {
      console.log(`R2 file cache hit: ${path}`);
      return cached.content;
    }

    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: path,
    });

    const response = await r2Client.send(command);
    
    if (!response.Body) {
      throw new Error('File body is empty');
    }

    // Convert stream to string
    const content = await response.Body.transformToString();
    
    // Cache the content
    r2FileCache.set(path, content, {
      size: response.ContentLength || Buffer.byteLength(content, 'utf8'),
      lastModified: response.LastModified?.toISOString() || new Date().toISOString()
    });
    
    return content;
  } catch (error) {
    console.error(`Error getting file content for ${path}:`, error);
    throw new Error(`Failed to get file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}
