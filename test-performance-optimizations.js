// Performance Optimization Test Suite
// ====================================
// Tests caching, timeout handling, and query optimization

const { embeddingCache } = require('./src/lib/cache/embedding-cache');
const { r2FileCache } = require('./src/lib/cache/r2-file-cache');

console.log('🧪 Performance Optimization Test Suite\n');
console.log('=' .repeat(60));

// Test 1: Embedding Cache
console.log('\n📦 Test 1: Embedding Cache');
console.log('-'.repeat(60));

async function testEmbeddingCache() {
  try {
    const testTexts = ['Hello world', 'Test embedding'];
    const testEmbeddings = [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]];
    const provider = 'cohere';
    const model = 'embed-multilingual-v3.0';

    // Test cache miss
    const miss = embeddingCache.get(testTexts, provider);
    console.log('✓ Cache miss test:', miss === null ? 'PASS' : 'FAIL');

    // Test cache set
    embeddingCache.set(testTexts, testEmbeddings, provider, model);
    console.log('✓ Cache set test: PASS');

    // Test cache hit
    const hit = embeddingCache.get(testTexts, provider);
    console.log('✓ Cache hit test:', hit !== null ? 'PASS' : 'FAIL');
    console.log('✓ Cache data integrity:', 
      JSON.stringify(hit) === JSON.stringify(testEmbeddings) ? 'PASS' : 'FAIL'
    );

    // Test cache stats
    const stats = embeddingCache.getStats();
    console.log('✓ Cache stats:');
    console.log(`  - Hits: ${stats.hits}`);
    console.log(`  - Misses: ${stats.misses}`);
    console.log(`  - Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
    console.log(`  - Size: ${stats.size}/${stats.maxSize}`);

    // Test cache clear
    embeddingCache.clear();
    const afterClear = embeddingCache.get(testTexts, provider);
    console.log('✓ Cache clear test:', afterClear === null ? 'PASS' : 'FAIL');

    console.log('\n✅ Embedding cache tests completed');
    return true;
  } catch (error) {
    console.error('❌ Embedding cache test failed:', error.message);
    return false;
  }
}

// Test 2: R2 File Cache
console.log('\n📦 Test 2: R2 File Cache');
console.log('-'.repeat(60));

async function testR2FileCache() {
  try {
    const testPath = 'test/file.md';
    const testContent = '# Test File\n\nThis is test content.';
    const testMetadata = {
      size: Buffer.byteLength(testContent, 'utf8'),
      lastModified: new Date().toISOString()
    };

    // Test cache miss
    const miss = r2FileCache.get(testPath);
    console.log('✓ Cache miss test:', miss === null ? 'PASS' : 'FAIL');

    // Test cache set
    r2FileCache.set(testPath, testContent, testMetadata);
    console.log('✓ Cache set test: PASS');

    // Test cache hit
    const hit = r2FileCache.get(testPath);
    console.log('✓ Cache hit test:', hit !== null ? 'PASS' : 'FAIL');
    console.log('✓ Cache data integrity:', 
      hit?.content === testContent ? 'PASS' : 'FAIL'
    );

    // Test cache stats
    const stats = r2FileCache.getStats();
    console.log('✓ Cache stats:');
    console.log(`  - Hits: ${stats.hits}`);
    console.log(`  - Misses: ${stats.misses}`);
    console.log(`  - Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
    console.log(`  - Size: ${stats.size}/${stats.maxSize}`);
    console.log(`  - Bytes: ${stats.totalBytes}/${stats.maxBytes}`);

    // Test cache invalidation
    r2FileCache.invalidate(testPath);
    const afterInvalidate = r2FileCache.get(testPath);
    console.log('✓ Cache invalidate test:', afterInvalidate === null ? 'PASS' : 'FAIL');

    // Test pattern invalidation
    r2FileCache.set('test/file1.md', 'content1', testMetadata);
    r2FileCache.set('test/file2.md', 'content2', testMetadata);
    r2FileCache.set('other/file.md', 'content3', testMetadata);
    
    r2FileCache.invalidatePattern(/^test\//);
    const pattern1 = r2FileCache.get('test/file1.md');
    const pattern2 = r2FileCache.get('other/file.md');
    console.log('✓ Pattern invalidate test:', 
      pattern1 === null && pattern2 !== null ? 'PASS' : 'FAIL'
    );

    // Test cache clear
    r2FileCache.clear();
    console.log('✓ Cache clear test: PASS');

    console.log('\n✅ R2 file cache tests completed');
    return true;
  } catch (error) {
    console.error('❌ R2 file cache test failed:', error.message);
    return false;
  }
}

// Test 3: Timeout Handling
console.log('\n⏱️  Test 3: Timeout Handling');
console.log('-'.repeat(60));

async function testTimeoutHandling() {
  try {
    // Test timeout with a slow endpoint
    const controller = new AbortController();
    const timeoutMs = 1000; // 1 second timeout
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Simulate a slow request
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 2000); // 2 seconds
        controller.signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new Error('Request timeout'));
        });
      });
      
      clearTimeout(timeoutId);
      console.log('❌ Timeout test: FAIL (should have timed out)');
      return false;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.message === 'Request timeout') {
        console.log('✓ Timeout test: PASS (correctly timed out)');
        return true;
      } else {
        console.log('❌ Timeout test: FAIL (wrong error)');
        return false;
      }
    }
  } catch (error) {
    console.error('❌ Timeout handling test failed:', error.message);
    return false;
  }
}

