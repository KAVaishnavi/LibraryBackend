const express = require('express');
const { body } = require('express-validator');
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  changePassword,
  getAllUsers,
  deleteUserAccount,
  addBookToLibrary,
  removeBookFromLibrary,
  getUserLibrary,
  updateBookStatus
} = require('../controlers/user.controller');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs (increased for development)
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation middleware
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('preferences.favoriteGenres')
    .optional()
    .isArray()
    .withMessage('Favorite genres must be an array'),
  
  body('preferences.readingGoal')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Reading goal must be between 1 and 365 books')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    })
];

// Public routes
router.post('/register', authLimiter, registerValidation, registerUser);
router.post('/login', authLimiter, loginValidation, loginUser);

// Protected routes (require authentication)
router.get('/profile', authenticateToken, getUserProfile);
router.put('/profile', authenticateToken, updateProfileValidation, updateUserProfile);
router.put('/change-password', authenticateToken, changePasswordValidation, changePassword);
router.delete('/account', authenticateToken, deleteUserAccount);

// Library routes (require authentication)
router.post('/library/books/:bookId', authenticateToken, addBookToLibrary);
router.delete('/library/books/:bookId', authenticateToken, removeBookFromLibrary);
router.get('/library', authenticateToken, getUserLibrary);
router.put('/library/books/:bookId', authenticateToken, updateBookStatus);

// Admin routes
router.get('/all', authenticateToken, requireAdmin, getAllUsers);

// Health check for user routes
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'User routes are working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;