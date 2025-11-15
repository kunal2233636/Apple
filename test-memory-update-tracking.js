// Test Memory Update Tracking
// ============================
// Validates that memory update operations work correctly with proper metadata tracking

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const TEST_USER_ID = 'test-user-memory-update-123';

async function testMemoryUpdateTracking() {
  console.log('🧪 Testing Memory Update Tracking\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Store a new memory first
    console.log('\n📝 Step 1: Storing initial memory...');
    const storeResponse = await fetch(`${API_BASE_URL}/api/ai/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        message: 'What is photosynthesis?',
        response: 'Photosynthesis is the process by which plants convert light energy into chemical energy.',
        conversationId: 'test-conversation-update-123',
        memory_type: 'session',
        metadata: {
          memoryType: 'learning_interaction',
          priority: 'medium',
          topic: 'biology',
          subject: 'photosynthesis',
          tags: ['science', 'biology', 'plants']
        }
      })
    });

    const storeResult = await storeResponse.json();
    
    if (!storeResult.success) {
      console.error('❌ Failed to store initial memory:', storeResult.error);
      return false;
    }

    const memoryId = storeResult.data.memoryId;
    console.log('✅ Memory stored successfully');
    console.log(`   Memory ID: ${memoryId}`);
    console.log(`   Quality Score: ${storeResult.data.qualityScore}`);
    console.log(`   Relevance Score: ${storeResult.data.relevanceScore}`);

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 2: Update the memory
    console.log('\n📝 Step 2: Updating memory...');
    const updateResponse = await fetch(`${API_BASE_URL}/api/ai/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        memoryId: memoryId,
        message: 'What is photosynthesis and why is it important?',
        response: 'Photosynthesis is the process by which plants convert light energy into chemical energy. It is crucial for life on Earth as it produces oxygen and forms the base of the food chain.',
        metadata: {
          memoryType: 'learning_interaction',
          priority: 'high',
          topic: 'biology',
          subject: 'photosynthesis',
          tags: ['science', 'biology', 'plants', 'ecology']
        }
      })
    });

    const updateResult = await updateResponse.json();
    
    if (!updateResult.success) {
      console.error('❌ Failed to update memory:', updateResult.error);
      return false;
    }

    console.log('✅ Memory updated successfully');
    console.log(`   Memory ID: ${updateResult.data.memoryId}`);
    console.log(`   Updated At: ${updateResult.data.updatedAt}`);
    console.log(`   Message: ${updateResult.data.message}`);

    // Step 3: Retrieve the updated memory to verify metadata
    console.log('\n📝 Step 3: Retrieving updated memory to verify metadata...');
    const searchResponse = await fetch(`${API_BASE_URL}/api/ai/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        query: 'photosynthesis',
        limit: 5,
        minSimilarity: 0.1
      })
    });

    const searchResult = await searchResponse.json();
    
    if (!searchResult.memories || searchResult.memories.length === 0) {
      console.error('❌ Failed to retrieve updated memory');
      return false;
    }

    // Find our updated memory
    const updatedMemory = searchResult.memories.find(m => m.id === memoryId);
    
    if (!updatedMemory) {
      console.error('❌ Updated memory not found in search results');
      return false;
    }

    console.log('✅ Updated memory retrieved successfully');
    console.log(`   Memory ID: ${updatedMemory.id}`);
    console.log(`   Content: ${updatedMemory.content.substring(0, 100)}...`);
    console.log(`   Updated At: ${updatedMemory.updated_at}`);

    // Step 4: Verify metadata.action = 'updated'
    console.log('\n📝 Step 4: Verifying metadata tracking...');
    
    const interactionData = updatedMemory.interaction_data;
    const metadata = interactionData?.metadata;

    console.log('\n   Interaction Data:');
    console.log(`   - Content: ${interactionData?.content?.substring(0, 80)}...`);
    console.log(`   - Response: ${interactionData?.response?.substring(0, 80)}...`);
    console.log(`   - Priority: ${interactionData?.priority}`);
    console.log(`   - Topic: ${interactionData?.topic}`);
    console.log(`   - Tags: ${JSON.stringify(interactionData?.tags)}`);

    console.log('\n   Metadata:');
    console.log(`   - Action: ${metadata?.action}`);
    console.log(`   - Updated At: ${metadata?.updatedAt}`);
    console.log(`   - Previous Update: ${metadata?.previousUpdate}`);

    // Verify requirements
    const checks = {
      'metadata.action is "updated"': metadata?.action === 'updated',
      'updatedAt timestamp exists': !!metadata?.updatedAt,
      'previousUpdate timestamp exists': !!metadata?.previousUpdate,
      'updated_at field updated': updatedMemory.updated_at !== updatedMemory.created_at,
      'confirmation message returned': updateResult.data.message === 'Memory updated successfully'
    };

    console.log('\n📊 Requirement Verification:');
    let allPassed = true;
    for (const [check, passed] of Object.entries(checks)) {
      console.log(`   ${passed ? '✅' : '❌'} ${check}`);
      if (!passed) allPassed = false;
    }

    // Step 5: Test update with missing memory
    console.log('\n📝 Step 5: Testing error handling for non-existent memory...');
    const errorResponse = await fetch(`${API_BASE_URL}/api/ai/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        memoryId: 'non-existent-memory-id-12345',
        message: 'This should fail'
      })
    });

    const errorResult = await errorResponse.json();
    
    if (errorResult.success) {
      console.error('❌ Should have failed for non-existent memory');
      allPassed = false;
    } else {
      console.log('✅ Correctly returned error for non-existent memory');
      console.log(`   Error Code: ${errorResult.error.code}`);
      console.log(`   Error Message: ${errorResult.error.message}`);
    }

    // Step 6: Test update with wrong user
    console.log('\n📝 Step 6: Testing access control (wrong user)...');
    const accessResponse = await fetch(`${API_BASE_URL}/api/ai/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'different-user-id-456',
        memoryId: memoryId,
        message: 'This should fail due to access control'
      })
    });

    const accessResult = await accessResponse.json();
    
    if (accessResult.success) {
      console.error('❌ Should have failed for wrong user access');
      allPassed = false;
    } else {
      console.log('✅ Correctly denied access for wrong user');
      console.log(`   Error Code: ${accessResult.error.code}`);
      console.log(`   Error Message: ${accessResult.error.message}`);
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    if (allPassed) {
      console.log('✅ ALL TESTS PASSED - Memory update tracking is working correctly!');
      console.log('\n✨ Requirements Met:');
      console.log('   ✅ Update operation added to /api/ai/memory');
      console.log('   ✅ metadata.action set to "updated"');
      console.log('   ✅ Update timestamp stored');
      console.log('   ✅ Update confirmation message returned');
      console.log('   ✅ Access control enforced');
      console.log('   ✅ Error handling for non-existent memories');
      return true;
    } else {
      console.log('❌ SOME TESTS FAILED - Please review the issues above');
      return false;
    }

  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run the test
testMemoryUpdateTracking()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
