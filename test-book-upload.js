const { createPDFCoverPage, combinePDFWithCover } = require('./src/controlers/book.controller.enhanced-cover');
const fs = require('fs');
const path = require('path');

async function testBookUpload() {
  try {
    console.log('🧪 Testing book upload with cover page...');
    
    // Test 1: Create a simple test PDF
    console.log('\n📄 Test 1: Creating test PDF...');
    const { PDFDocument, rgb } = require('pdf-lib');
    
    const testPdf = await PDFDocument.create();
    const page = testPdf.addPage();
    page.drawText('This is a test book content', {
      x: 50,
      y: 500,
      size: 20,
      color: rgb(0, 0, 0),
    });
    
    const testPdfBytes = await testPdf.save();
    const testPdfPath = path.join(__dirname, 'uploads', 'test', 'test-book.pdf');
    
    // Ensure directory exists
    const testDir = path.dirname(testPdfPath);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    fs.writeFileSync(testPdfPath, testPdfBytes);
    console.log('✅ Test PDF created:', testPdfPath);
    
    // Test 2: Create cover page
    console.log('\n🎨 Test 2: Creating cover page...');
    const coverResult = await createPDFCoverPage('Test Book Title', 'Test Author');
    
    if (coverResult.success) {
      console.log('✅ Cover page created successfully');
      console.log('📏 Cover size:', (coverResult.pdfBytes.length / 1024).toFixed(2), 'KB');
    } else {
      console.log('❌ Cover page creation failed:', coverResult.error);
      return false;
    }
    
    // Test 3: Combine PDF with cover
    console.log('\n📚 Test 3: Combining PDF with cover...');
    const combineResult = await combinePDFWithCover(testPdfPath, 'Test Book Title', 'Test Author');
    
    if (combineResult.success) {
      console.log('✅ PDF combination successful');
      console.log('📁 Combined file:', combineResult.filename);
      console.log('📏 Combined size:', (combineResult.size / 1024).toFixed(2), 'KB');
      
      // Verify the combined file exists
      if (fs.existsSync(combineResult.path)) {
        console.log('✅ Combined file verified on disk');
        
        // Check page count
        const { PDFDocument } = require('pdf-lib');
        const combinedBytes = fs.readFileSync(combineResult.path);
        const combinedPdf = await PDFDocument.load(combinedBytes);
        const pageCount = combinedPdf.getPageCount();
        console.log('📊 Combined PDF has', pageCount, 'pages (should be 2: cover + content)');
        
        if (pageCount === 2) {
          console.log('🎉 SUCCESS: Cover page integration is working correctly!');
          return true;
        } else {
          console.log('❌ ISSUE: Expected 2 pages, got', pageCount);
          return false;
        }
      } else {
        console.log('❌ Combined file not found on disk');
        return false;
      }
    } else {
      console.log('❌ PDF combination failed:', combineResult.error);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('❌ Error stack:', error.stack);
    return false;
  }
}

// Run the test
testBookUpload().then(success => {
  if (success) {
    console.log('\n🎉 All tests passed! Cover page functionality is working.');
    console.log('📝 When you upload a PDF book, it should automatically get a cover page.');
  } else {
    console.log('\n💥 Tests failed! There might be an issue with the cover page functionality.');
  }
  process.exit(success ? 0 : 1);
});