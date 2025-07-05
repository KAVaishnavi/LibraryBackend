const fs = require('fs').promises;
const path = require('path');

// Try to load pdf-parse, but make it optional
let pdfParse = null;
try {
  pdfParse = require('pdf-parse');
} catch (error) {
  console.log('⚠️ pdf-parse not installed, PDF metadata extraction will be limited');
}

class BookMetadataService {
  /**
   * Extract metadata from uploaded book file
   * @param {Object} file - Multer file object
   * @returns {Object} - Extracted metadata
   */
  async extractMetadata(file) {
    try {
      const metadata = {
        fileSize: file.size,
        format: this.getFileFormat(file.originalname),
        extractedText: '',
        title: '',
        author: '',
        subject: '',
        creator: '',
        producer: '',
        creationDate: null,
        modificationDate: null,
        pages: 0,
        language: '',
        keywords: []
      };

      // Read file content
      const filePath = file.path;
      const buffer = await fs.readFile(filePath);

      // Extract metadata based on file type
      switch (metadata.format.toLowerCase()) {
        case 'pdf':
          return await this.extractPdfMetadata(buffer, metadata);
        case 'epub':
          return await this.extractEpubMetadata(buffer, metadata);
        case 'txt':
          return await this.extractTextMetadata(buffer, metadata);
        default:
          return await this.extractBasicMetadata(file, metadata);
      }
    } catch (error) {
      console.error('Metadata extraction error:', error);
      return this.getDefaultMetadata(file);
    }
  }

  /**
   * Extract PDF metadata and content
   */
  async extractPdfMetadata(buffer, metadata) {
    try {
      if (!pdfParse) {
        console.log('⚠️ PDF parsing not available, using filename analysis');
        return this.extractBasicMetadata({ originalname: metadata.filename || 'unknown.pdf' }, metadata);
      }

      const data = await pdfParse(buffer);
      
      // Extract basic info
      metadata.pages = data.numpages;
      metadata.extractedText = data.text.substring(0, 5000); // First 5000 chars for search

      // Extract PDF metadata
      if (data.info) {
        metadata.title = data.info.Title || '';
        metadata.author = data.info.Author || '';
        metadata.subject = data.info.Subject || '';
        metadata.creator = data.info.Creator || '';
        metadata.producer = data.info.Producer || '';
        
        if (data.info.CreationDate) {
          metadata.creationDate = new Date(data.info.CreationDate);
        }
        if (data.info.ModDate) {
          metadata.modificationDate = new Date(data.info.ModDate);
        }
      }

      // Try to extract additional info from text content
      const textAnalysis = this.analyzeTextContent(data.text);
      
      // If title/author not in PDF metadata, try to extract from content
      if (!metadata.title && textAnalysis.title) {
        metadata.title = textAnalysis.title;
      }
      if (!metadata.author && textAnalysis.author) {
        metadata.author = textAnalysis.author;
      }

      metadata.language = textAnalysis.language;
      metadata.keywords = textAnalysis.keywords;

      return metadata;
    } catch (error) {
      console.error('PDF metadata extraction error:', error);
      // Fallback to basic metadata extraction
      return this.extractBasicMetadata({ originalname: metadata.filename || 'unknown.pdf' }, metadata);
    }
  }

  /**
   * Extract EPUB metadata
   */
  async extractEpubMetadata(buffer, metadata) {
    try {
      // For now, return basic metadata
      // TODO: Implement EPUB parsing when epub-parser is properly configured
      metadata.format = 'epub';
      return metadata;
    } catch (error) {
      console.error('EPUB metadata extraction error:', error);
      return metadata;
    }
  }

  /**
   * Extract text file metadata
   */
  async extractTextMetadata(buffer, metadata) {
    try {
      const text = buffer.toString('utf-8');
      metadata.extractedText = text.substring(0, 5000);
      
      const textAnalysis = this.analyzeTextContent(text);
      metadata.title = textAnalysis.title;
      metadata.author = textAnalysis.author;
      metadata.language = textAnalysis.language;
      metadata.keywords = textAnalysis.keywords;
      
      // Estimate pages (assuming ~250 words per page)
      const wordCount = text.split(/\s+/).length;
      metadata.pages = Math.ceil(wordCount / 250);

      return metadata;
    } catch (error) {
      console.error('Text metadata extraction error:', error);
      return metadata;
    }
  }

  /**
   * Extract basic metadata for unsupported formats
   */
  async extractBasicMetadata(file, metadata) {
    // Try to extract info from filename
    const filenameAnalysis = this.analyzeFilename(file.originalname);
    metadata.title = filenameAnalysis.title;
    metadata.author = filenameAnalysis.author;
    
    return metadata;
  }

