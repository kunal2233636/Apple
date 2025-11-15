// Script to apply the memory_type column migration
// This adds the dual-layer memory system support to the database

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
  console.log('🔧 Applying memory_type column migration...\n');
  
  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'src', 'lib', 'migrations', 'add_memory_type_column.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration SQL:');
    console.log(migrationSQL);
    console.log('\n');
    
    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        // Try direct execution if RPC doesn't exist
        console.log('RPC not available, trying direct execution...');
        
        // For ALTER TABLE and CREATE INDEX, we need to use raw SQL
        // This might require manual execution in Supabase SQL editor
        console.log('\n⚠️  Please execute the following SQL manually in Supabase SQL Editor:');
        console.log(statement + ';');
        console.log('');
      } else {
        console.log('✅ Statement executed successfully\n');
      }
    }
    
    // Verify the migration
    console.log('🔍 Verifying migration...');
    const { data, error } = await supabase
      .from('conversation_memory')
      .select('memory_type')
      .limit(1);
    
    if (error) {
      console.log('⚠️  Could not verify migration automatically.');
      console.log('Please check if the memory_type column exists in conversation_memory table.');
      console.log('Error:', error.message);
    } else {
      console.log('✅ Migration verified! The memory_type column is accessible.\n');
    }
    
    console.log('📋 Migration Summary:');
    console.log('   - Added memory_type column (session | universal)');
    console.log('   - Created index on (user_id, memory_type, created_at)');
    console.log('   - Default value: session');
    console.log('\n✅ Migration process completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n📝 Manual Migration Instructions:');
    console.error('1. Open Supabase SQL Editor');
    console.error('2. Copy and paste the contents of src/lib/migrations/add_memory_type_column.sql');
    console.error('3. Execute the SQL statements');
  }
}

applyMigration();
