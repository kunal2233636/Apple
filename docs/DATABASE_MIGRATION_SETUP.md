# Database Migration Setup Guide

## Overview
Your BlockWISE application requires several database tables to be properly set up in Supabase. We've identified that most tables already exist, but one crucial table is missing: **`resources`**.

## Current Status
✅ **Tables Already Exist**:
- `profiles` - User profile information
- `revision_queue` - Spare topic revision queue
- `user_penalties` - Gamification penalty tracking

❌ **Tables Missing**:
- `resources` - Notes and other resources management (CRITICAL for Resources section)

## Why This Matters
The Resources section in your app is trying to query a `resources` table that doesn't exist, causing the "The resources table needs to be created" error message.

## Quick Setup (Recommended)

### Option 1: Supabase Dashboard (Easiest)
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your BlockWISE project
3. Navigate to **SQL Editor**
4. Create a new query
5. Copy and paste the following SQL:

```sql
-- Create resources table
CREATE TABLE IF NOT EXISTS resources (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('note', 'other')),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    description TEXT,
    url TEXT,
    category VARCHAR(10) NOT NULL CHECK (category IN ('JEE', 'Other')),
    subject VARCHAR(255),
    tags JSONB,
    is_favorite BOOLEAN DEFAULT FALSE,
    file_path TEXT,
    file_name VARCHAR(255),
    file_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_resources_user_id ON resources(user_id);
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);
CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_updated_at ON resources(updated_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view their own resources" ON resources;
CREATE POLICY "Users can view their own resources" 
    ON resources FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own resources" ON resources;
CREATE POLICY "Users can insert their own resources" 
    ON resources FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own resources" ON resources;
CREATE POLICY "Users can update their own resources" 
    ON resources FOR UPDATE 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own resources" ON resources;
CREATE POLICY "Users can delete their own resources" 
    ON resources FOR DELETE 
    USING (auth.uid() = user_id);

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_resources_updated_at ON resources;
CREATE TRIGGER update_resources_updated_at 
    BEFORE UPDATE ON resources 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();
```

6. Click **Run** to execute the migration
7. Once complete, your Resources section will be fully functional!

### Option 2: Command Line Script
Run the dedicated migration script:
```bash
node src/lib/migrations/create-resources-table.js
```

This script will check if the table exists and provide instructions if needed.

## Verification
After running the migration:

1. **Test the Resources Section**:
   - Navigate to `/resources` in your app
   - You should no longer see the "Database setup required" error
   - You can now add notes and other resources

2. **Check Database**:
   - Go to Supabase Dashboard → Table Editor
   - You should see the `resources` table listed
   - Table structure should match the schema in `src/lib/database.types.ts`

## Migration Scripts Available
We've created several helpful scripts in `src/lib/migrations/`:

- **`create-resources-table.js`** - Specific script for the missing resources table
- **`run-all-migrations.js`** - Comprehensive check of all table migrations
- **`create_*.sql`** - Individual SQL migration files for all tables

## Security Features Included
The resources table includes:
- **Row Level Security (RLS)** - Users can only access their own resources
- **Foreign Key Constraints** - Proper referential integrity
- **Indexes** - Optimized for performance
- **Triggers** - Automatic timestamp updates

## Troubleshooting

### If you still get errors after migration:
1. Clear your browser cache
2. Check that the table appears in Supabase Table Editor
3. Verify the table has the exact structure shown above
4. Check that RLS policies are enabled

### If you need to drop and recreate the table:
```sql
DROP TABLE IF EXISTS resources CASCADE;
-- Then run the full migration SQL again
```

## Next Steps
Once the resources table is created:
1. The Resources section will work immediately
2. You can start adding study notes and resources
3. All existing gamification features will continue working
4. The application build process will complete successfully

## Support
If you encounter issues:
1. Verify your Supabase project URL and API keys are correct in `.env`
2. Check that you have database permissions in your Supabase project
3. Ensure you're running the migration in the correct Supabase project
4. Review the migration SQL for any syntax errors

---
**Status**: ✅ Analysis Complete | 📋 Migration Ready | ⚡ Quick Setup Required