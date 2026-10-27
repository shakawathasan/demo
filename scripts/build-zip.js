import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';

const zip = new AdmZip();
const rootDir = process.cwd();

const filesToInclude = [
  'package.json',
  'tsconfig.json',
  'vite.config.ts',
  'metadata.json',
  'index.html',
  '.env.example',
  'README.md',
  'DEPLOYMENT.md',
  'WHATSAPP_DOCS.md',
  'BKASH_GUIDE.md',
  'TEST_REPORT.md',
  'server.ts',
];

for (const f of filesToInclude) {
  const fullPath = path.join(rootDir, f);
  if (fs.existsSync(fullPath)) {
    zip.addLocalFile(fullPath);
    console.log(`Added file: ${f}`);
  }
}

if (fs.existsSync(path.join(rootDir, 'src'))) {
  zip.addLocalFolder(path.join(rootDir, 'src'), 'src');
  console.log('Added folder: src');
}

if (fs.existsSync(path.join(rootDir, 'data'))) {
  zip.addLocalFolder(path.join(rootDir, 'data'), 'data');
  console.log('Added folder: data');
}

const outPath = path.join(rootDir, 'tuition-management-bangladesh.zip');
zip.writeZip(outPath);

const stats = fs.statSync(outPath);
console.log(`ZIP successfully generated at ${outPath} (${(stats.size / 1024).toFixed(1)} KB)`);
