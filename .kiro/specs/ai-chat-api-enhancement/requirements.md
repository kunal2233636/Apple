# Requirements Document

## Introduction

This specification defines the enhancement of the existing Study Buddy AI chat system to provide a comprehensive, multi-provider AI infrastructure with advanced features including flexible model selection, enhanced web search with article extraction, multi-provider embedding services, file-based RAG from Cloudflare R2, and session-based memory management. These enhancements will be integrated into the existing Study Buddy chat interface at `/api/ai/chat`, maintaining backward compatibility while adding new capabilities for semantic search, web content analysis, and knowledge retrieval. This is NOT a separate chat interface - all improvements enhance the current Study Buddy experience.

## Glossary

- **Study Buddy Chat System**: The main conversational AI endpoint at `/api/ai/chat` that processes user queries and generates responses within the Study Buddy interface
- **Embedding Service**: A multi-provider service that generates vector embeddings for semantic search and RAG
- **Web Search Engine**: A service that performs web searches, fetches article content, and provides LLM-based explanations
- **Memory System**: A dual-layer memory architecture with session-specific and universal semantic memory
- **RAG System**: Retrieval-Augmented Generation system that enhances responses with relevant context
- **Serper.dev**: Third-party web search API service used for search queries
- **Cheerio**: HTML parsing library for extracting article content from web pages
- **Cloudflare R2**: Object storage service for storing markdown knowledge files
- **Voyage AI**: Embedding provider offering multilingual embedding models
- **Session Memory**: Conversation-specific memory tied to a particular chat session
- **Universal Memory**: Cross-session semantic memory stored as vectors for knowledge retention
- **LLM**: Large Language Model used for generating AI responses

## Requirements

### Requirement 1: Flexible Model Selection

**User Story:** As a developer, I want to specify which AI provider and model to use for each Study Buddy chat request, so that I can optimize for cost, performance, or specific capabilities.

#### Acceptance Criteria

1. WHEN a request is sent to THE Study Buddy Chat System with provider and model parameters, THE Study Buddy Chat System SHALL route the request to the specified provider and model
2. WHEN no provider is specified in a request, THE Study Buddy Chat System SHALL use the configured default provider
3. WHEN an invalid provider or model is specified, THE Study Buddy Chat System SHALL return a validation error with available options
4. THE Study Buddy Chat System SHALL validate that the requested model is supported by the specified provider before processing
5. THE Study Buddy Chat System SHALL include the actual provider and model used in the response metadata

### Requirement 2: Enhanced Web Search with Article Extraction

**User Story:** As a user, I want the AI to read and explain full articles from web search results, so that I receive comprehensive information beyond just snippets.

#### Acceptance Criteria

1. WHEN a web search is performed, THE Web Search Engine SHALL fetch the HTML content of the top relevant result by default
2. WHEN HTML content is fetched, THE Web Search Engine SHALL use Cheerio to extract the main article text
3. WHEN article text is extracted, THE Web Search Engine SHALL call an LLM to generate an explanation of the article content
4. WHEN a user requests information from multiple websites, THE Web Search Engine SHALL fetch and process up to the specified number of articles
5. THE Web Search Engine SHALL return both raw search results and LLM-generated explanations in the response

### Requirement 3: Multi-Provider Embedding Service

**User Story:** As a system administrator, I want to use multiple embedding providers with specific models, so that I can ensure high-quality multilingual embeddings and system reliability.

#### Acceptance Criteria

1. THE Embedding Service SHALL support Voyage AI with the voyage-multilingual-2 model
2. THE Embedding Service SHALL support Google with the gemini-embedding-001 model
3. THE Embedding Service SHALL support Cohere with the embed-multilingual-v3.0 model
4. WHEN an embedding request is made, THE Embedding Service SHALL use the specified provider or fall back to configured defaults
5. THE Embedding Service SHALL provide a unified API endpoint that supports embed, search, and RAG modes

### Requirement 4: Embedding API Endpoint

**User Story:** As a developer, I want a dedicated embedding endpoint that handles embeddings, semantic search, and RAG operations, so that I can build advanced AI features.

#### Acceptance Criteria

