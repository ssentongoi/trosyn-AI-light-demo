const fs = require('fs');
const path = require('path');

// List of files to update
const filesToUpdate = [
  'src/pages/SuperadminDashboard.jsx',
  'src/pages/LicensingSync.jsx',
  'src/pages/Register.jsx',
  'src/pages/CompanyHub.jsx',
  'src/pages/Dashboard.jsx',
  'src/pages/DeviceRegistration.jsx',
  'src/pages/AIAssistant.backup.jsx',
  'src/pages/AdminDashboard.jsx'
];

// Update each file
filesToUpdate.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  
  try {
    // Read the file
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Update the import statement
    const updatedContent = content.replace(
      /from ['"]\.\.\/contexts\/AuthContext['"]/g,
      "from '../contexts/AuthContext'"
    );
    
    // Write the updated content back to the file
    fs.writeFileSync(fullPath, updatedContent, 'utf8');
    console.log(`✅ Updated imports in ${filePath}`);
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
});

console.log('\nImport updates complete!');
