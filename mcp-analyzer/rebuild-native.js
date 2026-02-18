#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('Rebuilding native modules for Electron...');

try {
  // Get electron version from package.json
  const pkg = require('./package.json');
  const electronVersion = pkg.devDependencies.electron.replace('^', '');
  
  console.log(`Electron version: ${electronVersion}`);
  
  // Rebuild better-sqlite3 for Electron
  execSync(
    `npx electron-rebuild -f -w better-sqlite3 -v ${electronVersion}`,
    { 
      stdio: 'inherit',
      cwd: __dirname
    }
  );
  
  console.log('✓ Native modules rebuilt successfully!');
} catch (error) {
  console.error('Failed to rebuild native modules:', error.message);
  console.log('\nTry running manually:');
  console.log('  npm install --save-dev electron-rebuild');
  console.log('  npx electron-rebuild');
  process.exit(1);
}
