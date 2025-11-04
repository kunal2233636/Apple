const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration in .env file');
  console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigrations() {
  console.log('Starting database migrations...');

  const migrations = [
    {
      name: 'profiles',
      sql: `
        -- Create profiles table
        CREATE TABLE IF NOT EXISTS profiles (
          id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          full_name VARCHAR(255),
          avatar_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

        -- Enable Row Level Security
        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

        -- Create policies for authenticated users
        DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
        CREATE POLICY "Users can view their own profile" ON profiles
          FOR SELECT USING (auth.uid() = id);

        DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
        CREATE POLICY "Users can update their own profile" ON profiles
          FOR UPDATE USING (auth.uid() = id);

        DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
        CREATE POLICY "Users can insert their own profile" ON profiles
          FOR INSERT WITH CHECK (auth.uid() = id);

        -- Function to handle new user signup
        CREATE OR REPLACE FUNCTION handle_new_user()
        RETURNS TRIGGER AS $$
        BEGIN
          INSERT INTO public.profiles (id, email, full_name, avatar_url)
          VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
            NEW.raw_user_meta_data->>'avatar_url'
          );
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;

        -- Trigger to automatically create profile for new users
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE FUNCTION handle_new_user();
      `
    },
    {
      name: 'resources',
      sql: `
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
      `
    },
    {
      name: 'revision_queue',
      sql: `
        -- Create revision_queue table
        CREATE TABLE IF NOT EXISTS revision_queue (
          id SERIAL PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
          difficulty VARCHAR(10) CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
          added_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          -- Ensure unique constraint per user-topic combination
          UNIQUE(user_id, topic_id)
        );

        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_revision_queue_user_id ON revision_queue(user_id);
        CREATE INDEX IF NOT EXISTS idx_revision_queue_topic_id ON revision_queue(topic_id);
        CREATE INDEX IF NOT EXISTS idx_revision_queue_added_date ON revision_queue(added_date);

        -- Enable Row Level Security
        ALTER TABLE revision_queue ENABLE ROW LEVEL SECURITY;

        -- Create policies for authenticated users
        DROP POLICY IF EXISTS "Users can view their own revision queue" ON revision_queue;
        CREATE POLICY "Users can view their own revision queue" ON revision_queue
          FOR SELECT USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can insert their own revision queue items" ON revision_queue;
        CREATE POLICY "Users can insert their own revision queue items" ON revision_queue
          FOR INSERT WITH CHECK (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can update their own revision queue items" ON revision_queue;
        CREATE POLICY "Users can update their own revision queue items" ON revision_queue
          FOR UPDATE USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can delete their own revision queue items" ON revision_queue;
        CREATE POLICY "Users can delete their own revision queue items" ON revision_queue
          FOR DELETE USING (auth.uid() = user_id);
      `
    },
    {
      name: 'user_penalties',
      sql: `
        -- Create user_penalties table
        CREATE TABLE IF NOT EXISTS user_penalties (
          id SERIAL PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          penalty_type VARCHAR(50) NOT NULL,
          points_deducted INTEGER NOT NULL DEFAULT 0,
          reason TEXT NOT NULL,
          details JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_user_penalties_user_id ON user_penalties(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_penalties_created_at ON user_penalties(created_at);

        -- Enable Row Level Security
        ALTER TABLE user_penalties ENABLE ROW LEVEL SECURITY;

        -- Create policies for authenticated users
        DROP POLICY IF EXISTS "Users can view their own penalties" ON user_penalties;
        CREATE POLICY "Users can view their own penalties" ON user_penalties
          FOR SELECT USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "System can insert penalties" ON user_penalties;
        CREATE POLICY "System can insert penalties" ON user_penalties
          FOR INSERT WITH CHECK (true);

        DROP POLICY IF EXISTS "Users can update their own penalties" ON user_penalties;
        CREATE POLICY "Users can update their own penalties" ON user_penalties
          FOR UPDATE USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can delete their own penalties" ON user_penalties;
        CREATE POLICY "Users can delete their own penalties" ON user_penalties
          FOR DELETE USING (auth.uid() = user_id);
      `
    }
  ];

  const results = {
    success: [],
    failed: [],
    skipped: []
  };

  for (const migration of migrations) {
    console.log(`Processing migration: ${migration.name}`);
    
    try {
      // Try to query the table to see if it exists
      const { data, error } = await supabase
        .from(migration.name === 'user_penalties' ? 'user_penalties' : migration.name)
        .select('*')
        .limit(1);

      if (error && (error.message.includes('relation "public.' + migration.name + '" does not exist') ||
                    error.message.includes('Could not find the table') ||
                    error.code === 'PGRST205')) {
        // Table doesn't exist, need to create it
        console.log(`  Table "${migration.name}" doesn't exist, creating...`);
        console.log(`  Migration SQL for ${migration.name}:`);
        console.log(migration.sql);
        results.failed.push(migration.name);
        console.log(`  Manual execution required for ${migration.name}`);
      } else if (error) {
        console.error(`  Error checking ${migration.name}:`, error);
        results.failed.push(migration.name);
      } else {
        console.log(`  Table "${migration.name}" already exists`);
        results.success.push(migration.name);
      }
    } catch (err) {
      console.error(`  Unexpected error with ${migration.name}:`, err);
      results.failed.push(migration.name);
    }
    
    console.log(''); // Empty line for readability
  }

  console.log('Migration Summary:');
  console.log(`Already exists: ${results.success.length} tables`);
  console.log(`Need to be created: ${results.failed.length} tables`);
  
  if (results.failed.length > 0) {
    console.log('\nManual migration required for:');
    results.failed.forEach(table => {
      console.log(`   • ${table}`);
    });
    console.log('\nTo execute these migrations:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste each SQL from the migration files:');
    results.failed.forEach(table => {
      console.log(`   - src/lib/migrations/create_${table}_table.sql`);
    });
  }

  return results;
}

// Run migrations
runMigrations()
  .then(results => {
    if (results.failed.length === 0) {
      console.log('\nAll migrations completed successfully!');
      process.exit(0);
    } else {
      console.log('\nSome migrations need manual execution');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Migration process failed:', err);
    process.exit(1);
  });