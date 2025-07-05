const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Simple cleanup script for test data
async function cleanupTestData() {
  try {
    console.log('🧹 Starting cleanup of test data...\n');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/library';
    console.log('🔗 Connecting to database...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database');
    
    // Import models
    const User = require('./src/models/user.model');
    const Book = require('./src/models/book.model');
    
    // Find test users
    console.log('🔍 Finding test users...');
    const testUsers = await User.find({
      $or: [
        { name: { $regex: /test.*user/i } },
        { name: { $regex: /debug.*user/i } },
        { name: { $regex: /enhanced.*user/i } },
        { email: { $regex: /test\d+@example\.com/i } },
        { email: { $regex: /debug\d+@example\.com/i } },
        { email: { $regex: /enhanced\d+@example\.com/i } }
      ]
    });
    
    console.log(`📋 Found ${testUsers.length} test users to delete`);
    
    if (testUsers.length === 0) {
      console.log('✅ No test users found');
      await mongoose.disconnect();
      return;
    }
    
    // Show users to be deleted
    testUsers.forEach(user => {
      console.log(`   - ${user.name} (${user.email})`);
    });
    
    const testUserIds = testUsers.map(user => user._id);
    
    // Find and delete books by test users
    console.log('\n🔍 Finding books by test users...');
    const testBooks = await Book.find({ uploadedBy: { $in: testUserIds } });
    console.log(`📚 Found ${testBooks.length} books to delete`);
    
    if (testBooks.length > 0) {
      console.log('\n🗑️ Deleting books...');
      await Book.deleteMany({ uploadedBy: { $in: testUserIds } });
      console.log('✅ Books deleted');
    }
    
    // Delete test users
    console.log('\n🗑️ Deleting test users...');
    await User.deleteMany({ _id: { $in: testUserIds } });
    console.log('✅ Test users deleted');
    
    // Clean up test cover files
    console.log('\n🧹 Cleaning up test cover files...');
    const coversDir = path.join(__dirname, 'uploads/covers');
    
    if (fs.existsSync(coversDir)) {
      const coverFiles = fs.readdirSync(coversDir);
      const testCoverFiles = coverFiles.filter(file => 
        file.includes('test-cover') || 
        file.includes('fallback-cover') ||
        file.includes('debug') ||
        file.includes('enhanced')
      );
      
      console.log(`🖼️ Found ${testCoverFiles.length} test cover files to delete`);
      
      let deletedCount = 0;
      testCoverFiles.forEach(file => {
        try {
          const filePath = path.join(coversDir, file);
          fs.unlinkSync(filePath);
          console.log(`   ✅ Deleted: ${file}`);
          deletedCount++;
        } catch (error) {
          console.log(`   ❌ Failed to delete: ${file}`);
        }
      });
      
      console.log(`✅ Deleted ${deletedCount} cover files`);
    }
    
    // Show final status
    const remainingUsers = await User.countDocuments();
    const remainingBooks = await Book.countDocuments({ isActive: true });
    
    console.log('\n📊 Final Status:');
    console.log('===============');
    console.log(`👥 Remaining users: ${remainingUsers}`);
    console.log(`📚 Remaining books: ${remainingBooks}`);
    
    const remainingCovers = fs.existsSync(coversDir) ? fs.readdirSync(coversDir).length : 0;
    console.log(`🖼️ Remaining covers: ${remainingCovers}`);
    
    console.log('\n✅ Cleanup completed successfully!');
    console.log('🚀 Database is now clean and ready for real use.');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from database');
  }
}

// Run cleanup
if (require.main === module) {
  cleanupTestData().catch(console.error);
}

module.exports = { cleanupTestData };