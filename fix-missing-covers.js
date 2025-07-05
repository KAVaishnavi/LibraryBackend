const mongoose = require('mongoose');
const Book = require('./src/models/book.model');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Function to create simple cover image
const createSimpleCover = async (title, author) => {
  try {
    console.log('🎨 Creating simple cover for:', title, 'by', author);
    
    const coversDir = path.join(__dirname, 'uploads/covers');
    
    // Ensure directory exists
    if (!fs.existsSync(coversDir)) {
      fs.mkdirSync(coversDir, { recursive: true });
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
    
    console.log('✅ Cover created:', coverFilename);
    
    // Verify file exists
    if (fs.existsSync(coverPath)) {
      const stats = fs.statSync(coverPath);
      return {
        success: true,
        filename: coverFilename,
        path: coverPath,
        size: stats.size
      };
    } else {
      return { success: false };
    }
    
  } catch (error) {
    console.error('❌ Error creating cover:', error);
    return { success: false, error: error.message };
  }
};

async function fixMissingCovers() {
  try {
    console.log('🔧 Fixing missing cover images...');
    
    // Connect to MongoDB
    const mongoUrl = process.env.MONGODB_URL;
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB Atlas');
    
    // Get all books
    const allBooks = await Book.find({ isActive: true });
    console.log(`📚 Found ${allBooks.length} active books`);
    
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const book of allBooks) {
      console.log(`\n📖 Checking: "${book.title}" by ${book.author}`);
      
      // Check if book has cover image
      if (!book.coverImage || !book.coverImage.filename) {
        console.log('❌ No cover image found, creating one...');
        
        try {
          const coverResult = await createSimpleCover(book.title, book.author);
          
          if (coverResult.success) {
            // Update book with new cover
            await Book.findByIdAndUpdate(book._id, {
              $set: {
                coverImage: {
                  url: `/uploads/covers/${coverResult.filename}`,
                  filename: coverResult.filename,
                  originalName: `${book.title}-cover.jpg`,
                  size: coverResult.size,
                  mimeType: 'image/jpeg',
                  isGenerated: true,
                  generationType: 'text-cover',
                  generatedAt: new Date()
                }
              }
            });
            
            console.log(`✅ Created and assigned cover: ${coverResult.filename}`);
            fixedCount++;
          } else {
            console.log('❌ Failed to create cover');
            errorCount++;
          }
        } catch (error) {
          console.error('❌ Error creating cover:', error.message);
          errorCount++;
        }
      } else {
        // Check if cover file exists on disk
        const coverPath = path.join(__dirname, 'uploads/covers', book.coverImage.filename);
        
        if (!fs.existsSync(coverPath)) {
          console.log(`❌ Cover file missing: ${book.coverImage.filename}, recreating...`);
          
          try {
            const coverResult = await createSimpleCover(book.title, book.author);
            
            if (coverResult.success) {
              // Update book with new cover
              await Book.findByIdAndUpdate(book._id, {
                $set: {
                  'coverImage.url': `/uploads/covers/${coverResult.filename}`,
                  'coverImage.filename': coverResult.filename,
                  'coverImage.size': coverResult.size,
                  'coverImage.generatedAt': new Date()
                }
              });
              
              console.log(`✅ Recreated cover: ${coverResult.filename}`);
              fixedCount++;
            } else {
              console.log('❌ Failed to recreate cover');
              errorCount++;
            }
          } catch (error) {
            console.error('❌ Error recreating cover:', error.message);
            errorCount++;
          }
        } else {
          console.log(`✅ Cover exists: ${book.coverImage.filename}`);
        }
      }
    }
    
    console.log(`\n🎉 Cover fix complete!`);
    console.log(`✅ Fixed/Created: ${fixedCount} covers`);
    console.log(`❌ Errors: ${errorCount} covers`);
    
    // Create default cover
    console.log('\n🎨 Creating default cover...');
    const defaultCoverPath = path.join(__dirname, 'uploads', 'default-book-cover.jpg');
    
    if (!fs.existsSync(defaultCoverPath)) {
      const defaultResult = await createSimpleCover('Book Title', 'Author Name');
      if (defaultResult.success) {
        fs.copyFileSync(defaultResult.path, defaultCoverPath);
        console.log('✅ Created default cover');
      }
    } else {
      console.log('✅ Default cover already exists');
    }
    
    console.log('\n📂 Cover directory status:');
    const coversDir = path.join(__dirname, 'uploads/covers');
    const coverFiles = fs.readdirSync(coversDir);
    console.log(`📁 Total cover files: ${coverFiles.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

fixMissingCovers();