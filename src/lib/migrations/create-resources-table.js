const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration in .env file');
  console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createResourcesTable() {
  console.log('🚀 Creating resources table...');
  
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

  try {
    // Try to query the resources table to see if it exists
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .limit(1);

    if (error && (error.message.includes('relation "public.resources" does not exist') || 
                  error.message.includes('Could not find the table') || 
                  error.code === 'PGRST205')) {
      console.log('📋 The resources table does not exist in your Supabase database.');
      console.log('📋 Please copy the following SQL and execute it in your Supabase SQL Editor:\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(migrationSQL);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n📋 To execute this migration:');
      console.log('1. Go to your Supabase dashboard (https://supabase.com/dashboard)');
      console.log('2. Navigate to your project');
      console.log('3. Go to the SQL Editor');
      console.log('4. Create a new query');
      console.log('5. Paste the SQL above and run it');
      console.log('\n✅ Once executed, the resources section will be fully functional!');
      return false;
    } else if (error) {
      console.error('❌ Error checking resources table:', error);
      return false;
    } else {
      console.log('✅ Resources table already exists!');
      return true;
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return false;
  }
}

createResourcesTable()
  .then(success => {
    if (success) {
      console.log('\n🎉 Resources table is ready for use!');
      process.exit(0);
    } else {
      console.log('\n📋 Please execute the SQL migration in Supabase first.');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('💥 Migration check failed:', err);
    process.exit(1);
  });