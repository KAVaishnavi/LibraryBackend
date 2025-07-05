const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Diagnostic script to test upload functionality
async function diagnoseUpload() {
  console.log('🔍 Diagnosing Upload Issues...\n');
  
  const baseURL = 'http://localhost:5000';
  
  // Test 1: Check if server is responding
  console.log('1. Testing server connection...');
  try {
    const response = await axios.get(`${baseURL}/health`);
    console.log('✅ Server is responding:', response.data.message);
  } catch (error) {
    console.log('❌ Server connection failed:', error.message);
    console.log('   Make sure backend is running on port 5000');
    return;
  }
  
  // Test 2: Check authentication endpoint
  console.log('\n2. Testing authentication...');
  try {
    // Try to register a test user
    const registerData = {
      name: 'Test User',
      email: `test${Date.now()}@example.com`,
      password: 'testpassword123'
    };
    
    const registerResponse = await axios.post(`${baseURL}/api/users/register`, registerData);
    console.log('✅ User registration works');
    
    const token = registerResponse.data.data.token;
    console.log('✅ Got authentication token');
    
    // Test 3: Try book upload
    console.log('\n3. Testing book upload...');
    
    const formData = new FormData();
    formData.append('title', 'Test Book Title');
    formData.append('author', 'Test Author');
    formData.append('genre', 'Fiction');
    formData.append('description', 'This is a test book upload');
    formData.append('language', 'English');
    formData.append('uploadMethod', 'manual');
    
    const uploadResponse = await axios.post(`${baseURL}/api/books`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      }
    });
    
    console.log('✅ Book upload successful!');
    console.log('   Response:', uploadResponse.data.message);
    
    // Test 4: Check if book appears in library
    console.log('\n4. Testing book retrieval...');
    const booksResponse = await axios.get(`${baseURL}/api/books`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Books retrieval works');
    console.log(`   Found ${booksResponse.data.data.books.length} books`);
    
    // Find our test book
    const testBook = booksResponse.data.data.books.find(book => book.title === 'Test Book Title');
    if (testBook) {
      console.log('✅ Test book found in library');
      console.log('   Cover generated:', testBook.coverImage ? 'Yes' : 'No');
      if (testBook.coverImage) {
        console.log('   Cover URL:', testBook.coverImage.url);
        console.log('   Is generated:', testBook.coverImage.isGenerated);
      }
    } else {
      console.log('❌ Test book not found in library');
    }
    
  } catch (error) {
    console.log('❌ Upload test failed:', error.message);
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Error:', error.response.data);
    }
  }
  
  // Test 5: Check file upload with PDF
  console.log('\n5. Testing PDF file upload...');
  try {
    // Check if there are any PDF files to test with
    const booksDir = path.join(__dirname, 'uploads/books');
    if (fs.existsSync(booksDir)) {
      const pdfFiles = fs.readdirSync(booksDir).filter(file => file.endsWith('.pdf'));
      if (pdfFiles.length > 0) {
        console.log(`   Found ${pdfFiles.length} existing PDF files`);
        console.log('   You can try uploading a new PDF through the frontend');
      } else {
        console.log('   No PDF files found for testing');
      }
    }
  } catch (error) {
    console.log('❌ PDF test failed:', error.message);
  }
  
  console.log('\n📋 Diagnosis Summary:');
  console.log('====================');
  console.log('If all tests passed, the upload system should be working.');
  console.log('If you\'re still having issues:');
  console.log('1. Check browser console for frontend errors');
  console.log('2. Check backend console for server errors');
  console.log('3. Verify you\'re logged in on the frontend');
  console.log('4. Try uploading a small PDF file');
  console.log('5. Check network tab in browser dev tools');
}

// Run diagnosis
if (require.main === module) {
  diagnoseUpload().catch(console.error);
}

module.exports = { diagnoseUpload };