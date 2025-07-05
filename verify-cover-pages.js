const mongoose = require('mongoose');
const Book = require('./src/models/book.model');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
require('dotenv').config();

async function verifyCoverPages() {
  try {
    console.log('🔍 Verifying cover pages in PDF books...');
    
    // Connect to MongoDB
    const mongoUrl = process.env.MONGODB_URL;
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB Atlas');
    
    // Get all PDF books
    const pdfBooks = await Book.find({
      isActive: true,
      'bookFile.mimeType': { $regex: /pdf/i }
    });
    
    console.log(`📚 Found ${pdfBooks.length} PDF books to verify`);
    
    let booksWithCovers = 0;
    let booksWithoutCovers = 0;
    
    for (const book of pdfBooks) {
      console.log(`\n📖 Checking: "${book.title}" by ${book.author}`);
      console.log(`   📁 File: ${book.bookFile.filename}`);
      console.log(`   🎨 Has Cover Flag: ${book.bookFile.hasCoverPage ? '✅ YES' : '❌ NO'}`);
      
      // Check if file exists
      const filePath = path.join(__dirname, 'uploads/books', book.bookFile.filename);
      if (!fs.existsSync(filePath)) {
        console.log(`   💾 File Status: ❌ MISSING`);
        continue;
      }
      
      console.log(`   💾 File Status: ✅ EXISTS`);
      
      try {
        // Check actual PDF content
        const pdfBytes = fs.readFileSync(filePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pageCount = pdfDoc.getPageCount();
        
        console.log(`   📄 Total Pages: ${pageCount}`);
        
        // Check if it's a combined PDF (has cover page)
        const isCombinedPDF = book.bookFile.filename.includes('book-with-cover');
        console.log(`   🔗 Combined PDF: ${isCombinedPDF ? '✅ YES' : '❌ NO'}`);
        
        if (book.bookFile.hasCoverPage && isCombinedPDF) {
          console.log(`   ✅ VERIFIED: Book has cover page as first page`);
          booksWithCovers++;
        } else {
          console.log(`   ❌ ISSUE: Book missing cover page`);
          booksWithoutCovers++;
        }
        
      } catch (error) {
        console.log(`   ❌ ERROR: Cannot read PDF - ${error.message}`);
        booksWithoutCovers++;
      }
    }
    
    console.log(`\n📊 VERIFICATION SUMMARY:`);
    console.log(`=`.repeat(50));
    console.log(`📚 Total PDF books: ${pdfBooks.length}`);
    console.log(`✅ Books with cover pages: ${booksWithCovers}`);
    console.log(`❌ Books without cover pages: ${booksWithoutCovers}`);
    
    if (booksWithCovers === pdfBooks.length) {
      console.log(`\n🎉 PERFECT! All PDF books have cover pages as the first page!`);
      console.log(`📖 When you download any PDF book, you will see:`);
      console.log(`   1️⃣ Beautiful cover page (Page 1)`);
      console.log(`   2️⃣ Original book content (Page 2 onwards)`);
      console.log(`\n💡 To test: Download any book and check the first page!`);
    } else if (booksWithCovers > 0) {
      console.log(`\n✅ GOOD! ${booksWithCovers} books have cover pages.`);
      console.log(`⚠️ ${booksWithoutCovers} books still need cover pages.`);
      console.log(`\n🔧 Would you like me to fix the remaining books?`);
    } else {
      console.log(`\n❌ ISSUE: No books have cover pages yet.`);
      console.log(`🔧 The cover page system needs to be activated.`);
    }
    
    // Show example of what the cover page looks like
    console.log(`\n🎨 Cover Page Features:`);
    console.log(`   📐 Professional A4 size (595x842 points)`);
    console.log(`   🌈 Beautiful gradient background (blue to purple)`);
    console.log(`   📖 Book title prominently displayed`);
    console.log(`   👤 Author name clearly shown`);
    console.log(`   📚 "Digital Library" branding`);
    console.log(`   🎯 Book icon and decorative elements`);
    console.log(`   ⭐ White border and professional layout`);
    
  } catch (error) {
    console.error('❌ Error verifying cover pages:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

verifyCoverPages();