// Direct migration application using Supabase client
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
  console.log('🔧 Applying memory_type column migration directly...\n');
  
  try {
    // First, check if column already exists
    console.log('1. Checking if memory_type column exists...');
    const { data: checkData, error: checkError } = await supabase
      .from('conversation_memory')
      .select('memory_type')
      .limit(1);
    
    if (!checkError) {
      console.log('✅ Column already exists! Migration not needed.\n');
      return;
    }
    
    console.log('Column does not exist. Proceeding with migration...\n');
    
    // Execute the ALTER TABLE statement
    console.log('2. Adding memory_type column...');
    const alterTableSQL = `
      ALTER TABLE conversation_memory 
      ADD COLUMN memory_type TEXT DEFAULT 'session'
      CHECK (memory_type IN ('session', 'universal'));
    `;
    
    // We need to use raw SQL execution
    // Since Supabase doesn't allow direct SQL execution from client,
    // we'll need to do this through the Supabase dashboard
    
    console.log('\n⚠️  MANUAL MIGRATION REQUIRED');
    console.log('=' .repeat(70));
    console.log('\nPlease execute the following SQL in Supabase SQL Editor:');
    console.log('(Dashboard → SQL Editor → New Query)\n');
    console.log('-'.repeat(70));
    console.log(`
-- Add memory_type column
ALTER TABLE conversation_memory 
ADD COLUMN IF NOT EXISTS memory_type TEXT DEFAULT 'session'
CHECK (memory_type IN ('session', 'universal'));

-- Create index
CREATE INDEX IF NOT EXISTS idx_conversation_memory_type_user_created 
ON conversation_memory(user_id, memory_type, created_at DESC);

-- Add comment
COMMENT ON COLUMN conversation_memory.memory_type IS 
'Memory type: session (conversation-specific) or universal (cross-session semantic memory)';
    `);
    console.log('-'.repeat(70));
    console.log('\nAfter executing the SQL, press Enter to verify...');
    
    // Wait for user input
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
    
    // Verify
    console.log('\n3. Verifying migration...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('conversation_memory')
      .select('memory_type')
      .limit(1);
    
    if (verifyError) {
      console.log('❌ Verification failed:', verifyError.message);
      console.log('\nPlease ensure the SQL was executed successfully in Supabase.');
    } else {
      console.log('✅ Migration verified successfully!\n');
      console.log('The memory_type column is now available.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

applyMigration();
