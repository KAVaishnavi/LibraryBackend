const mongoose = require('mongoose');
const Book = require('./src/models/book.model');
require('dotenv').config();

async function manualFix() {
  try {
    console.log('🔧 Manual fix for cover page flags...');
    
    // Connect to MongoDB
    const mongoUrl = process.env.MONGODB_URL;
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB Atlas');
    
    // Get all books with cover files
    const books = await Book.find({
      isActive: true,
      'bookFile.filename': { $regex: /book-with-cover/ }
    });
    
    console.log(`📚 Found ${books.length} books with cover files`);
    
    for (const book of books) {
      console.log(`\n📖 Processing: "${book.title}" by ${book.author}`);
      console.log(`📁 Current file: ${book.bookFile.filename}`);
      console.log(`🎨 Current hasCoverPage: ${book.bookFile.hasCoverPage}`);
      
      // Update the book directly
      book.bookFile.hasCoverPage = true;
      if (!book.metadata) {
        book.metadata = {};
      }
      book.metadata.coverPageAdded = new Date();
      book.metadata.coverPageVersion = '1.0';
      
      await book.save();
      console.log(`✅ Updated and saved "${book.title}"`);
    }
    
    // Final verification
    console.log('\n🔍 Final verification...');
    const updatedBooks = await Book.find({
      isActive: true,
      'bookFile.filename': { $regex: /book-with-cover/ }
    });
    
    const successCount = updatedBooks.filter(book => book.bookFile.hasCoverPage === true).length;
    console.log(`✅ Final result: ${successCount}/${updatedBooks.length} books have hasCoverPage = true`);
    
    if (successCount === updatedBooks.length) {
      console.log('\n🎉 SUCCESS! All cover page flags are now set correctly!');
      console.log('📚 Your books now have cover pages as the first page.');
      console.log('🔄 Please refresh your frontend to see the changes.');
    } else {
      console.log('\n❌ Some books still need fixing.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

manualFix();