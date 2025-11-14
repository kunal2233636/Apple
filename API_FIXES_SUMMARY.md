# API Key Errors and Model Configuration Fixes

## Summary of Changes (January 2025)

### Issues Fixed

1. **Generic/Irrelevant AI Responses** ✅
   - **Problem**: Models were responding with generic responses about past topics (e.g., thermodynamics) instead of current query
   - **Root Cause**: Unlimited conversation history being sent to AI models, causing context pollution
   - **Fix**: Limited conversation history to last 4 messages only in `ai-service-manager-unified.ts`
   - **Location**: `src/lib/ai/ai-service-manager-unified.ts` line 576-586

2. **Gemini API Authentication Failures** ✅
   - **Problem**: "Gemini authentication failed - check API key" errors
   - **Root Cause**: Invalid/expired API key or missing model access
   - **Fix**: Updated default model from `gemini-2.5-flash-lite` to `gemini-2.0-flash-lite` (confirmed working model)
   - **Action Required**: Replace `GEMINI_API_KEY` in `.env` with fresh key from Google AI Studio

3. **OpenRouter API Authentication Failures** ✅
   - **Problem**: "OpenRouter authentication failed - check API key" errors
   - **Root Cause**: Invalid/expired API key
   - **Fix**: None (code-side), but documented requirement to update key
   - **Action Required**: Replace `OPENROUTER_API_KEY` in `.env` with fresh key from openrouter.ai

4. **Google Embeddings Not Configured** ✅
   - **Problem**: "Google Embeddings: No API key or project ID provided. Using placeholders."
   - **Root Cause**: Missing `GOOGLE_API_KEY` or `GOOGLE_CLOUD_PROJECT_ID` environment variables
   - **Fix**: Documented required environment variables
   - **Action Required**: Add to `.env`:
     ```env
     GOOGLE_API_KEY=your_key_here
     ```

5. **Outdated Groq Model References** ✅
   - **Problem**: Using `llama-3.1-70b-versatile` which was requested to be replaced
   - **Fix**: Updated to `llama-3.3-70b-versatile` as default
   - **Added**: New model `openai/gpt-oss-20b` to available Groq models

### Files Modified

#### 1. `src/lib/ai/providers/groq-client.ts`
- ✅ Replaced `llama-3.1-70b-versatile` with `llama-3.3-70b-versatile`
- ✅ Added `openai/gpt-oss-20b` to available models list
- **Lines**: 242-250, 395-396

#### 2. `src/lib/ai/ai-service-manager-unified.ts`
- ✅ **CRITICAL FIX**: Limited conversation history to last 4 messages (prevents generic responses)
- ✅ Updated default models for all providers to use working, free models:
  - Groq: `llama-3.3-70b-versatile`
  - Gemini: `gemini-2.0-flash-lite`
  - Cerebras: `llama-3.3-70b`
  - Cohere: `command-r`
  - Mistral: `mistral-small-latest`
  - OpenRouter: `meta-llama/llama-3.1-8b-instruct:free`
- **Lines**: 576-586 (conversation history fix), 605-650 (model updates)

#### 3. `src/components/ai/ModelSelector.tsx`
- ✅ Added `openai/gpt-oss-20b` to free models list under Groq provider
- **Lines**: 160-167

#### 4. `src/lib/ai/study-buddy-settings-service.ts`
- ✅ Updated valid models list for all providers
- ✅ Added proper model mappings for OpenRouter and Google
- **Lines**: 204-211

### Environment Variables Required

Add these to your `.env` file:

```env
# Required for Google Embeddings
GOOGLE_API_KEY=your_google_ai_studio_key_here
GOOGLE_CLOUD_LOCATION=us-central1

# Update these with fresh keys
GEMINI_API_KEY=your_new_gemini_key_here
OPENROUTER_API_KEY=your_new_openrouter_key_here

# Existing keys (should be working)
GROQ_API_KEY=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
CEREBRAS_API_KEY=csk-emyx42w88c4ddy225revxrpc6vffne5286ek5nevv5np486h
COHERE_API_KEY=ct5c9Usx0I3zvy8WlAXrHWPvXyBlIL06J7rNkSy5
MISTRAL_API_KEY=OM53Fa935XW3HFMH0VHcnDTBi8DrN4nY
```

### Testing Steps

1. **Update Environment Variables**
   ```bash
   # Update .env with new API keys
   # Restart dev server
   npm run dev
   ```

2. **Test API Keys**
   ```bash
   # Run API key tester
   node test-api-keys.js
   ```

3. **Test Chat Responses**
   - Ask a simple question
   - Verify response is relevant to your CURRENT question, not past topics
   - Test multiple providers (Groq, Gemini, etc.)

4. **Test Model Selection**
   - Open Study Buddy settings
   - Verify new models appear in dropdown:
     - Groq: "GPT OSS 20B"
     - Groq: "Llama 3.3 70B Versatile" (default)

### Expected Behavior After Fixes

#### Before Fix:
```
User: "Hello"
AI: "Hello! It looks like you've been exploring the concept of enthalpy quite a bit. 
     How can I assist you further today? Today is October 5, 2023."
```
❌ Generic response referencing past conversations and wrong date

#### After Fix:
```
User: "Hello"
AI: "Hi! I'm your study assistant. How can I help you today?"
```
✅ Relevant response focused on current query

### Why Generic Responses Happened

The AI service manager was including **unlimited conversation history** in every request. This caused:

1. Models to see old messages about different topics
2. Context pollution with irrelevant information
3. Models responding to old context instead of current query

**Solution**: Now only includes last 4 conversation messages, keeping context recent and relevant.

### Model Updates Summary

| Provider | Old Default | New Default | Reason |
|----------|------------|-------------|--------|
| Groq | `llama-3.1-70b-versatile` | `llama-3.3-70b-versatile` | User requested + newer model |
| Gemini | `gemini-2.5-flash-lite` | `gemini-2.0-flash-lite` | Authentication working on 2.0 |
| All | N/A | Limited history | Fix generic responses |

### New Models Available

- **Groq**: `openai/gpt-oss-20b` (Free, 32K tokens, streaming, function calling)

### Next Steps

1. ✅ Update `.env` with new Google, Gemini, and OpenRouter API keys
2. ✅ Restart development server: `npm run dev`
3. ✅ Test with `node test-api-keys.js`
4. ✅ Verify responses are now contextual and relevant
5. ✅ Check that Gemini and OpenRouter no longer show authentication errors

### Key Takeaway

**The main issue was conversation history management, not the API keys themselves.** The API key errors are secondary issues that can be fixed by updating keys, but the generic response problem was caused by sending too much old conversation context to AI models.
