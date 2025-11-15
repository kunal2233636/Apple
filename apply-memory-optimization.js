// Apply Memory Query Optimization Migration
// ==========================================

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🚀 Starting memory query optimization migration...\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'src', 'lib', 'migrations', 'optimize_memory_queries.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded successfully');
    console.log('📊 Applying indexes and optimizations...\n');

    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Skip comments
      if (statement.trim().startsWith('--')) {
        continue;
      }

      try {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: statement
        });

        if (error) {
          // Check if error is because index already exists
          if (error.message.includes('already exists')) {
            console.log(`  ⏭️  Skipped (already exists)`);
            skipCount++;
          } else {
            console.error(`  ❌ Error: ${error.message}`);
            errorCount++;
          }
        } else {
          console.log(`  ✅ Success`);
          successCount++;
        }
      } catch (err) {
        console.error(`  ❌ Error: ${err.message}`);
        errorCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⏭️  Skipped: ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    if (errorCount === 0) {
      console.log('\n✨ Memory query optimization completed successfully!');
      
      // Test the optimization by running ANALYZE
      console.log('\n🔍 Running ANALYZE to update query planner statistics...');
      const { error: analyzeError } = await supabase.rpc('exec_sql', {
        sql_query: 'ANALYZE conversation_memory;'
      });

      if (!analyzeError) {
        console.log('✅ Statistics updated successfully');
      }

      // Get memory statistics for verification
      console.log('\n📈 Verifying indexes...');
      const { data: indexes, error: indexError } = await supabase.rpc('exec_sql', {
        sql_query: `
          SELECT indexname, indexdef 
          FROM pg_indexes 
          WHERE tablename = 'conversation_memory' 
          AND indexname LIKE 'idx_conversation_memory_%'
          ORDER BY indexname;
        `
      });

      if (!indexError && indexes) {
        console.log(`✅ Found ${indexes.length} memory-related indexes`);
      }

    } else {
      console.log('\n⚠️  Migration completed with some errors. Please review the output above.');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the migration
applyMigration()
  .then(() => {
    console.log('\n✅ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });
