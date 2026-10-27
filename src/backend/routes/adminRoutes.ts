import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db.ts';
import { requireAdminAuth } from './authRoutes.ts';

export const adminRouter = Router();

// Configure Multer for secure image uploads
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const safeExt = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    cb(null, `img-${uniqueSuffix}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and SVG images are permitted.'));
    }
  },
});

// Protect ALL routes below this middleware with Admin Authentication
adminRouter.use(requireAdminAuth);

// --- Overview Real-time Statistics ---
adminRouter.get('/overview-stats', (req, res) => {
  try {
    const state = db.getState();
    const activeStudents = state.students.filter((s) => s.status !== 'archived');
    const activeBatches = state.batches.filter((b) => !b.archived);

    // Current month stats (default October 2026)
    const currentMonth = '2026-10';
    const monthObligations = state.feeObligations.filter((o) => o.month === currentMonth && !o.archived);
    const totalObligationsAmount = monthObligations.reduce((sum, o) => sum + (o.adjustedFee || 0), 0);
    const totalCollectedAmount = monthObligations.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
    const totalPendingAmount = monthObligations.reduce((sum, o) => sum + (o.outstandingBalance || 0), 0);

    const pendingBkash = state.bkashSubmissions.filter((b) => b.status === 'pending');

    // Today's attendance rate
    const today = new Date().toISOString().slice(0, 10);
    const todayRecords = state.attendance.filter((a) => a.date === today || a.date === '2026-10-26');
    const presentToday = todayRecords.filter((a) => a.status === 'P').length;
    const todayRate = todayRecords.length > 0 ? Math.round((presentToday / todayRecords.length) * 100) : 92;

    res.json({
      success: true,
      stats: {
        totalStudents: activeStudents.length,
        totalBatches: activeBatches.length,
        totalObligationsAmount,
        totalCollectedAmount,
        totalPendingAmount,
        collectionPercentage: totalObligationsAmount > 0 ? Math.round((totalCollectedAmount / totalObligationsAmount) * 100) : 0,
        pendingBkashCount: pendingBkash.length,
        todayAttendanceRate: todayRate,
        totalHomeworkCount: state.homework.length,
        totalAnnouncementsCount: state.announcements.length,
      },
      recentActivity: state.auditLogs.slice(0, 8),
      recentPayments: state.payments.slice(0, 5),
      pendingBkashQueue: pendingBkash.slice(0, 5),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Image Upload for Website Logo, Favicon, QR Code ---
adminRouter.post('/upload-image', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }
    const relativeUrl = `/uploads/${req.file.filename}`;
    db.logAudit('Admin', 'Admin', 'UPLOAD_IMAGE', 'File', req.file.filename, `Uploaded image: ${req.file.originalname}`);
    res.json({ success: true, url: relativeUrl, filename: req.file.filename });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- Students CRUD ---
adminRouter.get('/students', (req, res) => {
  const state = db.getState();
  res.json({ students: state.students });
});

adminRouter.post('/students', (req, res) => {
  try {
    const { name, classBatchId, rollNo, parentName, parentPhone, parentEmail, monthlyFee, notes } = req.body;
    const state = db.getState();

    if (!name || !classBatchId || !parentPhone) {
      return res.status(400).json({ error: 'Name, Class Batch, and Parent Phone are required' });
    }

    const batch = state.batches.find((b) => b.id === classBatchId);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    const newStudent = {
      id: `stu-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      studentId: `BD-STU-${1000 + state.students.length + 1}`,
      name: name.trim(),
      classBatchId: batch.id,
      classBatchName: batch.name,
      rollNo: Number(rollNo) || state.students.filter((s) => s.classBatchId === batch.id).length + 1,
      parentName: parentName ? parentName.trim() : 'Parent',
      parentPhone: parentPhone.trim(),
      parentEmail: parentEmail ? parentEmail.trim() : undefined,
      monthlyFee: Number(monthlyFee) || batch.monthlyFee,
      enrolledDate: new Date().toISOString().slice(0, 10),
      status: 'active' as const,
      notes,
    };

    state.students.unshift(newStudent);
    db.save();

    db.logAudit('Admin', 'Admin', 'CREATE_STUDENT', 'Student', newStudent.id, `Enrolled student ${newStudent.name} (${newStudent.studentId}) in ${batch.name}`);

    res.status(201).json({ success: true, student: newStudent });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

