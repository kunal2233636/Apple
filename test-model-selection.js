// Test script for model selection feature in /api/ai/chat
// Tests provider and model validation and selection

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testModelSelection() {
  console.log('🧪 Testing Model Selection Feature\n');
  console.log('=' .repeat(60));

  const testUserId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID

  // Test 1: Default behavior (no provider/model specified)
  console.log('\n📋 Test 1: Default behavior (no provider/model)');
  try {
    const response = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        message: 'Hello, test message',
        chatType: 'general'
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Default request successful');
      console.log(`   Provider used: ${data.data.aiResponse.provider_used}`);
      console.log(`   Model used: ${data.data.aiResponse.model_used}`);
    } else {
      console.log('❌ Default request failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Test 1 error:', error.message);
  }

  // Test 2: Valid provider specified
  console.log('\n📋 Test 2: Valid provider (groq)');
  try {
    const response = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        message: 'Test with specific provider',
        chatType: 'general',
        provider: 'groq'
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Provider selection successful');
      console.log(`   Provider used: ${data.data.aiResponse.provider_used}`);
      console.log(`   Model used: ${data.data.aiResponse.model_used}`);
    } else {
      console.log('❌ Provider selection failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Test 2 error:', error.message);
  }

  // Test 3: Valid provider and model specified
  console.log('\n📋 Test 3: Valid provider (groq) and model (llama-3.1-8b-instant)');
  try {
    const response = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        message: 'Test with specific provider and model',
        chatType: 'general',
        provider: 'groq',
        model: 'llama-3.1-8b-instant'
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Model selection successful');
      console.log(`   Provider used: ${data.data.aiResponse.provider_used}`);
      console.log(`   Model used: ${data.data.aiResponse.model_used}`);
      
      if (data.data.aiResponse.model_used === 'llama-3.1-8b-instant') {
        console.log('✅ Correct model was used!');
      } else {
        console.log('⚠️  Different model was used than requested');
      }
    } else {
      console.log('❌ Model selection failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Test 3 error:', error.message);
  }

  // Test 4: Invalid provider
  console.log('\n📋 Test 4: Invalid provider (should fail validation)');
  try {
    const response = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        message: 'Test with invalid provider',
        chatType: 'general',
        provider: 'invalid-provider'
      })
    });

    const data = await response.json();
    
    if (!data.success && data.error.code === 'INVALID_PROVIDER') {
      console.log('✅ Invalid provider correctly rejected');
      console.log(`   Error message: ${data.error.message}`);
      console.log(`   Available providers: ${data.metadata.availableProviders.join(', ')}`);
    } else {
      console.log('❌ Invalid provider was not rejected properly');
    }
  } catch (error) {
    console.log('❌ Test 4 error:', error.message);
  }

  // Test 5: Invalid model for provider
  console.log('\n📋 Test 5: Invalid model for provider (should fail validation)');
  try {
    const response = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        message: 'Test with invalid model',
        chatType: 'general',
        provider: 'groq',
        model: 'invalid-model-name'
      })
    });

    const data = await response.json();
    
    if (!data.success && data.error.code === 'INVALID_MODEL') {
      console.log('✅ Invalid model correctly rejected');
      console.log(`   Error message: ${data.error.message}`);
      console.log(`   Available models: ${data.metadata.availableModels.join(', ')}`);
    } else {
      console.log('❌ Invalid model was not rejected properly');
    }
  } catch (error) {
    console.log('❌ Test 5 error:', error.message);
  }

  // Test 6: Different provider with valid model
  console.log('\n📋 Test 6: Gemini provider with gemini-2.0-flash-lite model');
  try {
    const response = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        message: 'Test with Gemini provider',
        chatType: 'general',
        provider: 'gemini',
        model: 'gemini-2.0-flash-lite'
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Gemini provider selection successful');
      console.log(`   Provider used: ${data.data.aiResponse.provider_used}`);
      console.log(`   Model used: ${data.data.aiResponse.model_used}`);
    } else {
      console.log('❌ Gemini provider selection failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Test 6 error:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 Model Selection Tests Complete!\n');
}

// Run tests
testModelSelection().catch(console.error);
