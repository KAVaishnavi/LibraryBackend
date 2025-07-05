const fs = require('fs');
const path = require('path');

// Check which version of the controller is actually being used
function checkControllerVersion() {
  console.log('🔍 Checking Controller Version...\n');
  
  const controllerPath = path.join(__dirname, 'src/controlers/book.controller.js');
  
  try {
    const content = fs.readFileSync(controllerPath, 'utf8');
    
    console.log('📋 Controller Analysis:');
    console.log('======================');
    
    // Check for enhanced features
    const hasEnhancedPDF = content.includes('PDFProcessor');
    const hasGuaranteedCover = content.includes('GUARANTEED COVER');
    const hasMetadataExtraction = content.includes('extractPDFMetadata');
    const hasEnhancedLogging = content.includes('ENHANCED book creation');
    
    console.log('✅ Enhanced PDF Processor:', hasEnhancedPDF ? 'YES' : 'NO');
    console.log('✅ Guaranteed Cover Generation:', hasGuaranteedCover ? 'YES' : 'NO');
    console.log('✅ PDF Metadata Extraction:', hasMetadataExtraction ? 'YES' : 'NO');
    console.log('✅ Enhanced Logging:', hasEnhancedLogging ? 'YES' : 'NO');
    
    // Check if createFallbackCover function exists
    const hasFallbackFunction = content.includes('createFallbackCover');
    console.log('✅ Fallback Cover Function:', hasFallbackFunction ? 'YES' : 'NO');
    
    // Check if the enhanced createBook function is being used
    const createBookMatch = content.match(/const createBook = async \(req, res\) => {([\s\S]*?)};/);
    if (createBookMatch) {
      const createBookContent = createBookMatch[1];
      const isEnhanced = createBookContent.includes('ENHANCED') || createBookContent.includes('processPDF');
      console.log('✅ Enhanced createBook Function:', isEnhanced ? 'YES' : 'NO');
      
      if (!isEnhanced) {
        console.log('\n⚠️ WARNING: Using old createBook function!');
        console.log('   The enhanced controller may not have been applied correctly.');
      }
    }
    
    // Check for PDF processor import
    const hasPDFProcessorImport = content.includes("require('../utils/pdfProcessor')");
    console.log('✅ PDF Processor Import:', hasPDFProcessorImport ? 'YES' : 'NO');
    
    // Check if PDF processor file exists
    const pdfProcessorPath = path.join(__dirname, 'src/utils/pdfProcessor.js');
    const pdfProcessorExists = fs.existsSync(pdfProcessorPath);
    console.log('✅ PDF Processor File Exists:', pdfProcessorExists ? 'YES' : 'NO');
    
    console.log('\n📊 Summary:');
    console.log('===========');
    
    if (hasEnhancedPDF && hasGuaranteedCover && pdfProcessorExists) {
      console.log('✅ Enhanced system is properly installed');
      console.log('✅ All components are present');
      
      // Check if server needs restart
      console.log('\n🔄 Next Steps:');
      console.log('1. Restart the backend server to ensure changes are loaded');
      console.log('2. Try uploading a PDF file');
      console.log('3. Check console logs for enhanced processing messages');
      
    } else {
      console.log('❌ Enhanced system is NOT properly installed');
      console.log('\n🔧 Issues found:');
      if (!hasEnhancedPDF) console.log('   - PDF Processor not imported');
      if (!hasGuaranteedCover) console.log('   - Guaranteed cover logic missing');
      if (!pdfProcessorExists) console.log('   - PDF Processor file missing');
      
      console.log('\n🛠️ Fix required:');
      console.log('   Run the upgrade script again or manually apply changes');
    }
    
  } catch (error) {
    console.error('❌ Error checking controller:', error.message);
  }
}

// Run check
if (require.main === module) {
  checkControllerVersion();
}

module.exports = { checkControllerVersion };