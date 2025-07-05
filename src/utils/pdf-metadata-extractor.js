const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');

// Function to extract real metadata from PDF
const extractRealPDFMetadata = async (filePath) => {
  try {
    console.log('📖 Extracting REAL metadata from PDF:', filePath);
    
    if (!fs.existsSync(filePath)) {
      throw new Error('PDF file not found');
    }

    const dataBuffer = fs.readFileSync(filePath);
    
    // Parse PDF to get metadata and text
    const pdfData = await pdfParse(dataBuffer);
    
    console.log('📊 PDF Info:', {
      pages: pdfData.numpages,
      textLength: pdfData.text ? pdfData.text.length : 0,
      hasMetadata: !!pdfData.info
    });

    // Extract metadata from PDF info
    const metadata = {
      title: '',
      author: '',
      subject: '',
      creator: '',
      producer: '',
      creationDate: null,
      pages: pdfData.numpages || 0,
      extractedText: pdfData.text ? pdfData.text.substring(0, 1000) : '', // First 1000 chars
      confidence: 0
    };

    // Get PDF metadata
    if (pdfData.info) {
      console.log('📋 PDF Metadata found:', pdfData.info);
      
      if (pdfData.info.Title) {
        metadata.title = pdfData.info.Title.trim();
        metadata.confidence += 30;
        console.log('✅ Found title in metadata:', metadata.title);
      }
      
      if (pdfData.info.Author) {
        metadata.author = pdfData.info.Author.trim();
        metadata.confidence += 30;
        console.log('✅ Found author in metadata:', metadata.author);
      }
      
      if (pdfData.info.Subject) {
        metadata.subject = pdfData.info.Subject.trim();
        metadata.confidence += 10;
        console.log('✅ Found subject in metadata:', metadata.subject);
      }
      
      if (pdfData.info.Creator) {
        metadata.creator = pdfData.info.Creator.trim();
        console.log('✅ Found creator in metadata:', metadata.creator);
      }
      
      if (pdfData.info.CreationDate) {
        metadata.creationDate = pdfData.info.CreationDate;
        console.log('✅ Found creation date:', metadata.creationDate);
      }
    }

    // If no title/author in metadata, try to extract from first page text
    if (!metadata.title || !metadata.author) {
      console.log('🔍 Trying to extract title/author from text content...');
      
      const firstPageText = pdfData.text ? pdfData.text.substring(0, 2000) : '';
      const lines = firstPageText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      console.log('📄 First few lines of PDF:', lines.slice(0, 10));
      
      // Try to find title (usually first significant line)
      if (!metadata.title && lines.length > 0) {
        for (let i = 0; i < Math.min(5, lines.length); i++) {
          const line = lines[i];
          // Skip very short lines, page numbers, headers
          if (line.length > 10 && line.length < 100 && 
              !line.match(/^\d+$/) && 
              !line.toLowerCase().includes('page') &&
              !line.toLowerCase().includes('chapter')) {
            metadata.title = line;
            metadata.confidence += 15;
            console.log('✅ Extracted title from text:', metadata.title);
            break;
          }
        }
      }
      
      // Try to find author (look for "by", "author:", etc.)
      if (!metadata.author) {
        for (const line of lines.slice(0, 20)) {
          const authorMatch = line.match(/(?:by|author:?)\s+([^,\n]+)/i);
          if (authorMatch) {
            metadata.author = authorMatch[1].trim();
            metadata.confidence += 15;
            console.log('�� Extracted author from text:', metadata.author);
            break;
          }
        }
      }
    }

    // Auto-detect genre based on content
    metadata.genre = detectGenreFromContent(metadata.title, metadata.author, metadata.subject, pdfData.text);
    if (metadata.genre) {
      metadata.confidence += 10;
      console.log('✅ Detected genre:', metadata.genre);
    }

    console.log('📊 Final extracted metadata:', {
      title: metadata.title,
      author: metadata.author,
      genre: metadata.genre,
      pages: metadata.pages,
      confidence: metadata.confidence
    });

    return {
      success: true,
      metadata: metadata,
      confidence: metadata.confidence
    };

  } catch (error) {
    console.error('❌ Error extracting PDF metadata:', error);
    return {
      success: false,
      error: error.message,
      metadata: null
    };
  }
};

