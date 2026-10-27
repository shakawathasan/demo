import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db.ts';

export const bkashRouter = Router();

// Multer setup for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WebP) and PDFs are allowed'));
    }
  },
});

// 1. Get bKash configuration (Tuition bKash number, Merchant/Personal, QR url, instructions)
bkashRouter.get('/config', (req, res) => {
  const state = db.getState();
  const settings = state.settings;
  res.json({
    bkashNumber: settings.bkashNumber,
    bkashAccountType: settings.bkashAccountType,
    bkashQrUrl: settings.bkashQrUrl,
    bkashInstructions: settings.bkashInstructions,
    tuitionName: settings.tuitionName,
  });
});

// 2. Update bKash configuration (Admin only)
bkashRouter.patch('/config', upload.single('qrImage'), (req, res) => {
  try {
    const { bkashNumber, bkashAccountType, bkashInstructions } = req.body;
    const state = db.getState();

    if (bkashNumber) {
      state.settings.bkashNumber = bkashNumber.trim();
    }
    if (bkashAccountType) {
      state.settings.bkashAccountType = bkashAccountType;
    }
    if (bkashInstructions) {
      state.settings.bkashInstructions = bkashInstructions;
    }
    if (req.file) {
      state.settings.bkashQrUrl = `/uploads/${req.file.filename}`;
    }

    db.save();

    db.logAudit(
      'Admin',
      'Admin',
      'UPDATE_BKASH_CONFIG',
      'Settings',
      'bkash',
      `Updated bKash settings: Number=${state.settings.bkashNumber}, Type=${state.settings.bkashAccountType}`
    );

    res.json({ success: true, settings: state.settings });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 3. Parent Submits bKash payment verification request
bkashRouter.post('/submit', upload.single('screenshot'), (req, res) => {
  try {
    const { studentId, feeObligationId, amount, bKashNumber, transactionId } = req.body;

    if (!studentId || !feeObligationId || !amount || !transactionId || !bKashNumber) {
      return res.status(400).json({
        error: 'studentId, feeObligationId, amount, bKashNumber, and transactionId are required',
      });
    }

    let screenshotUrl = undefined;
    if (req.file) {
      screenshotUrl = `/uploads/${req.file.filename}`;
    }

    const submission = db.submitBkashPayment({
      studentId,
      feeObligationId,
      amount: Number(amount),
      bKashNumber,
      transactionId,
      screenshotUrl,
    });

    res.status(201).json({
      success: true,
      message: 'bKash payment submitted successfully. Status: Pending Verification by Admin.',
      submission,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 4. List Submissions for Admin Verification Queue
bkashRouter.get('/submissions', (req, res) => {
  const { status } = req.query;
  const state = db.getState();

  let list = state.bkashSubmissions;
  if (status && status !== 'all') {
    list = list.filter((s) => s.status === status);
  }

  res.json({ submissions: list });
});

// 5. Admin Approves bKash Submission
bkashRouter.post('/submissions/:id/approve', (req, res) => {
  try {
    const { id } = req.params;
    const { reviewedBy = 'Admin' } = req.body;

    const result = db.approveBkashSubmission(id, reviewedBy);
    res.json({
      success: true,
      message: `bKash payment approved. Issued receipt: ${result.payment.receiptNumber}`,
      submission: result.submission,
      payment: result.payment,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 6. Admin Rejects bKash Submission
bkashRouter.post('/submissions/:id/reject', (req, res) => {
  try {
    const { id } = req.params;
    const { reason, reviewedBy = 'Admin' } = req.body;

    const submission = db.rejectBkashSubmission(id, reason, reviewedBy);
    res.json({
      success: true,
      message: 'bKash submission rejected.',
      submission,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
