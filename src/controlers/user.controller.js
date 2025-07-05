const User = require('../models/user.model');
const Book = require('../models/book.model');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { userId }, 
    process.env.JWT_SECRET || 'your-secret-key', 
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Register User
const registerUser = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email address'
      });
    }

    // Create new user
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Update last login
    await user.updateLastLogin();

    // Return success response
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.profile,
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Email address is already registered'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Login User
const loginUser = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findByEmail(email).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Update last login
    await user.updateLastLogin();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.profile,
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get User Profile
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user: user.profile
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update User Profile
const updateUserProfile = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, preferences } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields
    if (name) user.name = name.trim();
    if (preferences) {
      if (preferences.favoriteGenres) user.preferences.favoriteGenres = preferences.favoriteGenres;
      if (preferences.readingGoal) user.preferences.readingGoal = preferences.readingGoal;
      if (preferences.notifications) {
        user.preferences.notifications = { ...user.preferences.notifications, ...preferences.notifications };
      }
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: user.profile
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Change Password
const changePassword = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get All Users (Admin only)
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find({ role: 'user' })
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments({ role: 'user' });

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete User Account
const deleteUserAccount = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Add Book to User Library
const addBookToLibrary = async (req, res) => {
  try {
    const { bookId } = req.params;
    const userId = req.user.userId;

    // Check if book exists
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // Check if book is public or user owns it
    if (!book.isPublic && book.uploadedBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this book'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if book is already in library
    const bookExists = user.library.books.some(
      libBook => libBook.bookId.toString() === bookId
    );

    if (bookExists) {
      return res.status(409).json({
        success: false,
        message: 'Book already exists in your library'
      });
    }

    // Add book to library
    user.library.books.push({
      bookId: bookId,
      addedAt: new Date(),
      status: 'to-read'
    });

    await user.save();

    // Populate the book details for response
    await user.populate('library.books.bookId');

    res.status(200).json({
      success: true,
      message: 'Book added to library successfully',
      data: {
        libraryBook: user.library.books[user.library.books.length - 1]
      }
    });

  } catch (error) {
    console.error('Add book to library error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Remove Book from User Library
const removeBookFromLibrary = async (req, res) => {
  try {
    const { bookId } = req.params;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find and remove book from library
    const bookIndex = user.library.books.findIndex(
      libBook => libBook.bookId.toString() === bookId
    );

    if (bookIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Book not found in your library'
      });
    }

    user.library.books.splice(bookIndex, 1);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Book removed from library successfully'
    });

  } catch (error) {
    console.error('Remove book from library error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get User Library
const getUserLibrary = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 12, status } = req.query;

    const user = await User.findById(userId)
      .populate({
        path: 'library.books.bookId',
        populate: {
          path: 'uploadedBy',
          select: 'name email'
        }
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let libraryBooks = user.library.books;

    // Filter by status if provided
    if (status) {
      libraryBooks = libraryBooks.filter(book => book.status === status);
    }

    // Sort by addedAt (newest first)
    libraryBooks.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));

    // Pagination
    const skip = (page - 1) * limit;
    const paginatedBooks = libraryBooks.slice(skip, skip + parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'User library retrieved successfully',
      data: {
        books: paginatedBooks,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(libraryBooks.length / limit),
          totalBooks: libraryBooks.length,
          hasNext: page < Math.ceil(libraryBooks.length / limit),
          hasPrev: page > 1,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get user library error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update Book Status in Library
const updateBookStatus = async (req, res) => {
  try {
    const { bookId } = req.params;
    const { status, rating, review } = req.body;
    const userId = req.user.userId;

    if (status && !['to-read', 'reading', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: to-read, reading, or completed'
      });
    }

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find book in library
    const libraryBook = user.library.books.find(
      libBook => libBook.bookId.toString() === bookId
    );

    if (!libraryBook) {
      return res.status(404).json({
        success: false,
        message: 'Book not found in your library'
      });
    }

    // Update fields
    if (status) libraryBook.status = status;
    if (rating) libraryBook.rating = rating;
    if (review !== undefined) libraryBook.review = review;

    await user.save();

    // Populate book details for response
    await user.populate('library.books.bookId');

    res.status(200).json({
      success: true,
      message: 'Book status updated successfully',
      data: {
        libraryBook
      }
    });

  } catch (error) {
    console.error('Update book status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
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
};