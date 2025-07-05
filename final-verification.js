const mongoose = require('mongoose');
const Book = require('./src/models/book.model');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function finalVerification() {
  try {
    console.log('🔍 Final verification of cover pages and images...');
    
    // Connect to MongoDB
    const mongoUrl = process.env.MONGODB_URL;
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB Atlas');
    
    // Get all books
    const allBooks = await Book.find({ isActive: true }).sort({ createdAt: -1 });
    console.log(`📚 Found ${allBooks.length} active books`);
    
    console.log('\n📋 Complete Status Report:');
    console.log('='.repeat(100));
    
    let pdfWithCoverCount = 0;
    let booksWithThumbnailCount = 0;
    let missingThumbnails = [];
    let missingPdfCovers = [];
    
    for (let i = 0; i < allBooks.length; i++) {
      const book = allBooks[i];
      const isPdf = book.bookFile?.mimeType?.includes('pdf');
      const hasPdfCoverPage = book.bookFile?.hasCoverPage === true;
      const hasThumbnail = book.coverImage && book.coverImage.filename;
      
      console.log(`\n${i + 1}. "${book.title}" by ${book.author}`);
      console.log(`   📄 Type: ${book.bookFile?.mimeType || 'No file'}`);
      
      if (isPdf) {
        console.log(`   📚 PDF Cover Page: ${hasPdfCoverPage ? '✅ YES' : '❌ NO'}`);
        if (hasPdfCoverPage) {
          pdfWithCoverCount++;
          console.log(`   📁 PDF File: ${book.bookFile.filename}`);
          
          // Check if PDF file exists
          const pdfPath = path.join(__dirname, 'uploads/books', book.bookFile.filename);
          const pdfExists = fs.existsSync(pdfPath);
          console.log(`   💾 PDF on disk: ${pdfExists ? '✅ EXISTS' : '❌ MISSING'}`);
        } else {
          missingPdfCovers.push(book.title);
        }
      }
      
      console.log(`   🖼️ Thumbnail Cover: ${hasThumbnail ? '✅ YES' : '❌ NO'}`);
      if (hasThumbnail) {
        booksWithThumbnailCount++;
        console.log(`   🎨 Cover File: ${book.coverImage.filename}`);
        console.log(`   🔗 Cover URL: ${book.coverImage.url}`);
        
        // Check if cover file exists
        const coverPath = path.join(__dirname, 'uploads/covers', book.coverImage.filename);
        const coverExists = fs.existsSync(coverPath);
        console.log(`   💾 Cover on disk: ${coverExists ? '✅ EXISTS' : '❌ MISSING'}`);
        
        if (!coverExists) {
          missingThumbnails.push({
            title: book.title,
            filename: book.coverImage.filename
          });
        }
      } else {
        missingThumbnails.push({
          title: book.title,
          filename: 'No cover assigned'
        });
      }
      
      console.log('   ' + '-'.repeat(80));
    }
    
    console.log('\n📊 FINAL SUMMARY:');
    console.log('='.repeat(50));
    console.log(`📚 Total books: ${allBooks.length}`);
    console.log(`📄 PDF books with cover pages: ${pdfWithCoverCount}`);
    console.log(`🖼️ Books with thumbnail covers: ${booksWithThumbnailCount}`);
    console.log(`❌ Missing PDF covers: ${missingPdfCovers.length}`);
    console.log(`❌ Missing thumbnails: ${missingThumbnails.length}`);
    
    if (missingPdfCovers.length > 0) {
      console.log('\n❌ Books missing PDF cover pages:');
      missingPdfCovers.forEach(title => console.log(`   - ${title}`));
    }
    
    if (missingThumbnails.length > 0) {
      console.log('\n❌ Books missing thumbnail covers:');
      missingThumbnails.forEach(item => console.log(`   - ${item.title} (${item.filename})`));
    }
    
    // Check uploads directories
    console.log('\n📂 Directory Status:');
    const booksDir = path.join(__dirname, 'uploads/books');
    const coversDir = path.join(__dirname, 'uploads/covers');
    
    if (fs.existsSync(booksDir)) {
      const bookFiles = fs.readdirSync(booksDir);
      const coverFiles = bookFiles.filter(file => file.includes('book-with-cover'));
      console.log(`📁 Books directory: ${bookFiles.length} files (${coverFiles.length} with covers)`);
    }
    
    if (fs.existsSync(coversDir)) {
      const coverFiles = fs.readdirSync(coversDir);
      console.log(`🎨 Covers directory: ${coverFiles.length} files`);
    }
    
    // Success message
    if (pdfWithCoverCount > 0 && booksWithThumbnailCount > 0) {
      console.log('\n🎉 SUCCESS! Your library now has:');
      console.log(`✅ ${pdfWithCoverCount} PDF books with cover pages as first page`);
      console.log(`✅ ${booksWithThumbnailCount} books with thumbnail covers for display`);
      console.log('\n📱 Frontend should now show:');
      console.log('   - Beautiful cover thumbnails in the book list');
      console.log('   - PDF downloads with cover page as first page');
      console.log('   - Professional book presentation');
      console.log('\n🔄 If you still see 404 errors, try:');
      console.log('   1. Refresh your browser (Ctrl+F5)');
      console.log('   2. Clear browser cache');
      console.log('   3. Check if server is running on port 5000');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

finalVerification();