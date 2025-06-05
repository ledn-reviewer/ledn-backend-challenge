import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, 'src');

function findTestFiles(dir, extension) {
  const result = [];
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      result.push(...findTestFiles(filePath, extension));
    } else if (file.endsWith(extension)) {
      result.push(filePath);
    }
  }

  return result;
}

const specFiles = findTestFiles(srcDir, '.spec.ts');
console.log('Found', specFiles.length, 'spec files:');
specFiles.forEach(file => console.log('- ' + file));
