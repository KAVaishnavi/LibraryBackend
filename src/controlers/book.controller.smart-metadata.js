const Book = require('../models/book.model');
const User = require('../models/user.model');
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { PDFDocument, rgb } = require('pdf-lib');
const { extractPDFMetadata } = require('../utils/metadata-extractor');

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

// Function to create simple cover image
const createSimpleCover = async (title, author) => {
  try {
    console.log('🎨 Creating simple cover for:', title, 'by', author);
    
    const coversDir = path.join(__dirname, '../../uploads/covers');
    
    // Ensure directory exists
    if (!fs.existsSync(coversDir)) {
      fs.mkdirSync(coversDir, { recursive: true });
    }
    
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const coverFilename = `smart-cover-${timestamp}-${randomId}.jpg`;
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
    
    console.log('✅ Cover created:', coverFilename);
    
    // Verify file exists
    if (fs.existsSync(coverPath)) {
      const stats = fs.statSync(coverPath);
      return {
        success: true,
        filename: coverFilename,
        path: coverPath,
        size: stats.size
      };
    } else {
      return { success: false };
    }
    
  } catch (error) {
    console.error('❌ Error creating cover:', error);
    return { success: false, error: error.message };
  }
};

// Enhanced book creation with SMART metadata extraction
const createBook = async (req, res) => {
  try {
    console.log('📚 Starting SMART book creation with automatic metadata extraction...');
    console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
    console.log('📁 Request files:', req.files ? Object.keys(req.files) : 'No files');

    // Basic validation
    if (!req.body.genre) {
      console.log('❌ Genre validation failed');
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
    console.log('🏷️ Parsed tags:', tags);

    const hasBookFile = req.files && req.files.bookFile && req.files.bookFile[0];
    console.log('📄 Has book file:', !!hasBookFile);
    
    let extractedMetadata = null;
    let finalTitle = req.body.title?.trim() || '';
    let finalAuthor = req.body.author?.trim() || '';
    let finalGenre = req.body.genre;
    let finalDescription = req.body.description?.trim() || '';

    // SMART METADATA EXTRACTION for uploaded files
    if (hasBookFile) {
      const file = req.files.bookFile[0];
      console.log('📁 File details:', {
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      });

      // Extract metadata from the uploaded file
      if (file.mimetype.includes('pdf')) {
        console.log('🧠 SMART EXTRACTION: Analyzing PDF for real metadata...');
        
        const filePath = path.join(__dirname, '../../uploads/books', file.filename);
        extractedMetadata = await extractPDFMetadata(filePath, file.originalname);
        
        console.log('📊 EXTRACTED METADATA:', extractedMetadata);
        
        // Use extracted data if user didn't provide or if extraction confidence is high
        if (!finalTitle || extractedMetadata.confidence > 30) {
          finalTitle = extractedMetadata.title;
          console.log('📖 Using extracted title:', finalTitle);
        }
        
        if (!finalAuthor || extractedMetadata.confidence > 30) {
          finalAuthor = extractedMetadata.author;
          console.log('👤 Using extracted author:', finalAuthor);
        }
        
        if (extractedMetadata.confidence > 40) {
          finalGenre = extractedMetadata.genre;
          console.log('📚 Using extracted genre:', finalGenre);
        }
        
        if (!finalDescription && extractedMetadata.description) {
          finalDescription = extractedMetadata.description;
          console.log('📄 Using extracted description');
        }
      }
    }

    // Validate that we have title and author
    if (!finalTitle || !finalAuthor) {
      console.log('❌ Title/Author validation failed');
      return res.status(400).json({
        success: false,
        message: 'Title and Author are required (could not extract from file)'
      });
    }

    console.log('✅ FINAL METADATA:', {
      title: finalTitle,
      author: finalAuthor,
      genre: finalGenre,
      extractionUsed: !!extractedMetadata
    });

    // Check for duplicates
    const duplicateQuery = {
      title: finalTitle,
      author: finalAuthor,
      uploadedBy: req.user.userId,
      isActive: true
    };
    
    console.log('🔍 Checking for duplicates...');
    const existingBook = await Book.findOne(duplicateQuery);
    if (existingBook) {
      console.log('❌ Duplicate book found');
      return res.status(409).json({
        success: false,
        message: 'You have already uploaded a book with this title and author'
      });
    }
    console.log('✅ No duplicates found');

    // Create book data with extracted metadata
    const bookData = {
      title: finalTitle,
      author: finalAuthor,
      genre: finalGenre,
      description: finalDescription,
      language: req.body.language || 'English',
      price: parseFloat(req.body.price) || 0,
      isbn: req.body.isbn?.trim() || undefined,
      publishedYear: req.body.publishedYear ? parseInt(req.body.publishedYear) : null,
      pages: extractedMetadata?.pages || (req.body.pages ? parseInt(req.body.pages) : null),
      publisher: req.body.publisher?.trim() || '',
      tags: tags,
      uploadedBy: req.user.userId,
      isPublic: true,
      isActive: true,
      uploadMethod: req.body.uploadMethod || (hasBookFile ? 'file' : 'manual'),
      metadata: {
        extractionMethod: extractedMetadata ? 'smart-analysis' : 'manual',
        extractionTimestamp: new Date(),
        autoDetected: !!extractedMetadata,
        extractionConfidence: extractedMetadata?.confidence || 0,
        smartExtraction: true
      }
    };

    console.log('📊 Initial book data created with smart metadata');

    // Add file info if present and combine with cover for PDFs
    if (hasBookFile) {
      const file = req.files.bookFile[0];
      const originalFilePath = path.join(__dirname, '../../uploads/books', file.filename);
      
      console.log('📁 Original file path:', originalFilePath);
      
      // Check if it's a PDF and combine with cover
      if (file.mimetype.includes('pdf')) {
        console.log('📄 PDF detected, starting cover integration...');
        
        const combineResult = await combinePDFWithCover(originalFilePath, finalTitle, finalAuthor);
        
        if (combineResult.success) {
          console.log('✅ PDF combination successful');
          bookData.bookFile = {
            url: `/uploads/books/${combineResult.filename}`,
            filename: combineResult.filename,
            originalName: file.originalname,
            size: combineResult.size,
            mimeType: file.mimetype,
            hasCoverPage: true,
            originalFilename: file.filename
          };
          
          bookData.metadata.originalFile = {
            filename: file.filename,
            size: file.size
          };
          
          console.log('✅ PDF successfully combined with cover page!');
        } else {
          console.log('❌ Failed to combine PDF with cover:', combineResult.error);
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
        console.log('📄 Non-PDF file, using as is');
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

    // GUARANTEED COVER GENERATION with extracted metadata
    console.log('🎨 Starting guaranteed cover generation with smart metadata...');
    
    const coverResult = await createSimpleCover(finalTitle, finalAuthor);
    
    if (coverResult.success) {
      bookData.coverImage = {
        url: `/uploads/covers/${coverResult.filename}`,
        filename: coverResult.filename,
        originalName: `${finalTitle}-cover.jpg`,
        size: coverResult.size,
        mimeType: 'image/jpeg',
        isGenerated: true,
        generationType: 'smart-cover',
        generatedAt: new Date(),
        usedSmartMetadata: !!extractedMetadata
      };
      console.log('✅ SMART COVER GENERATED SUCCESSFULLY!');
    } else {
      console.log('❌ Cover generation failed:', coverResult.error);
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

    console.log('💾 Creating book with smart extracted data...');
    console.log('📊 Final book metadata:', {
      title: bookData.title,
      author: bookData.author,
      genre: bookData.genre,
      hasFile: !!bookData.bookFile,
      hasCover: !!bookData.coverImage,
      smartExtraction: bookData.metadata.smartExtraction,
      extractionConfidence: bookData.metadata.extractionConfidence
    });

    const book = new Book(bookData);
    await book.save();

    // Populate the uploadedBy field for response
    await book.populate('uploadedBy', 'name email');

    console.log('✅ Book created successfully with SMART metadata extraction!');

    const smartMessage = extractedMetadata ? 
      ` (Smart extraction: ${extractedMetadata.confidence}% confidence)` : '';
    const coverMessage = bookData.coverImage?.isGenerated ? ' with auto-generated cover' : '';
    const pdfMessage = bookData.bookFile?.hasCoverPage ? ' and PDF cover page' : '';
    
    res.status(201).json({
      success: true,
      message: `📚 "${bookData.title}" by ${bookData.author} uploaded successfully${smartMessage}${coverMessage}${pdfMessage}!`,
      data: { 
        book,
        smartExtraction: {
          used: !!extractedMetadata,
          confidence: extractedMetadata?.confidence || 0,
          extractedTitle: extractedMetadata?.title,
          extractedAuthor: extractedMetadata?.author,
          extractedGenre: extractedMetadata?.genre,
          method: bookData.metadata.extractionMethod
        },
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
    console.error('❌ SMART book creation error:', error);
    console.error('❌ Error stack:', error.stack);
    
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

// Export the enhanced controller
module.exports = {
  createBook,
  createPDFCoverPage,
  combinePDFWithCover,
  createSimpleCover
};