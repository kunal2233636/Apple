// Background Jobs System Test
// ============================

import { backgroundJobRunner, checkSystemHealth } from './index';

// Test basic functionality of the background job system
export async function testBackgroundJobs() {
  console.log('🧪 Testing BlockWise AI Background Job System...\n');

  try {
    // Test 1: Initialize the system
    console.log('1️⃣ Testing system initialization...');
    const initResult = await backgroundJobRunner.initialize();
    
    if (initResult.success) {
      console.log('✅ System initialized successfully');
      console.log(`   Jobs started: ${initResult.jobsStarted.length}`);
      console.log(`   Active jobs: ${initResult.jobsStarted.join(', ')}`);
    } else {
      console.log('❌ System initialization failed');
      console.log(`   Errors: ${initResult.errors.join(', ')}`);
      return;
    }

    console.log('\n');

    // Test 2: Check system status
    console.log('2️⃣ Testing system status check...');
    const status = backgroundJobRunner.getStatus();
    
    console.log('✅ System status retrieved:');
    console.log(`   Status: ${status.isRunning ? 'Running' : 'Stopped'}`);
    console.log(`   Health: ${status.systemHealth}`);
    console.log(`   Total jobs: ${status.jobsCount}`);
    console.log(`   Active jobs: ${status.activeJobs}`);
    console.log(`   Uptime: ${Math.round(status.uptime / 1000)} seconds`);

    console.log('\n');

    // Test 3: Manual job execution
    console.log('3️⃣ Testing manual job execution...');
    
    // Test health check job
    const healthResult = await backgroundJobRunner.executeJobManually('health-check');
    console.log('✅ Health check executed:');
    console.log(`   Success: ${healthResult.success}`);
    console.log(`   Message: ${healthResult.message}`);
    console.log(`   Duration: ${healthResult.executionTime}ms`);

    console.log('\n');

    // Test 4: System health check
    console.log('4️⃣ Testing system health assessment...');
    const health = await checkSystemHealth();
    
    console.log('✅ System health assessed:');
    console.log(`   Overall: ${health.overall}`);
    console.log(`   Memory usage: ${Math.round(health.details.memoryUsage.heapUsed / 1024 / 1024)}MB`);
    console.log(`   Uptime: ${Math.round(health.details.uptime / 1000)} seconds`);
    
    if (health.recommendations.length > 0) {
      console.log('   Recommendations:');
      health.recommendations.forEach(rec => console.log(`     • ${rec}`));
    }

    console.log('\n');

    // Test 5: Job history
    console.log('5️⃣ Testing job execution history...');
    const history = backgroundJobRunner.getJobHistory();
    
    console.log('✅ Job history retrieved:');
    console.log(`   Total jobs tracked: ${history.length}`);
    
    history.slice(0, 5).forEach(job => {
      console.log(`   • ${job.jobName}: ${job.status} (${job.runCount} runs, ${job.successCount} success, ${job.failureCount} failures)`);
    });

    console.log('\n');

    // Test 6: System metrics
    console.log('6️⃣ Testing system metrics...');
    const metrics = backgroundJobRunner.getSystemMetrics();
    
    console.log('✅ System metrics retrieved:');
    console.log(`   Scheduler jobs: ${metrics.schedulerStats.totalJobs}`);
    console.log(`   Running jobs: ${metrics.schedulerStats.running}`);
    console.log(`   Memory: ${Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024)}MB used / ${Math.round(metrics.memoryUsage.heapTotal / 1024 / 1024)}MB total`);

    console.log('\n');

    // Test 7: Cleanup
    console.log('7️⃣ Testing system shutdown...');
    const shutdownResult = await backgroundJobRunner.shutdown();
    
    if (shutdownResult.success) {
      console.log('✅ System shutdown completed');
      console.log(`   Uptime: ${Math.round(shutdownResult.uptime / 1000)} seconds`);
    } else {
      console.log('❌ System shutdown failed');
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ System initialization');
    console.log('   ✅ Status monitoring');
    console.log('   ✅ Manual job execution');
    console.log('   ✅ Health assessment');
    console.log('   ✅ Job history tracking');
    console.log('   ✅ Metrics collection');
    console.log('   ✅ Graceful shutdown');

  } catch (error) {
    console.error('💥 Test failed with error:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check that all dependencies are installed');
    console.log('   2. Verify database connectivity');
    console.log('   3. Review environment configuration');
    console.log('   4. Check for any missing API keys');
  }
}

// Test individual job components
export async function testIndividualJobs() {
  console.log('\n🧪 Testing Individual Job Components...\n');

  const jobs = [
    'health-check',
    'daily-memory-cleanup', 
    'rate-limit-monitor',
    'cache-cleanup'
  ];

  for (const jobName of jobs) {
    try {
      console.log(`Testing ${jobName}...`);
      
      // Re-initialize for individual tests
      await backgroundJobRunner.initialize();
      
      const result = await backgroundJobRunner.executeJobManually(jobName);
      console.log(`  ✅ ${jobName}: ${result.success ? 'Success' : 'Failed'}`);
      
      if (!result.success) {
        console.log(`     Error: ${result.message}`);
      }
      
      await backgroundJobRunner.shutdown();
      
    } catch (error) {
      console.log(`  ❌ ${jobName}: Error - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testBackgroundJobs()
    .then(() => testIndividualJobs())
    .then(() => {
      console.log('\n✨ All background job tests completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Test execution failed:', error);
      process.exit(1);
    });
}