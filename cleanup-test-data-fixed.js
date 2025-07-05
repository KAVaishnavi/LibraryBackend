const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Script to remove test users and their uploaded books
async function cleanupTestData() {
  try {
    console.log('🧹 Starting cleanup of test data...\n');
    
    // Connect to MongoDB using the correct environment variable
    const mongoUri = process.env.MONGODB_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/library';
    console.log('🔗 Connecting to database...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database');
    
    // Import models
    const User = require('./src/models/user.model');
    const Book = require('./src/models/book.model');
    
    // Find all test users
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
    
    console.log(`📋 Found ${testUsers.length} test users:`);
    testUsers.forEach(user => {
      console.log(`   - ${user.name} (${user.email})`);
    });
    
    if (testUsers.length === 0) {
      console.log('✅ No test users found to clean up');
      await mongoose.disconnect();
      return;
    }
    
    // Get test user IDs
    const testUserIds = testUsers.map(user => user._id);
    
    // Find books uploaded by test users
    console.log('\n🔍 Finding books uploaded by test users...');
    const testBooks = await Book.find({
      uploadedBy: { $in: testUserIds }
    });
    
    console.log(`📚 Found ${testBooks.length} books uploaded by test users:`);
    testBooks.forEach(book => {
      console.log(`   - "${book.title}" by ${book.author}`);
    });
    
    // Collect cover files to delete
    const coverFilesToDelete = [];
    testBooks.forEach(book => {
      if (book.coverImage && book.coverImage.filename && book.coverImage.isGenerated) {
        coverFilesToDelete.push(book.coverImage.filename);
      }
    });
    
    console.log(`🖼️ Found ${coverFilesToDelete.length} generated cover files to delete`);
    
    // Delete books first
    if (testBooks.length > 0) {
      console.log('\n🗑️ Deleting test books...');
      const deleteResult = await Book.deleteMany({
        uploadedBy: { $in: testUserIds }
      });
      console.log(`✅ Deleted ${deleteResult.deletedCount} books`);
    }
    
    // Delete cover files
    if (coverFilesToDelete.length > 0) {
      console.log('\n🗑️ Deleting generated cover files...');
      const coversDir = path.join(__dirname, 'uploads/covers');
      
      let deletedCovers = 0;
      coverFilesToDelete.forEach(filename => {
        const filePath = path.join(coversDir, filename);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            console.log(`   ✅ Deleted: ${filename}`);
            deletedCovers++;
          } catch (error) {
            console.log(`   ❌ Failed to delete: ${filename} - ${error.message}`);
          }
        }
      });
      console.log(`✅ Deleted ${deletedCovers} cover files`);
    }
    
    // Delete test users
    console.log('\n🗑️ Deleting test users...');
    const userDeleteResult = await User.deleteMany({
      _id: { $in: testUserIds }
    });
    console.log(`✅ Deleted ${userDeleteResult.deletedCount} test users`);
    
    // Clean up any remaining test cover files
    console.log('\n🧹 Cleaning up remaining test cover files...');
    const coversDir = path.join(__dirname, 'uploads/covers');
    if (fs.existsSync(coversDir)) {
      const allCoverFiles = fs.readdirSync(coversDir);
      const testCoverFiles = allCoverFiles.filter(file => 
        file.includes('test-cover') || 
        file.includes('fallback-cover') ||
        file.includes('debug') ||
        file.includes('enhanced')
      );
      
      let cleanedFiles = 0;
      testCoverFiles.forEach(file => {
        const filePath = path.join(coversDir, file);
        try {
          fs.unlinkSync(filePath);
          console.log(`   ✅ Cleaned: ${file}`);
          cleanedFiles++;
        } catch (error) {
          console.log(`   ❌ Failed to clean: ${file} - ${error.message}`);
        }
      });
      
      if (cleanedFiles > 0) {
        console.log(`✅ Cleaned up ${cleanedFiles} additional test cover files`);
      } else {
        console.log('✅ No additional test cover files to clean');
      }
    }
    
    // Show final status
    console.log('\n📊 Cleanup Summary:');
    console.log('==================');
    console.log(`✅ Test users deleted: ${userDeleteResult.deletedCount}`);
    console.log(`✅ Test books deleted: ${testBooks.length}`);
    console.log(`✅ Cover files deleted: ${coverFilesToDelete.length}`);
    
    // Show remaining data
    const remainingUsers = await User.countDocuments();
    const remainingBooks = await Book.countDocuments({ isActive: true });
    
    console.log('\n📈 Remaining Data:');
    console.log('=================');
    console.log(`👥 Users: ${remainingUsers}`);
    console.log(`📚 Books: ${remainingBooks}`);
    
    // Check remaining covers
    const coversDir = path.join(__dirname, 'uploads/covers');
    if (fs.existsSync(coversDir)) {
      const remainingCovers = fs.readdirSync(coversDir);
      console.log(`🖼️ Cover files: ${remainingCovers.length}`);
      
      if (remainingCovers.length > 0) {
        console.log('\nRemaining cover files:');
        remainingCovers.forEach(file => {
          console.log(`   - ${file}`);
        });
      }
    }
    
    console.log('\n✅ Cleanup completed successfully!');
    console.log('🚀 Your database is now clean and ready for real use.');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
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