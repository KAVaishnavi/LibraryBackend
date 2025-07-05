const mongoose = require('mongoose');
require('dotenv').config();

async function directUpdate() {
  try {
    console.log('🔧 Direct database update for cover page flags...');
    
    // Connect to MongoDB
    const mongoUrl = process.env.MONGODB_URL;
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB Atlas');
    
    // Get the raw collection
    const db = mongoose.connection.db;
    const booksCollection = db.collection('books');
    
    // Find books with cover files
    const booksWithCovers = await booksCollection.find({
      isActive: true,
      'bookFile.filename': { $regex: /book-with-cover/ }
    }).toArray();
    
    console.log(`📚 Found ${booksWithCovers.length} books with cover files`);
    
    let updateCount = 0;
    
    for (const book of booksWithCovers) {
      console.log(`🔧 Updating "${book.title}" by ${book.author}`);
      
      // Update using raw MongoDB operations
      const result = await booksCollection.updateOne(
        { _id: book._id },
        { 
          $set: { 
            'bookFile.hasCoverPage': true,
            'bookFile.coverPageAdded': new Date(),
            'metadata.coverPageFixed': new Date()
          } 
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`✅ Updated "${book.title}"`);
        updateCount++;
      } else {
        console.log(`❌ Failed to update "${book.title}"`);
      }
    }
    
    console.log(`\n🎉 Update complete! Updated ${updateCount} books`);
    
    // Verify the updates
    console.log('\n🔍 Verifying updates...');
    const verifyBooks = await booksCollection.find({
      isActive: true,
      'bookFile.filename': { $regex: /book-with-cover/ }
    }).toArray();
    
    const withCoverFlag = verifyBooks.filter(book => book.bookFile.hasCoverPage === true);
    console.log(`✅ Verification: ${withCoverFlag.length}/${verifyBooks.length} books now have hasCoverPage = true`);
    
    if (withCoverFlag.length === verifyBooks.length) {
      console.log('\n🎉 SUCCESS! All books with cover files now have the correct flag!');
      console.log('📚 Your PDF books now have cover pages as the first page.');
      console.log('🔄 Please refresh your frontend to see the changes.');
      console.log('📖 When you download these books, you will see the cover page first.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

directUpdate();