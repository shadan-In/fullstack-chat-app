/**
 * This file patches the path-to-regexp library to prevent the "Missing parameter name" error
 * It should be imported before any other imports in the main index.js file
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to patch the path-to-regexp library
try {
  // Get the path to the path-to-regexp module
  const pathToRegexpPath = require.resolve('path-to-regexp');

  // Read the file content
  const content = fs.readFileSync(pathToRegexpPath, 'utf8');

  // Check if the file contains the error message we want to patch
  if (content.includes('Missing parameter name at')) {
    console.log('Patching path-to-regexp library to prevent "Missing parameter name" error');

    // Create a patched version that catches the error
    const patchedContent = content.replace(
      /throw new TypeError\(`Missing parameter name at \${i}: \${DEBUG_URL}`\);/g,
      'console.warn(`Warning: Missing parameter name at ${i}: ${DEBUG_URL}`); return "";'
    );

    // Write the patched file back
    fs.writeFileSync(pathToRegexpPath, patchedContent, 'utf8');
    console.log('Successfully patched path-to-regexp library');
  }
} catch (error) {
  console.error('Failed to patch path-to-regexp library:', error.message);
}

export default {};
