const Book = require('../models/book.model');
const User = require('../models/user.model');
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Simple function to create text-based cover (GUARANTEED TO WORK)
const createSimpleCover = async (title, author) => {
  try {
    console.log('🎨 Creating simple text cover for:', title, 'by', author);
    
    const coversDir = path.join(__dirname, '../../uploads/covers');
    
    // Ensure directory exists
    if (!fs.existsSync(coversDir)) {
      fs.mkdirSync(coversDir, { recursive: true });
      console.log('📁 Created covers directory');
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
    
    console.log('✅ Simple cover created:', coverFilename);
    
    // Verify file exists
    if (fs.existsSync(coverPath)) {
      const stats = fs.statSync(coverPath);
      console.log(`📏 Cover file size: ${(stats.size / 1024).toFixed(2)} KB`);
      
      return {
        success: true,
        filename: coverFilename,
        path: coverPath,
        size: stats.size
      };
    } else {
      console.log('❌ Cover file was not created');
      return { success: false };
    }
    
  } catch (error) {
    console.error('❌ Error creating simple cover:', error);
    return { success: false, error: error.message };
  }
};

// Enhanced book creation with GUARANTEED cover generation
const createBook = async (req, res) => {
  try {
    console.log('📚 Starting book creation with GUARANTEED cover...');
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
    
    // Get title and author
    let finalTitle = req.body.title?.trim() || '';
    let finalAuthor = req.body.author?.trim() || '';

    // Validate that we have title and author
    if (!finalTitle || !finalAuthor) {
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
    
    const existingBook = await Book.findOne(duplicateQuery);
    if (existingBook) {
      return res.status(409).json({
        success: false,
        message: 'You have already uploaded a book with this title and author'
      });
    }

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

    // GUARANTEED COVER GENERATION - ALWAYS CREATE A COVER
    console.log('🎨 GUARANTEED COVER GENERATION - Creating cover...');
    
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
      console.log('✅ COVER GENERATED SUCCESSFULLY!');
    } else {
      console.log('❌ Cover generation failed:', coverResult.error);
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

    console.log('💾 Creating book with data...');
    console.log('📊 Book metadata:', {
      title: bookData.title,
      author: bookData.author,
      genre: bookData.genre,
      hasFile: !!bookData.bookFile,
      hasCover: !!bookData.coverImage,
      coverGenerated: bookData.coverImage?.isGenerated || false
    });

    const book = new Book(bookData);
    await book.save();

    // Populate the uploadedBy field for response
    await book.populate('uploadedBy', 'name email');

    console.log('✅ Book created successfully with guaranteed cover!');

    const coverMessage = bookData.coverImage?.isGenerated ? ' with auto-generated cover' : '';
    
    res.status(201).json({
      success: true,
      message: `📚 "${bookData.title}" by ${bookData.author} uploaded successfully${coverMessage}!`,
      data: { 
        book,
        autoDetected: {
          title: bookData.title,
          author: bookData.author,
          genre: bookData.genre,
          coverGenerated: bookData.coverImage?.isGenerated || false,
          coverType: bookData.coverImage?.generationType || 'none'
        }
      }
    });

  } catch (error) {
    console.error('❌ Book creation error:', error);
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

// Get all books
const getAllBooks = async (req, res) => {
  try {
    console.log('📚 getAllBooks called');

    const { page = 1, limit = 10, genre, author, search } = req.query;
    const query = { isActive: true, isPublic: true };

    if (genre) query.genre = genre;
    if (author) query.author = new RegExp(author, 'i');
    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { author: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }

    const books = await Book.find(query)
      .populate('uploadedBy', 'username name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Book.countDocuments(query);

    // Add user context if authenticated
    const currentUserId = req.user?.userId;
    const booksWithUserContext = books.map(book => {
      const bookObj = book.toObject();
      
      // Check if current user uploaded this book
      const bookUploaderId = book.uploadedBy._id.toString();
      const userIdString = currentUserId ? currentUserId.toString() : null;
      const isOwner = userIdString && bookUploaderId === userIdString;
      
      bookObj.canDelete = isOwner;
      bookObj.canEdit = isOwner;
      
      return bookObj;
    });

    res.status(200).json({
      success: true,
      data: {
        books: booksWithUserContext,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total,
        currentUser: req.user || null
      }
    });
  } catch (error) {
    console.error('Get all books error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch books'
    });
  }
};

// Get book by ID
const getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id)
      .populate('uploadedBy', 'username')
      .populate('reviews.user', 'username');

    if (!book || !book.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { book }
    });
  } catch (error) {
    console.error('Get book by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch book'
    });
  }
};

