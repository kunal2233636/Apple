# Implementation Plan

- [x] 1. Set up Voyage AI embedding provider




  - Create VoyageEmbeddingProvider class in `src/lib/ai/providers/voyage-embeddings.ts`
  - Implement generateEmbeddings method using voyage-multilingual-2 model
  - Add health check method for provider status
  - _Requirements: 2.1, 3.1, 3.2_

- [x] 2. Update unified embedding service with new providers





  - [x] 2.1 Add Voyage provider to unified-embedding-service.ts


    - Add 'voyage' to AIProvider type
    - Update models mapping with voyage: 'voyage-multilingual-2'
    - Add Voyage to fallbackProviders array
    - _Requirements: 3.1, 3.2, 3.3_
  -

  - [x] 2.2 Update Google embedding model






    - Change Google model from 'text-embedding-004' to 'gemini-embedding-001'
    - Update GoogleEmbeddingProvider to use new model
    - _Requirements: 3.2_
  
  - [x] 2.3 Update Cohere embedding model







    - Change Cohere model from 'embed-english-v3.0' to 'embed-multilingual-v3.0'
    - Update CohereClient to use multilingual model
    - _Requirements: 3.3_

- [x] 3. Create /api/ai/embedding endpoint




  - [x] 3.1 Create route.ts file







    - Create `src/app/api/ai/embedding/route.ts`
    - Implement POST handler with mode parameter
    - Add GET handler for health check
    - _Requirements: 4.1, 4.2_
  - [x] 3.2 Implement embed mode




  - [x] 3.2 Implement embed mode


    - Accept texts array in request body
    - Call unifiedEmbeddingService.generateEmbeddings
    - Return embeddings with provider and model metadata
    - _Requirements: 4.2_
  
  - [x] 3.3 Implement search mode





    - Accept query and search parameters
    - Generate query embedding
    - Perform semantic search over conversation_memory
    - Return relevant memories with similarity scores
    - _Requirements: 4.3_
  




  - [x] 3.4 Implement RAG mode


    - Accept query parameter
    - Retrieve relevant context from memories and files





    - Optionally call LLM to generate answer






    - Return context, answer, and sources
    - _Requirements: 4.4_

- [x] 4. Enhance /api/ai/web-search with article extraction



  - [ ] 4.1 Add Cheerio dependency

    - Install cheerio package: `npm install cheerio`
    - Install types: `npm install -D @types/cheerio`
    - _Requirements: 2.2_
 


  
  - [ ] 4.2 Implement article content extraction

    - Create extractArticleContent function using Cheerio
    - Fetch HTML from article URL
    - Parse and extract main content (paragraphs, headings)
    - Handle extraction errors gracefully


    - _Requirements: 2.2_
  
  - [x] 4.3 Implement LLM explanation generation




    - Create generateArticleExplanation function
    - Call AI provider with article content
    - Use prompt: "Explain this article in simple terms for a student"
    - Return explanation text
    - _Requirements: 2.3_
  - [x] 4.4 Update web-search route.ts




  - [ ] 4.4 Update web-search route.ts

    - Add explain and maxArticles parameters to request interface
    - Default maxArticles to 1
    - Process top N articles when maxArticles > 1
    - Include fullContent and explanation in response
    - _Requirements: 2.1, 2.4, 2.5, 9.1, 9.2_
-

- [x] 5. Create /api/ai/files endpoint for R2 integration






  - [x] 5.1 Install Cloudflare R2 SDK

    - Install @aws-sdk/client-s3 (R2 is S3-compatible)
    - Configure R2 client with credentials
    - _Requirements: 5.1_

  -

  - [x] 5.2 Create route.ts file





    - Create `src/app/api/ai/files/route.ts`
    - Implement POST handler with mode parameter
    - Add GET handler for health check
    - _Requirements: 5.5_
  
-

  - [x] 5.3 Implement file listing and retrieval





    - Create listMarkdownFiles function
    - Create getFileContent function
    - Handle R2 errors gracefully
    - _Requirements: 5.2, 5.3_

  

  - [x] 5.4 Implement semantic file search





    - Generate embeddings for query
    - Search over file contents using embeddings
    - Return relevant files with relevance scores
    - _Requirements: 5.4_

- [x] 6. Implement dual-layer memory system





  - [x] 6.1 Create database migration







    - Create migration file: `src/lib/migrations/add_memory_type_column.sql`
    - Add memory_type column with CHECK constraint
    - Create index on (user_id, memory_type, created_at)
    - _Requirements: 6.1, 7.1_
  -

  - [x] 6.2 Update memory storage logic






    - Modify /api/ai/memory POST handler
    - Accept memory_type parameter (session or universal)
    - Store memories with appropriate type
    - _Requirements: 6.3, 7.2_
  -

  - [x] 6.3 Implement session memory retrieval






    - Create getSessionMemories function
    - Filter by user_id, conversation_id, and memory_type='session'
    - Order by created_at descending
    - _Requirements: 6.2_
  
  - [x] 6.4 Implement universal memory retrieval







    - Create getUniversalMemories function
    - Use semantic search with memory_type='universal' filter
    - Rank by relevance score
    - _Requirements: 7.1, 7.3, 7.4, 7.5_
  -

  - [x] 6.5 Implement memory update tracking






    - Add update operation to /api/ai/memory
    - Set metadata.action = 'updated'
    - Store update timestamp
    - Return update confirmation message
    - _Requirements: 6.4, 6.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 7. Enhance /api/ai/chat with model selection











  - [x] 7.1 Update request interface




    - Add provider parameter to AIChatRequest
    - Add model parameter to AIChatRequest
    - Make both parameters optional
    - _Requirements: 1.1, 1.2_
  -

  - [x] 7.2 Implement provider validation





    - Validate provider is in supported list
    - Return error with available providers if invalid
    - _Requirements: 1.3_
