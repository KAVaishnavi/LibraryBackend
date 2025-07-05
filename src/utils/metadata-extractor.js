const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

// Common genre keywords for classification
const genreKeywords = {
  'Fiction': ['novel', 'story', 'fiction', 'tale', 'narrative', 'romance', 'adventure'],
  'Non-Fiction': ['guide', 'manual', 'handbook', 'reference', 'biography', 'memoir', 'history'],
  'Science Fiction': ['sci-fi', 'science fiction', 'space', 'future', 'alien', 'robot', 'cyberpunk'],
  'Fantasy': ['fantasy', 'magic', 'wizard', 'dragon', 'quest', 'kingdom', 'sword'],
  'Mystery': ['mystery', 'detective', 'crime', 'murder', 'investigation', 'thriller'],
  'Romance': ['romance', 'love', 'heart', 'passion', 'relationship', 'wedding'],
  'Thriller': ['thriller', 'suspense', 'danger', 'chase', 'escape', 'conspiracy'],
  'Horror': ['horror', 'ghost', 'haunted', 'scary', 'fear', 'nightmare', 'demon'],
  'Biography': ['biography', 'life of', 'memoir', 'autobiography', 'life story'],
  'History': ['history', 'historical', 'ancient', 'war', 'civilization', 'century'],
  'Self-Help': ['self-help', 'improvement', 'success', 'motivation', 'productivity', 'habits'],
  'Business': ['business', 'management', 'leadership', 'entrepreneur', 'marketing', 'finance'],
  'Technology': ['technology', 'computer', 'programming', 'software', 'digital', 'tech'],
  'Health': ['health', 'medical', 'wellness', 'fitness', 'nutrition', 'medicine'],
  'Travel': ['travel', 'journey', 'adventure', 'guide', 'destination', 'explore'],
  'Cooking': ['cooking', 'recipe', 'food', 'kitchen', 'chef', 'cuisine'],
  'Art': ['art', 'painting', 'drawing', 'design', 'creative', 'artist'],
  'Poetry': ['poetry', 'poems', 'verse', 'poet', 'rhyme', 'sonnet'],
  'Drama': ['drama', 'play', 'theatre', 'act', 'scene', 'stage'],
  'Philosophy': ['philosophy', 'wisdom', 'truth', 'reality', 'existence', 'meaning'],
  'Psychology': ['psychology', 'mind', 'behavior', 'mental', 'dreams', 'consciousness']
};

// Common author name patterns and corrections
const authorCorrections = {
  // Remove common prefixes/suffixes
  'by ': '',
  'author: ': '',
  'written by ': '',
  '.pdf': '',
  '_': ' ',
  '-': ' '
};

// Title cleaning patterns
const titleCleaningPatterns = [
  /\.pdf$/i,
  /^the\s+/i,
  /^a\s+/i,
  /^an\s+/i,
  /_/g,
  /-/g,
  /\s+/g
];

/**
 * Extract metadata from PDF file
 */
async function extractPDFMetadata(filePath, originalFilename) {
  try {
    console.log('📖 [METADATA] Extracting metadata from:', originalFilename);
    
    const result = {
      title: null,
      author: null,
      genre: 'Fiction', // default
      description: null,
      pages: null,
      extractionMethod: 'content-analysis',
      confidence: 0
    };

    // Read PDF file
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Get basic info
    result.pages = pdfDoc.getPageCount();
    console.log('📄 [METADATA] Pages:', result.pages);

    // Try to extract metadata from PDF properties
    const metadata = await extractPDFProperties(pdfDoc);
    if (metadata.title) {
      result.title = cleanTitle(metadata.title);
      result.confidence += 30;
      console.log('📝 [METADATA] Title from PDF properties:', result.title);
    }
    
    if (metadata.author) {
      result.author = cleanAuthor(metadata.author);
      result.confidence += 30;
      console.log('👤 [METADATA] Author from PDF properties:', result.author);
    }

    // If no metadata found, try to extract from filename
    if (!result.title || !result.author) {
      const filenameData = extractFromFilename(originalFilename);
      
      if (!result.title && filenameData.title) {
        result.title = filenameData.title;
        result.confidence += 20;
        console.log('📝 [METADATA] Title from filename:', result.title);
      }
      
      if (!result.author && filenameData.author) {
        result.author = filenameData.author;
        result.confidence += 20;
        console.log('👤 [METADATA] Author from filename:', result.author);
      }
    }

    // Try to extract from first page content
    if (!result.title || !result.author || result.confidence < 50) {
      try {
        const firstPageContent = await extractFirstPageText(pdfDoc);
        const contentData = extractFromContent(firstPageContent);
        
        if (!result.title && contentData.title) {
          result.title = contentData.title;
          result.confidence += 25;
          console.log('📝 [METADATA] Title from content:', result.title);
        }
        
        if (!result.author && contentData.author) {
          result.author = contentData.author;
          result.confidence += 25;
          console.log('👤 [METADATA] Author from content:', result.author);
        }
        
        if (contentData.description) {
          result.description = contentData.description;
          console.log('📄 [METADATA] Description extracted');
        }
      } catch (error) {
        console.log('⚠️ [METADATA] Could not extract text content:', error.message);
      }
    }

    // Determine genre based on title and content
    if (result.title) {
      result.genre = determineGenre(result.title, result.description);
      console.log('📚 [METADATA] Determined genre:', result.genre);
    }

    // Fallback to cleaned filename if still no data
    if (!result.title) {
      result.title = cleanTitle(originalFilename.replace(/\.[^/.]+$/, ""));
      result.confidence += 10;
      console.log('📝 [METADATA] Fallback title from filename:', result.title);
    }

    if (!result.author) {
      result.author = 'Unknown Author';
      console.log('👤 [METADATA] Using fallback author');
    }

    // Ensure title and author are properly formatted
    result.title = formatTitle(result.title);
    result.author = formatAuthor(result.author);

    console.log('✅ [METADATA] Extraction complete:', {
      title: result.title,
      author: result.author,
      genre: result.genre,
      confidence: result.confidence
    });

    return result;

  } catch (error) {
    console.error('❌ [METADATA] Error extracting metadata:', error);
    
    // Return fallback data
    return {
      title: cleanTitle(originalFilename.replace(/\.[^/.]+$/, "")),
      author: 'Unknown Author',
      genre: 'Fiction',
      description: null,
      pages: null,
      extractionMethod: 'fallback',
      confidence: 0,
      error: error.message
    };
  }
}

