#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';

console.log('Test Diagnostics Script');
console.log('======================\n');

// Check for spec files
console.log('Checking for .spec.ts files in src directory:');
const findSpecFilesOutput = execSync('find src -name "*.spec.ts"').toString();
console.log(findSpecFilesOutput || 'No spec files found');
console.log('\n');

// Verify Jest configuration
console.log('Jest Configuration:');
try {
  const jestConfig = fs.readFileSync('jest.config.js', 'utf8');
  console.log(jestConfig);
} catch {
  console.error('Error reading jest.config.js');
}
console.log('\n');

// Run a basic Jest test with detailed output
console.log('Running Jest with --verbose flag:');
try {
  const jestOutput = execSync('jest "src/middleware/validators.spec.ts" --verbose', {
    stdio: 'inherit'
  });
  console.log(jestOutput || 'Command executed successfully');
} catch {
  console.error('Error running Jest - check the error output above');
}

console.log('Done.');