-

  - [x] 7.3 Implement model validation




    - Validate model is supported by specified provider
    - Return error with available models if invalid
    - _Requirements: 1.4_
  
  - [x] 7.4 Update AI Service Manager integration




    - Pass provider and model to aiServiceManager.processQuery
    - Update AIServiceManager to honor provider preference
    - Update getModelForQuery to use preferredModel parameter
    - _Requirements: 1.1_
  
  - [x] 7.5 Update response metadata




    - Include providerUsed in response metadata
    - Include modelUsed in response metadata
    - _Requirements: 1.5_
-

- [x] 8. Integrate web search into /api/ai/chat







  - [x] 8.1 Add web search parameters to request



    - Add webSearch object with enabled, maxArticles, explain fields
    - Default enabled to false for backward compatibility
    - _Requirements: 9.3, 10.5_
  

  - [x] 8.2 Implement web search decision logic



    - Check if webSearch.enabled is true
    - Call enhanced /api/ai/web-search endpoint
    - Handle search failures gracefully
    - _Requirements: 2.1_
  
  - [x] 8.3 Integrate search results into AI context




    - Format search results and explanations
    - Add to AI prompt context
    - Include in response metadata

    - _Requirements: 2.5, 9.4, 9.5_

- [x] 9. Integrate memory system into /api/ai/chat





  - [x] 9.1 Add memory parameters to request




    - Add memory object with includeSession, includeUniversal fields
    - Default both to true for backward compatibility
    - _Requirements: 10.1, 10.2_
  
  - [x] 9.2 Implement dual-layer memory retrieval




    - Call getSessionMemories if includeSession is true
    - Call getUniversalMemories if includeUniversal is true
    - Combine results for AI context
    - _Requirements: 6.2, 7.1_
  
  - [x] 9.3 Update memory storage after response




    - Determine if memory should be session or universal
    - Store with appropriate memory_type
    - Include conversation_id for session memories
    - _Requirements: 6.1, 6.3_

- [x] 10. Integrate RAG file retrieval into /api/ai/chat







  - [x] 10.1 Add RAG parameters to request


    - Add rag object with enabled and sources fields
    - Default enabled to false
    - _Requirements: 10.1_
  
  - [x] 10.2 Implement file retrieval logic




    - Call /api/ai/files endpoint when rag.enabled is true
    - Retrieve relevant markdown files
    - Handle R2 failures gracefully
    - _Requirements: 5.2, 5.3_
  
  - [x] 10.3 Integrate file content into AI context





    - Format file contents for AI prompt
    - Add to context with source attribution
    - Include in response metadata
    - _Requirements: 5.4_

- [x] 11. Update environment configuration







  - Add VOYAGE_API_KEY to .env
  - Add R2_ACCOUNT_ID to .env
  - Add R2_ACCESS_KEY_ID to .env
  - Add R2_SECRET_ACCESS_KEY to .env
  - Add R2_BUCKET_NAME to .env
  - Document all new environment variables in README
  - _Requirements: 5.1_

- [x] 12. Create Cloudflare R2 setup documentation







  - Document R2 bucket creation steps
  - Document API token generation
  - Document file organization structure
  - Create example markdown files for testing
  - _Requirements: 5.1, 5.2_


- [x] 13. Update API documentation









  - Document new /api/ai/embedding endpoint
  - Document new /api/ai/files endpoint
  - Document enhanced /api/ai/chat parameters
  - Document enhanced /api/ai/web-search parameters
  - Document enhanced /api/ai/memory operations
  - Create API usage examples
  - _Requirements: 10.1, 10.2, 10.3_


- [ ] 14. Implement backward compatibility checks


  - [x] 14.1 Test existing chat requests without new parameters







    - Verify default behavior matches previous version
    - Verify response structure is unchanged
    - _Requirements: 10.1, 10.2_
  - [x] 14.2 Test existing memory operations




  - [ ] 14.2 Test existing memory operations



    - Verify GET and POST continue to work
    - Verify existing memory retrieval is unaffected
    - _Requirements: 10.4_
  - [x] 14.3 Test existing web search




  - [ ] 14.3 Test existing web search



    - Verify search without new parameters works
    - Verify response format is backward compatible
    - _Requirements: 10.5_

- [x] 15 Performance optimization








  - Implement caching for embedding generation
  - Implement caching for file retrieval from R2
  - Add request timeout handling for web scraping
  - Optimize memory query performance with proper indexes
  - _Requirements: 7.4_
