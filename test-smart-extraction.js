const { extractPDFMetadata } = require('./src/utils/metadata-extractor');
const path = require('path');
const fs = require('fs');

async function testSmartExtraction() {
  try {
    console.log('🧠 Testing Smart Metadata Extraction...');
    
    // Find some existing PDF files to test with
    const booksDir = path.join(__dirname, 'uploads/books');
    
    if (!fs.existsSync(booksDir)) {
      console.log('❌ Books directory not found');
      return;
    }
    
    const files = fs.readdirSync(booksDir);
    const pdfFiles = files.filter(file => file.endsWith('.pdf')).slice(0, 3); // Test first 3 PDFs
    
    if (pdfFiles.length === 0) {
      console.log('❌ No PDF files found to test');
      return;
    }
    
    console.log(`📚 Testing with ${pdfFiles.length} PDF files...\n`);
    
    for (const filename of pdfFiles) {
      console.log(`📖 Testing: ${filename}`);
      console.log('='.repeat(60));
      
      const filePath = path.join(booksDir, filename);
      
      // Extract metadata
      const metadata = await extractPDFMetadata(filePath, filename);
      
      console.log('📊 EXTRACTION RESULTS:');
      console.log(`   📝 Title: "${metadata.title}"`);
      console.log(`   👤 Author: "${metadata.author}"`);
      console.log(`   📚 Genre: "${metadata.genre}"`);
      console.log(`   📄 Pages: ${metadata.pages || 'Unknown'}`);
      console.log(`   🎯 Confidence: ${metadata.confidence}%`);
      console.log(`   🔧 Method: ${metadata.extractionMethod}`);
      
      if (metadata.description) {
        console.log(`   📄 Description: ${metadata.description.substring(0, 100)}...`);
      }
      
      if (metadata.error) {
        console.log(`   ⚠️ Error: ${metadata.error}`);
      }
      
      console.log('\n');
    }
    
    console.log('🎉 Smart Metadata Extraction Test Complete!');
    console.log('\n📋 How it works for new uploads:');
    console.log('   1️⃣ User uploads a PDF file');
    console.log('   2️⃣ System analyzes PDF properties and filename');
    console.log('   3️⃣ Extracts real title, author, and genre');
    console.log('   4️⃣ Uses extracted data instead of fake placeholders');
    console.log('   5��⃣ Creates cover page with real information');
    console.log('   6️⃣ Saves book with professional metadata');
    
    console.log('\n🚀 Benefits:');
    console.log('   ✅ No more "obooko-fan0042" fake authors');
    console.log('   ✅ Real book titles instead of filenames');
    console.log('   ✅ Accurate genre classification');
    console.log('   ✅ Professional library appearance');
    console.log('   ✅ Automatic cover generation with real data');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSmartExtraction();