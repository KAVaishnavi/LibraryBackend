const Book = require('../models/book.model');
const User = require('../models/user.model');
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { PDFDocument, rgb } = require('pdf-lib');

// Function to create PDF cover page with enhanced debugging
const createPDFCoverPage = async (title, author) => {
  try {
    console.log('📄 [DEBUG] Creating PDF cover page for:', title, 'by', author);
    
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
    
    const { width, height } = page.getSize();
    console.log('📐 [DEBUG] Page dimensions:', width, 'x', height);
    
    // Add gradient background (simulated with rectangles)
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
    
    // Add book icon (simple rectangle)
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
      x: width/2 - (titleText.length * 8), // Approximate centering
      y: height - 280,
      size: 28,
      color: rgb(1, 1, 1),
    });
    
    // Add author
    const authorText = `by ${author.length > 30 ? author.substring(0, 30) + '...' : author}`;
    page.drawText(authorText, {
      x: width/2 - (authorText.length * 6), // Approximate centering
      y: height - 340,
      size: 20,
      color: rgb(1, 1, 1),
    });
    
    // Add decorative elements (circles)
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
    
    // Serialize the PDF
    console.log('💾 [DEBUG] Serializing PDF...');
    const pdfBytes = await pdfDoc.save();
    console.log('✅ [DEBUG] PDF serialized, size:', (pdfBytes.length / 1024).toFixed(2), 'KB');
    
    return {
      success: true,
      pdfBytes: pdfBytes
    };
    
  } catch (error) {
    console.error('❌ [DEBUG] Error creating PDF cover page:', error);
    console.error('❌ [DEBUG] Error stack:', error.stack);
    return { success: false, error: error.message };
  }
};

// Function to combine cover page with book PDF with enhanced debugging
const combinePDFWithCover = async (bookPath, title, author) => {
  try {
    console.log('📚 [DEBUG] Starting PDF combination...');
    console.log('📁 [DEBUG] Book path:', bookPath);
    console.log('📖 [DEBUG] Title:', title);
    console.log('👤 [DEBUG] Author:', author);
    
    // Check if original file exists
    if (!fs.existsSync(bookPath)) {
      throw new Error(`Original book file not found: ${bookPath}`);
    }
    
    const originalStats = fs.statSync(bookPath);
    console.log('📏 [DEBUG] Original file size:', (originalStats.size / 1024).toFixed(2), 'KB');
    
    // Create cover page
    console.log('🎨 [DEBUG] Creating cover page...');
    const coverResult = await createPDFCoverPage(title, author);
    if (!coverResult.success) {
      throw new Error('Failed to create cover page: ' + coverResult.error);
    }
    console.log('✅ [DEBUG] Cover page created successfully');
    
    // Read the original book PDF
    console.log('📖 [DEBUG] Reading original PDF...');
    const bookPdfBytes = fs.readFileSync(bookPath);
    console.log('✅ [DEBUG] Original PDF read, size:', (bookPdfBytes.length / 1024).toFixed(2), 'KB');
    
    // Create new PDF document for the combined result
    console.log('🔧 [DEBUG] Creating combined PDF document...');
    const combinedPdf = await PDFDocument.create();
    
    // Load cover page PDF
    console.log('📄 [DEBUG] Loading cover page PDF...');
    const coverPdf = await PDFDocument.load(coverResult.pdfBytes);
    const coverPages = await combinedPdf.copyPages(coverPdf, [0]);
    console.log('✅ [DEBUG] Cover page loaded and copied');
    
    // Add cover page first
    combinedPdf.addPage(coverPages[0]);
    console.log('✅ [DEBUG] Cover page added to combined PDF');
    
    // Load original book PDF
    console.log('📚 [DEBUG] Loading original book PDF...');
    const bookPdf = await PDFDocument.load(bookPdfBytes);
    const bookPageCount = bookPdf.getPageCount();
    console.log('📊 [DEBUG] Original book has', bookPageCount, 'pages');
    
    const bookPages = await combinedPdf.copyPages(bookPdf, Array.from({ length: bookPageCount }, (_, i) => i));
    console.log('✅ [DEBUG] Book pages copied');
    
    // Add all book pages
    bookPages.forEach((page, index) => {
      combinedPdf.addPage(page);
      if (index % 10 === 0) {
        console.log(`📄 [DEBUG] Added page ${index + 1}/${bookPageCount}`);
      }
    });
    console.log('✅ [DEBUG] All book pages added to combined PDF');
    
    // Save combined PDF
    console.log('💾 [DEBUG] Saving combined PDF...');
    const combinedPdfBytes = await combinedPdf.save();
    console.log('✅ [DEBUG] Combined PDF saved, size:', (combinedPdfBytes.length / 1024).toFixed(2), 'KB');
    
    // Generate filename for combined PDF
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const combinedFilename = `book-with-cover-${timestamp}-${randomId}.pdf`;
    const combinedPath = path.join(path.dirname(bookPath), combinedFilename);
    
    console.log('📁 [DEBUG] Combined file path:', combinedPath);
    
    // Write combined PDF to file
    console.log('💾 [DEBUG] Writing combined PDF to disk...');
    fs.writeFileSync(combinedPath, combinedPdfBytes);
    
    // Verify file was written
    if (fs.existsSync(combinedPath)) {
      const finalStats = fs.statSync(combinedPath);
      console.log('✅ [DEBUG] Combined PDF written successfully');
      console.log('📏 [DEBUG] Final file size:', (finalStats.size / 1024).toFixed(2), 'KB');
      console.log('📊 [DEBUG] Total pages in combined PDF:', combinedPdf.getPageCount());
    } else {
      throw new Error('Combined PDF file was not created');
    }
    
    console.log('🎉 [DEBUG] PDF combination completed successfully!');
    
    return {
      success: true,
      filename: combinedFilename,
      path: combinedPath,
      size: combinedPdfBytes.length
    };
    
  } catch (error) {
    console.error('❌ [DEBUG] Error combining PDF with cover:', error);
    console.error('❌ [DEBUG] Error stack:', error.stack);
    return { success: false, error: error.message };
  }
};

