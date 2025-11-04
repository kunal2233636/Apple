import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Check if resources table exists
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .limit(1);

    if (error && error.message.includes('relation "public.resources" does not exist')) {
      // Table doesn't exist, return migration SQL
      const migrationSQL = `
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
      `;

      return NextResponse.json({
        success: false,
        message: 'Resources table does not exist',
        migrationRequired: true,
        migrationSQL: migrationSQL
      });
    }

    if (error) {
      console.error('Error checking resources table:', error);
      return NextResponse.json({
        success: false,
        message: 'Error checking resources table',
        error: error.message
      }, { status: 500 });
    }

    // Table exists and query worked
    return NextResponse.json({
      success: true,
      message: 'Resources table exists and is accessible',
      migrationRequired: false
    });

  } catch (err: any) {
    console.error('Migration check error:', err);
    return NextResponse.json({
      success: false,
      message: 'Unexpected error during migration check',
      error: err.message
    }, { status: 500 });
  }
}