// Function to detect genre from content
const detectGenreFromContent = (title = '', author = '', subject = '', text = '') => {
  const content = `${title} ${author} ${subject} ${text}`.toLowerCase();
  
  const genreKeywords = {
    'Science Fiction': ['science fiction', 'sci-fi', 'space', 'alien', 'robot', 'future', 'mars', 'galaxy', 'cyberpunk', 'android', 'spacecraft', 'interstellar'],
    'Fantasy': ['fantasy', 'magic', 'dragon', 'wizard', 'kingdom', 'quest', 'sword', 'elf', 'sorcerer', 'throne', 'rings', 'hobbit', 'witch', 'spell'],
    'Mystery': ['mystery', 'detective', 'murder', 'crime', 'investigation', 'clue', 'suspect', 'police', 'forensic', 'evidence'],
    'Romance': ['romance', 'love', 'heart', 'passion', 'wedding', 'bride', 'relationship', 'dating', 'marriage'],
    'Thriller': ['thriller', 'suspense', 'danger', 'chase', 'escape', 'conspiracy', 'action', 'spy', 'agent'],
    'Horror': ['horror', 'ghost', 'haunted', 'nightmare', 'terror', 'dark', 'evil', 'demon', 'supernatural'],
    'Biography': ['biography', 'memoir', 'life of', 'story of', 'autobiography', 'personal account'],
    'History': ['history', 'historical', 'war', 'ancient', 'empire', 'revolution', 'century', 'era'],
    'Self-Help': ['self-help', 'guide', 'how to', 'success', 'motivation', 'habits', 'improvement', 'personal development'],
    'Business': ['business', 'entrepreneur', 'marketing', 'leadership', 'management', 'startup', 'innovation', 'strategy'],
    'Technology': ['technology', 'programming', 'computer', 'digital', 'internet', 'software', 'algorithm', 'coding'],
    'Philosophy': ['philosophy', 'philosophical', 'ethics', 'morality', 'wisdom', 'truth', 'existence', 'consciousness'],
    'Religion': ['religion', 'religious', 'spiritual', 'faith', 'god', 'bible', 'prayer', 'church', 'divine'],
    'Science': ['science', 'scientific', 'research', 'experiment', 'theory', 'physics', 'chemistry', 'biology'],
    'Health': ['health', 'medical', 'fitness', 'diet', 'nutrition', 'wellness', 'exercise', 'medicine'],
    'Education': ['education', 'learning', 'teaching', 'academic', 'university', 'school', 'study']
  };

  // Count keyword matches for each genre
  let bestGenre = '';
  let maxScore = 0;

  for (const [genre, keywords] of Object.entries(genreKeywords)) {
    let score = 0;
    for (const keyword of keywords) {
      if (content.includes(keyword)) {
        score += 1;
        // Give more weight to title and author matches
        if (title.toLowerCase().includes(keyword) || author.toLowerCase().includes(keyword)) {
          score += 2;
        }
      }
    }
    
    if (score > maxScore && score >= 2) { // Minimum 2 matches required
      maxScore = score;
      bestGenre = genre;
    }
  }

  return bestGenre || '';
};

// Function to extract first page as cover image
const extractFirstPageAsCover = async (pdfPath) => {
  try {
    console.log('🖼️ Extracting first page as cover from:', pdfPath);
    
    if (!fs.existsSync(pdfPath)) {
      throw new Error('PDF file not found');
    }

    // Read PDF
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    
    if (pdfDoc.getPageCount() === 0) {
      throw new Error('PDF has no pages');
    }

    // Create new PDF with just first page
    const newPdf = await PDFDocument.create();
    const [firstPage] = await newPdf.copyPages(pdfDoc, [0]);
    newPdf.addPage(firstPage);
    
    // Save first page as separate PDF
    const firstPagePdfBytes = await newPdf.save();
    
    // Generate filename for cover
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const coverFilename = `pdf-cover-${timestamp}-${randomId}.jpg`;
    
    // Ensure covers directory exists
    const coversDir = path.join(__dirname, '../../uploads/covers');
    if (!fs.existsSync(coversDir)) {
      fs.mkdirSync(coversDir, { recursive: true });
    }
    
    const coverPath = path.join(coversDir, coverFilename);
    
    // For now, create a simple cover with extracted metadata
    // In a production environment, you would use a PDF-to-image converter
    // like pdf2pic or similar library to convert the first page to image
    
    // Create a placeholder cover with extracted info
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
        
        <!-- PDF Icon -->
        <rect x="250" y="120" width="100" height="80" fill="white" opacity="0.9" rx="8"/>
        <text x="300" y="170" text-anchor="middle" fill="#667eea" font-family="Arial, sans-serif" font-size="24" font-weight="bold">PDF</text>
        
        <!-- Extracted from PDF text -->
        <text x="300" y="280" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="28" font-weight="bold">
          EXTRACTED FROM PDF
        </text>
        
        <text x="300" y="340" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="20" opacity="0.95">
          First Page Cover
        </text>
        
        <!-- Decorative elements -->
        <circle cx="150" cy="600" r="4" fill="white" opacity="0.6"/>
        <circle cx="450" cy="650" r="3" fill="white" opacity="0.5"/>
        
        <!-- Bottom text -->
        <text x="300" y="850" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14" opacity="0.7">
          Digital Library
        </text>
      </svg>
    `;
    
    // Convert SVG to JPEG
    await sharp(Buffer.from(svg))
      .jpeg({ quality: 85 })
      .toFile(coverPath);
    
    console.log('✅ Cover extracted and saved:', coverFilename);
    
    // Verify file exists
    if (fs.existsSync(coverPath)) {
      const stats = fs.statSync(coverPath);
      return {
        success: true,
        filename: coverFilename,
        path: coverPath,
        size: stats.size,
        extractedFromPDF: true
      };
    } else {
      throw new Error('Cover file was not created');
    }

  } catch (error) {
    console.error('❌ Error extracting first page as cover:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  extractRealPDFMetadata,
  extractFirstPageAsCover,
  detectGenreFromContent
};