const path = require('path');
const fs = require('fs');

// Test script to verify and fix cover generation
async function testCoverGeneration() {
  console.log('🔧 Testing Cover Generation Fix');
  console.log('===============================\n');
  
  // Check directories
  const uploadsDir = path.join(__dirname, 'uploads');
  const booksDir = path.join(uploadsDir, 'books');
  const coversDir = path.join(uploadsDir, 'covers');
  
  console.log('📁 Directory Check:');
  console.log(`   Books: ${fs.existsSync(booksDir) ? '✅' : '❌'} ${booksDir}`);
  console.log(`   Covers: ${fs.existsSync(coversDir) ? '✅' : '❌'} ${coversDir}`);
  
  // List PDF files
  if (fs.existsSync(booksDir)) {
    const pdfFiles = fs.readdirSync(booksDir).filter(file => file.endsWith('.pdf'));
    console.log(`\n📚 Found ${pdfFiles.length} PDF files`);
    
    if (pdfFiles.length > 0) {
      // Test with first PDF
      const testPdf = pdfFiles[0];
      const testPdfPath = path.join(booksDir, testPdf);
      
      console.log(`\n🧪 Testing with: ${testPdf}`);
      
      try {
        // Import the improved cover generator
        const { generateCoverFromPDF } = require('./src/controlers/book.controller');
        
        console.log('🎨 Attempting cover generation...');
        const result = await generateCoverFromPDF(testPdfPath, coversDir);
        
        if (result) {
          console.log('✅ Cover generation successful!');
          console.log(`   Generated: ${path.basename(result)}`);
          
          const stats = fs.statSync(result);
          console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
        } else {
          console.log('❌ Cover generation failed');
        }
        
      } catch (error) {
        console.error('❌ Test error:', error.message);
      }
    }
  }
  
  // Check existing covers
  if (fs.existsSync(coversDir)) {
    const coverFiles = fs.readdirSync(coversDir);
    console.log(`\n🖼️ Existing covers: ${coverFiles.length}`);
    
    if (coverFiles.length > 0) {
      console.log('   Recent covers:');
      coverFiles.slice(-3).forEach(file => {
        const filePath = path.join(coversDir, file);
        const stats = fs.statSync(filePath);
        console.log(`   - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
      });
    }
  }
  
  console.log('\n🔧 Troubleshooting Tips:');
  console.log('========================');
  console.log('1. Make sure pdf2pic and sharp are installed');
  console.log('2. Check PDF file permissions');
  console.log('3. Ensure covers directory is writable');
  console.log('4. Try uploading a new PDF book');
  console.log('5. Check server logs for detailed errors');
  
  console.log('\n📝 Next Steps:');
  console.log('==============');
  console.log('1. Upload a new PDF book through the frontend');
  console.log('2. Check if cover is automatically generated');
  console.log('3. Look for detailed logs in the console');
  console.log('4. Verify cover appears in library view');
}

// Run the test
if (require.main === module) {
  testCoverGeneration().catch(console.error);
}

module.exports = { testCoverGeneration };