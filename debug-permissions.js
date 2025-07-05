const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/library', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Book = require('./src/models/book.model');
const User = require('./src/models/user.model');

async function debugUserPermissions() {
  try {
    console.log('🔍 Debugging User Permissions\n');

    // Get all users
    const users = await User.find({}).select('_id name email');
    console.log('👥 Users in database:');
    users.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - ID: ${user._id}`);
    });

    // Get all books
    const books = await Book.find({ isActive: true }).populate('uploadedBy', 'name email');
    console.log(`\n📚 Books in database (${books.length} total):`);
    
    books.forEach(book => {
      console.log(`   - "${book.title}" by ${book.author}`);
      console.log(`     Uploaded by: ${book.uploadedBy?.name || 'Unknown'} (ID: ${book.uploadedBy?._id})`);
      console.log(`     Book ID: ${book._id}`);
      console.log('');
    });

    // Check permissions for each user
    console.log('🔐 Permission Analysis:');
    for (const user of users) {
      const userBooks = books.filter(book => 
        book.uploadedBy && book.uploadedBy._id.toString() === user._id.toString()
      );
      
      console.log(`\n   User: ${user.name}`);
      console.log(`   Can delete ${userBooks.length} books:`);
      userBooks.forEach(book => {
        console.log(`     ✅ "${book.title}"`);
      });
      
      if (userBooks.length === 0) {
        console.log(`     ❌ No books to delete`);
      }
    }

    // Test specific user ID comparison
    if (users.length > 0 && books.length > 0) {
      const testUser = users[0];
      const testBook = books[0];
      
      console.log('\n🧪 Testing ID Comparison:');
      console.log(`   Test User ID: ${testUser._id} (type: ${typeof testUser._id})`);
      console.log(`   Test Book Uploader ID: ${testBook.uploadedBy?._id} (type: ${typeof testBook.uploadedBy?._id})`);
      console.log(`   String comparison: ${testUser._id.toString()} === ${testBook.uploadedBy?._id.toString()}`);
      console.log(`   Result: ${testUser._id.toString() === testBook.uploadedBy?._id.toString()}`);
    }

    console.log('\n✅ Debug complete');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

debugUserPermissions();