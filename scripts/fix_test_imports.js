const fs = require('fs');
const path = require('path');

// Files that need their imports fixed
const filesToFix = [
  'src/frontend/src/components/common/__tests__/ProtectedRoute.test.jsx',
  'src/frontend/src/components/common/__tests__/AuthRoute.test.jsx',
  'src/frontend/src/contexts/__tests__/AppContext.test.jsx'
];

filesToFix.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  
  try {
    // Read the file content
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Fix the import path
    const fixedContent = content.replace(
      /from ['"]\.\.\/\.\.\/\.\.\/\.\.\/test-utils['"]/g,
      "from '../../../test-utils'"
    );
    
    // Write the fixed content back to the file
    if (content !== fixedContent) {
      fs.writeFileSync(fullPath, fixedContent, 'utf8');
      console.log(`✅ Fixed imports in ${filePath}`);
    } else {
      console.log(`ℹ️  No changes needed for ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

console.log('\nImport fixing complete!');
