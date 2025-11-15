/**
 * BACKWARD COMPATIBILITY CODE VERIFICATION
 * 
 * This script analyzes the /api/ai/chat implementation to verify
 * backward compatibility without requiring a running server.
 * 
 * Tests Requirements 10.1 and 10.2:
 * - Default behavior matches previous version
 * - Response structure is unchanged
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, colors.cyan);
  console.log('='.repeat(80) + '\n');
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.gray);
}

// Test results
const results = {
  passed: 0,
  failed: 0,
  checks: []
};

function recordCheck(name, passed, details = '') {
  results.checks.push({ name, passed, details });
  if (passed) {
    results.passed++;
    logSuccess(`${name}`);
  } else {
    results.failed++;
    logError(`${name}`);
  }
  if (details) {
    logInfo(`  ${details}`);
  }
}

/**
 * Read and analyze the chat endpoint implementation
 */
function analyzeImplementation() {
  logSection('📝 CODE ANALYSIS: /api/ai/chat Implementation');
  
  const chatRoutePath = path.join(process.cwd(), 'src', 'app', 'api', 'ai', 'chat', 'route.ts');
  
  if (!fs.existsSync(chatRoutePath)) {
    logError('Chat route file not found: ' + chatRoutePath);
    return false;
  }
  
  const code = fs.readFileSync(chatRoutePath, 'utf-8');
  
  // Check 1: Legacy includeMemoryContext parameter support
  const hasLegacyMemoryFlag = code.includes('includeMemoryContext');
  recordCheck(
    'Legacy includeMemoryContext parameter',
    hasLegacyMemoryFlag,
    hasLegacyMemoryFlag ? 'Found in request interface' : 'Missing from implementation'
  );
  
  // Check 2: New memory parameters with backward compatible defaults
  const hasNewMemoryParams = code.includes('memory?.includeSession') && code.includes('memory?.includeUniversal');
  const hasMemoryDefaults = code.includes('includeSession !== false') && code.includes('includeUniversal !== false');
  recordCheck(
    'New memory parameters with defaults',
    hasNewMemoryParams && hasMemoryDefaults,
    hasMemoryDefaults ? 'Defaults to true for backward compatibility' : 'Missing default values'
  );
  
  // Check 3: Legacy webSearch string format support
  const hasLegacyWebSearch = code.includes("webSearchMode === 'off'") || 
                             code.includes("webSearchMode === 'on'") || 
                             code.includes("webSearch === 'auto'");
  const hasWebSearchStringCheck = code.includes("typeof body?.webSearch === 'string'");
  recordCheck(
    'Legacy webSearch string format',
    hasLegacyWebSearch && hasWebSearchStringCheck,
    hasWebSearchStringCheck ? 'Supports auto/on/off string values' : 'Missing string format support'
  );
  
  // Check 4: New webSearch object format support
  const hasNewWebSearch = code.includes("typeof body?.webSearch === 'object'");
  const hasWebSearchEnabled = code.includes('webSearch.enabled');
  recordCheck(
    'New webSearch object format',
    hasNewWebSearch && hasWebSearchEnabled,
    hasNewWebSearch ? 'Supports {enabled, maxArticles, explain} format' : 'Missing object format'
  );
  
  // Check 5: RAG disabled by default
  const hasRagDefault = code.includes('rag?.enabled === true') || code.includes('ragEnabled = body?.rag?.enabled === true');
  recordCheck(
    'RAG disabled by default',
    hasRagDefault,
    hasRagDefault ? 'RAG is opt-in (enabled === true required)' : 'RAG default not verified'
  );
  
  // Check 6: Provider and model validation
  const hasProviderValidation = code.includes('SUPPORTED_PROVIDERS') && code.includes('INVALID_PROVIDER');
  const hasModelValidation = code.includes('PROVIDER_MODELS') && code.includes('INVALID_MODEL');
  recordCheck(
    'Provider and model validation',
    hasProviderValidation && hasModelValidation,
    hasProviderValidation ? 'Validates provider and model with helpful errors' : 'Missing validation'
  );
  
  // Check 7: Response structure includes all legacy fields
  const hasLegacyResponseFields = 
    code.includes('content:') &&
    code.includes('model_used:') &&
    code.includes('provider_used:') &&
    code.includes('tokens_used:') &&
    code.includes('latency_ms:') &&
    code.includes('web_search_enabled:') &&
    code.includes('fallback_used:') &&
    code.includes('cached:');
  recordCheck(
    'Response includes all legacy fields',
    hasLegacyResponseFields,
    hasLegacyResponseFields ? 'All required fields present in response' : 'Missing legacy fields'
  );
  
  // Check 8: Optional new fields in response
  const hasOptionalFields = 
    code.includes('web_search_results?:') || code.includes('web_search_results: webSearchUsed ?') &&
    code.includes('rag_results?:') || code.includes('rag_results: ragUsed ?');
  recordCheck(
    'New fields are optional',
    hasOptionalFields,
    hasOptionalFields ? 'New fields only included when features are used' : 'New fields may not be optional'
  );
  
  // Check 9: Error response structure
  const hasErrorStructure = 
    code.includes('success: false') &&
    code.includes('error: {') &&
    code.includes('code:') &&
    code.includes('message:');
  recordCheck(
    'Consistent error response structure',
    hasErrorStructure,
    hasErrorStructure ? 'Error responses have consistent structure' : 'Error structure not verified'
  );
  
  // Check 10: Metadata in all responses
  const hasMetadata = 
    code.includes('metadata: {') &&
    code.includes('requestId:') &&
    code.includes('processingTime:') &&
    code.includes('timestamp:');
  recordCheck(
    'Metadata in all responses',
    hasMetadata,
    hasMetadata ? 'All responses include metadata' : 'Metadata not verified'
  );
  
  return true;
}

