const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Book title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  author: {
    type: String,
    required: [true, 'Author name is required'],
    trim: true,
    maxlength: [100, 'Author name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  genre: {
    type: String,
    required: [true, 'Genre is required'],
    enum: [
      'Fiction', 'Non-Fiction', 'Mystery', 'Romance', 'Science Fiction', 
      'Fantasy', 'Thriller', 'Biography', 'History', 'Self-Help', 
      'Business', 'Technology', 'Health', 'Travel', 'Cooking', 
      'Art', 'Poetry', 'Drama', 'Horror', 'Adventure', 'Classic', 'Dystopian',
      'Philosophy', 'Religion', 'Science', 'Mathematics', 'Psychology', 
      'Sociology', 'Politics', 'Economics', 'Education', 'Reference'
    ]
  },
  isbn: {
    type: String,
    unique: true,
    sparse: true, // Allow multiple null values
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow empty ISBN
        // Basic ISBN validation (10 or 13 digits with optional hyphens)
        return /^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/.test(v);
      },
      message: 'Please enter a valid ISBN'
    }
  },
  publishedYear: {
    type: Number,
    min: [1000, 'Published year must be after 1000'],
    max: [new Date().getFullYear(), 'Published year cannot be in the future']
  },
  language: {
    type: String,
    default: 'English',
    enum: [
      'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 
      'Russian', 'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Other'
    ]
  },
  pages: {
    type: Number,
    min: [1, 'Pages must be at least 1']
  },
  publisher: {
    type: String,
    trim: true,
    maxlength: [100, 'Publisher name cannot exceed 100 characters']
  },
  price: {
    type: Number,
    min: [0, 'Price cannot be negative'],
    default: 0
  },
  coverImage: {
    url: String,
    filename: String,
    originalName: String,
    size: Number,
    mimeType: String,
    isGenerated: {
      type: Boolean,
      default: false
    },
    generationType: String, // 'pdf-first-page', 'text-cover-real-data', etc.
    extractedFromPDF: {
      type: Boolean,
      default: false
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  bookFile: {
    url: String,
    filename: String,
    originalName: String,
    size: Number, // in bytes
    mimeType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  uploadMethod: {
    type: String,
    enum: ['file', 'url', 'manual'],
    default: 'manual'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  rating: {
    average: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    count: {
      type: Number,
      default: 0
    },
    reviews: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
      },
      review: {
        type: String,
        maxlength: [1000, 'Review cannot exceed 1000 characters']
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  metadata: {
    fileSize: Number,
    format: String,
    quality: String,
    extractedText: String, // For search functionality
    extractedTitle: String, // Title extracted from file
    extractedAuthor: String, // Author extracted from file
    extractedSubject: String, // Subject from PDF metadata
    extractedCreator: String, // Creator from PDF metadata
    extractedProducer: String, // Producer from PDF metadata
    extractedCreationDate: Date, // Creation date from file
    extractedModificationDate: Date, // Modification date from file
    extractedPages: Number, // Pages extracted from file
    extractedLanguage: String, // Language detected from content
    extractedKeywords: [String], // Keywords extracted from content
    detectedGenre: String, // Auto-detected genre
    realExtraction: Boolean, // Whether real metadata extraction was used
    extractionConfidence: Number, // Confidence level of extraction
    originalMetadata: mongoose.Schema.Types.Mixed, // Original extracted metadata
    autoGenerated: {
      title: Boolean, // Whether title was auto-generated
      author: Boolean, // Whether author was auto-generated
      description: Boolean, // Whether description was auto-generated
      genre: Boolean, // Whether genre was auto-detected
      tags: Boolean, // Whether tags were auto-generated
      pages: Boolean, // Whether pages were auto-estimated
      language: Boolean, // Whether language was auto-detected
      publishedYear: Boolean // Whether published year was auto-estimated
    },
    extractionMethod: {
      type: String,
      enum: ['pdf-parse', 'filename-analysis', 'content-analysis', 'smart-analysis', 'real-pdf-extraction', 'manual'],
      default: 'manual'
    },
    extractionTimestamp: {
      type: Date,
      default: Date.now
    },
    extractionVersion: {
      type: String,
      default: '1.0'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
bookSchema.index({ title: 'text', author: 'text', description: 'text', tags: 'text' });
bookSchema.index({ genre: 1 });
bookSchema.index({ author: 1 });
bookSchema.index({ publishedYear: -1 });
bookSchema.index({ 'rating.average': -1 });
bookSchema.index({ createdAt: -1 });
bookSchema.index({ uploadedBy: 1 });
bookSchema.index({ isPublic: 1, isActive: 1 });

// Virtual for formatted file size
bookSchema.virtual('formattedFileSize').get(function() {
  if (!this.bookFile?.size) return 'Unknown';
  
  const bytes = this.bookFile.size;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// Virtual for book URL (for frontend access)
bookSchema.virtual('bookUrl').get(function() {
  if (this.uploadMethod === 'url') {
    return this.bookFile?.url;
  }
  return this.bookFile?.url ? `/api/books/${this._id}/download` : null;
});

// Virtual for cover image URL
bookSchema.virtual('coverUrl').get(function() {
  return this.coverImage?.url || '/default-book-cover.jpg';
});

// Pre-save middleware to update rating average
bookSchema.pre('save', function(next) {
  if (this.rating.reviews.length > 0) {
    const totalRating = this.rating.reviews.reduce((sum, review) => sum + review.rating, 0);
    this.rating.average = totalRating / this.rating.reviews.length;
    this.rating.count = this.rating.reviews.length;
  }
  next();
});

// Static method to find books by genre
bookSchema.statics.findByGenre = function(genre) {
  return this.find({ genre, isPublic: true, isActive: true });
};

// Static method to search books
bookSchema.statics.searchBooks = function(query, options = {}) {
  const {
    genre,
    author,
    minRating = 0,
    maxPrice,
    language,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = options;

  let searchQuery = {
    isPublic: true,
    isActive: true,
    'rating.average': { $gte: minRating }
  };

  // Text search
  if (query) {
    searchQuery.$text = { $search: query };
  }

  // Filter by genre
  if (genre) {
    searchQuery.genre = genre;
  }

  // Filter by author
  if (author) {
    searchQuery.author = new RegExp(author, 'i');
  }

  // Filter by price
  if (maxPrice) {
    searchQuery.price = { $lte: maxPrice };
  }

  // Filter by language
  if (language) {
    searchQuery.language = language;
  }

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  return this.find(searchQuery)
    .populate('uploadedBy', 'name email')
    .sort(sort)
    .skip(skip)
    .limit(limit);
};

// Instance method to add review
bookSchema.methods.addReview = function(userId, rating, reviewText) {
  // Remove existing review from same user
  this.rating.reviews = this.rating.reviews.filter(
    review => review.user.toString() !== userId.toString()
  );
  
  // Add new review
  this.rating.reviews.push({
    user: userId,
    rating,
    review: reviewText
  });
  
  return this.save();
};

// Instance method to increment download count
bookSchema.methods.incrementDownload = function() {
  this.downloadCount += 1;
  return this.save({ validateBeforeSave: false });
};

// Instance method to increment view count
bookSchema.methods.incrementView = function() {
  this.viewCount += 1;
  return this.save({ validateBeforeSave: false });
};

const Book = mongoose.model('Book', bookSchema);

module.exports = Book;