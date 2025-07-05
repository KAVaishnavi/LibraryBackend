const axios = require('axios');

// Quick test to verify cover generation
async function testCoverNow() {
  console.log('🧪 Testing Cover Generation Now...\n');
  
  const baseURL = 'http://localhost:5000';
  
  try {
    // Register test user
    const registerData = {
      name: 'Cover Test Now',
      email: `covertest${Date.now()}@example.com`,
      password: 'CoverTest123'
    };
    
    console.log('📝 Registering test user...');
    const registerResponse = await axios.post(`${baseURL}/api/users/register`, registerData);
    const token = registerResponse.data.data.token;
    console.log('✅ Token obtained');
    
    // Test book creation with cover generation
    console.log('\n📚 Testing book creation with cover generation...');
    const bookData = {
      title: 'Cover Test Book Now',
      author: 'Cover Test Author Now',
      genre: 'Fiction',
      description: 'Testing automatic cover generation right now',
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
    
    // Check cover generation
    const book = bookResponse.data.data.book;
    console.log('\n🔍 Cover Analysis:');
    console.log('==================');
    
    if (book.coverImage) {
      console.log('✅ COVER GENERATED SUCCESSFULLY!');
      console.log('🖼️ Cover URL:', book.coverImage.url);
      console.log('📁 Filename:', book.coverImage.filename);
      console.log('🎨 Generated:', book.coverImage.isGenerated);
      console.log('📏 Size:', book.coverImage.size, 'bytes');
      console.log('🔗 Full URL:', `${baseURL}${book.coverImage.url}`);
      
      // Test cover accessibility
      console.log('\n🌐 Testing cover accessibility...');
      const coverUrl = `${baseURL}${book.coverImage.url}`;
      
      try {
        const coverResponse = await axios.head(coverUrl);
        console.log('✅ Cover is accessible:', coverResponse.status);
        console.log('📊 Content-Type:', coverResponse.headers['content-type']);
        console.log('📏 Content-Length:', coverResponse.headers['content-length']);
      } catch (error) {
        console.log('❌ Cover not accessible:', error.response?.status || error.message);
      }
      
    } else {
      console.log('❌ NO COVER GENERATED!');
      console.log('This means the cover generation system is not working.');
      console.log('Book data:', JSON.stringify(book, null, 2));
    }
    
    // Check covers directory
    console.log('\n📁 Checking covers directory...');
    const fs = require('fs');
    const path = require('path');
    
    const coversDir = path.join(__dirname, 'uploads/covers');
    if (fs.existsSync(coversDir)) {
      const files = fs.readdirSync(coversDir);
      console.log(`📂 Found ${files.length} files in covers directory`);
      
      // Show latest files
      const latestFiles = files
        .map(file => ({
          name: file,
          time: fs.statSync(path.join(coversDir, file)).birthtime
        }))
        .sort((a, b) => b.time - a.time)
        .slice(0, 3);
      
      console.log('📋 Latest cover files:');
      latestFiles.forEach(file => {
        console.log(`   - ${file.name} (${file.time.toLocaleString()})`);
      });
    } else {
      console.log('❌ Covers directory does not exist');
    }
    
    console.log('\n🎯 CONCLUSION:');
    console.log('==============');
    if (book.coverImage) {
      console.log('✅ Cover generation is WORKING!');
      console.log('✅ Every book will get a cover automatically');
      console.log('✅ System is ready for use');
    } else {
      console.log('❌ Cover generation is NOT working');
      console.log('❌ Need to check server logs for errors');
      console.log('❌ May need to restart backend server');
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
  testCoverNow().catch(console.error);
}

module.exports = { testCoverNow };