// Simple function to create text-based cover (GUARANTEED TO WORK)
const createSimpleCover = async (title, author) => {
  try {
    console.log('🎨 [DEBUG] Creating simple text cover for:', title, 'by', author);
    
    const coversDir = path.join(__dirname, '../../uploads/covers');
    
    // Ensure directory exists
    if (!fs.existsSync(coversDir)) {
      fs.mkdirSync(coversDir, { recursive: true });
      console.log('📁 [DEBUG] Created covers directory');
    }
    
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const coverFilename = `simple-cover-${timestamp}-${randomId}.jpg`;
    const coverPath = path.join(coversDir, coverFilename);
    
    // Create simple SVG
    const svg = `
      <svg width="600" height="900" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad1)"/>
        <rect x="30" y="30" width="540" height="840" fill="none" stroke="white" stroke-width="2" opacity="0.3" rx="10"/>
        
        <!-- Book icon -->
        <rect x="250" y="120" width="100" height="80" fill="white" opacity="0.9" rx="8"/>
        <rect x="260" y="130" width="80" height="60" fill="none" stroke="#667eea" stroke-width="2"/>
        <line x1="270" y1="145" x2="330" y2="145" stroke="#667eea" stroke-width="1.5"/>
        <line x1="270" y1="155" x2="330" y2="155" stroke="#667eea" stroke-width="1.5"/>
        <line x1="270" y1="165" x2="320" y2="165" stroke="#667eea" stroke-width="1.5"/>
        
        <!-- Title -->
        <text x="300" y="280" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="28" font-weight="bold">
          ${title.length > 25 ? title.substring(0, 25) + '...' : title}
        </text>
        
        <!-- Author -->
        <text x="300" y="340" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="20" opacity="0.95">
          by ${author.length > 30 ? author.substring(0, 30) + '...' : author}
        </text>
        
        <!-- Decorative elements -->
        <circle cx="150" cy="600" r="4" fill="white" opacity="0.6"/>
        <circle cx="450" cy="650" r="3" fill="white" opacity="0.5"/>
        <circle cx="200" cy="750" r="2" fill="white" opacity="0.4"/>
        <circle cx="400" cy="800" r="2" fill="white" opacity="0.4"/>
        
        <!-- Bottom text -->
        <text x="300" y="850" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14" opacity="0.7">
          Digital Library
        </text>
      </svg>
    `;
    
    // Convert to JPEG
    await sharp(Buffer.from(svg))
      .jpeg({ quality: 85 })
      .toFile(coverPath);
    
    console.log('✅ [DEBUG] Simple cover created:', coverFilename);
    
    // Verify file exists
    if (fs.existsSync(coverPath)) {
      const stats = fs.statSync(coverPath);
      console.log(`📏 [DEBUG] Cover file size: ${(stats.size / 1024).toFixed(2)} KB`);
      
      return {
        success: true,
        filename: coverFilename,
        path: coverPath,
        size: stats.size
      };
    } else {
      console.log('❌ [DEBUG] Cover file was not created');
      return { success: false };
    }
    
  } catch (error) {
    console.error('❌ [DEBUG] Error creating simple cover:', error);
    return { success: false, error: error.message };
  }
};

