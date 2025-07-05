const express = require('express');
const { body } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Book = require('../models/book.model');

// Import the createBook function with REAL metadata extraction
const { createBook } = require('../controlers/book.controller.real-metadata');

// Import other functions from the original controller
const {
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
} = require('../controlers/book.controller');

const { authenticateToken, requireAdmin, optionalAuth } = require('../middleware/auth.middleware');

const router = express.Router();

// Ensure upload directories exist
const uploadDirs = ['uploads/books', 'uploads/covers'];
uploadDirs.forEach(dir => {
  const fullPath = path.join(__dirname, '../../', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'bookFile') {
      cb(null, path.join(__dirname, '../../uploads/books'));
    } else if (file.fieldname === 'coverImage') {
      cb(null, path.join(__dirname, '../../uploads/covers'));
    }
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'bookFile') {
    // Accept book files
    const allowedTypes = ['.pdf', '.epub', '.mobi', '.txt', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid book file type. Allowed: PDF, EPUB, MOBI, TXT, DOC, DOCX'), false);
    }
  } else if (file.fieldname === 'coverImage') {
    // Accept image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid cover image type. Only images are allowed'), false);
    }
  } else {
    cb(new Error('Unexpected field'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB for book files
    files: 2 // Maximum 2 files (book + cover)
  }
});

// Validation middleware
const createBookValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  
  body('author')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Author must be between 1 and 100 characters'),
  
  body('genre')
    .isIn([
      'Fiction', 'Non-Fiction', 'Mystery', 'Romance', 'Science Fiction', 
      'Fantasy', 'Thriller', 'Biography', 'History', 'Self-Help', 
      'Business', 'Technology', 'Health', 'Travel', 'Cooking', 
      'Art', 'Poetry', 'Drama', 'Horror', 'Adventure', 'Classic', 'Dystopian',
      'Philosophy', 'Religion', 'Science', 'Mathematics', 'Psychology', 
      'Sociology', 'Politics', 'Economics', 'Education', 'Reference'
    ])
    .withMessage('Please select a valid genre'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
  
  body('isbn')
    .optional()
    .trim()
    .matches(/^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/)
    .withMessage('Please enter a valid ISBN'),
  
  body('publishedYear')
    .optional()
    .isInt({ min: 1000, max: new Date().getFullYear() })
    .withMessage('Published year must be between 1000 and current year'),
  
  body('pages')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Pages must be at least 1'),
  
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price cannot be negative'),
  
  body('language')
    .optional()
    .isIn([
      'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 
      'Russian', 'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Other'
    ])
    .withMessage('Please select a valid language'),
  
  body('uploadMethod')
    .optional()
    .isIn(['file', 'url', 'manual'])
    .withMessage('Invalid upload method'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage('Each tag must be between 1 and 30 characters')
];

const updateBookValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  
  body('author')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Author must be between 1 and 100 characters'),
  
  body('genre')
    .optional()
    .isIn([
      'Fiction', 'Non-Fiction', 'Mystery', 'Romance', 'Science Fiction', 
      'Fantasy', 'Thriller', 'Biography', 'History', 'Self-Help', 
      'Business', 'Technology', 'Health', 'Travel', 'Cooking', 
      'Art', 'Poetry', 'Drama', 'Horror', 'Adventure', 'Classic', 'Dystopian',
      'Philosophy', 'Religion', 'Science', 'Mathematics', 'Psychology', 
      'Sociology', 'Politics', 'Economics', 'Education', 'Reference'
    ])
    .withMessage('Please select a valid genre'),
  
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean value')
];

const reviewValidation = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  body('review')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Review cannot exceed 1000 characters')
];

// Public routes (with optional authentication for user context)
router.get('/', optionalAuth, getAllBooks);
router.get('/stats', getBookStats);
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'REAL METADATA Book routes with PDF first page cover extraction',
    timestamp: new Date().toISOString(),
    features: {
      realMetadataExtraction: true,
      pdfFirstPageCover: true,
      guaranteedCoverGeneration: true,
      noFakeData: true
    }
  });
});
router.get('/:id', getBookById);
router.get('/:id/download', downloadBook);

// Protected routes (require authentication)
router.post('/extract-metadata',
  authenticateToken,
  upload.fields([
    { name: 'bookFile', maxCount: 1 }
  ]),
  extractBookMetadata
);

// REAL METADATA: Add logging middleware for book creation
router.post('/', 
  authenticateToken, 
  (req, res, next) => {
    console.log('🚀 [REAL METADATA] Book creation request received');
    console.log('📝 [REAL METADATA] Body keys:', Object.keys(req.body));
    console.log('📁 [REAL METADATA] Files:', req.files ? Object.keys(req.files) : 'No files');
    next();
  },
  upload.fields([
    { name: 'bookFile', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }
  ]), 
  (req, res, next) => {
    console.log('📁 [REAL METADATA] After multer - Files:', req.files ? Object.keys(req.files) : 'No files');
    if (req.files && req.files.bookFile) {
      console.log('📄 [REAL METADATA] Book file details:', {
        filename: req.files.bookFile[0].filename,
        mimetype: req.files.bookFile[0].mimetype,
        size: req.files.bookFile[0].size
      });
    }
    next();
  },
  createBookValidation, 
  createBook
);

router.put('/:id', authenticateToken, updateBookValidation, updateBook);
router.delete('/:id', authenticateToken, deleteBook);
router.post('/:id/review', authenticateToken, reviewValidation, addReview);

// User-specific routes
router.get('/user/:userId', authenticateToken, getUserBooks);

// Test routes
router.get('/test', testEndpoint);
router.get('/test-user-context', optionalAuth, (req, res) => {
  res.json({
    success: true,
    message: 'REAL METADATA user context test with PDF first page cover',
    data: {
      user: req.user,
      hasUser: !!req.user,
      userId: req.user?.userId?.toString(),
      userIdType: typeof req.user?.userId,
      timestamp: new Date().toISOString(),
      features: {
        realMetadataExtraction: true,
        pdfFirstPageCover: true,
        guaranteedCoverGeneration: true,
        noFakeData: true
      }
    }
  });
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  console.log('❌ [REAL METADATA] Error occurred:', error.message);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 50MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 2 files'
      });
    }
  }
  
  if (error.message.includes('Invalid')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
});

module.exports = router;