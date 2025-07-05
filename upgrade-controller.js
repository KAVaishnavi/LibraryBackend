const fs = require('fs');
const path = require('path');

// Script to upgrade the book controller with enhanced PDF processing
async function upgradeController() {
  console.log('🔄 Upgrading Book Controller with Enhanced PDF Processing...\n');
  
  const originalController = path.join(__dirname, 'src/controlers/book.controller.js');
  const enhancedController = path.join(__dirname, 'src/controlers/book.controller.enhanced.js');
  const backupController = path.join(__dirname, 'src/controlers/book.controller.backup.js');
  
  try {
    // Read the original controller
    console.log('📖 Reading original controller...');
    const originalContent = fs.readFileSync(originalController, 'utf8');
    
    // Read the enhanced controller
    console.log('📖 Reading enhanced controller...');
    const enhancedContent = fs.readFileSync(enhancedController, 'utf8');
    
    // Extract all the other functions from original controller
    console.log('🔍 Extracting existing functions...');
    
    // Find all exported functions in original
    const functionMatches = originalContent.match(/const \w+ = async \(req, res\) => {[\s\S]*?};/g) || [];
    const otherFunctions = [];
    
    // Get functions that are not createBook
    functionMatches.forEach(func => {
      if (!func.includes('const createBook =')) {
        otherFunctions.push(func);
      }
    });
    
    // Extract the module.exports section
    const exportsMatch = originalContent.match(/module\.exports = {[\s\S]*?};/);
    let exportsSection = '';
    if (exportsMatch) {
      exportsSection = exportsMatch[0];
    }
    
    // Create the new enhanced controller with all functions
    console.log('🔧 Building enhanced controller...');
    
    let newController = enhancedContent;
    
    // Add the other functions
    if (otherFunctions.length > 0) {
      const insertPoint = newController.lastIndexOf('// Export the enhanced createBook function');
      const functionsToAdd = '\n\n' + otherFunctions.join('\n\n') + '\n\n';
      newController = newController.substring(0, insertPoint) + functionsToAdd + newController.substring(insertPoint);
    }
    
    // Replace the exports section
    if (exportsSection) {
      newController = newController.replace(
        /module\.exports = {[\s\S]*?};/,
        exportsSection
      );
    }
    
    // Create backup of original
    console.log('💾 Creating backup of original controller...');
    fs.writeFileSync(backupController, originalContent);
    
    // Write the new enhanced controller
    console.log('✍️ Writing enhanced controller...');
    fs.writeFileSync(originalController, newController);
    
    console.log('✅ Controller upgrade completed successfully!\n');
    
    console.log('📋 What was enhanced:');
    console.log('====================');
    console.log('✅ PDF metadata extraction (exact title & author from PDF content)');
    console.log('✅ Enhanced PDF first page cover generation');
    console.log('✅ Beautiful fallback text covers');
    console.log('✅ Multiple extraction methods with fallbacks');
    console.log('✅ Guaranteed cover generation (every book gets a cover)');
    console.log('✅ Better error handling and logging');
    
    console.log('\n🔄 Next steps:');
    console.log('==============');
    console.log('1. Restart your backend server');
    console.log('2. Upload a PDF book to test the enhanced features');
    console.log('3. Check console logs for detailed processing info');
    console.log('4. Verify covers are generated in /uploads/covers/');
    
    console.log('\n📁 Files created/modified:');
    console.log('=========================');
    console.log('✅ Enhanced PDF processor: src/utils/pdfProcessor.js');
    console.log('✅ Backup created: src/controlers/book.controller.backup.js');
    console.log('✅ Main controller upgraded: src/controlers/book.controller.js');
    
  } catch (error) {
    console.error('❌ Error upgrading controller:', error);
    console.log('\n🔧 Manual steps if upgrade failed:');
    console.log('1. Check that all files exist');
    console.log('2. Manually copy enhanced functions');
    console.log('3. Restart backend server');
  }
}

// Run upgrade
if (require.main === module) {
  upgradeController().catch(console.error);
}

module.exports = { upgradeController };