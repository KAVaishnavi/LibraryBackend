const Book = require('../models/book.model');
const User = require('../models/user.model');
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');
const PDFProcessor = require('../utils/pdfProcessor');

// Initialize PDF processor
const pdfProcessor = new PDFProcessor();

// Enhanced filename parsing function
const extractBookDetailsFromFilename = (filename) => {
  console.log('🔍 Extracting details from filename:', filename);
  
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
  
  // Clean up common file naming patterns
  let cleanName = nameWithoutExt
    .replace(/[\[\](){}]/g, ' ') // Remove brackets
    .replace(/[_]+/g, ' ') // Replace underscores with spaces
    .replace(/[-]{2,}/g, ' ') // Replace multiple dashes with spaces
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
  
  console.log('🧹 Cleaned filename:', cleanName);
  
  const patterns = [
    // "Title by Author" format
    { pattern: /^(.+?)\s+by\s+(.+)$/i, titleIndex: 1, authorIndex: 2 },
    // "Author - Title" format (common in academic papers)
    { pattern: /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\s*[-–—]\s*(.+)$/, titleIndex: 2, authorIndex: 1 },
    // "Title - Author" format
    { pattern: /^(.+?)\s*[-–—]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})$/, titleIndex: 1, authorIndex: 2 },
    // "Title (Author)" format
    { pattern: /^(.+?)\s*\(([^)]+)\)$/, titleIndex: 1, authorIndex: 2 },
    // "Author_Title" format with underscore
    { pattern: /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\s+(.+)$/, titleIndex: 2, authorIndex: 1 },
  ];

  for (const { pattern, titleIndex, authorIndex } of patterns) {
    const match = cleanName.match(pattern);
    if (match) {
      let title = match[titleIndex].trim();
      let author = match[authorIndex].trim();
      
      // Clean up title and author
      title = title.replace(/^[-–—\s]+|[-–—\s]+$/g, '').trim();
      author = author.replace(/^[-–—\s]+|[-–—\s]+$/g, '').trim();
      
      // Validate that we have reasonable title and author
      if (title.length > 0 && author.length > 0 && title.length < 200 && author.length < 100) {
        console.log('✅ Pattern matched:', { title, author, pattern: pattern.source });
        return { title, author };
      }
    }
  }

  // If no pattern matches, try to split on common separators
  const separators = [' - ', ' – ', ' — ', ' by ', ' BY '];
  for (const separator of separators) {
    if (cleanName.includes(separator)) {
      const parts = cleanName.split(separator);
      if (parts.length === 2) {
        let [part1, part2] = parts.map(p => p.trim());
        
        // Determine which part is likely the title vs author
        const authorPattern = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}$/;
        
        if (authorPattern.test(part1) && part1.split(' ').length <= 3) {
          console.log('✅ Separator matched (author-title):', { title: part2, author: part1 });
          return { title: part2, author: part1 };
        } else if (authorPattern.test(part2) && part2.split(' ').length <= 3) {
          console.log('✅ Separator matched (title-author):', { title: part1, author: part2 });
          return { title: part1, author: part2 };
        } else {
          // Default to first part as title
          console.log('✅ Separator matched (default):', { title: part1, author: part2 });
          return { title: part1, author: part2 };
        }
      }
    }
  }

  // If no pattern matches, use the whole filename as title
  console.log('⚠️ No pattern matched, using full name as title');
  return {
    title: cleanName,
    author: ''
  };
};

