const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Import routes
const userRoutes = require('./src/routes/user.route');
const bookRoutes = require('./src/routes/book.route');

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request logging middleware (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Library Management API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// API routes
app.use('/api/users', userRoutes);
app.use('/api/books', bookRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Library Management API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      users: '/api/users',
      books: '/api/books',
      health: '/health'
    }
  });
});

// API documentation route
app.get('/api/docs', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Library Management API Documentation',
    version: '1.0.0',
    endpoints: {
      users: {
        'POST /api/users/register': 'Register a new user',
        'POST /api/users/login': 'Login user',
        'GET /api/users/profile': 'Get user profile (auth required)',
        'PUT /api/users/profile': 'Update user profile (auth required)',
        'PUT /api/users/change-password': 'Change password (auth required)',
        'DELETE /api/users/account': 'Delete user account (auth required)',
        'GET /api/users/all': 'Get all users (admin only)',
        'GET /api/users/health': 'User routes health check'
      },
      books: {
        'GET /api/books': 'Get all books with filtering and pagination',
        'GET /api/books/stats': 'Get book statistics',
        'GET /api/books/:id': 'Get book by ID',
        'GET /api/books/:id/download': 'Download book file',
        'POST /api/books': 'Create new book (auth required)',
        'PUT /api/books/:id': 'Update book (auth required, owner only)',
        'DELETE /api/books/:id': 'Delete book (auth required, owner only)',
        'POST /api/books/:id/review': 'Add review to book (auth required)',
        'GET /api/books/user/:userId': 'Get books by user (auth required)',
        'GET /api/books/health': 'Book routes health check'
      }
    },
    authentication: {
      type: 'Bearer Token',
      header: 'Authorization: Bearer <token>',
      note: 'Include JWT token in Authorization header for protected routes'
    },
    fileUpload: {
      endpoint: 'POST /api/books',
      fields: {
        bookFile: 'Book file (PDF, EPUB, MOBI, TXT, DOC, DOCX) - Max 50MB',
        coverImage: 'Cover image (JPEG, PNG, WebP) - Max 5MB'
      },
      contentType: 'multipart/form-data'
    }
  });
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: {
      root: '/',
      health: '/health',
      docs: '/api/docs',
      users: '/api/users',
      books: '/api/books'
    }
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);

  // CORS error
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation. Origin not allowed.'
    });
  }

  // JSON parsing error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON format in request body'
    });
  }

  // Validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  // Cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token has expired'
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? {
      stack: err.stack,
      name: err.name
    } : undefined
  });
});

module.exports = app;