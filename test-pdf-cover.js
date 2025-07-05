const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function testPDFCover() {
  try {
    console.log('🧪 Testing PDF cover creation...');
    
    // Create a simple PDF cover
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    
    const { width, height } = page.getSize();
    
    // Add background
    page.drawRectangle({
      x: 0,
      y: 0,
      width: width,
      height: height,
      color: rgb(0.4, 0.49, 0.92),
    });
    
    // Add title
    page.drawText('Test Book Title', {
      x: 50,
      y: height - 100,
      size: 30,
      color: rgb(1, 1, 1),
    });
    
    // Add author
    page.drawText('by Test Author', {
      x: 50,
      y: height - 150,
      size: 20,
      color: rgb(1, 1, 1),
    });
    
    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    
    // Write to file
    const testDir = path.join(__dirname, 'uploads', 'test');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testPath = path.join(testDir, 'test-cover.pdf');
    fs.writeFileSync(testPath, pdfBytes);
    
    console.log('✅ PDF cover test successful!');
    console.log('📁 Test file created at:', testPath);
    console.log('📏 File size:', (pdfBytes.length / 1024).toFixed(2), 'KB');
    
    return true;
  } catch (error) {
    console.error('❌ PDF cover test failed:', error);
    return false;
  }
}

// Run the test
testPDFCover().then(success => {
  if (success) {
    console.log('🎉 PDF functionality is working correctly!');
  } else {
    console.log('💥 PDF functionality has issues!');
  }
  process.exit(success ? 0 : 1);
});