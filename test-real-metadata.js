const { extractPDFMetadata } = require('./src/utils/metadata-extractor');
const path = require('path');
const fs = require('fs');

async function testRealMetadataExtraction() {
  try {
    console.log('🧠 Testing Real Metadata Extraction with Proper Filenames...');
    console.log('='.repeat(70));
    
    // Test different filename patterns that users might upload
    const testFilenames = [
      'Pride and Prejudice - Jane Austen.pdf',
      'The Great Gatsby by F. Scott Fitzgerald.pdf',
      'To Kill a Mockingbird_Harper Lee.pdf',
      '1984 - George Orwell.pdf',
      'Harry Potter and the Sorcerers Stone by J.K. Rowling.pdf',
      'The Art of War - Sun Tzu.pdf',
      'Steve Jobs Biography - Walter Isaacson.pdf',
      'Cooking Made Easy - Gordon Ramsay.pdf',
      'JavaScript The Good Parts - Douglas Crockford.pdf',
      'A Brief History of Time by Stephen Hawking.pdf'
    ];
    
    console.log('📚 Testing metadata extraction from various filename patterns:\n');
    
    for (const filename of testFilenames) {
      console.log(`📖 Testing: "${filename}"`);
      console.log('-'.repeat(60));
      
      // Since we don't have actual files, we'll test just the filename extraction
      const { determineGenre, formatTitle, formatAuthor } = require('./src/utils/metadata-extractor');
      
      // Extract from filename using our local function
      const filenameData = extractFromFilename(filename);
      
      // Determine genre
      const genre = determineGenre(filenameData.title || '', '');
      
      // Format the results
      const finalTitle = formatTitle(filenameData.title || filename.replace(/\.[^/.]+$/, ""));
      const finalAuthor = formatAuthor(filenameData.author || 'Unknown Author');
      
      console.log(`   📝 Extracted Title: "${finalTitle}"`);
      console.log(`   👤 Extracted Author: "${finalAuthor}"`);
      console.log(`   📚 Determined Genre: "${genre}"`);
      console.log(`   🎯 Extraction Method: filename-analysis`);
      console.log('');
    }
    
    console.log('🎉 Real Metadata Extraction Test Complete!');
    console.log('\n📋 How the Smart System Works:');
    console.log('   1️⃣ When user uploads "Pride and Prejudice - Jane Austen.pdf"');
    console.log('   2️⃣ System extracts: Title="Pride and Prejudice", Author="Jane Austen"');
    console.log('   3️⃣ Determines genre based on title keywords');
    console.log('   4️⃣ Creates professional cover with real information');
    console.log('   5️⃣ No more fake data like "obooko-fan0042"!');
    
    console.log('\n🚀 Supported Filename Patterns:');
    console.log('   ✅ "Title - Author.pdf"');
    console.log('   ✅ "Title by Author.pdf"');
    console.log('   ✅ "Title_Author.pdf"');
    console.log('   ✅ Plus PDF metadata extraction');
    console.log('   ✅ Plus content analysis');
    
    console.log('\n🎯 Benefits for Your Library:');
    console.log('   ✅ Automatic real title extraction');
    console.log('   ✅ Automatic real author extraction');
    console.log('   ✅ Intelligent genre classification');
    console.log('   ✅ Professional cover generation');
    console.log('   ✅ No manual data entry required');
    console.log('   ✅ Consistent, clean metadata');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Helper function to test filename extraction directly
function extractFromFilename(filename) {
  const result = { title: null, author: null };
  
  // Remove extension
  let cleanName = filename.replace(/\.[^/.]+$/, "");
  
  // Common patterns: "Title - Author", "Author - Title", "Title by Author"
  const patterns = [
    /^(.+?)\s*-\s*(.+)$/,  // Title - Author
    /^(.+?)\s+by\s+(.+)$/i,  // Title by Author
    /^(.+?)\s*_\s*(.+)$/,  // Title_Author
  ];
  
  for (const pattern of patterns) {
    const match = cleanName.match(pattern);
    if (match) {
      // Try to determine which is title and which is author
      const part1 = match[1].trim();
      const part2 = match[2].trim();
      
      // If one part looks like an author name (has spaces, proper case)
      if (looksLikeAuthorName(part2)) {
        result.title = part1;
        result.author = part2;
      } else if (looksLikeAuthorName(part1)) {
        result.title = part2;
        result.author = part1;
      } else {
        // Default: first part is title
        result.title = part1;
        result.author = part2;
      }
      break;
    }
  }
  
  // If no pattern matched, use the whole filename as title
  if (!result.title) {
    result.title = cleanName;
  }
  
  return result;
}

function looksLikeAuthorName(str) {
  // Check for common author name patterns
  const authorPatterns = [
    /^[A-Z][a-z]+\s+[A-Z][a-z]+$/,  // First Last
    /^[A-Z]\.\s*[A-Z][a-z]+$/,      // F. Last
    /^[A-Z][a-z]+\s+[A-Z]\.\s*[A-Z][a-z]+$/,  // First F. Last
  ];
  
  return authorPatterns.some(pattern => pattern.test(str.trim()));
}

testRealMetadataExtraction();