  /**
   * Analyze text content to extract metadata
   */
  analyzeTextContent(text) {
    const analysis = {
      title: '',
      author: '',
      language: 'English',
      keywords: []
    };

    // Extract title from first few lines
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    if (lines.length > 0) {
      // Look for title in first 5 lines
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i].trim();
        if (line.length > 10 && line.length < 100 && !line.includes('Chapter') && !line.includes('Page')) {
          analysis.title = line;
          break;
        }
      }
    }

    // Try to detect author patterns
    const authorPatterns = [
      /by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
      /author[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
      /written\s+by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi
    ];

    for (const pattern of authorPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        analysis.author = match[1].trim();
        break;
      }
    }

    // Detect language (basic detection)
    analysis.language = this.detectLanguage(text);

    // Extract keywords
    analysis.keywords = this.extractKeywords(text);

    return analysis;
  }

  /**
   * Analyze filename to extract title and author
   */
  analyzeFilename(filename) {
    // Remove file extension
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
    
    const patterns = [
      // "Title - Author" or "Title by Author"
      /^(.+?)\s*[-–—]\s*(.+)$/,
      /^(.+?)\s+by\s+(.+)$/i,
      // "Author - Title"
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*[-–—]\s*(.+)$/,
      // "Title (Author)"
      /^(.+?)\s*\(([^)]+)\)$/,
      // "[Author] Title"
      /^\[([^\]]+)\]\s*(.+)$/,
      // "Title_Author" with underscore
      /^(.+?)_([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)$/,
    ];

    for (const pattern of patterns) {
      const match = nameWithoutExt.match(pattern);
      if (match) {
        return {
          title: match[1].trim(),
          author: match[2].trim()
        };
      }
    }

    return {
      title: nameWithoutExt.trim(),
      author: ''
    };
  }

  /**
   * Basic language detection
   */
  detectLanguage(text) {
    const sample = text.substring(0, 1000).toLowerCase();
    
    // Simple language detection based on common words
    const languagePatterns = {
      'Spanish': ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'al'],
      'French': ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir', 'que', 'pour', 'dans', 'ce', 'son', 'une', 'sur', 'avec', 'ne', 'se'],
      'German': ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'des', 'auf', 'für', 'ist', 'im', 'dem', 'nicht', 'ein', 'eine', 'als'],
      'Italian': ['il', 'di', 'che', 'e', 'la', 'per', 'un', 'in', 'con', 'del', 'da', 'a', 'al', 'le', 'si', 'dei', 'sul', 'una', 'nel', 'alla'],
      'Portuguese': ['de', 'a', 'o', 'que', 'e', 'do', 'da', 'em', 'um', 'para', 'é', 'com', 'não', 'uma', 'os', 'no', 'se', 'na', 'por', 'mais']
    };

    let maxScore = 0;
    let detectedLanguage = 'English';

    for (const [language, words] of Object.entries(languagePatterns)) {
      let score = 0;
      for (const word of words) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        const matches = sample.match(regex);
        if (matches) {
          score += matches.length;
        }
      }
      
      if (score > maxScore) {
        maxScore = score;
        detectedLanguage = language;
      }
    }

    return detectedLanguage;
  }

  /**
   * Extract keywords from text
   */
  extractKeywords(text) {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);

    // Count word frequency
    const wordCount = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    // Get top keywords (excluding common words)
    const commonWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'she', 'use', 'her', 'now', 'air', 'any', 'may', 'say', 'she', 'way', 'who', 'oil', 'sit', 'set', 'run', 'eat', 'far', 'sea', 'eye', 'ask', 'own', 'try', 'kind', 'hand', 'high', 'year', 'work', 'part', 'make', 'good', 'long', 'here', 'well', 'such', 'take', 'than', 'them', 'will', 'come', 'made', 'many', 'time', 'very', 'when', 'much', 'know', 'just', 'first', 'could', 'where', 'after', 'think', 'little', 'right', 'never', 'before', 'great', 'might', 'still', 'should', 'being', 'every', 'three', 'state', 'while', 'start', 'never', 'place', 'again', 'where', 'right', 'those', 'both', 'during', 'without', 'another', 'between', 'through', 'because', 'important', 'different'
    ]);

    const keywords = Object.entries(wordCount)
      .filter(([word, count]) => !commonWords.has(word) && count > 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    return keywords;
  }

  /**
   * Get file format from filename
   */
  getFileFormat(filename) {
    const ext = path.extname(filename).toLowerCase();
    const formatMap = {
      '.pdf': 'PDF',
      '.epub': 'EPUB',
      '.mobi': 'MOBI',
      '.txt': 'TXT',
      '.doc': 'DOC',
      '.docx': 'DOCX'
    };
    return formatMap[ext] || 'Unknown';
  }

  /**
   * Get default metadata when extraction fails
   */
  getDefaultMetadata(file) {
    const filenameAnalysis = this.analyzeFilename(file.originalname);
    return {
      fileSize: file.size,
      format: this.getFileFormat(file.originalname),
      extractedText: '',
      title: filenameAnalysis.title,
      author: filenameAnalysis.author,
      subject: '',
      creator: '',
      producer: '',
      creationDate: null,
      modificationDate: null,
      pages: 0,
      language: 'English',
      keywords: []
    };
  }

  /**
   * Generate smart book suggestions based on extracted metadata
   */
  generateBookSuggestions(metadata, filename) {
    const suggestions = {};

    // Use extracted title and author
    if (metadata.title && metadata.title.trim()) {
      suggestions.title = metadata.title.trim();
    }
    if (metadata.author && metadata.author.trim()) {
      suggestions.author = metadata.author.trim();
    }

    // Detect genre based on keywords and content
    suggestions.genre = this.detectGenre(metadata.extractedText, metadata.keywords, metadata.title, metadata.author);

    // Use extracted language
    if (metadata.language) {
      suggestions.language = metadata.language;
    }

    // Use extracted pages
    if (metadata.pages > 0) {
      suggestions.pages = metadata.pages;
    }

    // Generate description based on content analysis
    if (metadata.extractedText) {
      suggestions.description = this.generateDescription(metadata.extractedText, suggestions.genre);
    }

    // Use creation date as published year if available
    if (metadata.creationDate) {
      suggestions.publishedYear = metadata.creationDate.getFullYear();
    }

    // Generate tags from keywords
    if (metadata.keywords && metadata.keywords.length > 0) {
      suggestions.tags = metadata.keywords.slice(0, 5);
    }

    return suggestions;
  }

  /**
   * Detect genre based on content analysis
   */
  detectGenre(text, keywords, title = '', author = '') {
    const combined = `${text} ${keywords.join(' ')} ${title} ${author}`.toLowerCase();
    
    const genreKeywords = {
      'Science Fiction': ['space', 'alien', 'robot', 'future', 'mars', 'galaxy', 'cyberpunk', 'android', 'spacecraft', 'technology', 'artificial intelligence'],
      'Fantasy': ['magic', 'dragon', 'wizard', 'kingdom', 'quest', 'sword', 'elf', 'sorcerer', 'spell', 'enchanted', 'mystical'],
      'Mystery': ['murder', 'detective', 'investigation', 'clue', 'suspect', 'crime', 'police', 'evidence', 'mystery', 'solve'],
      'Romance': ['love', 'heart', 'passion', 'relationship', 'romance', 'kiss', 'wedding', 'bride', 'romantic', 'dating'],
      'Thriller': ['danger', 'chase', 'escape', 'conspiracy', 'suspense', 'action', 'thriller', 'tension', 'pursuit'],
      'Horror': ['ghost', 'haunted', 'nightmare', 'terror', 'fear', 'scary', 'evil', 'demon', 'supernatural', 'horror'],
      'Biography': ['life', 'born', 'childhood', 'career', 'achievement', 'biography', 'memoir', 'autobiography'],
      'History': ['war', 'ancient', 'empire', 'revolution', 'historical', 'century', 'battle', 'civilization'],
      'Self-Help': ['success', 'motivation', 'guide', 'improve', 'habits', 'goals', 'personal development', 'self-help'],
      'Business': ['business', 'entrepreneur', 'marketing', 'leadership', 'management', 'strategy', 'profit', 'company'],
      'Technology': ['computer', 'programming', 'software', 'digital', 'internet', 'algorithm', 'coding', 'data'],
      'Health': ['health', 'fitness', 'diet', 'nutrition', 'exercise', 'medical', 'wellness', 'healing']
    };

    let maxScore = 0;
    let detectedGenre = '';

    for (const [genre, words] of Object.entries(genreKeywords)) {
      let score = 0;
      for (const word of words) {
        if (combined.includes(word)) {
          score += 1;
        }
      }
      
      if (score > maxScore) {
        maxScore = score;
        detectedGenre = genre;
      }
    }

    return detectedGenre;
  }

  /**
   * Generate description based on content
   */
  generateDescription(text, genre) {
    const firstParagraph = text.split('\n').find(p => p.trim().length > 50);
    
    if (firstParagraph && firstParagraph.length > 100) {
      return firstParagraph.substring(0, 300) + '...';
    }

    // Generate generic description based on genre
    const genericDescriptions = {
      'Fantasy': 'An enchanting fantasy tale that transports readers to magical realms filled with adventure and wonder.',
      'Science Fiction': 'A captivating science fiction story exploring futuristic concepts and technological possibilities.',
      'Mystery': 'A gripping mystery novel filled with suspense, clues, and unexpected twists.',
      'Romance': 'A heartwarming romance story about love, relationships, and emotional connections.',
      'Thriller': 'An intense thriller that keeps readers on the edge of their seats with non-stop action.',
      'Horror': 'A spine-chilling horror tale that explores the darker side of human nature.',
      'Biography': 'An inspiring biography chronicling remarkable life achievements.',
      'Self-Help': 'A practical guide offering valuable insights for personal growth and success.'
    };

    return genericDescriptions[genre] || 'A compelling book that offers readers an engaging and memorable experience.';
  }
}

module.exports = new BookMetadataService();