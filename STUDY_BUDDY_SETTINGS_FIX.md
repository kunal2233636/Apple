# Study Buddy Settings Issue - Complete Fix Guide

## Problem Summary

You're experiencing two related issues:
1. **"High demand" error message** - AI not responding
2. **Model settings not persisting** - Changes in settings don't take effect

## Root Causes

### Issue 1: High Demand Error
- **NOT from the AI provider** - it's a fallback message in your code (line 778 in `ai-service-manager-unified.ts`)
- Appears when **ALL configured AI providers fail**
- Most common cause: **Model timeouts or API key issues**

### Issue 2: Settings Not Persisting
The settings UI (lines 322-327 in `study-buddy/page.tsx`) calls `savePreferences()`, but there's a **race condition** where:
1. When you change the provider, the model auto-selection (lines 269-272 in `use-study-buddy.ts`) overwrites your manual model selection
2. Settings are stored in localStorage but may not reload properly

## Complete Fix

### Step 1: Clear Your Browser Cache

```powershell
# Option 1: Open browser DevTools (F12) and run in Console:
localStorage.clear()
location.reload()

# Option 2: In your browser:
# Chrome/Edge: Ctrl+Shift+Delete > Clear browsing data > Cached images and files + Cookies
```

### Step 2: Verify Your API Keys

Check that your `.env` file has valid API keys:

```bash
# Open .env file and verify:
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIza...
OPENROUTER_API_KEY=sk-or-v1-...
```

### Step 3: Restart Dev Server

```powershell
# Stop the server (Ctrl+C)
npm run dev
```

### Step 4: Test with Fast Model

1. Open Study Buddy
2. Click the ⚙️ Settings icon
3. Change settings to:
   - **Provider:** `groq`
   - **Model:** `llama-3.1-8b-instant` (fast model)
4. Click outside the settings panel to close it
5. Send a test message: "Hello, can you help me study?"

### Step 5: Check Server Console

Look at your terminal where `npm run dev` is running. You should see:

**✅ Success:**
```
Success with provider: groq
```

**❌ Error (with detailed info):**
```
========================================
[req-xxx] ❌ ALL PROVIDERS FAILED
========================================
Query Type: general
Attempted providers: groq, openrouter, ...
Last error: [actual error message]
========================================
```

## Common Error Messages & Solutions

### Error: "Request timeout after 25000ms"
**Cause:** Model is too slow or network issues
**Solution:** Use faster model: `llama-3.1-8b-instant` instead of `llama-3.3-70b-versatile`

### Error: "GROQ_API_KEY is not configured"
**Cause:** API key not loaded
**Solution:** 
1. Check `.env` file exists in project root
2. Restart dev server
3. Verify key is valid at https://console.groq.com/keys

### Error: "model 'xyz' is not found"
**Cause:** Wrong model name for the provider
**Solution:** Use correct model names:

| Provider | Working Free Models |
|----------|-------------------|
| groq | `llama-3.1-8b-instant` ⚡ |
| gemini | `gemini-2.0-flash-lite` ⚡ |
| cerebras | `llama3.1-8b` 🚀 |
| openrouter | `meta-llama/llama-3.1-8b-instruct:free` |

### Error: "rate limit exceeded"
**Cause:** Too many requests
**Solution:** Wait 1-2 minutes or switch to different provider

## Why Settings Aren't Persisting

### The Problem in the Code

In `use-study-buddy.ts` (lines 266-294), when you change the provider:

```typescript
const savePreferences = useCallback((newPreferences: Partial<ChatPreferences>) => {
  const updated = { ...preferences, ...newPreferences };
  
  // 🚨 THIS IS THE PROBLEM: Auto-selects default model when provider changes
  if (newPreferences.provider && newPreferences.provider !== preferences.provider) {
    updated.model = getDefaultModelForProvider(newPreferences.provider);
  }
  // ... saves to localStorage
}, [preferences]);
```

**What happens:**
1. You select Provider: `groq`
2. You select Model: `llama-3.3-70b-versatile`
3. Code auto-changes Model back to: `llama-3.1-8b-instant` (default)

### Temporary Workaround

**Always change model AFTER selecting provider:**
1. Click Settings ⚙️
2. Select Provider → Click away from dropdown
3. THEN select Model → Click away from dropdown
4. Close settings panel

## Quick Test Commands

### Check localStorage Settings
Open browser DevTools (F12) > Console:
```javascript
JSON.parse(localStorage.getItem('study-buddy-preferences'))
```

### Check if Settings Are Saved
```javascript
const prefs = JSON.parse(localStorage.getItem('study-buddy-preferences'));
console.log('Provider:', prefs.provider);
console.log('Model:', prefs.model);
```

### Force Reset to Fast Model
```javascript
localStorage.setItem('study-buddy-preferences', JSON.stringify({
  provider: 'groq',
  model: 'llama-3.1-8b-instant',
  streamResponses: true,
  temperature: 0.7,
  maxTokens: 2048
}));
location.reload();
```

## Permanent Fix (Code Change)

To fix the settings persistence issue permanently, you need to modify `use-study-buddy.ts`:

### Option 1: Only Auto-Select When No Model Is Provided

```typescript
// In use-study-buddy.ts, lines 269-272, change from:
if (newPreferences.provider && newPreferences.provider !== preferences.provider) {
  updated.model = getDefaultModelForProvider(newPreferences.provider);
}

// To:
if (newPreferences.provider && newPreferences.provider !== preferences.provider && !newPreferences.model) {
  updated.model = getDefaultModelForProvider(newPreferences.provider);
}
```

This way, if you explicitly set a model, it won't be overridden.

### Option 2: Remove Auto-Selection Entirely

```typescript
// Comment out or remove lines 269-272:
// if (newPreferences.provider && newPreferences.provider !== preferences.provider) {
//   updated.model = getDefaultModelForProvider(newPreferences.provider);
// }
```

Then users must manually select both provider AND model.

## Recommended Fast Models

For best performance and to avoid "high demand" errors:

1. **Groq** (Fastest):
   - `llama-3.1-8b-instant` ⚡⚡⚡
   
2. **Cerebras** (Very Fast):
   - `llama3.1-8b` 🚀🚀
   
3. **Gemini** (Fast):
   - `gemini-2.0-flash-lite` ⚡⚡

4. **OpenRouter** (Free but slower):
   - `meta-llama/llama-3.1-8b-instruct:free` ⚡

## Final Checklist

- [ ] Clear browser localStorage
- [ ] Verify API keys in `.env`
- [ ] Restart dev server
- [ ] Set Provider to `groq`
- [ ] Set Model to `llama-3.1-8b-instant`
- [ ] Close settings panel
- [ ] Send test message
- [ ] Check server console for success/error

## Still Not Working?

If you still see "high demand" error after following all steps:

1. **Check server console output** - it will show the exact error
2. **Try different provider** - switch from groq to gemini
3. **Check API key validity** - log into provider dashboard
4. **Check network/firewall** - ensure API requests aren't blocked
5. **Share server console error** - the detailed error message will tell us exactly what's wrong

---

## Quick Commands Summary

```powershell
# 1. Restart dev server
npm run dev

# 2. Clear localStorage (in browser DevTools console)
localStorage.clear()
location.reload()

# 3. Force fast model (in browser DevTools console)
localStorage.setItem('study-buddy-preferences', JSON.stringify({provider: 'groq', model: 'llama-3.1-8b-instant', streamResponses: true, temperature: 0.7, maxTokens: 2048}))
location.reload()
```

This should resolve both your issues! 🎉
