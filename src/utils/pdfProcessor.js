const fs = require('fs');
const path = require('path');
const pdf2pic = require('pdf2pic');
const sharp = require('sharp');
const pdfParse = require('pdf-parse');

/**
 * Enhanced PDF Processor for extracting metadata and generating covers
 */
class PDFProcessor {
  constructor() {
    this.outputDir = path.join(__dirname, '../../uploads/covers');
    this.ensureOutputDirectory();
  }

  /**
   * Ensure the covers output directory exists
   */
  ensureOutputDirectory() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      console.log('📁 Created covers directory:', this.outputDir);
    }
  }

  /**
   * Extract comprehensive metadata from PDF
   */
  async extractPDFMetadata(pdfPath) {
    try {
      console.log('📖 Extracting PDF metadata from:', path.basename(pdfPath));
      
      if (!fs.existsSync(pdfPath)) {
        throw new Error('PDF file not found');
      }

      const dataBuffer = fs.readFileSync(pdfPath);
      const pdfData = await pdfParse(dataBuffer);

      // Extract basic info
      const metadata = {
        title: null,
        author: null,
        subject: null,
        creator: null,
        producer: null,
        creationDate: null,
        pages: pdfData.numpages,
        text: pdfData.text ? pdfData.text.substring(0, 2000) : '', // First 2000 chars
        info: pdfData.info || {}
      };

      // Extract title from PDF metadata
      if (pdfData.info) {
        metadata.title = pdfData.info.Title || null;
        metadata.author = pdfData.info.Author || null;
        metadata.subject = pdfData.info.Subject || null;
        metadata.creator = pdfData.info.Creator || null;
        metadata.producer = pdfData.info.Producer || null;
        metadata.creationDate = pdfData.info.CreationDate || null;
      }

      // If no title/author in metadata, try to extract from content
      if (!metadata.title || !metadata.author) {
        const contentExtraction = this.extractTitleAuthorFromContent(pdfData.text);
        if (!metadata.title && contentExtraction.title) {
          metadata.title = contentExtraction.title;
        }
        if (!metadata.author && contentExtraction.author) {
          metadata.author = contentExtraction.author;
        }
      }

      console.log('📋 Extracted metadata:', {
        title: metadata.title,
        author: metadata.author,
        pages: metadata.pages,
        hasText: !!metadata.text
      });

      return metadata;

    } catch (error) {
      console.error('❌ Error extracting PDF metadata:', error.message);
      return {
        title: null,
        author: null,
        pages: null,
        text: '',
        error: error.message
      };
    }
  }

  /**
   * Extract title and author from PDF text content
   */
  extractTitleAuthorFromContent(text) {
    if (!text) return { title: null, author: null };

    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let title = null;
    let author = null;

    // Look for common patterns in the first few lines
    for (let i = 0; i < Math.min(20, lines.length); i++) {
      const line = lines[i];
      
      // Skip very short lines or lines with only numbers/symbols
      if (line.length < 3 || /^[\d\s\-_\.]+$/.test(line)) continue;
      
      // Look for "by" patterns
      const byMatch = line.match(/^(.+?)\s+by\s+(.+)$/i);
      if (byMatch) {
        title = byMatch[1].trim();
        author = byMatch[2].trim();
        break;
      }

      // Look for author patterns (usually after title)
      if (!title && line.length > 5 && line.length < 100) {
        // This might be a title
        title = line;
      } else if (title && !author && this.looksLikeAuthorName(line)) {
        author = line;
        break;
      }
    }

    // Clean up extracted data
    if (title) {
      title = this.cleanTitle(title);
    }
    if (author) {
      author = this.cleanAuthor(author);
    }

    return { title, author };
  }

  /**
   * Check if a line looks like an author name
   */
  looksLikeAuthorName(line) {
    // Author names are usually 2-4 words, mostly capitalized
    const words = line.split(/\s+/);
    if (words.length < 2 || words.length > 4) return false;
    
    // Check if most words start with capital letter
    const capitalizedWords = words.filter(word => /^[A-Z]/.test(word));
    return capitalizedWords.length >= words.length * 0.7;
  }

  /**
   * Clean extracted title
   */
  cleanTitle(title) {
    return title
      .replace(/^(TITLE|Title|title)[::\s]*/i, '')
      .replace(/[""'']/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Clean extracted author
   */
  cleanAuthor(author) {
    return author
      .replace(/^(BY|By|by|AUTHOR|Author|author)[::\s]*/i, '')
      .replace(/[""'']/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Generate cover from PDF first page with enhanced error handling
   */
  async generateCoverFromPDF(pdfPath, options = {}) {
    const {
      width = 600,
      height = 900,
      quality = 85,
      density = 200
    } = options;

    try {
      console.log('🎨 Generating cover from PDF first page...');
      
      if (!fs.existsSync(pdfPath)) {
        throw new Error('PDF file not found');
      }

      const stats = fs.statSync(pdfPath);
      console.log(`📄 PDF file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

      if (stats.size === 0) {
        throw new Error('PDF file is empty');
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const tempFilename = `temp-cover-${timestamp}-${randomId}`;
      const finalFilename = `pdf-cover-${timestamp}-${randomId}.jpg`;

      // Configure pdf2pic with multiple fallback options
      const convertOptions = [
        { density: 200, width: 800, height: 1200 },
        { density: 150, width: 600, height: 900 },
        { density: 100, width: 400, height: 600 }
      ];

      let result = null;
      let lastError = null;

      // Try different conversion options
      for (const option of convertOptions) {
        try {
          console.log(`🔄 Trying conversion with density ${option.density}...`);
          
          const convert = pdf2pic.fromPath(pdfPath, {
            density: option.density,
            saveFilename: tempFilename,
            savePath: this.outputDir,
            format: "png",
            width: option.width,
            height: option.height,
            page: 1
          });

          // Add timeout
          const extractionPromise = convert(1, { responseType: "image" });
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('PDF extraction timeout')), 30000)
          );

          result = await Promise.race([extractionPromise, timeoutPromise]);
          
          if (result && result.path && fs.existsSync(result.path)) {
            console.log('✅ PDF page extracted successfully');
            break;
          }
        } catch (error) {
          lastError = error;
          console.log(`❌ Conversion failed with density ${option.density}:`, error.message);
        }
      }

      if (!result || !result.path || !fs.existsSync(result.path)) {
        throw lastError || new Error('All conversion attempts failed');
      }

      // Optimize with sharp
      const optimizedPath = path.join(this.outputDir, finalFilename);
      
      await sharp(result.path)
        .resize(width, height, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 },
          withoutEnlargement: false
        })
        .jpeg({ 
          quality: quality,
          progressive: true
        })
        .toFile(optimizedPath);

      // Clean up temporary PNG
      if (fs.existsSync(result.path)) {
        fs.unlinkSync(result.path);
      }

      // Verify final file
      if (!fs.existsSync(optimizedPath)) {
        throw new Error('Failed to create optimized cover');
      }

      const finalStats = fs.statSync(optimizedPath);
      console.log(`✅ PDF cover generated: ${finalFilename} (${(finalStats.size / 1024).toFixed(2)} KB)`);

      return {
        success: true,
        coverPath: optimizedPath,
        filename: finalFilename,
        size: finalStats.size,
        type: 'pdf-extracted'
      };

    } catch (error) {
      console.error('❌ PDF cover generation failed:', error.message);
      this.cleanupTempFiles();
      return {
        success: false,
        error: error.message,
        type: 'pdf-failed'
      };
    }
  }

  /**
   * Create fallback text cover
   */
  async createFallbackCover(title, author, options = {}) {
    const {
      width = 600,
      height = 900,
      quality = 85
    } = options;

    try {
      console.log('🎨 Creating fallback text cover...');
      
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const coverFilename = `text-cover-${timestamp}-${randomId}.jpg`;
      const coverPath = path.join(this.outputDir, coverFilename);

      // Create enhanced SVG design
      const svg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
            </linearGradient>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
            </filter>
          </defs>
          
          <!-- Background -->
          <rect width="100%" height="100%" fill="url(#grad1)"/>
          
          <!-- Border -->
          <rect x="30" y="30" width="${width-60}" height="${height-60}" 
                fill="none" stroke="white" stroke-width="2" opacity="0.3" rx="10"/>
          
          <!-- Book icon -->
          <g transform="translate(${width/2-50}, 120)">
            <rect x="0" y="0" width="100" height="80" fill="white" opacity="0.9" rx="8" filter="url(#shadow)"/>
            <rect x="10" y="10" width="80" height="60" fill="none" stroke="#667eea" stroke-width="2"/>
            <line x1="20" y1="25" x2="70" y2="25" stroke="#667eea" stroke-width="1.5"/>
            <line x1="20" y1="35" x2="70" y2="35" stroke="#667eea" stroke-width="1.5"/>
            <line x1="20" y1="45" x2="60" y2="45" stroke="#667eea" stroke-width="1.5"/>
            <line x1="20" y1="55" x2="65" y2="55" stroke="#667eea" stroke-width="1.5"/>
          </g>
          
          <!-- Title -->
          <text x="${width/2}" y="280" text-anchor="middle" fill="white" 
                font-family="Georgia, serif" font-size="28" font-weight="bold" filter="url(#shadow)">
            ${this.wrapText(title, 18)}
          </text>
          
          <!-- Author -->
          <text x="${width/2}" y="350" text-anchor="middle" fill="white" 
                font-family="Georgia, serif" font-size="20" opacity="0.95" filter="url(#shadow)">
            by ${this.wrapText(author, 25)}
          </text>
          
          <!-- Decorative elements -->
          <circle cx="${width*0.2}" cy="${height*0.7}" r="4" fill="white" opacity="0.6"/>
          <circle cx="${width*0.8}" cy="${height*0.75}" r="3" fill="white" opacity="0.5"/>
          <circle cx="${width*0.3}" cy="${height*0.85}" r="2" fill="white" opacity="0.4"/>
          <circle cx="${width*0.7}" cy="${height*0.9}" r="2" fill="white" opacity="0.4"/>
          
          <!-- Bottom decoration -->
          <line x1="${width*0.3}" y1="${height-80}" x2="${width*0.7}" y2="${height-80}" 
                stroke="white" stroke-width="1" opacity="0.5"/>
          
          <!-- Library text -->
          <text x="${width/2}" y="${height-40}" text-anchor="middle" fill="white" 
                font-family="Arial, sans-serif" font-size="14" opacity="0.7">
            Digital Library
          </text>
        </svg>
      `;

      await sharp(Buffer.from(svg))
        .jpeg({ quality: quality })
        .toFile(coverPath);

      const stats = fs.statSync(coverPath);
      console.log(`✅ Text cover created: ${coverFilename} (${(stats.size / 1024).toFixed(2)} KB)`);

      return {
        success: true,
        coverPath: coverPath,
        filename: coverFilename,
        size: stats.size,
        type: 'text-generated'
      };

    } catch (error) {
      console.error('❌ Text cover creation failed:', error.message);
      return {
        success: false,
        error: error.message,
        type: 'text-failed'
      };
    }
  }

  /**
   * Wrap text to fit in cover
   */
  wrapText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    
    const words = text.split(' ');
    if (words.length === 1) {
      return text.substring(0, maxLength) + '...';
    }
    
    let result = '';
    for (const word of words) {
      if ((result + word).length <= maxLength) {
        result += (result ? ' ' : '') + word;
      } else {
        break;
      }
    }
    
    return result + (result.length < text.length ? '...' : '');
  }

  /**
   * Clean up temporary files
   */
  cleanupTempFiles() {
    try {
      const files = fs.readdirSync(this.outputDir);
      const tempFiles = files.filter(file => file.includes('temp-cover-'));
      
      tempFiles.forEach(file => {
        const filePath = path.join(this.outputDir, file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('🧹 Cleaned up temp file:', file);
        }
      });
    } catch (error) {
      console.error('❌ Error cleaning up temp files:', error.message);
    }
  }

  /**
   * Process PDF completely - extract metadata and generate cover
   */
  async processPDF(pdfPath, bookTitle = null, bookAuthor = null) {
    console.log('🔄 Processing PDF comprehensively...');
    
    // Extract metadata first
    const metadata = await this.extractPDFMetadata(pdfPath);
    
    // Use extracted metadata if book info not provided
    const finalTitle = bookTitle || metadata.title || 'Unknown Title';
    const finalAuthor = bookAuthor || metadata.author || 'Unknown Author';
    
    // Try to generate PDF cover first
    const pdfCover = await this.generateCoverFromPDF(pdfPath);
    
    let coverResult = null;
    
    if (pdfCover.success) {
      coverResult = pdfCover;
    } else {
      // Fallback to text cover
      console.log('📝 PDF cover failed, creating text cover...');
      const textCover = await this.createFallbackCover(finalTitle, finalAuthor);
      coverResult = textCover;
    }
    
    return {
      metadata: {
        ...metadata,
        finalTitle,
        finalAuthor
      },
      cover: coverResult
    };
  }
}

module.exports = PDFProcessor;