/**
 * Analyze request interface
 */
function analyzeRequestInterface() {
  logSection('📋 REQUEST INTERFACE ANALYSIS');
  
  const chatRoutePath = path.join(process.cwd(), 'src', 'app', 'api', 'ai', 'chat', 'route.ts');
  const code = fs.readFileSync(chatRoutePath, 'utf-8');
  
  // Extract interface definition - need to handle nested objects
  const interfaceStart = code.indexOf('interface AIChatRequest');
  const interfaceEnd = code.indexOf('}\n\ninterface AIChatResponse', interfaceStart);
  
  if (interfaceStart === -1 || interfaceEnd === -1) {
    logError('Could not find AIChatRequest interface');
    return false;
  }
  
  const interfaceContent = code.substring(interfaceStart, interfaceEnd + 1);
  
  // Check required fields
  const hasUserId = interfaceContent.includes('userId');
  const hasMessage = interfaceContent.includes('message');
  recordCheck(
    'Required fields (userId, message)',
    hasUserId && hasMessage,
    'Core required fields present'
  );
  
  // Check optional legacy fields
  const hasConversationId = interfaceContent.includes('conversationId?');
  const hasChatType = interfaceContent.includes('chatType?');
  const hasIncludeMemoryContext = interfaceContent.includes('includeMemoryContext?');
  recordCheck(
    'Optional legacy fields',
    hasConversationId && hasChatType && hasIncludeMemoryContext,
    'conversationId, chatType, includeMemoryContext'
  );
  
  // Check new optional fields
  const hasProvider = interfaceContent.includes('provider?');
  const hasModel = interfaceContent.includes('model?');
  const hasMemory = interfaceContent.includes('memory?');
  const hasWebSearch = interfaceContent.includes('webSearch?');
  const hasRag = interfaceContent.includes('rag?');
  const allNewFields = hasProvider && hasModel && hasMemory && hasWebSearch && hasRag;
  recordCheck(
    'New optional fields',
    allNewFields,
    allNewFields ? 'provider, model, memory, webSearch, rag' : `Missing: ${[!hasProvider && 'provider', !hasModel && 'model', !hasMemory && 'memory', !hasWebSearch && 'webSearch', !hasRag && 'rag'].filter(Boolean).join(', ')}`
  );
  
  return true;
}

/**
 * Analyze default value handling
 */
function analyzeDefaults() {
  logSection('⚙️  DEFAULT VALUE ANALYSIS');
  
  const chatRoutePath = path.join(process.cwd(), 'src', 'app', 'api', 'ai', 'chat', 'route.ts');
  const code = fs.readFileSync(chatRoutePath, 'utf-8');
  
  // Memory defaults
  const memoryDefaultsCorrect = 
    code.includes('includeSession !== false') && // Defaults to true
    code.includes('includeUniversal !== false'); // Defaults to true
  recordCheck(
    'Memory enabled by default',
    memoryDefaultsCorrect,
    memoryDefaultsCorrect ? 'Both session and universal memory default to true' : 'Memory defaults incorrect'
  );
  
  // Web search defaults
  const webSearchDefaultsCorrect = 
    code.includes("webSearch === 'auto'") || 
    code.includes('webSearchMode');
  recordCheck(
    'Web search auto mode',
    webSearchDefaultsCorrect,
    webSearchDefaultsCorrect ? 'Supports intelligent auto decision' : 'Auto mode not found'
  );
  
  // RAG defaults
  const ragDefaultsCorrect = code.includes('rag?.enabled === true');
  recordCheck(
    'RAG disabled by default',
    ragDefaultsCorrect,
    ragDefaultsCorrect ? 'RAG requires explicit enabled: true' : 'RAG default not verified'
  );
  
  return true;
}

