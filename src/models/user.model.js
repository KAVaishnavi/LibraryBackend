const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email address'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  avatar: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date,
    default: null
  },
  preferences: {
    favoriteGenres: [{
      type: String,
      enum: [
        'Fiction', 'Non-Fiction', 'Mystery', 'Romance', 'Science Fiction', 
        'Fantasy', 'Thriller', 'Biography', 'History', 'Self-Help', 
        'Business', 'Technology', 'Health', 'Travel', 'Cooking', 
        'Art', 'Poetry', 'Drama', 'Horror', 'Adventure', 'Classic', 'Dystopian'
      ]
    }],
    readingGoal: {
      type: Number,
      default: 12 // books per year
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      newBooks: {
        type: Boolean,
        default: true
      }
    }
  },
  library: {
    books: [{
      bookId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book'
      },
      addedAt: {
        type: Date,
        default: Date.now
      },
      status: {
        type: String,
        enum: ['to-read', 'reading', 'completed'],
        default: 'to-read'
      },
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      review: String
    }],
    favorites: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book'
    }]
  },
  stats: {
    booksRead: {
      type: Number,
      default: 0
    },
    joinedDate: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes for better performance (email index is already created by unique: true)
userSchema.index({ name: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for user's public profile
userSchema.virtual('profile').get(function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    avatar: this.avatar,
    isActive: this.isActive,
    lastLogin: this.lastLogin,
    joinedDate: this.stats.joinedDate,
    booksRead: this.stats.booksRead
  };
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Instance method to update last login
userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  return await this.save({ validateBeforeSave: false });
};

// Static method to find user by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

const User = mongoose.model('User', userSchema);

module.exports = User;