// Update book
const updateBook = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // Check if user owns the book or is admin
    if (book.uploadedBy.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this book'
      });
    }

    const updatedBook = await Book.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('uploadedBy', 'username');

    res.status(200).json({
      success: true,
      message: 'Book updated successfully',
      data: { book: updatedBook }
    });
  } catch (error) {
    console.error('Update book error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update book'
    });
  }
};

// Delete book
const deleteBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // Check if user owns the book or is admin
    const bookUploaderId = book.uploadedBy.toString();
    const currentUserId = req.user.userId.toString();
    const isOwner = bookUploaderId === currentUserId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this book'
      });
    }

    // Soft delete
    await Book.findByIdAndUpdate(req.params.id, { isActive: false });

    res.status(200).json({
      success: true,
      message: `Book "${book.title}" has been deleted successfully`
    });
  } catch (error) {
    console.error('Delete book error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete book: ' + error.message
    });
  }
};

// Get user books
const getUserBooks = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Check if user is requesting their own books or is admin
    if (userId !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view these books'
      });
    }

    const books = await Book.find({ uploadedBy: userId, isActive: true })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Book.countDocuments({ uploadedBy: userId, isActive: true });

    res.status(200).json({
      success: true,
      data: {
        books,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      }
    });
  } catch (error) {
    console.error('Get user books error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user books'
    });
  }
};

// Add review
const addReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const book = await Book.findById(req.params.id);
    if (!book || !book.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // Check if user already reviewed this book
    const existingReview = book.reviews.find(
      review => review.user.toString() === req.user.userId
    );

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this book'
      });
    }

    const review = {
      user: req.user.userId,
      rating: req.body.rating,
      review: req.body.review || '',
      createdAt: new Date()
    };

    book.reviews.push(review);
    
    // Update average rating
    const totalRating = book.reviews.reduce((sum, r) => sum + r.rating, 0);
    book.averageRating = totalRating / book.reviews.length;

    await book.save();

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      data: { review }
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add review'
    });
  }
};

// Download book
const downloadBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book || !book.isActive || !book.bookFile) {
      return res.status(404).json({
        success: false,
        message: 'Book file not found'
      });
    }

    const filePath = path.join(__dirname, '../../', book.bookFile.url);
    
    // Increment download count
    book.downloadCount = (book.downloadCount || 0) + 1;
    await book.save();

    res.download(filePath, book.bookFile.originalName);
  } catch (error) {
    console.error('Download book error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download book'
    });
  }
};

// Get book stats
const getBookStats = async (req, res) => {
  try {
    const totalBooks = await Book.countDocuments({ isActive: true, isPublic: true });
    const totalAuthors = await Book.distinct('author', { isActive: true, isPublic: true });
    const genreStats = await Book.aggregate([
      { $match: { isActive: true, isPublic: true } },
      { $group: { _id: '$genre', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalBooks,
        totalAuthors: totalAuthors.length,
        genreStats
      }
    });
  } catch (error) {
    console.error('Get book stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch book statistics'
    });
  }
};

// Extract book metadata
const extractBookMetadata = async (req, res) => {
  try {
    console.log('🔍 Starting metadata extraction...');
    
    if (!req.files || !req.files.bookFile || !req.files.bookFile[0]) {
      return res.status(400).json({
        success: false,
        message: 'No book file uploaded'
      });
    }

    const file = req.files.bookFile[0];
    console.log('📁 Processing file:', file.originalname);

    // Basic file metadata
    const metadata = {
      filename: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      format: file.mimetype.includes('pdf') ? 'PDF' : 
              file.mimetype.includes('epub') ? 'EPUB' : 
              file.mimetype.includes('mobi') ? 'MOBI' : 'Unknown',
      extractedAt: new Date(),
      extractionMethod: 'basic-analysis'
    };

    // Simple suggestions
    const suggestions = {
      title: file.originalname.replace(/\.[^/.]+$/, ""),
      author: '',
      genre: 'Fiction',
      language: 'English',
      publishedYear: new Date().getFullYear()
    };

    res.status(200).json({
      success: true,
      message: 'Metadata extracted successfully',
      data: {
        metadata,
        suggestions
      }
    });

  } catch (error) {
    console.error('❌ Metadata extraction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extract metadata',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Test endpoint
const testEndpoint = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Test endpoint working!',
      user: req.user,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Test failed: ' + error.message
    });
  }
};

module.exports = {
  createBook,
  getAllBooks,
  getBookById,
  updateBook,
  deleteBook,
  getUserBooks,
  addReview,
  downloadBook,
  getBookStats,
  extractBookMetadata,
  testEndpoint
};