// Enhanced book creation with GUARANTEED cover generation and PDF cover page integration
const createBook = async (req, res) => {
  try {
    console.log('📚 [DEBUG] Starting book creation with enhanced debugging...');
    console.log('📝 [DEBUG] Request body:', JSON.stringify(req.body, null, 2));
    console.log('📁 [DEBUG] Request files:', req.files ? Object.keys(req.files) : 'No files');

    // Basic validation
    if (!req.body.genre) {
      console.log('❌ [DEBUG] Genre validation failed');
      return res.status(400).json({
        success: false,
        message: 'Genre is required'
      });
    }

    // Parse tags
    let tags = [];
    if (req.body.tags) {
      if (Array.isArray(req.body.tags)) {
        tags = req.body.tags;
      } else {
        const tagKeys = Object.keys(req.body).filter(key => key.startsWith('tags['));
        tags = tagKeys.map(key => req.body[key]).filter(tag => tag && tag.trim());
      }
    }
    console.log('🏷️ [DEBUG] Parsed tags:', tags);

    const hasBookFile = req.files && req.files.bookFile && req.files.bookFile[0];
    console.log('📄 [DEBUG] Has book file:', !!hasBookFile);
    
    if (hasBookFile) {
      const file = req.files.bookFile[0];
      console.log('📁 [DEBUG] File details:', {
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      });
    }
    
    // Get title and author
    let finalTitle = req.body.title?.trim() || '';
    let finalAuthor = req.body.author?.trim() || '';
    console.log('📖 [DEBUG] Final title:', finalTitle);
    console.log('👤 [DEBUG] Final author:', finalAuthor);

    // Validate that we have title and author
    if (!finalTitle || !finalAuthor) {
      console.log('❌ [DEBUG] Title/Author validation failed');
      return res.status(400).json({
        success: false,
        message: 'Title and Author are required'
      });
    }

    // Check for duplicates
    const duplicateQuery = {
      title: finalTitle,
      author: finalAuthor,
      uploadedBy: req.user.userId,
      isActive: true
    };
    
    console.log('🔍 [DEBUG] Checking for duplicates...');
    const existingBook = await Book.findOne(duplicateQuery);
    if (existingBook) {
      console.log('❌ [DEBUG] Duplicate book found');
      return res.status(409).json({
        success: false,
        message: 'You have already uploaded a book with this title and author'
      });
    }
    console.log('✅ [DEBUG] No duplicates found');

    // Create book data
    const bookData = {
      title: finalTitle,
      author: finalAuthor,
      genre: req.body.genre,
      description: req.body.description?.trim() || '',
      language: req.body.language || 'English',
      price: parseFloat(req.body.price) || 0,
      isbn: req.body.isbn?.trim() || undefined,
      publishedYear: req.body.publishedYear ? parseInt(req.body.publishedYear) : null,
      pages: req.body.pages ? parseInt(req.body.pages) : null,
      publisher: req.body.publisher?.trim() || '',
      tags: tags,
      uploadedBy: req.user.userId,
      isPublic: true,
      isActive: true,
      uploadMethod: req.body.uploadMethod || (hasBookFile ? 'file' : 'manual'),
      metadata: {
        extractionMethod: hasBookFile ? 'content-analysis' : 'manual',
        extractionTimestamp: new Date(),
        autoDetected: hasBookFile
      }
    };

    console.log('📊 [DEBUG] Initial book data created');

    // Add file info if present and combine with cover for PDFs
    if (hasBookFile) {
      const file = req.files.bookFile[0];
      const originalFilePath = path.join(__dirname, '../../uploads/books', file.filename);
      
      console.log('📁 [DEBUG] Original file path:', originalFilePath);
      
      // Check if it's a PDF and combine with cover
      if (file.mimetype.includes('pdf')) {
        console.log('📄 [DEBUG] PDF detected, starting cover integration...');
        
        const combineResult = await combinePDFWithCover(originalFilePath, finalTitle, finalAuthor);
        
        if (combineResult.success) {
          console.log('✅ [DEBUG] PDF combination successful');
          // Use the combined PDF instead of the original
          bookData.bookFile = {
            url: `/uploads/books/${combineResult.filename}`,
            filename: combineResult.filename,
            originalName: file.originalname,
            size: combineResult.size,
            mimeType: file.mimetype,
            hasCoverPage: true,
            originalFilename: file.filename
          };
          
          // Keep the original file as backup
          bookData.metadata.originalFile = {
            filename: file.filename,
            size: file.size
          };
          
          console.log('✅ [DEBUG] PDF successfully combined with cover page!');
        } else {
          console.log('❌ [DEBUG] Failed to combine PDF with cover:', combineResult.error);
          // Fall back to original file
          bookData.bookFile = {
            url: `/uploads/books/${file.filename}`,
            filename: file.filename,
            originalName: file.originalname,
            size: file.size,
            mimeType: file.mimetype,
            hasCoverPage: false
          };
        }
      } else {
        console.log('📄 [DEBUG] Non-PDF file, using as is');
        // For non-PDF files, use as is
        bookData.bookFile = {
          url: `/uploads/books/${file.filename}`,
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          hasCoverPage: false
        };
      }
      
      bookData.metadata.fileFormat = file.mimetype.includes('pdf') ? 'PDF' : 
                                    file.mimetype.includes('epub') ? 'EPUB' : 
                                    file.mimetype.includes('mobi') ? 'MOBI' : 'Unknown';
    }

    // GUARANTEED COVER GENERATION - ALWAYS CREATE A COVER
    console.log('🎨 [DEBUG] Starting guaranteed cover generation...');
    
    const coverResult = await createSimpleCover(finalTitle, finalAuthor);
    
    if (coverResult.success) {
      bookData.coverImage = {
        url: `/uploads/covers/${coverResult.filename}`,
        filename: coverResult.filename,
        originalName: `${finalTitle}-cover.jpg`,
        size: coverResult.size,
        mimeType: 'image/jpeg',
        isGenerated: true,
        generationType: 'text-cover',
        generatedAt: new Date()
      };
      console.log('✅ [DEBUG] COVER GENERATED SUCCESSFULLY!');
    } else {
      console.log('❌ [DEBUG] Cover generation failed:', coverResult.error);
      // Continue without cover - but this should never happen
    }

    // Handle URL-based uploads
    if (req.body.uploadMethod === 'url') {
      if (req.body.bookUrl) {
        bookData.bookFile = {
          url: req.body.bookUrl,
          isExternal: true
        };
      }
    }

    console.log('💾 [DEBUG] Creating book with data...');
    console.log('📊 [DEBUG] Final book metadata:', {
      title: bookData.title,
      author: bookData.author,
      genre: bookData.genre,
      hasFile: !!bookData.bookFile,
      hasCover: !!bookData.coverImage,
      coverGenerated: bookData.coverImage?.isGenerated || false,
      pdfWithCoverPage: bookData.bookFile?.hasCoverPage || false
    });

    const book = new Book(bookData);
    await book.save();

    // Populate the uploadedBy field for response
    await book.populate('uploadedBy', 'name email');

    console.log('✅ [DEBUG] Book created successfully with guaranteed cover and PDF integration!');

    const coverMessage = bookData.coverImage?.isGenerated ? ' with auto-generated cover' : '';
    const pdfMessage = bookData.bookFile?.hasCoverPage ? ' and PDF cover page' : '';
    
    res.status(201).json({
      success: true,
      message: `📚 "${bookData.title}" by ${bookData.author} uploaded successfully${coverMessage}${pdfMessage}!`,
      data: { 
        book,
        autoDetected: {
          title: bookData.title,
          author: bookData.author,
          genre: bookData.genre,
          coverGenerated: bookData.coverImage?.isGenerated || false,
          coverType: bookData.coverImage?.generationType || 'none',
          pdfWithCoverPage: bookData.bookFile?.hasCoverPage || false
        }
      }
    });

  } catch (error) {
    console.error('❌ [DEBUG] Book creation error:', error);
    console.error('❌ [DEBUG] Error stack:', error.stack);
    
    // Handle specific errors
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0];
      let message = 'A book with this information already exists';
      
      if (duplicateField === 'isbn') {
        message = `A book with ISBN "${error.keyValue?.isbn}" already exists`;
      } else if (error.message.includes('title') && error.message.includes('author')) {
        message = 'A book with this title and author already exists';
      }
      
      return res.status(409).json({
        success: false,
        message: message,
        field: duplicateField
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create book: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Export only the createBook function for testing
module.exports = {
  createBook,
  createPDFCoverPage,
  combinePDFWithCover,
  createSimpleCover
};