adminRouter.patch('/students/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, classBatchId, rollNo, parentName, parentPhone, parentEmail, monthlyFee, status, notes } = req.body;
    const state = db.getState();

    const student = state.students.find((s) => s.id === id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    if (name) student.name = name.trim();
    if (classBatchId) {
      const batch = state.batches.find((b) => b.id === classBatchId);
      if (batch) {
        student.classBatchId = batch.id;
        student.classBatchName = batch.name;
      }
    }
    if (rollNo !== undefined) student.rollNo = Number(rollNo);
    if (parentName) student.parentName = parentName.trim();
    if (parentPhone) student.parentPhone = parentPhone.trim();
    if (parentEmail !== undefined) student.parentEmail = parentEmail.trim();
    if (monthlyFee !== undefined) student.monthlyFee = Number(monthlyFee);
    if (status) student.status = status;
    if (notes !== undefined) student.notes = notes;

    db.save();
    db.logAudit('Admin', 'Admin', 'UPDATE_STUDENT', 'Student', student.id, `Updated profile for ${student.name}`);

    res.json({ success: true, student });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

adminRouter.delete('/students/:id', (req, res) => {
  try {
    const { id } = req.params;
    const state = db.getState();

    const student = state.students.find((s) => s.id === id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    // Protect historical financial and attendance records
    const hasPayments = state.payments.some((p) => p.studentId === id);
    const hasObligations = state.feeObligations.some((o) => o.studentId === id && o.paidAmount > 0);
    const hasAttendance = state.attendance.some((a) => a.studentId === id);

    if (hasPayments || hasObligations || hasAttendance) {
      student.status = 'archived';
      db.save();
      db.logAudit(
        'Admin',
        'Admin',
        'ARCHIVE_STUDENT',
        'Student',
        student.id,
        `Student ${student.name} was archived to preserve financial records and attendance integrity.`
      );
      return res.json({
        success: true,
        archived: true,
        message: `Student '${student.name}' has existing financial or attendance records. The record has been safely archived.`,
      });
    }

    state.students = state.students.filter((s) => s.id !== id);
    db.save();
    db.logAudit('Admin', 'Admin', 'DELETE_STUDENT', 'Student', id, `Deleted student ${student.name}`);

    res.json({ success: true, deleted: true, message: `Student '${student.name}' removed.` });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- Batches & Classes CRUD ---
adminRouter.get('/batches', (req, res) => {
  const state = db.getState();
  res.json({ batches: state.batches.filter((b) => !b.archived) });
});

adminRouter.post('/batches', (req, res) => {
  try {
    const { name, grade, shift, monthlyFee, subjectNames } = req.body;
    const state = db.getState();

    if (!name || !monthlyFee) {
      return res.status(400).json({ error: 'Batch name and monthly fee are required' });
    }

    const newBatch = {
      id: `batch-${Date.now()}`,
      name: name.trim(),
      grade: grade || 'General',
      shift: shift || 'Standard',
      monthlyFee: Number(monthlyFee),
      subjectNames: Array.isArray(subjectNames) && subjectNames.length > 0 ? subjectNames : ['General Science', 'General Mathematics'],
      academicYear: '2026-2027',
    };

    state.batches.push(newBatch);
    db.save();

    db.logAudit('Admin', 'Admin', 'CREATE_BATCH', 'ClassBatch', newBatch.id, `Created batch "${newBatch.name}"`);

    res.status(201).json({ success: true, batch: newBatch });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

adminRouter.patch('/batches/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, grade, shift, monthlyFee, subjectNames } = req.body;
    const state = db.getState();

    const batch = state.batches.find((b) => b.id === id);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    if (name) batch.name = name.trim();
    if (grade) batch.grade = grade.trim();
    if (shift) batch.shift = shift.trim();
    if (monthlyFee !== undefined) batch.monthlyFee = Number(monthlyFee);
    if (Array.isArray(subjectNames)) batch.subjectNames = subjectNames;

    db.save();
    db.logAudit('Admin', 'Admin', 'UPDATE_BATCH', 'ClassBatch', batch.id, `Updated batch "${batch.name}"`);

    res.json({ success: true, batch });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

adminRouter.delete('/batches/:id', (req, res) => {
  try {
    const { id } = req.params;
    const state = db.getState();

    const batch = state.batches.find((b) => b.id === id);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    batch.archived = true;
    db.save();
    db.logAudit('Admin', 'Admin', 'ARCHIVE_BATCH', 'ClassBatch', id, `Archived batch "${batch.name}"`);

    res.json({ success: true, message: `Batch '${batch.name}' archived successfully.` });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- bKash Verification Queue ---
adminRouter.get('/bkash-queue', (req, res) => {
  const state = db.getState();
  res.json({ submissions: state.bkashSubmissions });
});

adminRouter.post('/bkash-verify/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { action, rejectionReason } = req.body; // 'approve' | 'reject'
    const state = db.getState();

    const sub = state.bkashSubmissions.find((s) => s.id === id);
    if (!sub) return res.status(404).json({ error: 'bKash submission not found' });

    if (action === 'approve') {
      const amount = sub.amount || sub.claimedAmount || 0;
      const sender = sub.bKashNumber || sub.senderNumber || '';

      sub.status = 'approved';
      sub.reviewedBy = 'Admin';
      sub.reviewedAt = new Date().toISOString();
      sub.verifiedBy = 'Admin';
      sub.verifiedAt = new Date().toISOString();

      // Find obligation and record payment
      const obligation = state.feeObligations.find((o) => o.id === sub.feeObligationId);
      if (obligation) {
        obligation.paidAmount = (obligation.paidAmount || 0) + amount;
        obligation.outstandingBalance = Math.max(0, obligation.adjustedFee - obligation.paidAmount);
        obligation.status = obligation.outstandingBalance === 0 ? 'paid' : 'partial';
        obligation.lastPaymentDate = new Date().toISOString().slice(0, 10);
      }

      // Create Payment Record
      const newPayment = {
        id: `pay-${Date.now()}`,
        receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
        feeObligationId: sub.feeObligationId,
        studentId: sub.studentId,
        studentName: sub.studentName,
        amount,
        paymentMethod: 'bKash' as const,
        transactionId: sub.transactionId,
        submissionId: sub.id,
        paymentDate: new Date().toISOString().slice(0, 10),
        recordedBy: 'Admin',
        receivedBy: 'bKash Online Verification',
        notes: `Verified TrxID ${sub.transactionId} from ${sender}`,
        createdAt: new Date().toISOString(),
      };
      state.payments.unshift(newPayment);

      db.save();
      db.logAudit('Admin', 'Admin', 'VERIFY_BKASH', 'BkashSubmission', sub.id, `Approved bKash TrxID ${sub.transactionId} for ${sub.studentName} (৳${amount})`);

      return res.json({ success: true, message: `Payment verified and ৳${amount} credited to ${sub.studentName}.`, payment: newPayment });
    } else if (action === 'reject') {
      sub.status = 'rejected';
      sub.rejectionReason = rejectionReason || 'Transaction ID not found in bKash merchant statement.';
      sub.reviewedBy = 'Admin';
      sub.reviewedAt = new Date().toISOString();
      sub.verifiedBy = 'Admin';
      sub.verifiedAt = new Date().toISOString();

      db.save();
      db.logAudit('Admin', 'Admin', 'REJECT_BKASH', 'BkashSubmission', sub.id, `Rejected bKash TrxID ${sub.transactionId}: ${sub.rejectionReason}`);

      return res.json({ success: true, message: `Submission rejected: ${sub.rejectionReason}` });
    }

    res.status(400).json({ error: 'Action must be "approve" or "reject"' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- WhatsApp Message Templates ---
adminRouter.get('/templates', (req, res) => {
  const state = db.getState();
  res.json({ templates: state.templates });
});

adminRouter.put('/templates/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { templateText } = req.body;
    const state = db.getState();

    const tmpl = state.templates.find((t) => t.id === id);
    if (!tmpl) return res.status(404).json({ error: 'Template not found' });

    tmpl.templateText = templateText.trim();
    db.save();

    db.logAudit('Admin', 'Admin', 'UPDATE_TEMPLATE', 'WhatsAppTemplate', tmpl.id, `Updated template: ${tmpl.name}`);

    res.json({ success: true, template: tmpl });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- Global Website Settings & Branding ---
adminRouter.get('/settings', (req, res) => {
  const state = db.getState();
  res.json({ settings: state.settings });
});

adminRouter.patch('/settings', (req, res) => {
  try {
    const state = db.getState();
    state.settings = { ...state.settings, ...req.body };
    db.save();

    db.logAudit('Admin', 'Admin', 'UPDATE_GLOBAL_SETTINGS', 'Settings', 'global', `Updated website settings & branding (${state.settings.tuitionName})`);

    res.json({ success: true, settings: state.settings });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- Audit Logs ---
adminRouter.get('/audit-logs', (req, res) => {
  const state = db.getState();
  res.json({ auditLogs: state.auditLogs.slice(0, 100) });
});

// --- Homework CRUD ---
adminRouter.get('/homework', (req, res) => {
  const state = db.getState();
  res.json({ homework: state.homework });
});

adminRouter.post('/homework', (req, res) => {
  try {
    const { title, classBatchId, subject, description, dueDate, createdBy = 'Teacher' } = req.body;
    const state = db.getState();

    const batch = state.batches.find((b) => b.id === classBatchId);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    const newHw = {
      id: `hw-${Date.now()}`,
      title: title.trim(),
      classBatchId,
      classBatchName: batch.name,
      subject: subject || 'General',
      description: description || '',
      assignedDate: new Date().toISOString().slice(0, 10),
      dueDate: dueDate || new Date().toISOString().slice(0, 10),
      createdBy,
      createdAt: new Date().toISOString(),
    };

    state.homework.unshift(newHw);
    db.save();

    db.logAudit('Admin', 'Admin', 'CREATE_HOMEWORK', 'Homework', newHw.id, `Created homework "${newHw.title}" for ${batch.name}`);

    res.status(201).json({ success: true, homework: newHw });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

adminRouter.delete('/homework/:id', (req, res) => {
  try {
    const { id } = req.params;
    const state = db.getState();
    state.homework = state.homework.filter((h) => h.id !== id);
    db.save();
    res.json({ success: true, message: 'Homework removed' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- Announcements CRUD ---
adminRouter.get('/announcements', (req, res) => {
  const state = db.getState();
  res.json({ announcements: state.announcements });
});

adminRouter.post('/announcements', (req, res) => {
  try {
    const { title, content, targetAudience = 'all', isImportant = false } = req.body;
    const state = db.getState();

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const newAnn = {
      id: `ann-${Date.now()}`,
      title: title.trim(),
      content: content.trim(),
      targetAudience: targetAudience as any,
      date: new Date().toISOString().slice(0, 10),
      isImportant: Boolean(isImportant),
      createdBy: 'Administration',
    };

    state.announcements.unshift(newAnn);
    db.save();

    db.logAudit('Admin', 'Admin', 'CREATE_ANNOUNCEMENT', 'Announcement', newAnn.id, `Published notice "${newAnn.title}"`);

    res.status(201).json({ success: true, announcement: newAnn });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

adminRouter.delete('/announcements/:id', (req, res) => {
  try {
    const { id } = req.params;
    const state = db.getState();
    state.announcements = state.announcements.filter((a) => a.id !== id);
    db.save();
    res.json({ success: true, message: 'Announcement removed' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- Reset Database ---
adminRouter.post('/reset-database', (req, res) => {
  db.resetToDefault();
  res.json({ success: true, message: 'Database reset to initial verified state with full demo dataset.' });
});
