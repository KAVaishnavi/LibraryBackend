const Book = require('../models/book.model');
const User = require('../models/user.model');
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');
const pdf2pic = require('pdf2pic');
const sharp = require('sharp');

// Function to create a simple text-based cover as fallback
const createFallbackCover = async (title, author, outputDir) => {
  try {
    console.log('Creating fallback text cover...');
    
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const coverFilename = `fallback-cover-${timestamp}-${randomId}.jpg`;
    const coverPath = path.join(outputDir, coverFilename);
    
    // Create SVG with book info
    const svg = `
      <svg width="600" height="900" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#7C3AED;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad1)"/>
        <rect x="50" y="50" width="500" height="800" fill="none" stroke="white" stroke-width="3" opacity="0.3"/>
        
        <!-- Book icon -->
        <rect x="250" y="150" width="100" height="80" fill="white" opacity="0.8" rx="5"/>
        <rect x="260" y="160" width="80" height="60" fill="none" stroke="#4F46E5" stroke-width="2"/>
        <line x1="270" y1="170" x2="330" y2="170" stroke="#4F46E5" stroke-width="1"/>
        <line x1="270" y1="180" x2="330" y2="180" stroke="#4F46E5" stroke-width="1"/>
        <line x1="270" y1="190" x2="320" y2="190" stroke="#4F46E5" stroke-width="1"/>
        
        <!-- Title -->
        <text x="300" y="320" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="32" font-weight="bold">
          ${title.length > 20 ? title.substring(0, 20) + '...' : title}
        </text>
        
        <!-- Author -->
        <text x="300" y="380" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="24" opacity="0.9">
          by ${author.length > 25 ? author.substring(0, 25) + '...' : author}
        </text>
        
        <!-- Decorative elements -->
        <circle cx="150" cy="600" r="3" fill="white" opacity="0.6"/>
        <circle cx="450" cy="650" r="3" fill="white" opacity="0.6"/>
        <circle cx="200" cy="700" r="2" fill="white" opacity="0.4"/>
        <circle cx="400" cy="750" r="2" fill="white" opacity="0.4"/>
        
        <!-- Bottom text -->
        <text x="300" y="820" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="16" opacity="0.7">
          Digital Library
        </text>
      </svg>
    `;
    
    // Convert SVG to JPEG using sharp
    await sharp(Buffer.from(svg))
      .jpeg({ quality: 85 })
      .toFile(coverPath);
    
    console.log('Fallback cover created:', coverFilename);
    return coverPath;
    
  } catch (error) {
    console.error('Error creating fallback cover:', error);
    return null;
  }
};

