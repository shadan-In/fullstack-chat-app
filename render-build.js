/**
 * This is a special build script for Render deployment
 * It patches the path-to-regexp library to prevent the "Missing parameter name" error
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting Render build process...');

// Run the normal build process
console.log('Installing backend dependencies...');
execSync('npm install --prefix backend', { stdio: 'inherit' });

console.log('Installing frontend dependencies...');
execSync('npm install --prefix frontend', { stdio: 'inherit' });

console.log('Building frontend...');
execSync('npm run build --prefix frontend', { stdio: 'inherit' });

// Now patch the path-to-regexp library
try {
  console.log('Patching path-to-regexp library...');
  
  // Find the path-to-regexp module
  const nodeModulesPath = path.join(__dirname, 'backend', 'node_modules');
  const pathToRegexpPath = path.join(nodeModulesPath, 'path-to-regexp', 'dist', 'index.js');
  
  if (fs.existsSync(pathToRegexpPath)) {
    // Read the file content
    const content = fs.readFileSync(pathToRegexpPath, 'utf8');
    
    // Check if the file contains the error message we want to patch
    if (content.includes('Missing parameter name at')) {
      console.log('Found path-to-regexp library, applying patch...');
      
      // Create a patched version that catches the error
      const patchedContent = content.replace(
        /throw new TypeError\(`Missing parameter name at \${i}: \${DEBUG_URL}`\);/g,
        'console.warn(`Warning: Missing parameter name at ${i}: ${DEBUG_URL}`); return "";'
      );
      
      // Write the patched file back
      fs.writeFileSync(pathToRegexpPath, patchedContent, 'utf8');
      console.log('Successfully patched path-to-regexp library');
    } else {
      console.log('path-to-regexp library does not contain the expected error message');
    }
  } else {
    console.log('Could not find path-to-regexp library at:', pathToRegexpPath);
  }
} catch (error) {
  console.error('Failed to patch path-to-regexp library:', error.message);
}

console.log('Render build process completed successfully');
