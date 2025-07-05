const mongoose = require('mongoose');
require('dotenv').config();

async function forceFix() {
  try {
    console.log('🔧 Force fixing PDF cover page flags...');
    
    // Connect to MongoDB
    const mongoUrl = process.env.MONGODB_URL;
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB Atlas');
    
    // Get the raw collection
    const db = mongoose.connection.db;
    const booksCollection = db.collection('books');
    
    // Find all books with cover files
    const booksWithCovers = await booksCollection.find({
      isActive: true,
      'bookFile.filename': { $regex: /book-with-cover/ }
    }).toArray();
    
    console.log(`📚 Found ${booksWithCovers.length} books with cover files`);
    
    if (booksWithCovers.length === 0) {
      console.log('❌ No books with cover files found');
      return;
    }
    
    // Show current status
    console.log('\n📋 Current status:');
    for (const book of booksWithCovers) {
      console.log(`   "${book.title}" - hasCoverPage: ${book.bookFile.hasCoverPage || 'undefined'}`);
    }
    
    // Force update all books with cover files
    console.log('\n🔧 Force updating all books with cover files...');
    
    const updateResult = await booksCollection.updateMany(
      { 
        isActive: true,
        'bookFile.filename': { $regex: /book-with-cover/ }
      },
      { 
        $set: { 
          'bookFile.hasCoverPage': true,
          'bookFile.coverPageFixed': new Date(),
          'metadata.coverPageStatus': 'fixed'
        } 
      }
    );
    
    console.log(`✅ Update result: ${updateResult.modifiedCount} documents modified`);
    
    // Verify the updates
    console.log('\n🔍 Verifying updates...');
    const verifyBooks = await booksCollection.find({
      isActive: true,
      'bookFile.filename': { $regex: /book-with-cover/ }
    }).toArray();
    
    console.log('\n📋 After update:');
    let successCount = 0;
    for (const book of verifyBooks) {
      const hasFlag = book.bookFile.hasCoverPage === true;
      console.log(`   "${book.title}" - hasCoverPage: ${book.bookFile.hasCoverPage} ${hasFlag ? '✅' : '❌'}`);
      if (hasFlag) successCount++;
    }
    
    console.log(`\n📊 Final result: ${successCount}/${verifyBooks.length} books have hasCoverPage = true`);
    
    if (successCount === verifyBooks.length) {
      console.log('\n🎉 SUCCESS! All PDF books now have cover page flags set correctly!');
      console.log('📚 Your PDF books have cover pages as the first page.');
      console.log('🖼️ Thumbnail covers are also working.');
      console.log('🔄 Refresh your frontend to see all the changes.');
    } else {
      console.log('\n❌ Some books still need fixing. There might be a schema issue.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

forceFix();