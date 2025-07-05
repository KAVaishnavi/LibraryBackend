const mongoose = require('mongoose');
const Book = require('./src/models/book.model');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function removeTestBook() {
  try {
    console.log('🗑️ Removing test book uploaded by "Cover Test Author Now"...');
    
    // Connect to MongoDB
    const mongoUrl = process.env.MONGODB_URL;
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB Atlas');
    
    // Find the test book
    const testBook = await Book.findOne({
      $or: [
        { author: 'Cover Test Author Now' },
        { title: 'Cover Test Book Now' },
        { author: { $regex: /test.*cover/i } },
        { title: { $regex: /test.*cover/i } }
      ]
    });
    
    if (!testBook) {
      console.log('❌ Test book not found');
      return;
    }
    
    console.log(`📖 Found test book: "${testBook.title}" by ${testBook.author}`);
    console.log(`📁 Book ID: ${testBook._id}`);
    
    // Show book details
    console.log('\n📋 Book details:');
    console.log(`   Title: ${testBook.title}`);
    console.log(`   Author: ${testBook.author}`);
    console.log(`   Genre: ${testBook.genre}`);
    console.log(`   Created: ${testBook.createdAt}`);
    console.log(`   Cover Image: ${testBook.coverImage?.filename || 'None'}`);
    console.log(`   Book File: ${testBook.bookFile?.filename || 'None'}`);
    
    // Remove associated files
    let filesRemoved = 0;
    
    // Remove cover image file
    if (testBook.coverImage?.filename) {
      const coverPath = path.join(__dirname, 'uploads/covers', testBook.coverImage.filename);
      if (fs.existsSync(coverPath)) {
        fs.unlinkSync(coverPath);
        console.log(`✅ Removed cover image: ${testBook.coverImage.filename}`);
        filesRemoved++;
      }
    }
    
    // Remove book file
    if (testBook.bookFile?.filename) {
      const bookPath = path.join(__dirname, 'uploads/books', testBook.bookFile.filename);
      if (fs.existsSync(bookPath)) {
        fs.unlinkSync(bookPath);
        console.log(`✅ Removed book file: ${testBook.bookFile.filename}`);
        filesRemoved++;
      }
    }
    
    // Remove from database
    await Book.findByIdAndDelete(testBook._id);
    console.log(`✅ Removed book from database`);
    
    console.log(`\n🎉 Test book removal complete!`);
    console.log(`📊 Summary:`);
    console.log(`   - Book removed from database: ✅`);
    console.log(`   - Files removed: ${filesRemoved}`);
    console.log(`   - Book title: "${testBook.title}"`);
    console.log(`   - Author: ${testBook.author}`);
    
    // Verify removal
    const verifyBook = await Book.findById(testBook._id);
    if (!verifyBook) {
      console.log(`\n✅ Verification: Book successfully removed from database`);
    } else {
      console.log(`\n❌ Verification: Book still exists in database`);
    }
    
  } catch (error) {
    console.error('❌ Error removing test book:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

removeTestBook();