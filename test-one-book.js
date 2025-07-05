const mongoose = require('mongoose');
const Book = require('./src/models/book.model');
require('dotenv').config();

async function testOneBook() {
  try {
    console.log('🧪 Testing one book update...');
    
    // Connect to MongoDB
    const mongoUrl = process.env.MONGODB_URL;
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB Atlas');
    
    // Get one book with cover file
    const book = await Book.findOne({
      isActive: true,
      'bookFile.filename': { $regex: /book-with-cover/ }
    });
    
    if (!book) {
      console.log('❌ No book found');
      return;
    }
    
    console.log(`📖 Testing with: "${book.title}" by ${book.author}`);
    console.log('📊 Current bookFile structure:', JSON.stringify(book.bookFile, null, 2));
    
    // Try different update approaches
    console.log('\n🔧 Approach 1: Direct field update');
    try {
      await Book.updateOne(
        { _id: book._id },
        { 
          $set: { 
            'bookFile.hasCoverPage': true,
            'bookFile.testField': 'test123'
          } 
        }
      );
      console.log('✅ Update query executed');
      
      // Check if it worked
      const updated1 = await Book.findById(book._id);
      console.log('📊 After update 1:', {
        hasCoverPage: updated1.bookFile.hasCoverPage,
        testField: updated1.bookFile.testField
      });
    } catch (error) {
      console.log('❌ Approach 1 failed:', error.message);
    }
    
    console.log('\n🔧 Approach 2: Full bookFile replacement');
    try {
      const newBookFile = {
        ...book.bookFile.toObject(),
        hasCoverPage: true,
        testField2: 'test456'
      };
      
      await Book.updateOne(
        { _id: book._id },
        { $set: { bookFile: newBookFile } }
      );
      console.log('✅ Full replacement executed');
      
      // Check if it worked
      const updated2 = await Book.findById(book._id);
      console.log('📊 After update 2:', {
        hasCoverPage: updated2.bookFile.hasCoverPage,
        testField2: updated2.bookFile.testField2
      });
    } catch (error) {
      console.log('❌ Approach 2 failed:', error.message);
    }
    
    console.log('\n🔧 Approach 3: Document save');
    try {
      const bookToSave = await Book.findById(book._id);
      bookToSave.bookFile.hasCoverPage = true;
      bookToSave.bookFile.testField3 = 'test789';
      await bookToSave.save();
      console.log('✅ Document save executed');
      
      // Check if it worked
      const updated3 = await Book.findById(book._id);
      console.log('📊 After update 3:', {
        hasCoverPage: updated3.bookFile.hasCoverPage,
        testField3: updated3.bookFile.testField3
      });
    } catch (error) {
      console.log('❌ Approach 3 failed:', error.message);
    }
    
    // Final check
    console.log('\n🔍 Final verification...');
    const finalBook = await Book.findById(book._id);
    console.log('📊 Final bookFile structure:', JSON.stringify(finalBook.bookFile, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

testOneBook();