/**
 * Extract metadata from PDF properties
 */
async function extractPDFProperties(pdfDoc) {
  try {
    const metadata = {
      title: null,
      author: null,
      subject: null,
      creator: null
    };

    // Try to get PDF metadata (this might not work with all PDFs)
    try {
      const info = pdfDoc.getTitle();
      if (info) metadata.title = info;
    } catch (e) {}

    try {
      const author = pdfDoc.getAuthor();
      if (author) metadata.author = author;
    } catch (e) {}

    try {
      const subject = pdfDoc.getSubject();
      if (subject) metadata.subject = subject;
    } catch (e) {}

    try {
      const creator = pdfDoc.getCreator();
      if (creator) metadata.creator = creator;
    } catch (e) {}

    return metadata;
  } catch (error) {
    return { title: null, author: null, subject: null, creator: null };
  }
}

/**
 * Extract text from first page (simplified - would need pdf-parse for full text extraction)
 */
async function extractFirstPageText(pdfDoc) {
  // This is a placeholder - for full text extraction, you'd need pdf-parse or similar
  // For now, we'll return empty string and rely on filename/metadata extraction
  return '';
}

/**
 * Extract metadata from filename
 */
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

/**
 * Check if a string looks like an author name
 */
function looksLikeAuthorName(str) {
  // Check for common author name patterns
  const authorPatterns = [
    /^[A-Z][a-z]+\s+[A-Z][a-z]+$/,  // First Last
    /^[A-Z]\.\s*[A-Z][a-z]+$/,      // F. Last
    /^[A-Z][a-z]+\s+[A-Z]\.\s*[A-Z][a-z]+$/,  // First F. Last
  ];
  
  return authorPatterns.some(pattern => pattern.test(str.trim()));
}

/**
 * Extract metadata from content
 */
function extractFromContent(content) {
  // This would analyze the first page content for title/author
  // For now, return empty as we need pdf-parse for full implementation
  return { title: null, author: null, description: null };
}

/**
 * Determine genre based on title and description
 */
function determineGenre(title, description) {
  const text = (title + ' ' + (description || '')).toLowerCase();
  
  let bestGenre = 'Fiction';
  let maxScore = 0;
  
  for (const [genre, keywords] of Object.entries(genreKeywords)) {
    let score = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score++;
      }
    }
    
    if (score > maxScore) {
      maxScore = score;
      bestGenre = genre;
    }
  }
  
  return bestGenre;
}

/**
 * Clean and format title
 */
function cleanTitle(title) {
  if (!title) return 'Untitled';
  
  let cleaned = title.toString().trim();
  
  // Remove common unwanted parts
  cleaned = cleaned.replace(/\.pdf$/i, '');
  cleaned = cleaned.replace(/_/g, ' ');
  cleaned = cleaned.replace(/-/g, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  return cleaned.trim();
}

/**
 * Clean and format author
 */
function cleanAuthor(author) {
  if (!author) return 'Unknown Author';
  
  let cleaned = author.toString().trim();
  
  // Apply corrections
  for (const [pattern, replacement] of Object.entries(authorCorrections)) {
    cleaned = cleaned.replace(new RegExp(pattern, 'gi'), replacement);
  }
  
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned || 'Unknown Author';
}

/**
 * Format title with proper capitalization
 */
function formatTitle(title) {
  if (!title) return 'Untitled';
  
  return title.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Format author name
 */
function formatAuthor(author) {
  if (!author || author === 'Unknown Author') return 'Unknown Author';
  
  return author.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

module.exports = {
  extractPDFMetadata,
  determineGenre,
  cleanTitle,
  cleanAuthor,
  formatTitle,
  formatAuthor
};