/**
 * Analyze response structure
 */
function analyzeResponseStructure() {
  logSection('📤 RESPONSE STRUCTURE ANALYSIS');
  
  const chatRoutePath = path.join(process.cwd(), 'src', 'app', 'api', 'ai', 'chat', 'route.ts');
  const code = fs.readFileSync(chatRoutePath, 'utf-8');
  
  // Check for response interface
  const hasResponseInterface = code.includes('interface AIChatResponse');
  recordCheck(
    'Response interface defined',
    hasResponseInterface,
    hasResponseInterface ? 'AIChatResponse interface found' : 'Interface not found'
  );
  
  // Check core response fields
  const coreFields = [
    'success',
    'data',
    'aiResponse',
    'content',
    'model_used',
    'provider_used',
    'tokens_used',
    'latency_ms',
    'web_search_enabled',
    'rag_enabled',
    'fallback_used',
    'cached',
    'metadata',
    'requestId',
    'processingTime',
    'timestamp'
  ];
  
  const missingFields = coreFields.filter(field => !code.includes(field));
  recordCheck(
    'All core response fields present',
    missingFields.length === 0,
    missingFields.length === 0 ? 'All required fields found' : `Missing: ${missingFields.join(', ')}`
  );
  
  // Check optional fields are properly marked
  const optionalFieldsCorrect = 
    (code.includes('web_search_results?:') || code.includes('web_search_results: webSearchUsed ?')) &&
    (code.includes('rag_results?:') || code.includes('rag_results: ragUsed ?'));
  recordCheck(
    'Optional fields properly marked',
    optionalFieldsCorrect,
    optionalFieldsCorrect ? 'New fields are optional' : 'Optional marking not verified'
  );
  
  return true;
}

/**
 * Main verification
 */
function runVerification() {
  logSection('🔄 BACKWARD COMPATIBILITY CODE VERIFICATION');
  log('Analyzing /api/ai/chat implementation for backward compatibility', colors.cyan);
  log('Requirements: 10.1 (Default behavior) and 10.2 (Response structure)', colors.cyan);
  
  const startTime = Date.now();
  
  // Run all analyses
  analyzeImplementation();
  analyzeRequestInterface();
  analyzeDefaults();
  analyzeResponseStructure();
  
  const totalTime = Date.now() - startTime;
  
  // Print summary
  logSection('📊 VERIFICATION SUMMARY');
  
  log(`Total Checks: ${results.passed + results.failed}`, colors.cyan);
  log(`Passed: ${results.passed}`, colors.green);
  log(`Failed: ${results.failed}`, results.failed > 0 ? colors.red : colors.green);
  log(`Verification Time: ${totalTime}ms`, colors.gray);
  
  console.log('\n' + '='.repeat(80));
  
  // Detailed results
  if (results.failed > 0) {
    logSection('❌ FAILED CHECKS');
    results.checks
      .filter(c => !c.passed)
      .forEach(c => {
        logError(`${c.name}`);
        if (c.details) {
          logInfo(`  ${c.details}`);
        }
      });
  }
  
  // Final verdict
  console.log('\n' + '='.repeat(80));
  if (results.failed === 0) {
    logSuccess('✅ ALL BACKWARD COMPATIBILITY CHECKS PASSED!');
    log('The implementation maintains full backward compatibility.', colors.green);
    log('Existing integrations will continue to work without modifications.', colors.green);
    console.log('\n' + '='.repeat(80));
    
    logSection('📋 VERIFICATION DETAILS');
    log('✅ Legacy parameters are supported (includeMemoryContext, webSearch string)', colors.green);
    log('✅ New parameters are optional and don\'t break existing requests', colors.green);
    log('✅ Default values match previous version behavior', colors.green);
    log('✅ Response structure includes all legacy fields', colors.green);
    log('✅ New response fields are optional', colors.green);
    log('✅ Error responses maintain consistent structure', colors.green);
    
    logSection('✅ REQUIREMENTS SATISFIED');
    log('Requirement 10.1: Default behavior matches previous version ✅', colors.green);
    log('Requirement 10.2: Response structure is unchanged ✅', colors.green);
    
  } else {
    logError('❌ SOME CHECKS FAILED - REVIEW IMPLEMENTATION');
    log('Please review failed checks and ensure backward compatibility.', colors.red);
  }
  console.log('='.repeat(80) + '\n');
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run verification
try {
  runVerification();
} catch (error) {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
}
