// Test Study Buddy API directly
const testUserId = 'test-user-' + Date.now();
const testMessage = 'Hello, can you help me study?';

console.log('🧪 Testing Study Buddy API...');
console.log('Test User ID:', testUserId);
console.log('Test Message:', testMessage);
console.log('');

fetch('http://localhost:3003/api/ai/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userId: testUserId,
    message: testMessage,
    chatType: 'study_assistant',
    provider: 'groq',
    model: 'llama-3.1-8b-instant'
  })
})
  .then(async response => {
    console.log('📡 Response Status:', response.status);
    console.log('');
    
    const data = await response.json();
    console.log('📦 Response Data:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.success && data.data?.aiResponse?.content) {
      console.log('');
      console.log('✅ SUCCESS! AI Response:');
      console.log(data.data.aiResponse.content);
    } else if (data.error) {
      console.log('');
      console.log('❌ ERROR:', data.error.message);
    }
  })
  .catch(error => {
    console.error('❌ Request failed:', error.message);
  });