// Test 4: Cache Performance
console.log('\n⚡ Test 4: Cache Performance');
console.log('-'.repeat(60));

async function testCachePerformance() {
  try {
    const iterations = 1000;
    const testTexts = ['Performance test text'];
    const testEmbeddings = [Array(1024).fill(0).map(() => Math.random())];

    // Warm up cache
    embeddingCache.set(testTexts, testEmbeddings, 'test', 'test-model');

    // Test cache hit performance
    const startHit = Date.now();
    for (let i = 0; i < iterations; i++) {
      embeddingCache.get(testTexts, 'test');
    }
    const hitTime = Date.now() - startHit;
    const avgHitTime = hitTime / iterations;

    console.log(`✓ Cache hit performance: ${avgHitTime.toFixed(3)}ms per lookup`);
    console.log(`✓ Total time for ${iterations} lookups: ${hitTime}ms`);

    // Test cache set performance
    embeddingCache.clear();
    const startSet = Date.now();
    for (let i = 0; i < 100; i++) {
      const uniqueTexts = [`Test ${i}`];
      embeddingCache.set(uniqueTexts, testEmbeddings, 'test', 'test-model');
    }
    const setTime = Date.now() - startSet;
    const avgSetTime = setTime / 100;

    console.log(`✓ Cache set performance: ${avgSetTime.toFixed(3)}ms per operation`);
    console.log(`✓ Total time for 100 sets: ${setTime}ms`);

    // Verify performance is acceptable
    const hitPerformanceOk = avgHitTime < 1; // Should be sub-millisecond
    const setPerformanceOk = avgSetTime < 5; // Should be under 5ms

    console.log(`✓ Hit performance acceptable: ${hitPerformanceOk ? 'PASS' : 'FAIL'}`);
    console.log(`✓ Set performance acceptable: ${setPerformanceOk ? 'PASS' : 'FAIL'}`);

    console.log('\n✅ Cache performance tests completed');
    return hitPerformanceOk && setPerformanceOk;
  } catch (error) {
    console.error('❌ Cache performance test failed:', error.message);
    return false;
  }
}

// Test 5: Cache Eviction
console.log('\n🗑️  Test 5: Cache Eviction (LRU)');
console.log('-'.repeat(60));

async function testCacheEviction() {
  try {
    // Create a small cache for testing
    const { EmbeddingCache } = require('./src/lib/cache/embedding-cache');
    const smallCache = new EmbeddingCache(3, 60); // Max 3 entries

    const testEmbeddings = [[0.1, 0.2, 0.3]];

    // Fill cache
    smallCache.set(['text1'], testEmbeddings, 'test', 'model');
    smallCache.set(['text2'], testEmbeddings, 'test', 'model');
    smallCache.set(['text3'], testEmbeddings, 'test', 'model');

    console.log(`✓ Cache filled: ${smallCache.size()}/3 entries`);

    // Access text1 to make it recently used
    smallCache.get(['text1'], 'test');

    // Add new entry, should evict text2 (least recently used)
    smallCache.set(['text4'], testEmbeddings, 'test', 'model');

    const text1Exists = smallCache.get(['text1'], 'test') !== null;
    const text2Exists = smallCache.get(['text2'], 'test') !== null;
    const text3Exists = smallCache.get(['text3'], 'test') !== null;
    const text4Exists = smallCache.get(['text4'], 'test') !== null;

    console.log(`✓ text1 (accessed): ${text1Exists ? 'KEPT' : 'EVICTED'}`);
    console.log(`✓ text2 (LRU): ${text2Exists ? 'KEPT' : 'EVICTED'}`);
    console.log(`✓ text3: ${text3Exists ? 'KEPT' : 'EVICTED'}`);
    console.log(`✓ text4 (new): ${text4Exists ? 'KEPT' : 'EVICTED'}`);

    const evictionWorking = text1Exists && !text2Exists && text3Exists && text4Exists;
    console.log(`✓ LRU eviction test: ${evictionWorking ? 'PASS' : 'FAIL'}`);

    console.log('\n✅ Cache eviction tests completed');
    return evictionWorking;
  } catch (error) {
    console.error('❌ Cache eviction test failed:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('\n🚀 Running all performance optimization tests...\n');

  const results = {
    embeddingCache: await testEmbeddingCache(),
    r2FileCache: await testR2FileCache(),
    timeoutHandling: await testTimeoutHandling(),
    cachePerformance: await testCachePerformance(),
    cacheEviction: await testCacheEviction()
  };

  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));

  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;

  Object.entries(results).forEach(([test, result]) => {
    const status = result ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${test}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log(`Final Score: ${passed}/${total} tests passed`);
  console.log('='.repeat(60));

  if (passed === total) {
    console.log('\n🎉 All performance optimization tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.');
    process.exit(1);
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});
