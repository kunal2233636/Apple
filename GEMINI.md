# Project Overview

This is a Next.js project, a web application called "BlockWise" that is designed to help JEE students with their studies. It uses AI to power its study management features. It uses Supabase for authentication and database, and Tailwind CSS for styling. The project is structured with a main application, an admin panel, an API, and user-specific pages.

The project uses IndexedDB for local storage and a sync engine to keep the local data in sync with the Supabase database. This allows the application to work offline.

The main application has a variety of features, including:

*   Achievements
*   Activity logs
*   Analytics
*   Boards
*   Chat
*   Daily summary
*   Dashboard
*   Feedback
*   Files
*   Gamification
*   Points history
*   Resources
*   Revision
*   Revision queue
*   Schedule
*   Settings
*   Study buddy
*   Suggestions
*   Topics

The project has a significant AI component, with features covering a wide range of AI-related tasks, including:

*   Chat
*   Providers (Gemini, Groq, Cerebras, Cohere, Mistral, OpenRouter)
*   Tests
*   Activity logging
*   Adaptive teaching
*   Advanced personalization
*   AI analysis
*   AI context building
*   AI data centralization
*   AI database optimization
*   AI features engine
*   AI performance monitoring
*   AI service management
*   AI suggestions
*   Analytics data service
*   API key testing
*   API logging
*   Auto fallback management
*   Background job scheduling
*   Centralized service integration
*   Chat integration
*   Context building
*   Daily summary
*   File embedding service
*   File processing
*   Fixed embedding service
*   Fixed memory context provider
*   Google Drive integration
*   Memory context provider
*   Memory extraction
*   Mistral data service
*   Mistral integration
*   Motivation engine
*   Personal question detection
*   Personalization detection engine
*   Personalized suggestions engine
*   Prediction data service
*   Prediction engine
*   Production optimization
*   Query type detection
*   Rate limit management
*   Rate limit tracking
*   Realtime dashboard websocket
*   Realtime data integration
*   Realtime usage dashboard
*   Response caching
*   Response synthesis service
*   Schedule data service
*   Scheduling suggestions
*   Semantic search
*   Service integration layer
*   Settings integration
*   Smart query classifier
*   Student context builder
*   Study buddy caching
*   Study buddy settings service

# Building and Running

The following commands can be used to build, run, and test the project:

*   `npm run dev`: Starts the development server.
*   `npm run build`: Builds the application for production.
*   `npm run start`: Starts the production server.
*   `npm run lint`: Lints the code.
*   `npm run typecheck`: Type-checks the code.
*   `npm run test`: Runs the tests.

# Development Conventions

The project uses TypeScript and ESLint for code quality. The code is structured in a standard Next.js project layout, with a `src` directory containing the application's code. The project also uses a number of AI-related libraries, including `@ai-sdk`, `@genkit-ai`, and `@google/generative-ai`.

A robust fallback mechanism is implemented in `src/lib/ai/ai-service-manager-unified.ts` which includes retry logic with exponential backoff for transient errors and improved error handling to differentiate between permanent and transient errors. Individual AI provider clients (e.g., Gemini, Groq, Cerebras, Cohere, Mistral, OpenRouter) also implement their own retry logic.
