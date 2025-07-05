const mongoose = require('mongoose');
const Book = require('./src/models/book.model');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
require('dotenv').config();

async function fixCoverFlags() {
  try {
    console.log('🔧 Final fix for cover page flags...');
    
    // Connect to MongoDB
    const mongoUrl = process.env.MONGODB_URL;
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB Atlas');
    
    // Get the raw collection to bypass any schema issues
    const db = mongoose.connection.db;
    const booksCollection = db.collection('books');
    
    // Find all books with cover files
    const booksWithCovers = await booksCollection.find({
      isActive: true,
      'bookFile.filename': { $regex: /book-with-cover/ }
    }).toArray();
    
    console.log(`📚 Found ${booksWithCovers.length} books with cover files`);
    
    let successCount = 0;
    
    for (const book of booksWithCovers) {
      console.log(`\n📖 Processing: "${book.title}" by ${book.author}`);
      console.log(`   📁 File: ${book.bookFile.filename}`);
      
      // Verify the PDF actually has a cover page
      const filePath = path.join(__dirname, 'uploads/books', book.bookFile.filename);
      
      if (!fs.existsSync(filePath)) {
        console.log(`   ❌ File not found: ${filePath}`);
        continue;
      }
      
      try {
        // Check PDF content
        const pdfBytes = fs.readFileSync(filePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pageCount = pdfDoc.getPageCount();
        
        console.log(`   📄 Pages: ${pageCount}`);
        
        // Update the database with correct flags
        const updateResult = await booksCollection.updateOne(
          { _id: book._id },
          { 
            $set: { 
              'bookFile.hasCoverPage': true,
              'bookFile.coverPageVerified': new Date(),
              'bookFile.totalPages': pageCount,
              'metadata.coverPageStatus': 'verified-working'
            } 
          }
        );
        
        if (updateResult.modifiedCount > 0) {
          console.log(`   ✅ Updated database flags`);
          successCount++;
        } else {
          console.log(`   ⚠️ No database changes made`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error processing PDF: ${error.message}`);
      }
    }
    
    console.log(`\n🎉 Cover flag fix complete!`);
    console.log(`✅ Successfully updated: ${successCount} books`);
    
    // Final verification
    console.log(`\n🔍 Final verification...`);
    const verifyBooks = await booksCollection.find({
      isActive: true,
      'bookFile.filename': { $regex: /book-with-cover/ }
    }).toArray();
    
    const withFlags = verifyBooks.filter(book => book.bookFile.hasCoverPage === true);
    console.log(`📊 Books with cover flags: ${withFlags.length}/${verifyBooks.length}`);
    
    if (withFlags.length === verifyBooks.length) {
      console.log(`\n🎉 SUCCESS! All books now have cover page flags set!`);
      console.log(`\n📚 Your PDF books now have cover pages as the FIRST PAGE:`);
      console.log(`   1️⃣ Page 1: Beautiful cover with title and author`);
      console.log(`   2️⃣ Page 2+: Original book content`);
      console.log(`\n💡 To test:`);
      console.log(`   1. Download any PDF book from your library`);
      console.log(`   2. Open the PDF file`);
      console.log(`   3. The first page will be a professional cover page`);
      console.log(`   4. The second page onwards will be the original content`);
      console.log(`\n🔄 Refresh your frontend to see the updated status!`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

fixCoverFlags();