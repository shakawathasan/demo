import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { db } from '../db.ts';

export const exportRouter = Router();

// 1. Download Full Database JSON
exportRouter.get('/backup-json', (req, res) => {
  const state = db.getState();
  const filename = `tuition-management-backup-${new Date().toISOString().slice(0, 10)}.json`;

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(JSON.stringify(state, null, 2));
});

// 2. Download Verified Project ZIP
exportRouter.get('/project-zip', (req, res) => {
  try {
    const zip = new AdmZip();
    const rootDir = process.cwd();

    // Files to include
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
      }
    }

    // Include /src recursively
    const srcDir = path.join(rootDir, 'src');
    if (fs.existsSync(srcDir)) {
      zip.addLocalFolder(srcDir, 'src');
    }

    // Include /data sample
    const dataDir = path.join(rootDir, 'data');
    if (fs.existsSync(dataDir)) {
      zip.addLocalFolder(dataDir, 'data');
    }

    const zipBuffer = zip.toBuffer();

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="shikho-tuition-bangladesh.zip"');
    res.setHeader('Content-Length', zipBuffer.length.toString());
    res.send(zipBuffer);
  } catch (err: any) {
    console.error('Failed to create project ZIP:', err);
    res.status(500).json({ error: 'Failed to generate project archive' });
  }
});
