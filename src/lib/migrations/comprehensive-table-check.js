const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// All tables that the application expects to exist based on database.types.ts
const allTables = [
  // Core tables
  'profiles',
  'subjects', 
  'chapters',
  'topics',
  'blocks',
  'sessions',
  'feedback',
  
  // Gamification tables
  'user_gamification',
  'user_badges',
  'points_history',
  'user_penalties',
  'achievement_progress',
  
  // Activity and analytics
  'activity_logs',
  'daily_activity_summary',
  
  // Resources and revision
  'resources',
  'revision_queue',
  'revision_topics',
  
  // Question management
  'cbse_question_sets',
  
  // Other
  'pomodoro_templates',
  'sync_queue'
];

async function checkAllTables() {
  console.log('🔍 Comprehensive Database Table Analysis');
  console.log('==========================================\n');

  const results = {
    existing: [],
    missing: [],
    errors: []
  };

  for (const tableName of allTables) {
    process.stdout.write(`Checking "${tableName}"... `);
    
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error && (error.message.includes('relation "public.' + tableName + '" does not exist') || 
                    error.message.includes('Could not find the table') || 
                    error.code === 'PGRST205')) {
        console.log('❌ MISSING');
        results.missing.push(tableName);
      } else if (error) {
        console.log('⚠️  ERROR:', error.message);
        results.errors.push({ table: tableName, error: error.message });
      } else {
        console.log('✅ EXISTS');
        results.existing.push(tableName);
      }
    } catch (err) {
      console.log('💥 CRASH:', err.message);
      results.errors.push({ table: tableName, error: err.message });
    }
  }

  console.log('\n📊 ANALYSIS RESULTS:');
  console.log('=====================');
  console.log(`✅ Existing tables: ${results.existing.length}`);
  console.log(`❌ Missing tables: ${results.missing.length}`);
  console.log(`⚠️  Errors: ${results.errors.length}`);

  if (results.missing.length > 0) {
    console.log('\n❌ MISSING TABLES (Critical):');
    console.log('============================');
    results.missing.forEach(table => {
      console.log(`   • ${table}`);
    });
    console.log('\n📋 These missing tables are causing the console errors you see.');
  }

  if (results.errors.length > 0) {
    console.log('\n⚠️  TABLES WITH ERRORS:');
    console.log('========================');
    results.errors.forEach(({ table, error }) => {
      console.log(`   • ${table}: ${error}`);
    });
  }

  // Identify critical missing tables based on console errors
  const criticalMissing = results.missing.filter(table => 
    ['blocks', 'user_gamification', 'topics', 'sessions'].includes(table)
  );

  if (criticalMissing.length > 0) {
    console.log('\n🚨 CRITICAL MISSING TABLES (Causing your console errors):');
    console.log('========================================================');
    criticalMissing.forEach(table => {
      console.log(`   • ${table} - This explains the "${table}" related console errors`);
    });
  }

  if (results.missing.length === 0 && results.errors.length === 0) {
    console.log('\n🎉 ALL TABLES EXIST! Your database is fully set up.');
  } else {
    console.log('\n💡 NEXT STEPS:');
    console.log('==============');
    console.log('1. Check docs/DATABASE_MIGRATION_SETUP.md for basic table creation');
    console.log('2. Contact your database administrator to create missing tables');
    console.log('3. Consider running a full database schema migration');
  }

  return results;
}

checkAllTables()
  .then(results => {
    const hasMissing = results.missing.length > 0;
    process.exit(hasMissing ? 1 : 0);
  })
  .catch(err => {
    console.error('💥 Analysis failed:', err);
    process.exit(1);
  });