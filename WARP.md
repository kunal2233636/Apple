# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Core Commands

This is a Next.js 15 app (`nextn`) with Vitest tests and TypeScript typechecking.

All commands below assume you are in the repo root (`C:\Users\kunal\Apple\Apple`). Use `npm` unless the user explicitly prefers another package manager.

### Install dependencies

- `npm install`

### Development server

- Start Next.js dev server (with Turbopack):
  - `npm run dev`
- Typical entrypoint for the UI: `src/app/page.tsx`

### Build & run

- Build the production bundle:
  - `npm run build`
- Start the production server (after build):
  - `npm start`

### Linting & types

- Lint the codebase (Next lint):
  - `npm run lint`
- Typecheck (no emit, uses `tsconfig.test.json`):
  - `npm run typecheck`

### Tests (Vitest)

General:

- Run the main test suite:
  - `npm test`
- Run tests once (no watch):
  - `npm run test:run`
- Watch mode during development:
  - `npm run test:watch`
- Test UI (Vitest UI):
  - `npm run test:ui`
- Coverage:
  - `npm run test:coverage`

Targeted AI-related suites:

- All AI tests under `src/lib/ai/tests`:
  - `npm run test:ai`
- Provider-specific tests under `src/lib/ai/providers`:
  - `npm run test:providers`
- AI integration tests under `src/lib/ai/tests/integration`:
  - `npm run test:integration`

Running a single test (pattern):

- By file:
  - `npx vitest path/to/file.test.ts`
- By test name (substring match):
  - `npx vitest path/to/file.test.ts -t "partial test name"`

### Genkit (AI dev tooling)

- Start Genkit dev tooling pointing at `src/ai/dev.ts`:
  - `npm run genkit:dev`
- Watch mode for Genkit dev:
  - `npm run genkit:watch`

## High-Level Architecture

This section summarizes the major subsystems and how they interact. Do not enumerate every file; instead, navigate starting from these directories.

### Next.js app

- The main web application is a Next.js 15 app.
- Entrypoint: `src/app/page.tsx` (referenced by the root `README.md`).
- Typical Next.js structure (`src/app`, `src/components`, etc.) should be assumed unless otherwise indicated by the code; inspect `src/app` when adding routes or pages.

### AI subsystem (`src/lib/ai`)

This repo has a substantial AI integration layer that is central to most non-trivial features.

Key ideas (from `src/lib/ai/README.md` and `src/lib/ai/chat/README.md`):

- **Multi-provider support**: Groq, Gemini, Cerebras, Cohere, Mistral, and OpenRouter.
- **API key testing harness**:
  - Centralized API key validation before using AI features.
  - Orchestrated via `testAllAPIKeys` / `getAPIKeyTester` and provider-specific test helpers under `src/lib/ai/providers`.
  - Results are logged (console + file), and can be surfaced in the UI via localStorage-based history.
- **Unified chat interface** (`src/lib/ai/chat`):
  - `unified-provider.ts`: abstract base + common utilities for all AI providers.
  - `provider-registry.ts`: registry/health checks, provider priority, and automatic fallback logic.
  - `chat-service.ts`: main `UnifiedChatService` coordinating routing, streaming, sessions, and metrics.
  - `configuration-manager.ts`: manages provider configs, env var mapping, enable/disable flags, and priorities.
  - Public surface is designed around `getChatService()` and API routes like `/api/chat` and `/api/chat/stream`.
  - Supports:
    - Standard request/response chat
    - Server-Sent Events streaming
    - Provider health checks
    - Provider performance metrics and basic rate-limit awareness
- **Environment configuration**:
  - Expects provider API keys via env vars (e.g., `GROQ_API_KEY`, `GEMINI_API_KEY`, `CEREBRAS_API_KEY`, `COHERE_API_KEY`, `MISTRAL_API_KEY`, `OPENROUTER_API_KEY`).
  - Additional chat-level envs (e.g., `CHAT_DEFAULT_PROVIDER`, `CHAT_TIMEOUT`, etc.) configure defaults and limits.

When extending AI functionality, prefer to:

- Add or adjust providers under `src/lib/ai/chat/providers` via `BaseUnifiedProvider` rather than calling raw HTTP APIs.
- Use `getChatService()` / `streamMessage` in app code instead of direct provider SDK calls.
- Use the existing API key testing/logging utilities when introducing new providers or changing env var expectations.

### Hallucination prevention system (`src/lib/hallucination-prevention`)

This repository implements a multi-layer hallucination prevention architecture. Layers are documented via separate READMEs; they are intended to work together but can often be used independently.

