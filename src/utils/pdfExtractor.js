const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

class PDFExtractor {
  constructor() {
    this.genreKeywords = {
      'Fiction': ['novel', 'story', 'fiction', 'tale', 'narrative', 'character', 'plot'],
      'Non-Fiction': ['guide', 'manual', 'handbook', 'reference', 'study', 'analysis', 'research'],
      'Mystery': ['mystery', 'detective', 'crime', 'murder', 'investigation', 'clue', 'suspect'],
      'Romance': ['love', 'romance', 'relationship', 'heart', 'passion', 'wedding', 'dating'],
      'Science Fiction': ['sci-fi', 'space', 'future', 'technology', 'alien', 'robot', 'galaxy'],
      'Fantasy': ['magic', 'fantasy', 'wizard', 'dragon', 'kingdom', 'quest', 'adventure'],
      'Thriller': ['thriller', 'suspense', 'action', 'danger', 'chase', 'escape', 'tension'],
      'Biography': ['biography', 'life', 'memoir', 'autobiography', 'personal', 'journey'],
      'History': ['history', 'historical', 'past', 'ancient', 'war', 'civilization', 'era'],
      'Self-Help': ['self-help', 'improvement', 'success', 'motivation', 'personal development'],
      'Business': ['business', 'management', 'leadership', 'strategy', 'marketing', 'finance'],
      'Technology': ['technology', 'computer', 'software', 'programming', 'digital', 'tech'],
      'Health': ['health', 'medical', 'wellness', 'fitness', 'nutrition', 'medicine'],
      'Travel': ['travel', 'journey', 'destination', 'guide', 'adventure', 'explore'],
      'Cooking': ['cooking', 'recipe', 'food', 'kitchen', 'chef', 'cuisine', 'meal'],
      'Art': ['art', 'painting', 'drawing', 'creative', 'design', 'artistic', 'visual'],
      'Poetry': ['poetry', 'poem', 'verse', 'rhyme', 'poet', 'lyrical', 'stanza'],
      'Drama': ['drama', 'play', 'theater', 'stage', 'act', 'scene', 'dialogue'],
      'Horror': ['horror', 'scary', 'fear', 'ghost', 'monster', 'nightmare', 'terror'],
      'Adventure': ['adventure', 'expedition', 'exploration', 'journey', 'quest', 'discovery']
    };
  }

  async extractMetadata(filePath) {
    try {
      console.log('📖 Starting PDF extraction for:', filePath);
      
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      
      console.log('📄 PDF parsed successfully');
      
      const metadata = {
        extractedText: data.text,
        extractedPages: data.numpages,
        extractedTitle: this.extractTitle(data),
        extractedAuthor: this.extractAuthor(data),
        extractedDescription: this.generateDescription(data.text),
        detectedGenre: this.detectGenre(data.text),
        extractedKeywords: this.extractKeywords(data.text),
        extractedLanguage: this.detectLanguage(data.text),
        extractionMethod: 'pdf-parse',
        extractionTimestamp: new Date(),
        fileSize: dataBuffer.length,
        format: 'PDF'
      };

      console.log('✅ Metadata extracted:', {
        title: metadata.extractedTitle,
        author: metadata.extractedAuthor,
        pages: metadata.extractedPages,
        genre: metadata.detectedGenre
      });

      return metadata;
    } catch (error) {
      console.error('❌ PDF extraction error:', error);
      return this.getFallbackMetadata(filePath);
    }
  }

  extractTitle(data) {
    try {
      // Try to get title from PDF info
      if (data.info && data.info.Title) {
        return data.info.Title.trim();
      }

      // Extract from text content
      const text = data.text;
      const lines = text.split('\n').filter(line => line.trim().length > 0);
      
      // Look for title patterns in first few lines
      for (let i = 0; i < Math.min(10, lines.length); i++) {
        const line = lines[i].trim();
        
        // Skip very short lines or lines with too many numbers
        if (line.length < 3 || line.length > 100) continue;
        if ((line.match(/\d/g) || []).length > line.length * 0.5) continue;
        
        // Check if line looks like a title
        if (this.looksLikeTitle(line)) {
          return this.cleanTitle(line);
        }
      }

      return null;
    } catch (error) {
      console.error('Title extraction error:', error);
      return null;
    }
  }

