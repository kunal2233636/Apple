# AI Database Migration Execution Guide

## Overview
This guide provides step-by-step instructions to execute the AI Study Assistant database migration.

**Generated:** 2025-11-04T03:20:38.003Z
**Migration File:** migration-2025-11-02T03-13-31-004Z.sql

## Prerequisites

### Required Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database operations

### Required Tools
- Supabase CLI (for production deployment)
- PostgreSQL client (for local development)

## Execution Methods

### Method 1: Supabase CLI (Recommended for Production)

1. **Install Supabase CLI**
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**
   ```bash
   supabase login
   ```

3. **Link your project**
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. **Reset and apply migration**
   ```bash
   supabase db reset --linked
   supabase db push
   ```

### Method 2: Supabase Dashboard SQL Editor

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar

3. **Execute Migration**
   - Copy the contents of `migration-2025-11-02T03-13-31-004Z.sql`
   - Paste into the SQL Editor
   - Click "Run" to execute

### Method 3: Local PostgreSQL

1. **Connect to your database**
   ```bash
   psql "postgresql://user:password@localhost:5432/dbname"
   ```

2. **Execute migration**
   ```bash
   psql -f migration-2025-11-02T03-13-31-004Z.sql
   ```

## Expected Results

After successful execution, you should see:

### ✅ Tables Created (7 total)
1. `chat_conversations` - Chat conversation records
2. `chat_messages` - Individual chat messages
3. `study_chat_memory` - Vector-enabled memory storage
4. `memory_summaries` - Weekly/monthly compressed summaries
5. `student_ai_profile` - Student learning profiles
6. `api_usage_logs` - API usage tracking and cost monitoring
7. `ai_system_prompts` - Configurable AI behavior prompts

### ✅ Security Features
- Row Level Security (RLS) enabled on all tables
- User-based access policies implemented
- Service role permissions configured

### ✅ Performance Optimizations
- 25+ optimized indexes created
- Vector search capabilities enabled
- Query performance tuned

### ✅ Initial Data
- `hinglish_chat_general` system prompt
- `hinglish_chat_with_data` system prompt

### ✅ Database Functions
- Auto-updating timestamps
- Memory cleanup automation
- Summary generation
- API usage logging
- Vector similarity search

## Verification Steps

After execution, verify the setup:

### 1. Check Tables Exist
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('chat_conversations', 'chat_messages', 'study_chat_memory', 'memory_summaries', 'student_ai_profile', 'api_usage_logs', 'ai_system_prompts');
```

### 2. Check System Prompts
```sql
SELECT name, language, is_active 
FROM ai_system_prompts 
WHERE name IN ('hinglish_chat_general', 'hinglish_chat_with_data');
```

### 3. Check RLS Policies
```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

### 4. Check Extensions
```sql
SELECT extname 
FROM pg_extension 
WHERE extname IN ('vector', 'pgcrypto');
```

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Ensure you're using the service role key
   - Check that RLS is properly configured

2. **Extension Not Available**
   - The `vector` extension requires Supabase Pro plan
   - For local development, install: `CREATE EXTENSION vector;`

3. **Foreign Key Errors**
   - Ensure `auth.users` table exists
   - Check that UUIDs are properly formatted

4. **Vector Dimension Mismatch**
   - Ensure embeddings are exactly 1536 dimensions (Cohere)
   - Verify vector extension is loaded

## Next Steps

1. **Test the Integration**
   - Run the application with the new database structure
   - Test chat conversations and memory storage

2. **Load Vector Embeddings**
   - When ready, add vector embeddings to `study_chat_memory` table
   - Create vector indexes for similarity search

3. **Monitor API Usage**
   - The `api_usage_logs` table will track all AI API calls
   - Monitor costs and performance metrics

## Support

If you encounter issues:
1. Check the migration logs for specific error messages
2. Verify all prerequisites are met
3. Ensure environment variables are correctly set
4. Contact the development team with specific error details

---
**Migration completed successfully! 🎉**
