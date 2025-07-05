const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createDefaultCover() {
  try {
    console.log('🎨 Creating default book cover...');
    
    // Create simple SVG for default cover
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
          Book Title
        </text>
        
        <!-- Author -->
        <text x="300" y="340" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="20" opacity="0.95">
          by Author Name
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
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Create default cover
    const defaultCoverPath = path.join(uploadsDir, 'default-book-cover.jpg');
    
    await sharp(Buffer.from(svg))
      .jpeg({ quality: 85 })
      .toFile(defaultCoverPath);
    
    console.log('✅ Default cover created:', defaultCoverPath);
    
    // Also create icon-192.png for PWA
    const iconPath = path.join(uploadsDir, 'icon-192.png');
    
    const iconSvg = `
      <svg width="192" height="192" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad1)" rx="20"/>
        
        <!-- Book icon -->
        <rect x="76" y="60" width="40" height="32" fill="white" opacity="0.9" rx="4"/>
        <rect x="80" y="64" width="32" height="24" fill="none" stroke="#667eea" stroke-width="2"/>
        <line x1="84" y1="72" x2="108" y2="72" stroke="#667eea" stroke-width="1"/>
        <line x1="84" y1="76" x2="108" y2="76" stroke="#667eea" stroke-width="1"/>
        <line x1="84" y1="80" x2="104" y2="80" stroke="#667eea" stroke-width="1"/>
        
        <!-- Text -->
        <text x="96" y="120" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14" font-weight="bold">
          BookHub
        </text>
      </svg>
    `;
    
    await sharp(Buffer.from(iconSvg))
      .png()
      .toFile(iconPath);
    
    console.log('✅ App icon created:', iconPath);
    
    console.log('\n🎉 Default assets created successfully!');
    console.log('📱 These will be served by the backend to prevent 404 errors.');
    
  } catch (error) {
    console.error('❌ Error creating default cover:', error);
  }
}

createDefaultCover();