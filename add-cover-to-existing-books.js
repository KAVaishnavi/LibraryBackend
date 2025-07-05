const mongoose = require('mongoose');
const Book = require('./src/models/book.model');
const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Function to create PDF cover page
const createPDFCoverPage = async (title, author) => {
  try {
    console.log('📄 Creating PDF cover page for:', title, 'by', author);
    
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    
    const { width, height } = page.getSize();
    
    // Add gradient background
    const gradientSteps = 50;
    for (let i = 0; i < gradientSteps; i++) {
      const opacity = 0.8 - (i / gradientSteps) * 0.3;
      const color1 = { r: 0.4, g: 0.49, b: 0.92 }; // #667eea
      const color2 = { r: 0.46, g: 0.29, b: 0.64 }; // #764ba2
      
      const ratio = i / gradientSteps;
      const r = color1.r + (color2.r - color1.r) * ratio;
      const g = color1.g + (color2.g - color1.g) * ratio;
      const b = color1.b + (color2.b - color1.b) * ratio;
      
      page.drawRectangle({
        x: 0,
        y: height - (i + 1) * (height / gradientSteps),
        width: width,
        height: height / gradientSteps,
        color: rgb(r, g, b),
        opacity: opacity,
      });
    }
    
    // Add border
    page.drawRectangle({
      x: 30,
      y: 30,
      width: width - 60,
      height: height - 60,
      borderColor: rgb(1, 1, 1),
      borderWidth: 2,
      borderOpacity: 0.3,
    });
    
    // Add book icon
    page.drawRectangle({
      x: width/2 - 50,
      y: height - 200,
      width: 100,
      height: 80,
      color: rgb(1, 1, 1),
      opacity: 0.9,
    });
    
    page.drawRectangle({
      x: width/2 - 40,
      y: height - 190,
      width: 80,
      height: 60,
      borderColor: rgb(0.4, 0.49, 0.92),
      borderWidth: 2,
    });
    
    // Add lines inside book icon
    for (let i = 0; i < 3; i++) {
      page.drawLine({
        start: { x: width/2 - 30, y: height - 175 - (i * 10) },
        end: { x: width/2 + 30, y: height - 175 - (i * 10) },
        thickness: 1.5,
        color: rgb(0.4, 0.49, 0.92),
      });
    }
    
    // Add title
    const titleText = title.length > 25 ? title.substring(0, 25) + '...' : title;
    page.drawText(titleText, {
      x: width/2 - (titleText.length * 8),
      y: height - 280,
      size: 28,
      color: rgb(1, 1, 1),
    });
    
    // Add author
    const authorText = `by ${author.length > 30 ? author.substring(0, 30) + '...' : author}`;
    page.drawText(authorText, {
      x: width/2 - (authorText.length * 6),
      y: height - 340,
      size: 20,
      color: rgb(1, 1, 1),
    });
    
    // Add decorative elements
    page.drawCircle({
      x: 150,
      y: 240,
      size: 4,
      color: rgb(1, 1, 1),
      opacity: 0.6,
    });
    
    page.drawCircle({
      x: 450,
      y: 190,
      size: 3,
      color: rgb(1, 1, 1),
      opacity: 0.5,
    });
    
    // Add bottom text
    page.drawText('Digital Library', {
      x: width/2 - 60,
      y: 50,
      size: 14,
      color: rgb(1, 1, 1),
      opacity: 0.7,
    });
    
    const pdfBytes = await pdfDoc.save();
    return { success: true, pdfBytes: pdfBytes };
    
  } catch (error) {
    console.error('❌ Error creating PDF cover page:', error);
    return { success: false, error: error.message };
  }
};