// ENHANCED BOOK CREATION WITH GUARANTEED COVER AND EXACT METADATA
const createBook = async (req, res) => {
  try {
    console.log('📚 Starting ENHANCED book creation with guaranteed cover...');
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
    const hasISBN = req.body.isbn && req.body.isbn.trim();
    
    // Initialize title and author
    let finalTitle = req.body.title?.trim() || '';
    let finalAuthor = req.body.author?.trim() || '';
    let extractedMetadata = null;

    // ENHANCED PDF PROCESSING - Extract exact title and author
    if (hasBookFile) {
      const file = req.files.bookFile[0];
      const pdfPath = path.join(__dirname, '../../uploads/books', file.filename);
      
      console.log('🔍 Processing PDF for exact metadata extraction...');
      
      // Process PDF comprehensively
      const pdfResult = await pdfProcessor.processPDF(pdfPath, finalTitle, finalAuthor);
      extractedMetadata = pdfResult.metadata;
      
      console.log('📖 PDF Metadata extracted:', {
        pdfTitle: extractedMetadata.title,
        pdfAuthor: extractedMetadata.author,
        pages: extractedMetadata.pages,
        finalTitle: extractedMetadata.finalTitle,
        finalAuthor: extractedMetadata.finalAuthor
      });

      // Use PDF metadata if form fields are empty
      if (!finalTitle && extractedMetadata.title) {
        finalTitle = extractedMetadata.title;
        console.log('📝 Using PDF extracted title:', finalTitle);
      }
      if (!finalAuthor && extractedMetadata.author) {
        finalAuthor = extractedMetadata.author;
        console.log('👤 Using PDF extracted author:', finalAuthor);
      }

      // Fallback to filename extraction if still no title/author
      if (!finalTitle || !finalAuthor) {
        const filenameDetails = extractBookDetailsFromFilename(file.originalname);
        if (!finalTitle && filenameDetails.title) {
          finalTitle = filenameDetails.title;
          console.log('📝 Using filename extracted title:', finalTitle);
        }
        if (!finalAuthor && filenameDetails.author) {
          finalAuthor = filenameDetails.author;
          console.log('👤 Using filename extracted author:', finalAuthor);
        }
      }

      // Final fallback
      if (!finalTitle) finalTitle = extractedMetadata.finalTitle;
      if (!finalAuthor) finalAuthor = extractedMetadata.finalAuthor;
    }

    // Validate that we have title and author
    if (!finalTitle || !finalAuthor) {
      return res.status(400).json({
        success: false,
        message: 'Title and Author are required. Please provide them manually if they cannot be extracted from the PDF or filename.'
      });
    }

    // Check for duplicates
    if (hasBookFile || hasISBN) {
      const duplicateQuery = {
        title: finalTitle,
        author: finalAuthor,
        uploadedBy: req.user.userId,
        isActive: true
      };
      
      const existingBook = await Book.findOne(duplicateQuery);
      if (existingBook) {
        return res.status(409).json({
          success: false,
          message: 'You have already uploaded a book with this title and author'
        });
      }
    }

    // Create comprehensive book data
    const bookData = {
      title: finalTitle,
      author: finalAuthor,
      genre: req.body.genre,
      description: req.body.description?.trim() || '',
      language: req.body.language || 'English',
      price: parseFloat(req.body.price) || 0,
      isbn: req.body.isbn?.trim() || undefined,
      publishedYear: req.body.publishedYear ? parseInt(req.body.publishedYear) : null,
      pages: req.body.pages ? parseInt(req.body.pages) : (extractedMetadata?.pages || null),
      publisher: req.body.publisher?.trim() || '',
      tags: tags,
      uploadedBy: req.user.userId,
      isPublic: true,
      isActive: true,
      uploadMethod: req.body.uploadMethod || (hasBookFile ? 'file' : 'manual'),
      metadata: {
        extractionMethod: hasBookFile ? 'enhanced-pdf-analysis' : 'manual',
        extractionTimestamp: new Date(),
        autoDetected: hasBookFile,
        extractedFromFilename: hasBookFile && (!req.body.title?.trim() || !req.body.author?.trim()),
        extractedFromPDF: extractedMetadata ? true : false,
        pdfMetadata: extractedMetadata || null
      }
    };

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

    // GUARANTEED COVER GENERATION
    let coverImageProcessed = false;
    
    // Check if cover image was uploaded
    if (req.files && req.files.coverImage && req.files.coverImage[0]) {
      const coverFile = req.files.coverImage[0];
      bookData.coverImage = {
        url: `/uploads/covers/${coverFile.filename}`,
        filename: coverFile.filename,
        originalName: coverFile.originalname,
        size: coverFile.size,
        mimeType: coverFile.mimetype,
        isGenerated: false
      };
      console.log('🖼️ Manual cover image uploaded');
      coverImageProcessed = true;
    }
    
    // ALWAYS GENERATE COVER IF NOT PROVIDED
    if (!coverImageProcessed) {
      console.log('🎨 No cover provided - generating automatic cover...');
      
      let coverResult = null;
      
      // Method 1: Try PDF first page extraction
      if (hasBookFile && bookData.metadata.fileFormat === 'PDF') {
        console.log('📄 Attempting PDF first page extraction...');
        const file = req.files.bookFile[0];
        const pdfPath = path.join(__dirname, '../../uploads/books', file.filename);
        
        coverResult = await pdfProcessor.generateCoverFromPDF(pdfPath);
        
        if (coverResult.success) {
          console.log('✅ SUCCESS: PDF cover extracted from first page!');
        } else {
          console.log('⚠️ PDF cover extraction failed:', coverResult.error);
        }
      }
      
      // Method 2: Create text cover if PDF failed or not applicable
      if (!coverResult || !coverResult.success) {
        console.log('📝 Creating beautiful text cover...');
        coverResult = await pdfProcessor.createFallbackCover(finalTitle, finalAuthor);
      }
      
      // Apply cover result
      if (coverResult && coverResult.success) {
        bookData.coverImage = {
          url: `/uploads/covers/${coverResult.filename}`,
          filename: coverResult.filename,
          originalName: `${finalTitle}-${coverResult.type}.jpg`,
          size: coverResult.size,
          mimeType: 'image/jpeg',
          isGenerated: true,
          generationType: coverResult.type,
          generatedAt: new Date()
        };
        console.log(`✅ Cover generated successfully: ${coverResult.type}`);
        coverImageProcessed = true;
      } else {
        console.log('❌ All cover generation methods failed');
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
      if (req.body.coverUrl) {
        bookData.coverImage = {
          url: req.body.coverUrl,
          isExternal: true
        };
      }
    }

    console.log('💾 Creating book with enhanced data...');
    console.log('📊 Final book metadata:', {
      title: bookData.title,
      author: bookData.author,
      genre: bookData.genre,
      pages: bookData.pages,
      hasFile: !!bookData.bookFile,
      hasCover: !!bookData.coverImage,
      coverType: bookData.coverImage?.generationType || 'manual',
      extractedFromPDF: bookData.metadata.extractedFromPDF
    });

    const book = new Book(bookData);
    await book.save();

    // Populate the uploadedBy field for response
    await book.populate('uploadedBy', 'name email');

    console.log('✅ Book created successfully with guaranteed cover!');

    let coverMessage = '';
    if (bookData.coverImage?.isGenerated) {
      if (bookData.coverImage.generationType === 'pdf-extracted') {
        coverMessage = ' with cover extracted from PDF first page';
      } else {
        coverMessage = ' with auto-generated text cover';
      }
    }
    
    res.status(201).json({
      success: true,
      message: `📚 "${bookData.title}" by ${bookData.author} uploaded successfully${coverMessage}!`,
      data: { 
        book,
        autoDetected: {
          title: bookData.title,
          author: bookData.author,
          genre: bookData.genre,
          pages: bookData.pages,
          tags: bookData.tags.length,
          description: bookData.description ? 'Generated' : 'None',
          coverGenerated: bookData.coverImage?.isGenerated || false,
          coverType: bookData.coverImage?.generationType || 'manual',
          extractedFromPDF: bookData.metadata.extractedFromPDF
        }
      }
    });

  } catch (error) {
    console.error('❌ Enhanced book creation error:', error);
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

// Export the enhanced createBook function along with other existing functions
module.exports = {
  createBook,
  // Add other existing functions here when replacing the main controller
};