const mongoose = require('mongoose');
const Book = require('./src/models/book.model');
require('dotenv').config();

async function fixCoverFlags() {
  try {
    console.log('🔧 Fixing cover page flags in database...');
    
    // Connect to MongoDB
    const mongoUrl = process.env.MONGODB_URL || 'mongodb+srv://kavaishnavi2020:books@cluster0.dkjy6hl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB Atlas');
    
    // Find all books with cover files but hasCoverPage = false
    const booksToUpdate = await Book.find({
      isActive: true,
      'bookFile.filename': { $regex: /book-with-cover/ },
      $or: [
        { 'bookFile.hasCoverPage': { $exists: false } },
        { 'bookFile.hasCoverPage': false }
      ]
    });
    
    console.log(`📚 Found ${booksToUpdate.length} books with cover files that need flag updates`);
    
    if (booksToUpdate.length === 0) {
      console.log('🎉 All books already have correct flags!');
      return;
    }
    
    let updateCount = 0;
    
    for (const book of booksToUpdate) {
      console.log(`🔧 Updating "${book.title}" by ${book.author}`);
      
      try {
        await Book.findByIdAndUpdate(book._id, {
          $set: {
            'bookFile.hasCoverPage': true,
            'metadata.coverPageAdded': new Date(),
            'metadata.coverPageVersion': '1.0',
            'metadata.coverPageFixed': new Date()
          }
        });
        
        console.log(`✅ Updated "${book.title}"`);
        updateCount++;
        
      } catch (error) {
        console.error(`❌ Failed to update "${book.title}":`, error.message);
      }
    }
    
    console.log(`\n🎉 Update complete!`);
    console.log(`✅ Successfully updated: ${updateCount} books`);
    console.log(`📚 All books with cover files now have hasCoverPage = true`);
    
    // Verify the updates
    console.log('\n🔍 Verifying updates...');
    const verifyBooks = await Book.find({
      isActive: true,
      'bookFile.filename': { $regex: /book-with-cover/ }
    });
    
    const withCoverFlag = verifyBooks.filter(book => book.bookFile.hasCoverPage === true);
    console.log(`✅ Verification: ${withCoverFlag.length}/${verifyBooks.length} books now have hasCoverPage = true`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

fixCoverFlags();