// Enhanced function to generate cover image from PDF first page
const generateCoverFromPDF = async (pdfPath, outputDir) => {
  try {
    console.log('Starting cover generation from PDF first page...');
    console.log('PDF Path:', pdfPath);
    console.log('Output Dir:', outputDir);
    
    // Validate PDF file exists
    if (!fs.existsSync(pdfPath)) {
      console.error('PDF file not found:', pdfPath);
      return null;
    }
    
    // Check file size
    const stats = fs.statSync(pdfPath);
    console.log(`PDF file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    
    if (stats.size === 0) {
      console.error('PDF file is empty');
      return null;
    }
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log('Created output directory:', outputDir);
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const tempFilename = `temp-cover-${timestamp}-${randomId}`;
    const finalFilename = `cover-${timestamp}-${randomId}.jpg`;
    
    console.log('Configuring pdf2pic...');
    
    // Configure pdf2pic with better error handling
    const convert = pdf2pic.fromPath(pdfPath, {
      density: 200,           // Reduced density for better compatibility
      saveFilename: tempFilename,
      savePath: outputDir,
      format: "png",
      width: 600,            // Reasonable width
      height: 800,           // Reasonable height
      page: 1                // First page only
    });
    
    console.log('Extracting first page...');
    
    // Convert first page to image with timeout
    const extractionPromise = convert(1, { responseType: "image" });
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('PDF extraction timeout after 30 seconds')), 30000)
    );
    
    const result = await Promise.race([extractionPromise, timeoutPromise]);
    
    if (!result || !result.path) {
      console.error('Failed to extract PDF page - no result');
      return null;
    }
    
    console.log('PDF page extracted to:', result.path);
    
    // Verify extracted file exists
    if (!fs.existsSync(result.path)) {
      console.error('Extracted file not found:', result.path);
      return null;
    }
    
    // Optimize the image with sharp
    const optimizedPath = path.join(outputDir, finalFilename);
    console.log('Optimizing image with sharp...');
    
    await sharp(result.path)
      .resize(600, 900, { 
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
        withoutEnlargement: false
      })
      .jpeg({ 
        quality: 85,
        progressive: true
      })
      .toFile(optimizedPath);
    
    // Clean up original PNG
    if (fs.existsSync(result.path)) {
      fs.unlinkSync(result.path);
      console.log('Cleaned up temporary PNG file');
    }
    
    // Verify final file was created
    if (!fs.existsSync(optimizedPath)) {
      console.error('Final optimized file not created');
      return null;
    }
    
    const finalStats = fs.statSync(optimizedPath);
    console.log(`Cover generated successfully: ${finalFilename} (${(finalStats.size / 1024).toFixed(2)} KB)`);
    
    return optimizedPath;
    
  } catch (error) {
    console.error('Error generating cover from PDF:', error.message);
    console.error('Error stack:', error.stack);
    
    // Clean up any temporary files
    try {
      const files = fs.readdirSync(outputDir);
      const tempFiles = files.filter(file => file.includes('temp-cover-'));
      tempFiles.forEach(file => {
        const filePath = path.join(outputDir, file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('Cleaned up temp file:', file);
        }
      });
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError.message);
    }
    
    return null;
  }
};

// Enhanced filename parsing function
const extractBookDetailsFromFilename = (filename) => {
  console.log('Extracting details from filename:', filename);
  
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
  
  // Clean up common file naming patterns
  let cleanName = nameWithoutExt
    .replace(/[\[\](){}]/g, ' ') // Remove brackets
    .replace(/[_]+/g, ' ') // Replace underscores with spaces
    .replace(/[-]{2,}/g, ' ') // Replace multiple dashes with spaces
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
  
  console.log('Cleaned filename:', cleanName);
  
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
      title = title.replace(/^[-–—\s]+|[-–���\s]+$/g, '').trim();
      author = author.replace(/^[-–—\s]+|[-–—\s]+$/g, '').trim();
      
      // Validate that we have reasonable title and author
      if (title.length > 0 && author.length > 0 && title.length < 200 && author.length < 100) {
        console.log('Pattern matched:', { title, author, pattern: pattern.source });
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
          console.log('Separator matched (author-title):', { title: part2, author: part1 });
          return { title: part2, author: part1 };
        } else if (authorPattern.test(part2) && part2.split(' ').length <= 3) {
          console.log('Separator matched (title-author):', { title: part1, author: part2 });
          return { title: part1, author: part2 };
        } else {
          // Default to first part as title
          console.log('Separator matched (default):', { title: part1, author: part2 });
          return { title: part1, author: part2 };
        }
      }
    }
  }

  // If no pattern matches, use the whole filename as title
  console.log('No pattern matched, using full name as title');
  return {
    title: cleanName,
    author: ''
  };
};

// Enhanced book creation with automatic metadata extraction and GUARANTEED cover generation
const createBook = async (req, res) => {
  try {
    console.log('Starting enhanced book creation...');
    console.log('Request body:', req.body);
    console.log('Request files:', req.files ? Object.keys(req.files) : 'No files');
    console.log('User:', req.user);

    // Basic validation - only genre is required initially
    if (!req.body.genre) {
      console.log('Missing required genre');
      return res.status(400).json({
        success: false,
        message: 'Genre is required'
      });
    }

    // Parse tags if they come as array indices
    let tags = [];
    if (req.body.tags) {
      if (Array.isArray(req.body.tags)) {
        tags = req.body.tags;
      } else {
        // Handle tags sent as individual array items (tags[0], tags[1], etc.)
        const tagKeys = Object.keys(req.body).filter(key => key.startsWith('tags['));
        tags = tagKeys.map(key => req.body[key]).filter(tag => tag && tag.trim());
      }
    }

    // Check for existing book only if we have a book file or ISBN
    const hasBookFile = req.files && req.files.bookFile && req.files.bookFile[0];
    const hasISBN = req.body.isbn && req.body.isbn.trim();
    
    // Extract title and author from filename if file is uploaded and fields are empty
    let finalTitle = req.body.title?.trim() || '';
    let finalAuthor = req.body.author?.trim() || '';
    
    if (hasBookFile && (!finalTitle || !finalAuthor)) {
      const file = req.files.bookFile[0];
      const extractedDetails = extractBookDetailsFromFilename(file.originalname);
      
      // Use extracted details if current fields are empty
      if (!finalTitle && extractedDetails.title) {
        finalTitle = extractedDetails.title;
        console.log('Using extracted title:', finalTitle);
      }
      if (!finalAuthor && extractedDetails.author) {
        finalAuthor = extractedDetails.author;
        console.log('Using extracted author:', finalAuthor);
      }
    }

    // Validate that we have title and author
    if (!finalTitle || !finalAuthor) {
      console.log('Missing title or author after extraction');
      return res.status(400).json({
        success: false,
        message: 'Title and Author are required. Please provide them manually if they cannot be extracted from the filename.'
      });
    }

    // Check for duplicate using final title and author
    if (hasBookFile || hasISBN) {
      const duplicateQuery = {
        title: finalTitle,
        author: finalAuthor,
        uploadedBy: req.user.userId,
        isActive: true
      };
      
      const existingBook = await Book.findOne(duplicateQuery);
      if (existingBook) {
        console.log('Duplicate book found:', existingBook._id);
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
        autoDetected: hasBookFile,
        extractedFromFilename: hasBookFile && (!req.body.title?.trim() || !req.body.author?.trim())
      }
    };

    // Add file info if present
    if (req.files && req.files.bookFile && req.files.bookFile[0]) {
      const file = req.files.bookFile[0];
      bookData.bookFile = {
        url: `/uploads/books/${file.filename}`,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype
      };
      
      // Add file format to metadata
      bookData.metadata.fileFormat = file.mimetype.includes('pdf') ? 'PDF' : 
                                    file.mimetype.includes('epub') ? 'EPUB' : 
                                    file.mimetype.includes('mobi') ? 'MOBI' : 'Unknown';
      
      console.log('Book file processed:', file.originalname);
    }

    // Handle cover image - GUARANTEED COVER GENERATION
    let coverImageProcessed = false;
    
    // Add cover image if present
    if (req.files && req.files.coverImage && req.files.coverImage[0]) {
      const coverFile = req.files.coverImage[0];
      bookData.coverImage = {
        url: `/uploads/covers/${coverFile.filename}`,
        filename: coverFile.filename,
        originalName: coverFile.originalname,
        size: coverFile.size,
        mimeType: coverFile.mimetype
      };
      console.log('Cover image processed:', coverFile.originalname);
      coverImageProcessed = true;
    }
    
    // GUARANTEED COVER GENERATION - Try multiple methods
    if (!coverImageProcessed) {
      const coversDir = path.join(__dirname, '../../uploads/covers');
      
      // Method 1: Try PDF cover generation if it's a PDF
      if (bookData.bookFile && bookData.metadata.fileFormat === 'PDF') {
        console.log('Attempting PDF cover generation...');
        try {
          const pdfPath = path.join(__dirname, '../../', bookData.bookFile.url);
          console.log('PDF file path:', pdfPath);
          console.log('Covers directory:', coversDir);
          
          const generatedCoverPath = await generateCoverFromPDF(pdfPath, coversDir);
          
          if (generatedCoverPath) {
            const coverFilename = path.basename(generatedCoverPath);
            bookData.coverImage = {
              url: `/uploads/covers/${coverFilename}`,
              filename: coverFilename,
              originalName: `${bookData.title}-cover.jpg`,
              size: fs.statSync(generatedCoverPath).size,
              mimeType: 'image/jpeg',
              isGenerated: true
            };
            console.log('SUCCESS: PDF cover generated!');
            coverImageProcessed = true;
          } else {
            console.log('PDF cover generation failed, trying fallback...');
          }
        } catch (error) {
          console.error('PDF cover generation error:', error.message);
        }
      }
      
      // Method 2: Create fallback text cover if PDF method failed or not applicable
      if (!coverImageProcessed) {
        console.log('Creating fallback text cover...');
        try {
          const fallbackCoverPath = await createFallbackCover(bookData.title, bookData.author, coversDir);
          
          if (fallbackCoverPath) {
            const coverFilename = path.basename(fallbackCoverPath);
            bookData.coverImage = {
              url: `/uploads/covers/${coverFilename}`,
              filename: coverFilename,
              originalName: `${bookData.title}-fallback-cover.jpg`,
              size: fs.statSync(fallbackCoverPath).size,
              mimeType: 'image/jpeg',
              isGenerated: true,
              isFallback: true
            };
            console.log('SUCCESS: Fallback cover created!');
            coverImageProcessed = true;
          }
        } catch (fallbackError) {
          console.error('Fallback cover creation failed:', fallbackError.message);
        }
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

    console.log('Creating book with enhanced data...');
    console.log('Book metadata:', {
      title: bookData.title,
      author: bookData.author,
      genre: bookData.genre,
      pages: bookData.pages,
      tags: bookData.tags,
      hasFile: !!bookData.bookFile,
      hasCover: !!bookData.coverImage,
      coverGenerated: bookData.coverImage?.isGenerated || false,
      coverIsFallback: bookData.coverImage?.isFallback || false
    });

    const book = new Book(bookData);
    await book.save();

    // Populate the uploadedBy field for response
    await book.populate('uploadedBy', 'name email');

    console.log('Book created successfully:', book._id);

    let coverMessage = '';
    if (bookData.coverImage?.isGenerated) {
      if (bookData.coverImage?.isFallback) {
        coverMessage = ' with auto-generated text cover';
      } else {
        coverMessage = ' with auto-generated PDF cover';
      }
    }
    
    res.status(201).json({
      success: true,
      message: `"${bookData.title}" by ${bookData.author} uploaded successfully${coverMessage}!`,
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
          coverType: bookData.coverImage?.isFallback ? 'text' : 'pdf'
        }
      }
    });

  } catch (error) {
    console.error('Enhanced book creation error:', error);
    console.error('Error stack:', error.stack);
    
    // Handle specific errors
    if (error.code === 11000) {
      console.log('Duplicate key error details:', {
        code: error.code,
        keyPattern: error.keyPattern,
        keyValue: error.keyValue,
        message: error.message
      });
      
      // Check which field caused the duplicate error
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

// Export the functions we need
module.exports = {
  createBook,
  generateCoverFromPDF,
  createFallbackCover,
  extractBookDetailsFromFilename
};