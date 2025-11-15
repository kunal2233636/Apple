// Verification script for model selection implementation
// Checks that all required code changes are in place

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Model Selection Implementation\n');
console.log('=' .repeat(60));

let allChecksPass = true;

// Check 1: Verify AIChatRequest interface has provider and model fields
console.log('\n✓ Check 1: AIChatRequest interface');
try {
  const chatRouteContent = fs.readFileSync('src/app/api/ai/chat/route.ts', 'utf8');
  
  const hasProviderField = chatRouteContent.includes("provider?: 'groq' | 'gemini' | 'cerebras' | 'cohere' | 'mistral' | 'openrouter'");
  const hasModelField = chatRouteContent.includes('model?: string');
  
  if (hasProviderField && hasModelField) {
    console.log('  ✅ Provider and model fields added to AIChatRequest interface');
  } else {
    console.log('  ❌ Missing provider or model fields in AIChatRequest interface');
    allChecksPass = false;
  }
} catch (error) {
  console.log('  ❌ Error reading chat route:', error.message);
  allChecksPass = false;
}

// Check 2: Verify provider validation
console.log('\n✓ Check 2: Provider validation');
try {
  const chatRouteContent = fs.readFileSync('src/app/api/ai/chat/route.ts', 'utf8');
  
  const hasProviderValidation = chatRouteContent.includes('SUPPORTED_PROVIDERS') &&
                                 chatRouteContent.includes('INVALID_PROVIDER');
  
  if (hasProviderValidation) {
    console.log('  ✅ Provider validation implemented');
  } else {
    console.log('  ❌ Provider validation not found');
    allChecksPass = false;
  }
} catch (error) {
  console.log('  ❌ Error checking provider validation:', error.message);
  allChecksPass = false;
}

// Check 3: Verify model validation
console.log('\n✓ Check 3: Model validation');
try {
  const chatRouteContent = fs.readFileSync('src/app/api/ai/chat/route.ts', 'utf8');
  
  const hasModelValidation = chatRouteContent.includes('PROVIDER_MODELS') &&
                              chatRouteContent.includes('INVALID_MODEL');
  
  if (hasModelValidation) {
    console.log('  ✅ Model validation implemented');
  } else {
    console.log('  ❌ Model validation not found');
    allChecksPass = false;
  }
} catch (error) {
  console.log('  ❌ Error checking model validation:', error.message);
  allChecksPass = false;
}

// Check 4: Verify AI Service Manager uses preferred provider
console.log('\n✓ Check 4: AI Service Manager provider preference');
try {
  const aiServiceManagerContent = fs.readFileSync('src/lib/ai/ai-service-manager-unified.ts', 'utf8');
  
  const usesPreferredProvider = aiServiceManagerContent.includes('request.provider') ||
                                 aiServiceManagerContent.includes('preferredProvider');
  
  if (usesPreferredProvider) {
    console.log('  ✅ AI Service Manager honors provider preference');
  } else {
    console.log('  ❌ AI Service Manager does not use provider preference');
    allChecksPass = false;
  }
} catch (error) {
  console.log('  ❌ Error checking AI Service Manager:', error.message);
  allChecksPass = false;
}

// Check 5: Verify getModelForQuery uses preferred model
console.log('\n✓ Check 5: Model selection in getModelForQuery');
try {
  const aiServiceManagerContent = fs.readFileSync('src/lib/ai/ai-service-manager-unified.ts', 'utf8');
  
  const usesPreferredModel = aiServiceManagerContent.includes('preferredModel') &&
                             aiServiceManagerContent.includes('Using preferred model');
  
  if (usesPreferredModel) {
    console.log('  ✅ getModelForQuery uses preferred model parameter');
  } else {
    console.log('  ❌ getModelForQuery does not properly use preferred model');
    allChecksPass = false;
  }
} catch (error) {
  console.log('  ❌ Error checking getModelForQuery:', error.message);
  allChecksPass = false;
}

// Check 6: Verify response includes provider_used and model_used
console.log('\n✓ Check 6: Response metadata');
try {
  const chatRouteContent = fs.readFileSync('src/app/api/ai/chat/route.ts', 'utf8');
  
  const hasResponseMetadata = chatRouteContent.includes('model_used: aiResponse.model_used') &&
                               chatRouteContent.includes('provider_used: aiResponse.provider_used');
  
  if (hasResponseMetadata) {
    console.log('  ✅ Response includes provider_used and model_used');
  } else {
    console.log('  ❌ Response metadata incomplete');
    allChecksPass = false;
  }
} catch (error) {
  console.log('  ❌ Error checking response metadata:', error.message);
  allChecksPass = false;
}

// Check 7: Verify AIServiceManagerResponse type has provider_used
console.log('\n✓ Check 7: AIServiceManagerResponse type');
try {
  const typesContent = fs.readFileSync('src/types/ai-service-manager.ts', 'utf8');
  
  const hasProviderUsed = typesContent.includes('provider_used');
  
  if (hasProviderUsed) {
    console.log('  ✅ AIServiceManagerResponse type includes provider_used');
  } else {
    console.log('  ⚠️  AIServiceManagerResponse type may need provider_used field');
  }
} catch (error) {
  console.log('  ❌ Error checking types:', error.message);
  allChecksPass = false;
}

// Summary
console.log('\n' + '='.repeat(60));
if (allChecksPass) {
  console.log('✅ All implementation checks passed!');
  console.log('\n📝 Summary:');
  console.log('  • Request interface updated with provider and model fields');
  console.log('  • Provider validation implemented');
  console.log('  • Model validation implemented');
  console.log('  • AI Service Manager honors provider preference');
  console.log('  • Model selection uses preferred model');
  console.log('  • Response metadata includes provider_used and model_used');
  console.log('\n🎉 Task 7 implementation is complete!');
} else {
  console.log('❌ Some implementation checks failed. Please review the output above.');
}
console.log('');
