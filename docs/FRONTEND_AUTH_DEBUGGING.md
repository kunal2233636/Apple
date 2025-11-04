# Frontend Authentication Debugging Guide

## Issue Summary
Console errors like:
- `Failed to update block start time: {}`
- `Error applying time adjustment: {}`
- `Apply Penalty: Could not fetch user gamification data. {}`

**Root Cause**: Frontend authentication issues, NOT missing database tables.

## Quick Diagnostic Steps

### 1. Check Authentication Status
Open browser dev tools and run in console:
```javascript
// Check if user is authenticated
console.log('User Auth Status:', await window.supabase?.auth.getUser());
```

### 2. Verify Supabase Client
```javascript
// Check Supabase client configuration
console.log('Supabase Client:', window.supabase);
```

### 3. Test Database Connection with Auth
```javascript
// Test authenticated query
const { data, error } = await window.supabase
  .from('user_gamification')
  .select('*')
  .limit(1);
  
console.log('Auth Query Result:', { data, error });
```

## Common Solutions

### A. Re-authenticate User
1. Log out completely
2. Clear browser cache/cookies
3. Log back in
4. Test functionality

### B. Check Environment Variables
Ensure these are correctly set in your `.env`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### C. Verify NextAuth Configuration
Check that NextAuth is properly configured to work with Supabase authentication.

### D. Add Authentication Guards
Wrap database queries with authentication checks:

```javascript
// Before making database queries
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  console.log('User not authenticated');
  return;
}
// Now safe to make database queries
```

## Next Steps
1. Complete the database migration (create missing tables)
2. Fix frontend authentication flow
3. Test all functionality with proper user sessions

## Status
- ✅ Database tables: 18/20 exist
- ❌ Missing: `revision_topics`, `cbse_question_sets`  
- 🚨 Frontend auth: Needs debugging