const mongoose = require('mongoose');
const Book = require('./src/models/book.model');
require('dotenv').config();

async function checkCurrentBooks() {
  try {
    console.log('📚 Checking current books in database...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('✅ Connected to MongoDB');
    
    // Get recent books
    const books = await Book.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title author genre metadata createdAt');
    
    console.log(`\n📖 Found ${books.length} recent books:\n`);
    
    books.forEach((book, index) => {
      console.log(`${index + 1}. "${book.title}" by ${book.author}`);
      console.log(`   📚 Genre: ${book.genre}`);
      console.log(`   🧠 Smart Extraction: ${book.metadata?.smartExtraction ? 'Yes' : 'No'}`);
      console.log(`   🎯 Confidence: ${book.metadata?.extractionConfidence || 0}%`);
      console.log(`   📅 Created: ${book.createdAt.toLocaleDateString()}`);
      console.log('');
    });
    
    // Check for fake data patterns
    const fakeDataBooks = await Book.find({
      $or: [
        { author: /obooko-fan/i },
        { author: /fake/i },
        { author: /test/i },
        { title: /test/i }
      ],
      isActive: true
    }).countDocuments();
    
    console.log(`🔍 Books with potential fake data: ${fakeDataBooks}`);
    
    // Check smart extraction usage
    const smartBooks = await Book.find({
      'metadata.smartExtraction': true,
      isActive: true
    }).countDocuments();
    
    const totalBooks = await Book.find({ isActive: true }).countDocuments();
    
    console.log(`\n📊 Smart Extraction Statistics:`);
    console.log(`   📚 Total active books: ${totalBooks}`);
    console.log(`   🧠 Books with smart extraction: ${smartBooks}`);
    console.log(`   📈 Smart extraction usage: ${totalBooks > 0 ? Math.round((smartBooks / totalBooks) * 100) : 0}%`);
    
    if (smartBooks > 0) {
      console.log('\n✅ SMART METADATA EXTRACTION IS WORKING!');
      console.log('   Real author and title data is being extracted automatically');
    } else {
      console.log('\n⚠️ No books found with smart extraction metadata');
      console.log('   This might be because books were uploaded before the smart system was implemented');
    }
    
  } catch (error) {
    console.error('❌ Error checking books:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkCurrentBooks();