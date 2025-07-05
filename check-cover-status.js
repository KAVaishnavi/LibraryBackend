const mongoose = require('mongoose');
const Book = require('./src/models/book.model');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function checkCoverStatus() {
  try {
    console.log('🔍 Checking cover page status...');
    
    // Connect to MongoDB
    const mongoUrl = process.env.MONGODB_URL || 'mongodb+srv://kavaishnavi2020:books@cluster0.dkjy6hl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB Atlas');
    
    // Get all books
    const allBooks = await Book.find({ isActive: true }).sort({ createdAt: -1 });
    console.log(`📚 Found ${allBooks.length} active books`);
    
    console.log('\n📋 Book Status Report:');
    console.log('='.repeat(80));
    
    let pdfCount = 0;
    let withCoverCount = 0;
    let withoutCoverCount = 0;
    
    for (let i = 0; i < allBooks.length; i++) {
      const book = allBooks[i];
      const isPdf = book.bookFile?.mimeType?.includes('pdf');
      const hasCoverPage = book.bookFile?.hasCoverPage === true;
      
      if (isPdf) {
        pdfCount++;
        if (hasCoverPage) {
          withCoverCount++;
        } else {
          withoutCoverCount++;
        }
      }
      
      console.log(`${i + 1}. "${book.title}" by ${book.author}`);
      console.log(`   📁 File: ${book.bookFile?.filename || 'No file'}`);
      console.log(`   📄 Type: ${book.bookFile?.mimeType || 'Unknown'}`);
      console.log(`   🎨 Has Cover Page: ${hasCoverPage ? '✅ YES' : '❌ NO'}`);
      console.log(`   📏 Size: ${book.bookFile?.size ? (book.bookFile.size / 1024).toFixed(2) + ' KB' : 'Unknown'}`);
      console.log(`   🔗 URL: ${book.bookFile?.url || 'No URL'}`);
      
      // Check if file exists on disk
      if (book.bookFile?.filename) {
        const filePath = path.join(__dirname, 'uploads/books', book.bookFile.filename);
        const fileExists = fs.existsSync(filePath);
        console.log(`   💾 File on disk: ${fileExists ? '✅ EXISTS' : '❌ MISSING'}`);
        
        if (fileExists) {
          const stats = fs.statSync(filePath);
          console.log(`   📊 Actual file size: ${(stats.size / 1024).toFixed(2)} KB`);
        }
      }
      
      console.log('   ' + '-'.repeat(60));
    }
    
    console.log('\n��� Summary:');
    console.log(`📚 Total books: ${allBooks.length}`);
    console.log(`📄 PDF books: ${pdfCount}`);
    console.log(`✅ PDFs with cover pages: ${withCoverCount}`);
    console.log(`❌ PDFs without cover pages: ${withoutCoverCount}`);
    
    // Check uploads directory
    console.log('\n📂 Checking uploads directory...');
    const uploadsDir = path.join(__dirname, 'uploads/books');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      console.log(`📁 Files in uploads/books: ${files.length}`);
      
      const coverFiles = files.filter(file => file.includes('book-with-cover'));
      console.log(`🎨 Cover files found: ${coverFiles.length}`);
      
      if (coverFiles.length > 0) {
        console.log('\n🎨 Recent cover files:');
        coverFiles.slice(-5).forEach(file => {
          const filePath = path.join(uploadsDir, file);
          const stats = fs.statSync(filePath);
          console.log(`   📄 ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
        });
      }
    } else {
      console.log('❌ Uploads directory not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

checkCoverStatus();