// Function to combine cover page with book PDF
const combinePDFWithCover = async (bookPath, title, author) => {
  try {
    console.log('📚 Combining PDF with cover page...');
    
    // Create cover page
    const coverResult = await createPDFCoverPage(title, author);
    if (!coverResult.success) {
      throw new Error('Failed to create cover page: ' + coverResult.error);
    }
    
    // Read the original book PDF
    const bookPdfBytes = fs.readFileSync(bookPath);
    
    // Create new PDF document for the combined result
    const combinedPdf = await PDFDocument.create();
    
    // Load cover page PDF
    const coverPdf = await PDFDocument.load(coverResult.pdfBytes);
    const coverPages = await combinedPdf.copyPages(coverPdf, [0]);
    
    // Add cover page first
    combinedPdf.addPage(coverPages[0]);
    
    // Load original book PDF
    const bookPdf = await PDFDocument.load(bookPdfBytes);
    const bookPageCount = bookPdf.getPageCount();
    const bookPages = await combinedPdf.copyPages(bookPdf, Array.from({ length: bookPageCount }, (_, i) => i));
    
    // Add all book pages
    bookPages.forEach(page => combinedPdf.addPage(page));
    
    // Save combined PDF
    const combinedPdfBytes = await combinedPdf.save();
    
    // Generate filename for combined PDF
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const combinedFilename = `book-with-cover-${timestamp}-${randomId}.pdf`;
    const combinedPath = path.join(path.dirname(bookPath), combinedFilename);
    
    // Write combined PDF to file
    fs.writeFileSync(combinedPath, combinedPdfBytes);
    
    console.log('✅ PDF combined with cover successfully!');
    
    return {
      success: true,
      filename: combinedFilename,
      path: combinedPath,
      size: combinedPdfBytes.length
    };
    
  } catch (error) {
    console.error('❌ Error combining PDF with cover:', error);
    return { success: false, error: error.message };
  }
};

async function addCoverToExistingBooks() {
  try {
    console.log('🚀 Starting to add cover pages to existing books...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/library');
    console.log('✅ Connected to MongoDB');
    
    // Find all PDF books that don't have cover pages
    const pdfBooks = await Book.find({
      isActive: true,
      'bookFile.mimeType': { $regex: /pdf/i },
      $or: [
        { 'bookFile.hasCoverPage': { $exists: false } },
        { 'bookFile.hasCoverPage': false }
      ]
    });
    
    console.log(`📚 Found ${pdfBooks.length} PDF books without cover pages`);
    
    if (pdfBooks.length === 0) {
      console.log('🎉 All PDF books already have cover pages!');
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < pdfBooks.length; i++) {
      const book = pdfBooks[i];
      console.log(`\n📖 Processing book ${i + 1}/${pdfBooks.length}: "${book.title}" by ${book.author}`);
      
      try {
        // Check if original file exists
        const originalPath = path.join(__dirname, 'uploads/books', book.bookFile.filename);
        
        if (!fs.existsSync(originalPath)) {
          console.log(`❌ Original file not found: ${originalPath}`);
          errorCount++;
          continue;
        }
        
        // Combine PDF with cover
        const combineResult = await combinePDFWithCover(originalPath, book.title, book.author);
        
        if (combineResult.success) {
          // Update book record
          await Book.findByIdAndUpdate(book._id, {
            $set: {
              'bookFile.url': `/uploads/books/${combineResult.filename}`,
              'bookFile.filename': combineResult.filename,
              'bookFile.size': combineResult.size,
              'bookFile.hasCoverPage': true,
              'bookFile.originalFilename': book.bookFile.filename,
              'metadata.originalFile': {
                filename: book.bookFile.filename,
                size: book.bookFile.size
              },
              'metadata.coverPageAdded': new Date(),
              'metadata.coverPageVersion': '1.0'
            }
          });
          
          console.log(`✅ Successfully added cover page to "${book.title}"`);
          successCount++;
        } else {
          console.log(`❌ Failed to add cover page to "${book.title}": ${combineResult.error}`);
          errorCount++;
        }
        
      } catch (error) {
        console.error(`❌ Error processing "${book.title}":`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n🎉 Processing complete!`);
    console.log(`✅ Successfully processed: ${successCount} books`);
    console.log(`❌ Errors: ${errorCount} books`);
    
    if (successCount > 0) {
      console.log(`\n📚 ${successCount} books now have cover pages as the first page!`);
      console.log(`🔄 You may need to refresh your frontend to see the changes.`);
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the script
addCoverToExistingBooks();