- **Layer 1 – Input validation & preprocessing** (`layer1`):
  - Pipeline: user input → `InputValidator` → `QueryClassifier` → `PromptEngineer` → AI service.
  - Core operations:
    - Content sanitization, PII detection, prompt-injection and inappropriate content filtering.
    - Query classification (type, complexity, safety) and strategy selection.
    - Prompt construction with safety constraints, context integration, and response-format guidance.
  - Public API (pattern):
    - High-level: `processInput` returns validation result, classification, optimized prompt, and metadata.
    - Component-level: `validateInput`, `classifyQuery`, `constructPrompt` for more granular control.

- **Layer 2 – Context & memory management** (`layer2`):
  - Focuses on ultra-compressed context building and memory/knowledge management.
  - Key components:
    - `EnhancedContextBuilder`: builds context at 4 levels (light, recent, selective, full) with aggressive compression and integration of student profile/learning style.
    - `KnowledgeBase`: manages knowledge sources, verification (content/source/cross-reference/expert), reliability scores, and advanced search.
    - `ConversationMemory`: stores/retrieves/optimizes interaction memories; handles cross-conversation linking and retention policies.
    - `ContextOptimizer`: enforces token budgets, relevance scoring, and context compression/optimization strategies.
  - `Layer2Service` (in `index.ts`) orchestrates these for end-to-end context preparation before AI calls.

- **Layer 4 – User feedback & learning** (`layer4`):
  - Collects feedback and uses it to improve behavior and personalization.
  - Main elements:
    - `FeedbackCollector`: explicit (ratings, corrections) + implicit (time on page, follow-up questions) feedback.
    - `LearningEngine`: derives corrections/patterns from feedback to inform model and configuration choices.
    - `PersonalizationEngine`: shapes responses based on user profiles, segments, learning styles, and preferences.
    - `PatternRecognizer`: identifies behavioral/feedback/quality patterns and correlations.
  - Entry pattern: `processUserFeedbackAndLearning` for full pipeline; lower-level helpers for quick feedback and pattern analysis.

- **Layer 5 – (High-level safeguards & orchestration)** (`layer5`):
  - Adds system-level safeguards and orchestration on top of earlier layers (see `layer5/README.md` for specifics).
  - Use when implementing new end-to-end flows that must apply hallucination prevention consistently across input, context, model selection, and feedback.

When adding new AI features that should be “safe by default”, route requests through Layer 1 and Layer 2 before hitting `UnifiedChatService`, and surface outcomes into Layer 4 where user feedback is relevant.

### Background jobs system (`src/lib/background-jobs`)

The background jobs system is a key part of the runtime behavior and maintenance of AI-related data and performance.

From `src/lib/background-jobs/README.md`:

- **Purpose**: Run scheduled maintenance and monitoring jobs for AI usage, data hygiene, and system health.
- **Core files**:
  - `scheduler.ts`: cron-like scheduling and job registration.
  - `runner.ts`: initialization, lifecycle management, and graceful shutdown.
  - `configuration.ts`: job definitions (names, schedules, priorities, dependencies).
  - `index.ts`: consolidated exports and helper functions.
  - A set of job modules like `daily-memory-cleanup`, `weekly-summary-generation`, `database-maintenance`, `rate-limit-monitor`, `archive-conversations`, `automated-backup`, etc.
- **Integration patterns**:
  - Initialization from application startup: `initializeBackgroundJobs()`; use this in server bootstrap code when you need jobs active.
  - Manual execution helpers: `executeDailyMemoryCleanup`, `executeHealthCheck`, `executeAutomatedBackup`, and others for targeted debugging.
  - Monitoring helpers: `backgroundJobRunner.getStatus()`, `getJobHistory()`, `getSystemMetrics()`, `rateLimitMonitor.getCurrentStatus()`, etc.

When modifying or adding jobs:

- Wire new jobs into `scheduler.ts` and `configuration.ts` rather than creating ad-hoc cron logic elsewhere.
- Use existing patterns for rate-limit awareness and provider failover instead of duplicating logic.

### Tests & validation for hallucination prevention (`src/test/hallucination-prevention`)

- There is a dedicated test/readme area for hallucination-prevention tests under `src/test/hallucination-prevention`.
- Use this directory as the primary place to add or adjust tests that assert cross-layer behavior and integration for the hallucination prevention stack.

## README alignment

Important points from `README.md` and AI-related READMEs already reflected above:

- This project is based on a Firebase Studio Next.js starter; UI entry is `src/app/page.tsx`.
- The AI subsystem is designed to validate provider keys up front, funnel traffic through a unified chat abstraction, and run periodic background jobs to maintain health and data quality.
- When implementing new features, prefer hooking into these existing layers (AI chat, hallucination prevention, background jobs) instead of bypassing them with one-off provider calls or schedulers.
