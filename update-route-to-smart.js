const fs = require('fs');
const path = require('path');

const routeFilePath = path.join(__dirname, 'src/routes/book.route.js');

// Read the file
let content = fs.readFileSync(routeFilePath, 'utf8');

// Replace the controller import
content = content.replace(
  /require\('\.\.\/controlers\/book\.controller\.debug-cover'\)/g,
  "require('../controlers/book.controller.smart-metadata')"
);

// Also update any other references
content = content.replace(
  /require\('\.\.\/controlers\/book\.controller\.enhanced-cover'\)/g,
  "require('../controlers/book.controller.smart-metadata')"
);

// Write the file back
fs.writeFileSync(routeFilePath, content);

console.log('✅ Updated route to use smart metadata controller');
console.log('🧠 New uploads will now use intelligent metadata extraction');
console.log('🔄 Please restart your backend server to activate smart extraction');