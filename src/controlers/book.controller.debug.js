const Book = require('../models/book.model');
const User = require('../models/user.model');
const { validationResult } = require('express-validator');
const path = require('path');

// Ultra-simplified create book for debugging
const createBook = async (req, res) => {
  try {
    console.log('🔍 DEBUG: Starting book creation...');
    console.log('🔍 DEBUG: Request body:', req.body);
    console.log('🔍 DEBUG: Request files:', req.files ? Object.keys(req.files) : 'No files');
    console.log('🔍 DEBUG: User:', req.user);

    // Basic validation
    if (!req.body.title || !req.body.author || !req.body.genre) {
      console.log('❌ DEBUG: Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Title, Author, and Genre are required'
      });
    }

    // Create minimal book data
    const bookData = {
      title: req.body.title.trim(),
      author: req.body.author.trim(),
      genre: req.body.genre,
      description: req.body.description || '',
      language: req.body.language || 'English',
      uploadedBy: req.user.userId,
      isPublic: true,
      isActive: true,
      price: 0,
      tags: [],
      metadata: {
        extractionMethod: 'manual',
        extractionTimestamp: new Date()
      }
    };

    // Add file info if present
    if (req.files && req.files.bookFile) {
      const file = req.files.bookFile[0];
      bookData.bookFile = {
        url: `/uploads/books/${file.filename}`,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype
      };
      console.log('📁 DEBUG: Book file added:', file.originalname);
    }

    console.log('💾 DEBUG: Creating book with data:', bookData);

    const book = new Book(bookData);
    await book.save();

    console.log('✅ DEBUG: Book saved successfully:', book._id);

    res.status(201).json({
      success: true,
      message: 'Book uploaded successfully (debug mode)!',
      data: { book }
    });

  } catch (error) {
    console.error('❌ DEBUG: Create book error:', error);
    console.error('❌ DEBUG: Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Debug: ' + error.message,
      error: error.stack
    });
  }
};

// Test endpoint
const testEndpoint = async (req, res) => {
  try {
    console.log('🧪 TEST: Endpoint called');
    console.log('🧪 TEST: User:', req.user);
    
    res.status(200).json({
      success: true,
      message: 'Test endpoint working!',
      user: req.user,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ TEST: Error:', error);
    res.status(500).json({
      success: false,
      message: 'Test failed: ' + error.message
    });
  }
};

module.exports = {
  createBook,
  testEndpoint
};