const path = require('path');
const fs = require('fs');
const pdf2pic = require('pdf2pic');
const sharp = require('sharp');

/**
 * Enhanced PDF Cover Generator Utility
 * Provides robust cover generation with multiple fallback options
 */
class CoverGenerator {
  constructor() {
    this.defaultCoverPath = path.join(__dirname, '../assets/default-book-cover.jpg');
    this.outputDir = path.join(__dirname, '../../uploads/covers');
    
    // Ensure output directory exists
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
   * Generate cover from PDF first page with enhanced error handling
   * @param {string} pdfPath - Path to the PDF file
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Cover generation result
   */
  async generateCoverFromPDF(pdfPath, options = {}) {
    const {
      width = 600,
      height = 900,
      quality = 85,
      density = 300,
      timeout = 30000 // 30 seconds timeout
    } = options;

    console.log('🎨 Starting cover generation for:', path.basename(pdfPath));

    try {
      // Validate PDF file exists and is readable
      if (!fs.existsSync(pdfPath)) {
        throw new Error('PDF file not found');
      }

      const stats = fs.statSync(pdfPath);
      if (stats.size === 0) {
        throw new Error('PDF file is empty');
      }

      console.log(`📄 PDF file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

      // Generate unique filename for the cover
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const coverFilename = `cover-${timestamp}-${randomId}.jpg`;
      const tempPngPath = path.join(this.outputDir, `temp-${timestamp}-${randomId}.png`);
      const finalCoverPath = path.join(this.outputDir, coverFilename);

      // Configure pdf2pic with timeout and error handling
      const convert = pdf2pic.fromPath(pdfPath, {
        density: density,
        saveFilename: `temp-${timestamp}-${randomId}`,
        savePath: this.outputDir,
        format: "png",
        width: Math.round(width * 1.33), // Higher resolution for better quality
        height: Math.round(height * 1.33),
        page: 1 // First page only
      });

      console.log('🖼️ Extracting first page from PDF...');

      // Extract first page with timeout
      const extractionPromise = convert(1, { responseType: "image" });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('PDF extraction timeout')), timeout)
      );

      const result = await Promise.race([extractionPromise, timeoutPromise]);

      if (!result || !result.path || !fs.existsSync(result.path)) {
        throw new Error('Failed to extract PDF page');
      }

      console.log('✅ PDF page extracted successfully');

      // Optimize and resize with sharp
      console.log('🔧 Optimizing image...');
      
      await sharp(result.path)
        .resize(width, height, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 },
          withoutEnlargement: false
        })
        .jpeg({ 
          quality: quality,
          progressive: true,
          mozjpeg: true
        })
        .toFile(finalCoverPath);

      // Clean up temporary PNG file
      if (fs.existsSync(result.path)) {
        fs.unlinkSync(result.path);
      }

      // Verify final cover was created
      if (!fs.existsSync(finalCoverPath)) {
        throw new Error('Failed to create optimized cover');
      }

      const finalStats = fs.statSync(finalCoverPath);
      console.log(`✅ Cover generated: ${coverFilename} (${(finalStats.size / 1024).toFixed(2)} KB)`);

      return {
        success: true,
        coverPath: finalCoverPath,
        coverUrl: `/uploads/covers/${coverFilename}`,
        filename: coverFilename,
        size: finalStats.size,
        mimeType: 'image/jpeg',
        isGenerated: true,
        generatedAt: new Date(),
        dimensions: { width, height },
        quality: quality
      };

    } catch (error) {
      console.error('❌ Cover generation failed:', error.message);
      
      // Clean up any temporary files
      this.cleanupTempFiles();

      return {
        success: false,
        error: error.message,
        fallback: await this.createFallbackCover(options)
      };
    }
  }

  /**
   * Create a fallback cover with book title and author
   * @param {Object} bookInfo - Book information
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Fallback cover result
   */
  async createFallbackCover(bookInfo = {}, options = {}) {
    const {
      width = 600,
      height = 900,
      backgroundColor = '#4F46E5', // Indigo
      textColor = '#FFFFFF'
    } = options;

    try {
      console.log('🎨 Creating fallback cover...');

      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const coverFilename = `fallback-cover-${timestamp}-${randomId}.jpg`;
      const fallbackCoverPath = path.join(this.outputDir, coverFilename);

      // Create a simple colored background with text
      const svg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="${backgroundColor}"/>
          <text x="50%" y="40%" text-anchor="middle" fill="${textColor}" 
                font-family="Arial, sans-serif" font-size="36" font-weight="bold">
            ${bookInfo.title || 'Book Title'}
          </text>
          <text x="50%" y="60%" text-anchor="middle" fill="${textColor}" 
                font-family="Arial, sans-serif" font-size="24">
            ${bookInfo.author || 'Author Name'}
          </text>
          <text x="50%" y="80%" text-anchor="middle" fill="${textColor}" 
                font-family="Arial, sans-serif" font-size="18" opacity="0.8">
            ${bookInfo.genre || 'Book'}
          </text>
        </svg>
      `;

      await sharp(Buffer.from(svg))
        .jpeg({ quality: 85 })
        .toFile(fallbackCoverPath);

      const stats = fs.statSync(fallbackCoverPath);

      console.log(`✅ Fallback cover created: ${coverFilename}`);

      return {
        success: true,
        coverPath: fallbackCoverPath,
        coverUrl: `/uploads/covers/${coverFilename}`,
        filename: coverFilename,
        size: stats.size,
        mimeType: 'image/jpeg',
        isGenerated: true,
        isFallback: true,
        generatedAt: new Date()
      };

    } catch (error) {
      console.error('❌ Fallback cover creation failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clean up temporary files
   */
  cleanupTempFiles() {
    try {
      const files = fs.readdirSync(this.outputDir);
      const tempFiles = files.filter(file => file.startsWith('temp-'));
      
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
   * Get cover generation statistics
   * @returns {Object} Statistics about generated covers
   */
  getStatistics() {
    try {
      const files = fs.readdirSync(this.outputDir);
      const coverFiles = files.filter(file => 
        file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png')
      );

      const totalSize = coverFiles.reduce((sum, file) => {
        const filePath = path.join(this.outputDir, file);
        const stats = fs.statSync(filePath);
        return sum + stats.size;
      }, 0);

      return {
        totalCovers: coverFiles.length,
        totalSize: totalSize,
        averageSize: coverFiles.length > 0 ? Math.round(totalSize / coverFiles.length) : 0,
        directory: this.outputDir
      };
    } catch (error) {
      console.error('❌ Error getting statistics:', error.message);
      return {
        totalCovers: 0,
        totalSize: 0,
        averageSize: 0,
        directory: this.outputDir,
        error: error.message
      };
    }
  }
}

// Export singleton instance
const coverGenerator = new CoverGenerator();

module.exports = {
  CoverGenerator,
  coverGenerator,
  
  // Convenience functions
  generateCoverFromPDF: (pdfPath, options) => 
    coverGenerator.generateCoverFromPDF(pdfPath, options),
    
  createFallbackCover: (bookInfo, options) => 
    coverGenerator.createFallbackCover(bookInfo, options),
    
  getStatistics: () => 
    coverGenerator.getStatistics()
};