1. THE Embedding Service SHALL expose a POST endpoint at /api/ai/embedding
2. WHEN mode is "embed", THE Embedding Service SHALL generate embeddings for the provided texts and return embedding vectors
3. WHEN mode is "search", THE Embedding Service SHALL perform semantic search over conversation memory and return relevant memories
4. WHEN mode is "rag", THE Embedding Service SHALL retrieve relevant context and optionally generate an LLM response
5. THE Embedding Service SHALL accept optional provider and model parameters to override defaults

### Requirement 5: Cloudflare R2 File Storage and Retrieval

**User Story:** As a knowledge manager, I want to store markdown notes in Cloudflare R2 and retrieve them for RAG, so that the AI can access structured knowledge bases.

#### Acceptance Criteria

1. THE RAG System SHALL connect to Cloudflare R2 using configured credentials
2. WHEN a file search is requested, THE RAG System SHALL list and locate markdown files in the R2 bucket
3. WHEN markdown files are found, THE RAG System SHALL fetch their contents
4. THE RAG System SHALL use the Embedding Service to perform semantic search over markdown file contents
5. THE RAG System SHALL expose a POST endpoint at /api/ai/files for file retrieval operations

### Requirement 6: Session-Based Memory Management

**User Story:** As a user, I want my conversations to have their own memory context, so that the AI remembers information specific to each chat session.

#### Acceptance Criteria

1. THE Memory System SHALL store memories with a conversation_id to associate them with specific sessions
2. WHEN retrieving session memory, THE Memory System SHALL filter memories by conversation_id
3. THE Memory System SHALL support storing new memories with session context
4. WHEN updating a memory, THE Memory System SHALL mark the memory as updated in the metadata
5. THE Memory System SHALL return update confirmation in the API response indicating the memory was updated

### Requirement 7: Universal Semantic Memory

**User Story:** As a user, I want important information to be remembered across all my conversations, so that the AI builds long-term knowledge about my preferences and context.

#### Acceptance Criteria

1. THE Memory System SHALL store high-priority memories in a universal memory store accessible across sessions
2. WHEN performing semantic search, THE Memory System SHALL search both session-specific and universal memories
3. THE Memory System SHALL use vector embeddings to enable semantic similarity search
4. THE Memory System SHALL rank memories by relevance score combining similarity and importance
5. THE Memory System SHALL expose separate endpoints for session memory and universal memory operations

### Requirement 8: Memory Update Tracking

**User Story:** As a developer, I want to track when memories are updated, so that the system can distinguish between new and modified information.

#### Acceptance Criteria

1. WHEN a memory is updated, THE Memory System SHALL set a metadata flag indicating action type as "updated"
2. THE Memory System SHALL store the update timestamp in the memory record
3. WHEN returning updated memories, THE Memory System SHALL include the update status in the response
4. THE Memory System SHALL maintain a history of memory modifications in the interaction_data field
5. THE Memory System SHALL return a clear confirmation message when a memory update succeeds

### Requirement 9: Web Search Flexibility

**User Story:** As a user, I want control over how many websites are searched, so that I can get quick answers or comprehensive research as needed.

#### Acceptance Criteria

1. THE Web Search Engine SHALL default to fetching content from one top relevant website
2. WHEN a user requests more sources, THE Web Search Engine SHALL accept a maxArticles parameter
3. THE Web Search Engine SHALL support an explain parameter to enable or disable LLM explanations
4. WHEN explain mode is enabled, THE Web Search Engine SHALL process each article through an LLM
5. THE Web Search Engine SHALL return both structured search results and natural language explanations

### Requirement 10: Backward Compatibility and Study Buddy Integration

**User Story:** As a system maintainer, I want new features to be backward compatible and seamlessly integrated into Study Buddy, so that existing Study Buddy functionality continues to work without modification.

#### Acceptance Criteria

1. THE Study Buddy Chat System SHALL continue to support all existing request parameters used by the Study Buddy interface
2. WHEN new optional parameters are omitted, THE Study Buddy Chat System SHALL use default behavior matching the previous version
3. THE Study Buddy Chat System SHALL maintain existing response structure while adding new optional fields
4. THE Memory System SHALL continue to support existing GET and POST operations used by Study Buddy
5. THE Web Search Engine SHALL maintain existing search functionality when new parameters are not provided
6. THE Study Buddy Chat System SHALL integrate all new features without requiring changes to the Study Buddy UI components
