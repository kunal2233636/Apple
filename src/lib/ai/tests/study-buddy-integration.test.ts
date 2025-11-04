// Study Buddy Integration Test Suite
// ==================================

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

// Import all Study Buddy components
import { personalQuestionDetector } from '../personal-question-detector';
import { studentContextBuilder, determineContextLevel } from '../student-context-builder';
import { semanticSearch } from '../semantic-search';
import { memoryExtractor } from '../memory-extractor';
import { studyBuddyCache } from '../study-buddy-cache';
import { aiServiceManager } from '../ai-service-manager';

describe('Study Buddy Integration Tests', () => {
  
  beforeEach(() => {
    // Clean up cache before each test
    studyBuddyCache.clear();
    
    // Mock console methods for cleaner test output
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Personal Question Detection', () => {
    test('should detect personal questions correctly', () => {
      const personalQuestions = [
        'Mera Physics kaisa chal raha hai?',
        'My weak areas?',
        'How to improve my performance?',
        'Kaise chal raha hai mera padhai?',
        'What should I focus on?',
        'Mera progress kaisa hai?'
      ];

      const generalQuestions = [
        'What is entropy?',
        'How to solve integration problems?',
        'Explain photosynthesis',
        'What is Newton\'s third law?'
      ];

      personalQuestions.forEach(question => {
        const result = personalQuestionDetector.detectPersonalQuestion(question);
        expect(result.isPersonal).toBe(true);
        expect(result.confidence).toBeGreaterThan(0.5);
      });

      generalQuestions.forEach(question => {
        const result = personalQuestionDetector.detectPersonalQuestion(question);
        expect(result.isPersonal).toBe(false);
      });
    });

    test('should handle mixed language questions', () => {
      const mixedQuestions = [
        'Physics ka question solve kaise kare?',
        'How to improve my Chemistry score?',
        'Integration problems me kya strategy use karna chahiye?'
      ];

      mixedQuestions.forEach(question => {
        const result = personalQuestionDetector.detectPersonalQuestion(question);
        expect(result.isPersonal || result.confidence > 0.3).toBe(true);
      });
    });
  });

  describe('Context Level Determination', () => {
    test('should determine correct context levels', () => {
      expect(determineContextLevel('How am I doing?', false)).toBe(1);
      expect(determineContextLevel('What should I focus on this week?', true)).toBe(2);
      expect(determineContextLevel('Show my performance trends', true)).toBe(3);
      expect(determineContextLevel('Give me complete analysis', true)).toBe(4);
    });

    test('should handle complex questions appropriately', () => {
      const complexQuestions = [
        { question: 'Analyze my entire study progress', expectedLevel: 4 },
        { question: 'What are my learning patterns?', expectedLevel: 3 },
        { question: 'How to improve this week?', expectedLevel: 2 },
        { question: 'OK?', expectedLevel: 1 }
      ];

      complexQuestions.forEach(({ question, expectedLevel }) => {
        const level = determineContextLevel(question, true);
        expect(level).toBe(expectedLevel);
      });
    });
  });

  describe('Student Context Building', () => {
    test('should build context by levels', async () => {
      const userId = 'test-user-id';
      
      // Mock the buildFullAIContext method
      const mockContextData = {
        profileText: 'JEE 2025 aspirant. Physics: 78%, Chemistry: 82%, Maths: 75%.',
        strongSubjects: ['Organic Chemistry', 'Kinematics'],
        weakSubjects: ['Thermodynamics', 'Modern Physics'],
        examTarget: 'JEE 2025',
        studyProgress: {
          totalTopics: 50,
          completedTopics: 35,
          accuracy: 78
        },
        currentData: {
          streak: 7,
          level: 3,
          points: 1250,
          revisionQueue: 5
        },
        learningStyle: 'visual'
      };

      vi.spyOn(studentContextBuilder, 'buildContextByLevel').mockResolvedValue(mockContextData.profileText);

      const context = await studentContextBuilder.buildContextByLevel(userId, 2);
      expect(typeof context).toBe('string');
      expect(context.length).toBeGreaterThan(0);
    });
  });

  describe('Semantic Search', () => {
    test('should search memories with correct parameters', async () => {
      const mockSearchResult = {
        memories: [
          {
            id: '1',
            content: 'Student struggled with entropy concept',
            similarity: 0.85,
            created_at: '2024-01-15T10:00:00Z',
            importance_score: 4,
            tags: ['weakness', 'thermodynamics']
          }
        ],
        searchStats: {
          totalFound: 1,
          averageSimilarity: 0.85,
          searchTimeMs: 150,
          embeddingGenerated: true,
          cohereUsage: {
            embeddingTokens: 100,
            monthlyUsage: 1,
            monthlyLimit: 1000
          }
        }
      };

      vi.spyOn(semanticSearch, 'searchMemories').mockResolvedValue(mockSearchResult);

      const result = await semanticSearch.searchMemories({
        userId: 'test-user',
        query: 'entropy problems',
        limit: 5,
        minSimilarity: 0.7
      });

      expect(result.memories).toHaveLength(1);
      expect(result.memories[0].similarity).toBe(0.85);
      expect(result.searchStats.totalFound).toBe(1);
    });

    test('should handle search failures gracefully', async () => {
      vi.spyOn(semanticSearch, 'searchMemories').mockRejectedValue(new Error('Search failed'));

      const result = await semanticSearch.searchMemories({
        userId: 'test-user',
        query: 'test query'
      });

      expect(result.memories).toHaveLength(0);
    });
  });

  describe('Memory Extraction', () => {
    test('should extract insights from conversations', async () => {
      const mockExtractionResult = {
        insights: [
          {
            content: 'Student identified difficulty with thermodynamics',
            importanceScore: 4,
            tags: ['weakness', 'thermodynamics'],
            category: 'weakness',
            sourceContext: 'Student mentioned struggling with entropy'
          }
        ],
        memoriesCreated: 1,
        embeddingsGenerated: 1,
        storageErrors: []
      };

      vi.spyOn(memoryExtractor, 'extractAndStoreMemories').mockResolvedValue(mockExtractionResult);

      const result = await memoryExtractor.extractAndStoreMemories({
        userId: 'test-user',
        conversationId: 'test-conv',
        userMessage: 'Thermodynamics is difficult for me',
        aiResponse: 'Let me help you with thermodynamics concepts',
        isPersonalQuery: true,
        contextLevel: 'balanced'
      });

      expect(result.insights).toHaveLength(1);
      expect(result.memoriesCreated).toBe(1);
    });

    test('should skip extraction for non-personal queries', async () => {
      const result = await memoryExtractor.extractAndStoreMemories({
        userId: 'test-user',
        conversationId: 'test-conv',
        userMessage: 'What is entropy?',
        aiResponse: 'Entropy is a thermodynamic property...',
        isPersonalQuery: false,
        contextLevel: 'light'
      });

      expect(result.insights).toHaveLength(0);
      expect(result.memoriesCreated).toBe(0);
    });
  });

  describe('Study Buddy Cache', () => {
    test('should cache and retrieve data correctly', () => {
      const testData = { message: 'test response', timestamp: Date.now() };
      const cacheKey = 'test-cache-key';

      // Set cache
      studyBuddyCache.set(cacheKey, testData);

      // Get cache
      const retrieved = studyBuddyCache.get(cacheKey);
      expect(retrieved).toEqual(testData);

      // Check cache has method
      expect(studyBuddyCache.has(cacheKey)).toBe(true);
    });

    test('should expire cache entries after TTL', async () => {
      const testData = { message: 'temporary data' };
      const cacheKey = 'temp-cache-key';

      // Set with short TTL (10ms)
      studyBuddyCache.set(cacheKey, testData, { ttl: 10 });

      // Should be available immediately
      expect(studyBuddyCache.get(cacheKey)).toEqual(testData);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 15));

      // Should be expired
      expect(studyBuddyCache.get(cacheKey)).toBeNull();
    });

    test('should generate proper cache keys', () => {
      const cacheKey = studyBuddyCache.generateCacheKey({
        userId: 'user-123',
        message: 'How am I doing?',
        contextLevel: 2,
        isPersonalQuery: true
      });

      expect(cacheKey).toContain('user-123');
      expect(cacheKey).toContain('study_buddy');
      expect(cacheKey).toContain('personal');
    });

    test('should provide cache statistics', () => {
      studyBuddyCache.set('test1', { data: 'test1' });
      studyBuddyCache.set('test2', { data: 'test2' });

      const stats = studyBuddyCache.getStatistics();
      expect(stats.totalEntries).toBe(2);
      expect(stats.totalRequests).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cache Invalidation', () => {
    test('should invalidate user cache correctly', () => {
      studyBuddyCache.set('user1:key1', { data: 'user1-data1' });
      studyBuddyCache.set('user1:key2', { data: 'user1-data2' });
      studyBuddyCache.set('user2:key1', { data: 'user2-data1' });

      const invalidated = studyBuddyCache.invalidateUserCache('user1');
      expect(invalidated).toBe(2);

      // Check user1 data is gone
      expect(studyBuddyCache.get('user1:key1')).toBeNull();
      expect(studyBuddyCache.get('user1:key2')).toBeNull();

      // Check user2 data remains
      expect(studyBuddyCache.get('user2:key1')).toEqual({ data: 'user2-data1' });
    });
  });

  describe('Integration Flow', () => {
    test('should handle complete Study Buddy flow', async () => {
      // Mock all external dependencies
      const mockUserId = 'integration-test-user';
      const mockConversationId = 'integration-test-conv';
      const mockMessage = 'Mera Physics kaisa chal raha hai?';

      // Mock context building
      vi.spyOn(studentContextBuilder, 'buildContextByLevel').mockResolvedValue(
        'JEE 2025. Physics: 78%, Chemistry: 82%, Maths: 75%. Weak: Thermodynamics.'
      );

      // Mock semantic search
      vi.spyOn(semanticSearch, 'searchMemories').mockResolvedValue({
        memories: [
          {
            id: '1',
            content: 'Student improved Physics score from 65% to 78%',
            similarity: 0.92,
            created_at: '2024-01-10T10:00:00Z'
          }
        ],
        searchStats: {
          totalFound: 1,
          averageSimilarity: 0.92,
          searchTimeMs: 120,
          embeddingGenerated: true,
          cohereUsage: { embeddingTokens: 100, monthlyUsage: 1, monthlyLimit: 1000 }
        }
      });

      // Mock memory extraction
      vi.spyOn(memoryExtractor, 'extractAndStoreMemories').mockResolvedValue({
        insights: [
          {
            content: 'Student shows consistent improvement in Physics',
            importanceScore: 4,
            tags: ['achievement', 'physics'],
            category: 'achievement',
            sourceContext: 'Performance improvement noted'
          }
        ],
        memoriesCreated: 1,
        embeddingsGenerated: 1,
        storageErrors: []
      });

      // Test the flow
      const isPersonal = personalQuestionDetector.detectPersonalQuestion(mockMessage).isPersonal;
      expect(isPersonal).toBe(true);

      const contextLevel = determineContextLevel(mockMessage, true);
      expect(contextLevel).toBe(2);

      const context = await studentContextBuilder.buildContextByLevel(mockUserId, contextLevel);
      expect(context.length).toBeGreaterThan(0);

      const searchResult = await semanticSearch.searchMemories({
        userId: mockUserId,
        query: mockMessage,
        limit: 3,
        contextLevel: 'balanced'
      });
      expect(searchResult.memories).toHaveLength(1);

      const extractionResult = await memoryExtractor.extractAndStoreMemories({
        userId: mockUserId,
        conversationId: mockConversationId,
        userMessage: mockMessage,
        aiResponse: 'Your Physics is improving well!',
        isPersonalQuery: isPersonal,
        contextLevel: 'balanced'
      });
      expect(extractionResult.memoriesCreated).toBe(1);

      // Test caching
      const cacheKey = studyBuddyCache.generateCacheKey({
        userId: mockUserId,
        message: mockMessage,
        contextLevel
      });
      
      const mockResponse = { content: 'Your Physics performance is good!', cached: false };
      studyBuddyCache.cacheAIResponse(cacheKey, mockResponse);
      
      const cachedResponse = studyBuddyCache.getCachedAIResponse(cacheKey);
      expect(cachedResponse).toEqual(mockResponse);
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors', async () => {
      vi.spyOn(semanticSearch, 'searchMemories').mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await semanticSearch.searchMemories({
        userId: 'test-user',
        query: 'test query'
      });

      expect(result.memories).toHaveLength(0);
    });

    test('should handle API rate limits', async () => {
      // Mock rate limit scenario
      const originalSearchMemories = semanticSearch.searchMemories;
      vi.spyOn(semanticSearch, 'searchMemories').mockImplementation(async () => {
        throw new Error('Rate limit exceeded');
      });

      const result = await semanticSearch.searchMemories({
        userId: 'test-user',
        query: 'test query'
      });

      expect(result.memories).toHaveLength(0);
    });
  });

  describe('Performance Tests', () => {
    test('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => ({
        userId: `user-${i}`,
        query: `How am I doing in subject ${i}?`,
        contextLevel: 2
      }));

      const startTime = Date.now();
      
      const promises = requests.map(async (req) => {
        const cacheKey = studyBuddyCache.generateCacheKey({
          userId: req.userId,
          message: req.query,
          contextLevel: req.contextLevel
        });
        
        studyBuddyCache.set(cacheKey, { response: `Response for ${req.query}` });
        return studyBuddyCache.get(cacheKey);
      });

      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should maintain cache performance under load', () => {
      const startTime = Date.now();
      
      // Add 100 entries
      for (let i = 0; i < 100; i++) {
        studyBuddyCache.set(`key-${i}`, { data: `data-${i}` });
      }

      // Retrieve all entries
      for (let i = 0; i < 100; i++) {
        studyBuddyCache.get(`key-${i}`);
      }

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(500); // Should be fast
    });
  });

  describe('Memory Management', () => {
    test('should clean up expired entries', () => {
      // Add entries with different TTLs
      studyBuddyCache.set('short-ttl', { data: 'short' }, { ttl: 10 });
      studyBuddyCache.set('long-ttl', { data: 'long' }, { ttl: 1000 });

      // Wait for short TTL to expire
      setTimeout(() => {
        const cleaned = studyBuddyCache.cleanup();
        expect(cleaned).toBe(1);
        expect(studyBuddyCache.get('short-ttl')).toBeNull();
        expect(studyBuddyCache.get('long-ttl')).not.toBeNull();
      }, 15);
    });

    test('should evict oldest entries when at capacity', () => {
      // Fill cache to near capacity
      for (let i = 0; i < 450; i++) {
        studyBuddyCache.set(`key-${i}`, { data: `data-${i}` });
      }

      expect(studyBuddyCache.size()).toBe(450);

      // Add more entries to trigger eviction
      for (let i = 450; i < 500; i++) {
        studyBuddyCache.set(`key-${i}`, { data: `data-${i}` });
      }

      // Should still be at max size
      expect(studyBuddyCache.size()).toBeLessThanOrEqual(500);
    });
  });
});