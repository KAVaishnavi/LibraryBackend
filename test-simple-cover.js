const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Simple test to create a text-based cover
async function createSimpleCover() {
  console.log('Creating simple text cover...');
  
  try {
    const outputDir = path.join(__dirname, 'uploads/covers');
    
    // Ensure directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log('Created covers directory');
    }
    
    const coverPath = path.join(outputDir, `test-cover-${Date.now()}.jpg`);
    
    // Create simple SVG
    const svg = `
      <svg width="600" height="900" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#4F46E5"/>
        <text x="300" y="300" text-anchor="middle" fill="white" font-family="Arial" font-size="32" font-weight="bold">
          Test Book Title
        </text>
        <text x="300" y="400" text-anchor="middle" fill="white" font-family="Arial" font-size="24">
          by Test Author
        </text>
      </svg>
    `;
    
    // Convert to JPEG
    await sharp(Buffer.from(svg))
      .jpeg({ quality: 85 })
      .toFile(coverPath);
    
    console.log('SUCCESS: Cover created at:', coverPath);
    
    // Check file exists and size
    if (fs.existsSync(coverPath)) {
      const stats = fs.statSync(coverPath);
      console.log(`File size: ${(stats.size / 1024).toFixed(2)} KB`);
      return true;
    } else {
      console.log('ERROR: File was not created');
      return false;
    }
    
  } catch (error) {
    console.error('ERROR creating cover:', error);
    return false;
  }
}

// Test PDF cover generation
async function testPDFCover() {
  console.log('\nTesting PDF cover generation...');
  
  try {
    const pdf2pic = require('pdf2pic');
    
    const booksDir = path.join(__dirname, 'uploads/books');
    const coversDir = path.join(__dirname, 'uploads/covers');
    
    if (!fs.existsSync(booksDir)) {
      console.log('No books directory found');
      return false;
    }
    
    const pdfFiles = fs.readdirSync(booksDir).filter(file => file.endsWith('.pdf'));
    
    if (pdfFiles.length === 0) {
      console.log('No PDF files found');
      return false;
    }
    
    const testPdf = pdfFiles[0];
    const pdfPath = path.join(booksDir, testPdf);
    
    console.log('Testing with PDF:', testPdf);
    
    // Try simple pdf2pic conversion
    const convert = pdf2pic.fromPath(pdfPath, {
      density: 150,
      saveFilename: `test-pdf-cover-${Date.now()}`,
      savePath: coversDir,
      format: "png",
      width: 400,
      height: 600,
      page: 1
    });
    
    const result = await convert(1, { responseType: "image" });
    
    if (result && result.path && fs.existsSync(result.path)) {
      console.log('SUCCESS: PDF cover extracted to:', result.path);
      
      // Convert to JPEG with sharp
      const jpegPath = result.path.replace('.png', '.jpg');
      await sharp(result.path)
        .jpeg({ quality: 85 })
        .toFile(jpegPath);
      
      // Clean up PNG
      fs.unlinkSync(result.path);
      
      console.log('SUCCESS: Converted to JPEG:', jpegPath);
      return true;
    } else {
      console.log('ERROR: PDF extraction failed');
      return false;
    }
    
  } catch (error) {
    console.error('ERROR in PDF cover generation:', error.message);
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('=== Cover Generation Tests ===\n');
  
  const textCoverResult = await createSimpleCover();
  const pdfCoverResult = await testPDFCover();
  
  console.log('\n=== Results ===');
  console.log('Text cover:', textCoverResult ? 'SUCCESS' : 'FAILED');
  console.log('PDF cover:', pdfCoverResult ? 'SUCCESS' : 'FAILED');
  
  if (textCoverResult || pdfCoverResult) {
    console.log('\nCover generation is working! The issue might be in the integration.');
    console.log('Try uploading a new PDF book to test the full flow.');
  } else {
    console.log('\nBoth methods failed. Check dependencies and file permissions.');
  }
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { createSimpleCover, testPDFCover };