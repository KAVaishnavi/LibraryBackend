const Book = require('../models/book.model');
const User = require('../models/user.model');
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');
const { extractRealPDFMetadata, extractFirstPageAsCover } = require('../utils/pdf-metadata-extractor');

// Enhanced book creation with REAL metadata extraction
const createBook = async (req, res) => {
  try {
    console.log('📚 Starting book creation with REAL metadata extraction...');
    console.log('📝 Request body:', req.body);
    console.log('📁 Request files:', req.files ? Object.keys(req.files) : 'No files');

    // Basic validation
    if (!req.body.genre) {
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

    const hasBookFile = req.files && req.files.bookFile && req.files.bookFile[0];
    
    let extractedMetadata = null;
    let finalTitle = req.body.title?.trim() || '';
    let finalAuthor = req.body.author?.trim() || '';
    let finalGenre = req.body.genre;
    let finalDescription = req.body.description?.trim() || '';
    let finalPages = req.body.pages ? parseInt(req.body.pages) : null;

    // REAL METADATA EXTRACTION for PDF files
    if (hasBookFile) {
      const file = req.files.bookFile[0];
      console.log('📁 File details:', {
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      });

      // Extract REAL metadata from PDF
      if (file.mimetype.includes('pdf')) {
        console.log('📖 REAL EXTRACTION: Analyzing PDF for actual metadata...');
        
        const filePath = path.join(__dirname, '../../uploads/books', file.filename);
        const extractionResult = await extractRealPDFMetadata(filePath);
        
        if (extractionResult.success) {
          extractedMetadata = extractionResult.metadata;
          console.log('📊 REAL EXTRACTED METADATA:', extractedMetadata);
          
          // Use extracted data if user didn't provide or if extraction confidence is good
          if (!finalTitle && extractedMetadata.title) {
            finalTitle = extractedMetadata.title;
            console.log('📖 Using extracted title:', finalTitle);
          }
          
          if (!finalAuthor && extractedMetadata.author) {
            finalAuthor = extractedMetadata.author;
            console.log('👤 Using extracted author:', finalAuthor);
          }
          
          if (extractedMetadata.genre && extractedMetadata.confidence > 20) {
            finalGenre = extractedMetadata.genre;
            console.log('📚 Using extracted genre:', finalGenre);
          }
          
          if (!finalPages && extractedMetadata.pages) {
            finalPages = extractedMetadata.pages;
            console.log('📄 Using extracted pages:', finalPages);
          }
          
          // Generate description based on extracted content
          if (!finalDescription && extractedMetadata.title && extractedMetadata.author) {
            finalDescription = `A ${finalGenre || 'book'} by ${extractedMetadata.author}. This ${extractedMetadata.pages ? extractedMetadata.pages + '-page' : ''} work offers readers an engaging experience.`;
            console.log('📄 Generated description from metadata');
          }
        } else {
          console.log('❌ Failed to extract metadata:', extractionResult.error);
        }
      }
    }

    // Validate that we have title and author
    if (!finalTitle || !finalAuthor) {
      console.log('❌ Title/Author validation failed');
      return res.status(400).json({
        success: false,
        message: 'Title and Author are required. Could not extract from file - please provide manually.'
      });
    }

    console.log('✅ FINAL METADATA:', {
      title: finalTitle,
      author: finalAuthor,
      genre: finalGenre,
      pages: finalPages,
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

    // Create book data with REAL extracted metadata
    const bookData = {
      title: finalTitle,
      author: finalAuthor,
      genre: finalGenre,
      description: finalDescription,
      language: req.body.language || 'English',
      price: parseFloat(req.body.price) || 0,
      isbn: req.body.isbn?.trim() || undefined,
      publishedYear: req.body.publishedYear ? parseInt(req.body.publishedYear) : null,
      pages: finalPages,
      publisher: req.body.publisher?.trim() || '',
      tags: tags,
      uploadedBy: req.user.userId,
      isPublic: true,
      isActive: true,
      uploadMethod: req.body.uploadMethod || (hasBookFile ? 'file' : 'manual'),
      metadata: {
        extractionMethod: extractedMetadata ? 'real-pdf-extraction' : 'manual',
        extractionTimestamp: new Date(),
        realExtraction: !!extractedMetadata,
        extractionConfidence: extractedMetadata?.confidence || 0,
        originalMetadata: extractedMetadata || null
      }
    };

    console.log('📊 Initial book data created with REAL metadata');

    // Add file info if present
    if (hasBookFile) {
      const file = req.files.bookFile[0];
      bookData.bookFile = {
        url: `/uploads/books/${file.filename}`,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype
      };
      
      bookData.metadata.fileFormat = file.mimetype.includes('pdf') ? 'PDF' : 
                                    file.mimetype.includes('epub') ? 'EPUB' : 
                                    file.mimetype.includes('mobi') ? 'MOBI' : 'Unknown';
    }

    // EXTRACT FIRST PAGE AS COVER for PDF files
    let coverGenerated = false;
    if (hasBookFile && hasBookFile.mimetype.includes('pdf')) {
      console.log('🖼️ Extracting first page as cover...');
      
      const filePath = path.join(__dirname, '../../uploads/books', hasBookFile.filename);
      const coverResult = await extractFirstPageAsCover(filePath);
      
      if (coverResult.success) {
        bookData.coverImage = {
          url: `/uploads/covers/${coverResult.filename}`,
          filename: coverResult.filename,
          originalName: `${finalTitle}-first-page-cover.jpg`,
          size: coverResult.size,
          mimeType: 'image/jpeg',
          isGenerated: true,
          generationType: 'pdf-first-page',
          extractedFromPDF: true,
          generatedAt: new Date()
        };
        coverGenerated = true;
        console.log('✅ FIRST PAGE COVER EXTRACTED SUCCESSFULLY!');
      } else {
        console.log('❌ First page cover extraction failed:', coverResult.error);
        
        // Fallback to text cover with real metadata
        const textCoverResult = await createTextCoverWithRealData(finalTitle, finalAuthor);
        if (textCoverResult.success) {
          bookData.coverImage = {
            url: `/uploads/covers/${textCoverResult.filename}`,
            filename: textCoverResult.filename,
            originalName: `${finalTitle}-text-cover.jpg`,
            size: textCoverResult.size,
            mimeType: 'image/jpeg',
            isGenerated: true,
            generationType: 'text-cover-real-data',
            generatedAt: new Date()
          };
          coverGenerated = true;
          console.log('✅ TEXT COVER WITH REAL DATA CREATED!');
        }
      }
    } else {
      // For non-PDF files, create text cover with real data
      const textCoverResult = await createTextCoverWithRealData(finalTitle, finalAuthor);
      if (textCoverResult.success) {
        bookData.coverImage = {
          url: `/uploads/covers/${textCoverResult.filename}`,
          filename: textCoverResult.filename,
          originalName: `${finalTitle}-text-cover.jpg`,
          size: textCoverResult.size,
          mimeType: 'image/jpeg',
          isGenerated: true,
          generationType: 'text-cover-real-data',
          generatedAt: new Date()
        };
        coverGenerated = true;
        console.log('✅ TEXT COVER WITH REAL DATA CREATED!');
      }
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

    console.log('💾 Creating book with REAL extracted data...');
    console.log('📊 Final book metadata:', {
      title: bookData.title,
      author: bookData.author,
      genre: bookData.genre,
      pages: bookData.pages,
      hasFile: !!bookData.bookFile,
      hasCover: !!bookData.coverImage,
      realExtraction: bookData.metadata.realExtraction,
      extractionConfidence: bookData.metadata.extractionConfidence
    });

    const book = new Book(bookData);
    await book.save();

    // Populate the uploadedBy field for response
    await book.populate('uploadedBy', 'name email');

    console.log('✅ Book created successfully with REAL metadata extraction!');

    const extractionMessage = extractedMetadata ? 
      ` (Real extraction: ${extractedMetadata.confidence}% confidence)` : '';
    const coverMessage = coverGenerated ? 
      (bookData.coverImage.generationType === 'pdf-first-page' ? 
        ' with first page as cover' : ' with auto-generated cover') : '';
    
    res.status(201).json({
      success: true,
      message: `📚 "${bookData.title}" by ${bookData.author} uploaded successfully${extractionMessage}${coverMessage}!`,
      data: { 
        book,
        realExtraction: {
          used: !!extractedMetadata,
          confidence: extractedMetadata?.confidence || 0,
          extractedTitle: extractedMetadata?.title,
          extractedAuthor: extractedMetadata?.author,
          extractedGenre: extractedMetadata?.genre,
          extractedPages: extractedMetadata?.pages,
          method: bookData.metadata.extractionMethod
        },
        coverInfo: {
          generated: coverGenerated,
          type: bookData.coverImage?.generationType || 'none',
          extractedFromPDF: bookData.coverImage?.extractedFromPDF || false
        }
      }
    });

  } catch (error) {
    console.error('❌ REAL book creation error:', error);
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

// Function to create text cover with real extracted data
const createTextCoverWithRealData = async (title, author) => {
  try {
    console.log('🎨 Creating text cover with REAL data:', title, 'by', author);
    
    const sharp = require('sharp');
    const coversDir = path.join(__dirname, '../../uploads/covers');
    
    // Ensure directory exists
    if (!fs.existsSync(coversDir)) {
      fs.mkdirSync(coversDir, { recursive: true });
    }
    
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const coverFilename = `real-data-cover-${timestamp}-${randomId}.jpg`;
    const coverPath = path.join(coversDir, coverFilename);
    
    // Create cover with real extracted data
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
        
        <!-- Real Title -->
        <text x="300" y="280" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="28" font-weight="bold">
          ${title.length > 25 ? title.substring(0, 25) + '...' : title}
        </text>
        
        <!-- Real Author -->
        <text x="300" y="340" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="20" opacity="0.95">
          by ${author.length > 30 ? author.substring(0, 30) + '...' : author}
        </text>
        
        <!-- Real Data Badge -->
        <rect x="200" y="400" width="200" height="30" fill="white" opacity="0.2" rx="15"/>
        <text x="300" y="420" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="bold">
          REAL EXTRACTED DATA
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
    
    console.log('✅ Real data cover created:', coverFilename);
    
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
    console.error('❌ Error creating real data cover:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  createBook,
  createTextCoverWithRealData
};