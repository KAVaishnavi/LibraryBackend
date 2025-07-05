const axios = require('axios');

// Debug the current system to see what's actually happening
async function debugCurrentSystem() {
  console.log('🔍 Debugging Current System Status...\n');
  
  const baseURL = 'http://localhost:5000';
  
  try {
    // Test 1: Check server health
    console.log('1. Testing server health...');
    const health = await axios.get(`${baseURL}/health`);
    console.log('✅ Server is running:', health.data.message);
    
    // Test 2: Register and get token
    console.log('\n2. Getting authentication token...');
    const registerData = {
      name: 'Debug User',
      email: `debug${Date.now()}@example.com`,
      password: 'DebugPassword123'
    };
    
    const registerResponse = await axios.post(`${baseURL}/api/users/register`, registerData);
    const token = registerResponse.data.data.token;
    console.log('✅ Token obtained');
    
    // Test 3: Try creating a simple book to see what happens
    console.log('\n3. Testing book creation (manual entry)...');
    const bookData = {
      title: 'Debug Test Book',
      author: 'Debug Author',
      genre: 'Fiction',
      description: 'Testing current system',
      uploadMethod: 'manual'
    };
    
    console.log('📤 Sending book creation request...');
    const bookResponse = await axios.post(`${baseURL}/api/books`, bookData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Book creation response received');
    console.log('📊 Response data:', JSON.stringify(bookResponse.data, null, 2));
    
    // Test 4: Check what's in the covers directory
    console.log('\n4. Checking covers directory...');
    const fs = require('fs');
    const path = require('path');
    
    const coversDir = path.join(__dirname, 'uploads/covers');
    if (fs.existsSync(coversDir)) {
      const files = fs.readdirSync(coversDir);
      console.log(`📁 Found ${files.length} files in covers directory:`);
      files.forEach(file => {
        const filePath = path.join(coversDir, file);
        const stats = fs.statSync(filePath);
        const created = stats.birthtime.toLocaleString();
        console.log(`   - ${file} (${(stats.size / 1024).toFixed(2)} KB, created: ${created})`);
      });
    } else {
      console.log('❌ Covers directory does not exist');
    }
    
    // Test 5: Try to access the cover URL
    if (bookResponse.data.data.book.coverImage) {
      console.log('\n5. Testing cover URL access...');
      const coverUrl = `${baseURL}${bookResponse.data.data.book.coverImage.url}`;
      console.log('🔗 Cover URL:', coverUrl);
      
      try {
        const coverResponse = await axios.head(coverUrl);
        console.log('✅ Cover is accessible:', coverResponse.status);
      } catch (error) {
        console.log('❌ Cover not accessible:', error.response?.status || error.message);
      }
    }
    
  } catch (error) {
    console.log('❌ Debug failed:', error.message);
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Response:', JSON.stringify(error.response.data, null, 2));
    }
    console.log('   Full error:', error);
  }
}

// Run debug
if (require.main === module) {
  debugCurrentSystem().catch(console.error);
}

module.exports = { debugCurrentSystem };