  extractAuthor(data) {
    try {
      // Try to get author from PDF info
      if (data.info && data.info.Author) {
        return data.info.Author.trim();
      }

      const text = data.text;
      const lines = text.split('\n');
      
      // Look for author patterns
      const authorPatterns = [
        /by\s+([A-Za-z\s\.]+)/i,
        /author[:\s]+([A-Za-z\s\.]+)/i,
        /written\s+by\s+([A-Za-z\s\.]+)/i,
        /([A-Z][a-z]+\s+[A-Z][a-z]+)/g // Name pattern
      ];

      for (const line of lines.slice(0, 20)) {
        for (const pattern of authorPatterns) {
          const match = line.match(pattern);
          if (match && match[1]) {
            const author = match[1].trim();
            if (this.looksLikeAuthorName(author)) {
              return author;
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Author extraction error:', error);
      return null;
    }
  }

  generateDescription(text) {
    try {
      // Clean and prepare text
      const cleanText = text.replace(/\s+/g, ' ').trim();
      const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 20);
      
      if (sentences.length === 0) return null;

      // Find meaningful sentences (skip headers, page numbers, etc.)
      const meaningfulSentences = sentences.filter(sentence => {
        const s = sentence.trim();
        return s.length > 30 && 
               s.length < 200 && 
               !s.match(/^(chapter|page|\d+|table of contents|index)/i) &&
               !s.match(/^\d+$/) &&
               (s.match(/[a-zA-Z]/g) || []).length > s.length * 0.7;
      });

      if (meaningfulSentences.length === 0) return null;

      // Take first few meaningful sentences
      const description = meaningfulSentences
        .slice(0, 3)
        .join('. ')
        .trim();

      return description.length > 50 ? description + '.' : null;
    } catch (error) {
      console.error('Description generation error:', error);
      return null;
    }
  }

  detectGenre(text) {
    try {
      const lowerText = text.toLowerCase();
      const genreScores = {};

      // Initialize scores
      Object.keys(this.genreKeywords).forEach(genre => {
        genreScores[genre] = 0;
      });

      // Count keyword matches
      Object.entries(this.genreKeywords).forEach(([genre, keywords]) => {
        keywords.forEach(keyword => {
          const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
          const matches = (lowerText.match(regex) || []).length;
          genreScores[genre] += matches;
        });
      });

      // Find genre with highest score
      const maxScore = Math.max(...Object.values(genreScores));
      if (maxScore > 0) {
        const detectedGenre = Object.keys(genreScores).find(
          genre => genreScores[genre] === maxScore
        );
        return detectedGenre;
      }

      return 'Fiction'; // Default fallback
    } catch (error) {
      console.error('Genre detection error:', error);
      return 'Fiction';
    }
  }

  extractKeywords(text) {
    try {
      const words = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && word.length < 15);

      // Count word frequency
      const wordCount = {};
      words.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
      });

      // Get top keywords
      const keywords = Object.entries(wordCount)
        .filter(([word, count]) => count > 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word]) => word);

      return keywords;
    } catch (error) {
      console.error('Keyword extraction error:', error);
      return [];
    }
  }

  detectLanguage(text) {
    try {
      const sample = text.substring(0, 1000).toLowerCase();
      
      // Simple language detection based on common words
      const languagePatterns = {
        'English': ['the', 'and', 'that', 'have', 'for', 'not', 'with', 'you', 'this', 'but'],
        'Spanish': ['que', 'de', 'no', 'la', 'el', 'en', 'y', 'a', 'es', 'se'],
        'French': ['que', 'de', 'et', 'le', 'la', 'les', 'des', 'un', 'une', 'dans'],
        'German': ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich'],
        'Italian': ['che', 'di', 'la', 'il', 'e', 'per', 'un', 'in', 'con', 'non']
      };

      let maxScore = 0;
      let detectedLanguage = 'English';

      Object.entries(languagePatterns).forEach(([language, words]) => {
        let score = 0;
        words.forEach(word => {
          const regex = new RegExp(`\\b${word}\\b`, 'g');
          score += (sample.match(regex) || []).length;
        });
        
        if (score > maxScore) {
          maxScore = score;
          detectedLanguage = language;
        }
      });

      return detectedLanguage;
    } catch (error) {
      console.error('Language detection error:', error);
      return 'English';
    }
  }

  looksLikeTitle(text) {
    // Check if text looks like a title
    const titleIndicators = [
      text.length > 5 && text.length < 100,
      !text.includes('@'),
      !text.includes('http'),
      !/^\d+$/.test(text),
      !text.toLowerCase().includes('page'),
      !text.toLowerCase().includes('chapter')
    ];

    return titleIndicators.filter(Boolean).length >= 4;
  }

  looksLikeAuthorName(text) {
    // Check if text looks like an author name
    const namePattern = /^[A-Z][a-z]+(\s+[A-Z][a-z]*)*\.?$/;
    return namePattern.test(text.trim()) && 
           text.length > 3 && 
           text.length < 50 &&
           !text.toLowerCase().includes('chapter') &&
           !text.toLowerCase().includes('page');
  }

  cleanTitle(title) {
    return title
      .replace(/[^\w\s\-:]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  getFallbackMetadata(filePath) {
    const filename = path.basename(filePath, path.extname(filePath));
    
    return {
      extractedTitle: this.extractTitleFromFilename(filename),
      extractedAuthor: null,
      extractedDescription: null,
      detectedGenre: 'Fiction',
      extractedKeywords: [],
      extractedLanguage: 'English',
      extractedPages: null,
      extractionMethod: 'filename-analysis',
      extractionTimestamp: new Date(),
      fileSize: fs.statSync(filePath).size,
      format: 'PDF'
    };
  }

  extractTitleFromFilename(filename) {
    return filename
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
  }
}

module.exports = PDFExtractor;