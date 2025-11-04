const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugSpecificTables() {
  console.log('🔍 DEBUGGING SPECIFIC ERROR-PRONE TABLES');
  console.log('========================================\n');

  // Focus on tables causing console errors
  const criticalTables = ['blocks', 'user_gamification', 'resources'];

  for (const tableName of criticalTables) {
    console.log(`\n🔍 Testing "${tableName}" table:`);
    console.log('--------------------------------');
    
    try {
      // Test 1: Basic query without authentication
      console.log('Test 1: Anonymous query...');
      const { data: anonData, error: anonError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (anonError) {
        console.log(`   ❌ Anonymous query failed: ${anonError.message}`);
        if (anonError.code === 'PGRST116') {
          console.log('   📋 This is expected - RLS is enabled and requires authentication');
        }
      } else {
        console.log('   ✅ Anonymous query succeeded (unexpected)');
      }

      // Test 2: Try with auth (if available)
      console.log('Test 2: Authenticated query (if user is logged in)...');
      const { data: authData, error: authError } = await supabase.auth.getUser();
      
      if (authData?.user) {
        console.log(`   👤 User is authenticated: ${authData.user.email}`);
        
        const { data: userData, error: userError } = await supabase
          .from(tableName)
          .select('*')
          .eq('user_id', authData.user.id)
          .limit(1);

        if (userError) {
          console.log(`   ❌ Authenticated query failed: ${userError.message}`);
          console.log(`   🔍 Error code: ${userError.code}`);
        } else {
          console.log(`   ✅ Authenticated query succeeded`);
          console.log(`   📊 Returned ${userData?.length || 0} records`);
        }
      } else {
        console.log('   👤 No authenticated user - testing without user context');
        
        const { data: noUserData, error: noUserError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (noUserError) {
          console.log(`   ❌ Query without user failed: ${noUserError.message}`);
        } else {
          console.log(`   ✅ Query without user succeeded - returning ${noUserData?.length || 0} records`);
        }
      }

    } catch (err) {
      console.log(`   💥 Unexpected error: ${err.message}`);
    }
  }

  console.log('\n🎯 ANALYSIS COMPLETE');
  console.log('===================');
  console.log('If you see errors above, the issue is likely:');
  console.log('1. RLS (Row Level Security) policies blocking access');
  console.log('2. User not authenticated when making queries');
  console.log('3. Database permissions or role issues');
  console.log('\n💡 RECOMMENDED SOLUTIONS:');
  console.log('1. Ensure users are properly authenticated');
  console.log('2. Check RLS policies in Supabase Dashboard');
  console.log('3. Verify database connection and permissions');
}

debugSpecificTables()
  .then(() => {
    console.log('\n🔍 Debug complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('💥 Debug failed:', err);
    process.exit(1);
  });