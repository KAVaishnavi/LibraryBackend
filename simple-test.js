const axios = require('axios');

// Simple test to check what's happening
async function simpleTest() {
  console.log('🔍 Simple Upload Test\n');
  
  const baseURL = 'http://localhost:5000';
  
  // Test server health
  try {
    const health = await axios.get(`${baseURL}/health`);
    console.log('✅ Server is running:', health.data.message);
  } catch (error) {
    console.log('❌ Server not responding. Make sure backend is running.');
    return;
  }
  
  // Test with proper password
  try {
    const registerData = {
      name: 'Test User',
      email: `test${Date.now()}@example.com`,
      password: 'TestPassword123'  // Proper password format
    };
    
    console.log('📝 Registering test user...');
    const registerResponse = await axios.post(`${baseURL}/api/users/register`, registerData);
    console.log('✅ User registered successfully');
    
    const token = registerResponse.data.data.token;
    console.log('🔑 Got token:', token.substring(0, 20) + '...');
    
    // Test simple book creation (no file)
    console.log('\n📚 Testing book creation...');
    const bookData = {
      title: 'Test Book',
      author: 'Test Author', 
      genre: 'Fiction',
      description: 'Test description',
      uploadMethod: 'manual'
    };
    
    const bookResponse = await axios.post(`${baseURL}/api/books`, bookData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Book created successfully!');
    console.log('📖 Book title:', bookResponse.data.data.book.title);
    console.log('🖼️ Cover generated:', bookResponse.data.data.book.coverImage ? 'Yes' : 'No');
    
    if (bookResponse.data.data.book.coverImage) {
      console.log('   Cover URL:', bookResponse.data.data.book.coverImage.url);
      console.log('   Is fallback:', bookResponse.data.data.book.coverImage.isFallback || false);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run test
if (require.main === module) {
  simpleTest().catch(console.error);
}

module.exports = { simpleTest };