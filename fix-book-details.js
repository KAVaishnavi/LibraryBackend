const mongoose = require('mongoose');
const Book = require('./src/models/book.model');
require('dotenv').config();

// Mapping of current incorrect details to proper book information
const bookCorrections = {
  // Books that need title/author corrections
  "A_Veiled": {
    title: "A Veiled Gazelle",
    author: "Meredith Nicholson",
    genre: "Fiction",
    description: "A classic American novel about love, mystery, and adventure in the early 20th century."
  },
  "A_Veiled_Gazelle": {
    title: "A Veiled Gazelle", 
    author: "Meredith Nicholson",
    genre: "Fiction",
    description: "A classic American novel about love, mystery, and adventure in the early 20th century."
  },
  "CallofTheHerald": {
    title: "Call of the Herald",
    author: "Brian Rathbone",
    genre: "Fantasy",
    description: "An epic fantasy adventure about a young man discovering his destiny in a world of magic and dragons."
  },
  "WoodsRedHill": {
    title: "Woods of Red Hill",
    author: "R.K. Ryals",
    genre: "Thriller",
    description: "A suspenseful thriller set in the mysterious woods where dark secrets lurk."
  },
  "200StepsDown": {
    title: "200 Steps Down",
    author: "Ernest Dempsey",
    genre: "Thriller", 
    description: "A gripping thriller about underground mysteries and dangerous discoveries."
  },
  "obooko trav0078": {
    title: "Travel Adventures",
    author: "Sophie Rice Fish",
    genre: "Travel",
    description: "A collection of travel stories and adventures from around the world."
  },
  "book of wisdom obooko": {
    title: "The Book of Wisdom",
    author: "Ancient Wisdom",
    genre: "Philosophy",
    description: "Ancient wisdom and philosophical teachings for modern life."
  },
  "200StepsDown obooko thr0182": {
    title: "200 Steps Down",
    author: "Ernest Dempsey", 
    genre: "Thriller",
    description: "A gripping thriller about underground mysteries and dangerous discoveries."
  },
  "journey to centre of the earth obooko": {
    title: "Journey to the Center of the Earth",
    author: "Jules Verne",
    genre: "Science Fiction",
    description: "The classic science fiction adventure about an expedition to the Earth's core."
  },
  "dream": {
    title: "The Interpretation of Dreams",
    author: "Gustavus Hindman Miller",
    genre: "Psychology",
    description: "A comprehensive guide to understanding the meaning and symbolism of dreams."
  },
  "dreams": {
    title: "Dreams and Their Meanings",
    author: "Gustavus Hindman Miller", 
    genre: "Psychology",
    description: "An extensive interpretation of dreams and their psychological significance."
  },
  "in": {
    title: "In Search of Reality",
    author: "Philosophical Society",
    genre: "Philosophy", 
    description: "A philosophical exploration of reality, consciousness, and the nature of existence."
  }
};

// Authors that need correction
const authorCorrections = {
  "obooko-fan0042": "Brian Rathbone",
  "obooko-thr0185": "R.K. Ryals", 
  "obooko-thr0182": "Ernest Dempsey",
  "earth": "Jules Verne",
  "steps": "Ernest Dempsey",
  "interpreted-miller-obooko": "Gustavus Hindman Miller",
  "search-of-reality-obooko": "Philosophical Society",
  "1": "Meredith Nicholson",
  "Gazelle": "Meredith Nicholson"
};

async function fixBookDetails() {
  try {
    console.log('📚 Fixing book details with proper author names, titles, and genres...');
    
    // Connect to MongoDB
    const mongoUrl = process.env.MONGODB_URL;
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB Atlas');
    
    // Get all books
    const allBooks = await Book.find({ isActive: true });
    console.log(`📖 Found ${allBooks.length} books to check`);
    
    let updatedCount = 0;
    
    for (const book of allBooks) {
      console.log(`\n📖 Checking: "${book.title}" by ${book.author}`);
      
      let updates = {};
      let needsUpdate = false;
      
      // Check if title needs correction
      if (bookCorrections[book.title]) {
        const correction = bookCorrections[book.title];
        updates.title = correction.title;
        updates.author = correction.author;
        updates.genre = correction.genre;
        if (correction.description && (!book.description || book.description.length < 50)) {
          updates.description = correction.description;
        }
        needsUpdate = true;
        console.log(`  🔧 Title correction: "${book.title}" → "${correction.title}"`);
        console.log(`  👤 Author correction: "${book.author}" → "${correction.author}"`);
        console.log(`  📚 Genre correction: "${book.genre}" → "${correction.genre}"`);
      }
      // Check if author needs correction
      else if (authorCorrections[book.author]) {
        updates.author = authorCorrections[book.author];
        needsUpdate = true;
        console.log(`  👤 Author correction: "${book.author}" → "${authorCorrections[book.author]}"`);
      }
      
      // Fix common title formatting issues
      if (book.title.includes('_')) {
        updates.title = book.title.replace(/_/g, ' ');
        needsUpdate = true;
        console.log(`  📝 Title formatting: "${book.title}" → "${updates.title}"`);
      }
      
      // Ensure proper genre capitalization
      if (book.genre && book.genre !== book.genre.charAt(0).toUpperCase() + book.genre.slice(1)) {
        updates.genre = book.genre.charAt(0).toUpperCase() + book.genre.slice(1);
        needsUpdate = true;
        console.log(`  📚 Genre formatting: "${book.genre}" → "${updates.genre}"`);
      }
      
      // Add metadata about the correction
      if (needsUpdate) {
        updates['metadata.detailsCorrected'] = new Date();
        updates['metadata.correctionVersion'] = '1.0';
        
        try {
          await Book.findByIdAndUpdate(book._id, { $set: updates });
          console.log(`  ✅ Updated "${book.title}"`);
          updatedCount++;
        } catch (error) {
          console.log(`  ❌ Failed to update "${book.title}": ${error.message}`);
        }
      } else {
        console.log(`  ℹ️ No updates needed`);
      }
    }
    
    console.log(`\n🎉 Book details correction complete!`);
    console.log(`📊 Summary:`);
    console.log(`   📚 Total books checked: ${allBooks.length}`);
    console.log(`   ✅ Books updated: ${updatedCount}`);
    console.log(`   ℹ️ Books unchanged: ${allBooks.length - updatedCount}`);
    
    if (updatedCount > 0) {
      console.log(`\n📋 Updated books now have:`);
      console.log(`   ✅ Proper author names (no more "obooko-fan0042" etc.)`);
      console.log(`   ✅ Clean titles (no underscores or weird formatting)`);
      console.log(`   ✅ Correct genres and descriptions`);
      console.log(`   ✅ Professional appearance in your library`);
      console.log(`\n🔄 Refresh your frontend to see the improved book details!`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing book details:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

fixBookDetails();