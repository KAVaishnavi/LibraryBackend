// Quick fix to add guaranteed cover generation to existing book controller

const fs = require('fs');
const path = require('path');

// Read the current book controller
const controllerPath = path.join(__dirname, 'src/controlers/book.controller.js');
let content = fs.readFileSync(controllerPath, 'utf8');

// Check if fallback cover function already exists
if (!content.includes('createFallbackCover')) {
  console.log('Adding fallback cover function...');
  
  // Add the fallback cover function after the imports
  const fallbackFunction = `
// Function to create a simple text-based cover as fallback
const createFallbackCover = async (title, author, outputDir) => {
  try {
    console.log('Creating fallback text cover...');
    
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const coverFilename = \`fallback-cover-\${timestamp}-\${randomId}.jpg\`;
    const coverPath = path.join(outputDir, coverFilename);
    
    // Create SVG with book info
    const svg = \`
      <svg width="600" height="900" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#7C3AED;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad1)"/>
        <rect x="50" y="50" width="500" height="800" fill="none" stroke="white" stroke-width="3" opacity="0.3"/>
        
        <!-- Book icon -->
        <rect x="250" y="150" width="100" height="80" fill="white" opacity="0.8" rx="5"/>
        <rect x="260" y="160" width="80" height="60" fill="none" stroke="#4F46E5" stroke-width="2"/>
        <line x1="270" y1="170" x2="330" y2="170" stroke="#4F46E5" stroke-width="1"/>
        <line x1="270" y1="180" x2="330" y2="180" stroke="#4F46E5" stroke-width="1"/>
        <line x1="270" y1="190" x2="320" y2="190" stroke="#4F46E5" stroke-width="1"/>
        
        <!-- Title -->
        <text x="300" y="320" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="32" font-weight="bold">
          \${title.length > 20 ? title.substring(0, 20) + '...' : title}
        </text>
        
        <!-- Author -->
        <text x="300" y="380" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="24" opacity="0.9">
          by \${author.length > 25 ? author.substring(0, 25) + '...' : author}
        </text>
        
        <!-- Decorative elements -->
        <circle cx="150" cy="600" r="3" fill="white" opacity="0.6"/>
        <circle cx="450" cy="650" r="3" fill="white" opacity="0.6"/>
        <circle cx="200" cy="700" r="2" fill="white" opacity="0.4"/>
        <circle cx="400" cy="750" r="2" fill="white" opacity="0.4"/>
        
        <!-- Bottom text -->
        <text x="300" y="820" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="16" opacity="0.7">
          Digital Library
        </text>
      </svg>
    \`;
    
    // Convert SVG to JPEG using sharp
    await sharp(Buffer.from(svg))
      .jpeg({ quality: 85 })
      .toFile(coverPath);
    
    console.log('Fallback cover created:', coverFilename);
    return coverPath;
    
  } catch (error) {
    console.error('Error creating fallback cover:', error);
    return null;
  }
};

`;

  // Insert after the sharp import
  content = content.replace(
    "const sharp = require('sharp');",
    "const sharp = require('sharp');" + fallbackFunction
  );
}

// Add guaranteed cover generation logic
if (!content.includes('GUARANTEED COVER')) {
  console.log('Adding guaranteed cover generation...');
  
  // Find the cover generation section and replace it
  const oldCoverLogic = /\/\/ Always try to generate cover from PDF[\s\S]*?\/\/ Continue without cover - not a critical error[\s\S]*?}\s*}/;
  
  const newCoverLogic = `// GUARANTEED COVER GENERATION - Always create a cover
    if (!coverImageProcessed) {
      const coversDir = path.join(__dirname, '../../uploads/covers');
      
      // Method 1: Try PDF cover generation if it's a PDF
      if (bookData.bookFile && bookData.metadata.fileFormat === 'PDF') {
        console.log('Attempting PDF cover generation...');
        try {
          const pdfPath = path.join(__dirname, '../../', bookData.bookFile.url);
          console.log('PDF file path:', pdfPath);
          console.log('Covers directory:', coversDir);
          
          const generatedCoverPath = await generateCoverFromPDF(pdfPath, coversDir);
          
          if (generatedCoverPath) {
            const coverFilename = path.basename(generatedCoverPath);
            bookData.coverImage = {
              url: \`/uploads/covers/\${coverFilename}\`,
              filename: coverFilename,
              originalName: \`\${bookData.title}-cover.jpg\`,
              size: fs.statSync(generatedCoverPath).size,
              mimeType: 'image/jpeg',
              isGenerated: true
            };
            console.log('SUCCESS: PDF cover generated!');
            coverImageProcessed = true;
          } else {
            console.log('PDF cover generation failed, trying fallback...');
          }
        } catch (error) {
          console.error('PDF cover generation error:', error.message);
        }
      }
      
      // Method 2: Create fallback text cover if PDF method failed or not applicable
      if (!coverImageProcessed) {
        console.log('Creating fallback text cover...');
        try {
          const fallbackCoverPath = await createFallbackCover(bookData.title, bookData.author, coversDir);
          
          if (fallbackCoverPath) {
            const coverFilename = path.basename(fallbackCoverPath);
            bookData.coverImage = {
              url: \`/uploads/covers/\${coverFilename}\`,
              filename: coverFilename,
              originalName: \`\${bookData.title}-fallback-cover.jpg\`,
              size: fs.statSync(fallbackCoverPath).size,
              mimeType: 'image/jpeg',
              isGenerated: true,
              isFallback: true
            };
            console.log('SUCCESS: Fallback cover created!');
            coverImageProcessed = true;
          }
        } catch (fallbackError) {
          console.error('Fallback cover creation failed:', fallbackError.message);
        }
      }
    }`;
  
  if (oldCoverLogic.test(content)) {
    content = content.replace(oldCoverLogic, newCoverLogic);
    console.log('Replaced existing cover logic');
  } else {
    console.log('Could not find existing cover logic to replace');
    // Try to find a different pattern
    const insertPoint = content.indexOf('// Handle URL-based uploads');
    if (insertPoint !== -1) {
      content = content.substring(0, insertPoint) + newCoverLogic + '\n\n    ' + content.substring(insertPoint);
      console.log('Inserted cover logic before URL handling');
    }
  }
}

// Write the updated content back
fs.writeFileSync(controllerPath, content, 'utf8');
console.log('Book controller updated with guaranteed cover generation!');

console.log('\\nNext steps:');
console.log('1. Restart your backend server');
console.log('2. Upload a new PDF book');
console.log('3. Check if cover is generated automatically');
console.log('4. Look for "SUCCESS: Fallback cover created!" in logs');