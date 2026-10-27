import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  User,
  ClassBatch,
  Student,
  FeeObligation,
  PaymentRecord,
  BkashSubmission,
  AttendanceRecord,
  WeeklyTest,
  TestResult,
  Homework,
  Announcement,
  ReferralEnquiry,
  WhatsAppTemplate,
  WhatsAppMessageLog,
  TuitionSettings,
  AuditLog
} from './types.ts';
import {
  initialSettings,
  initialTemplates,
  initialBatches,
  initialUsers,
  initialStudents,
  initialFeeObligations,
  initialPayments,
  initialBkashSubmissions,
  initialAttendance,
  initialWeeklyTests,
  initialTestResults,
  initialHomework,
  initialAnnouncements,
  initialReferrals,
  initialAuditLogs
} from './seedData.ts';

export interface DatabaseState {
  version: number;
  settings: TuitionSettings;
  users: User[];
  batches: ClassBatch[];
  students: Student[];
  feeObligations: FeeObligation[];
  payments: PaymentRecord[];
  bkashSubmissions: BkashSubmission[];
  attendance: AttendanceRecord[];
  tests: WeeklyTest[];
  testResults: TestResult[];
  homework: Homework[];
  announcements: Announcement[];
  referrals: ReferralEnquiry[];
  templates: WhatsAppTemplate[];
  whatsappLogs: WhatsAppMessageLog[];
  auditLogs: AuditLog[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

class DatabaseManager {
  private state: DatabaseState;
  private isSaving = false;

  constructor() {
    this.ensureDirectories();
    this.state = this.loadOrInitialize();
  }

  private ensureDirectories() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  }

  private loadOrInitialize(): DatabaseState {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version) {
          // Ensure admin user has secure password hash & salt
          let modified = false;
          const admin = parsed.users?.find((u: any) => u.role === 'admin' || u.id === 'user-admin');
          if (admin && (!admin.passwordHash || !admin.passwordSalt)) {
            admin.passwordHash = 'a51349d63b533f958668732d8173895afba060fd9399c3082a36ecef4ae4493131e94eaf22a0462007da27999e5afea3d8a0c076833bee3ea23a74cf6632c4ea';
            admin.passwordSalt = '7f8a3c2b1d0e9f8a7b6c5d4e3f2a1b0c';
            modified = true;
          }
          if (parsed.settings) {
            parsed.settings = { ...initialSettings, ...parsed.settings };
            modified = true;
          }
          if (modified) {
            this.persist(parsed);
          }
          return parsed;
        }
      } catch (err) {
        console.error('Failed to parse existing database.json, initializing fresh seed:', err);
      }
    }

    const freshState: DatabaseState = {
      version: 1,
      settings: { ...initialSettings },
      users: [...initialUsers],
      batches: [...initialBatches],
      students: [...initialStudents],
      feeObligations: [...initialFeeObligations],
      payments: [...initialPayments],
      bkashSubmissions: [...initialBkashSubmissions],
      attendance: [...initialAttendance],
      tests: [...initialWeeklyTests],
      testResults: [...initialTestResults],
      homework: [...initialHomework],
      announcements: [...initialAnnouncements],
      referrals: [...initialReferrals],
      templates: [...initialTemplates],
      whatsappLogs: [],
      auditLogs: [...initialAuditLogs],
    };

    this.persist(freshState);
    return freshState;
  }

  private persist(stateToSave: DatabaseState = this.state) {
    try {
      this.ensureDirectories();
      const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(stateToSave, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Failed to persist database:', err);
    }
  }

  public getState(): DatabaseState {
    return this.state;
  }

  public save() {
    this.persist(this.state);
  }

  public resetToDefault() {
    this.state = {
      version: 1,
      settings: { ...initialSettings },
      users: [...initialUsers],
      batches: [...initialBatches],
      students: [...initialStudents],
      feeObligations: [...initialFeeObligations],
      payments: [...initialPayments],
      bkashSubmissions: [...initialBkashSubmissions],
      attendance: [...initialAttendance],
      tests: [...initialWeeklyTests],
      testResults: [...initialTestResults],
      homework: [...initialHomework],
      announcements: [...initialAnnouncements],
      referrals: [...initialReferrals],
      templates: [...initialTemplates],
      whatsappLogs: [],
      auditLogs: [
        ...initialAuditLogs,
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: 'user-admin',
          userName: 'System Admin',
          action: 'DATABASE_RESET',
          entityType: 'System',
          entityId: 'database',
          details: 'Database was reset to default verified seed data.',
        },
      ],
    };
    this.save();
  }

  public logAudit(userId: string, userName: string, action: string, entityType: string, entityId: string, details: string) {
    const log: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      userId,
      userName,
      action,
      entityType,
      entityId,
      details,
    };
    this.state.auditLogs.unshift(log);
    // Keep max 500 audit logs
    if (this.state.auditLogs.length > 500) {
      this.state.auditLogs = this.state.auditLogs.slice(0, 500);
    }
    this.save();
  }

  // --- Transactions & Integrity ---
  public runTransaction<T>(fn: () => T): T {
    // Snapshot state in memory
    const snapshot = JSON.stringify(this.state);
    try {
      const result = fn();
      this.save();
      return result;
    } catch (err) {
      // Rollback
      this.state = JSON.parse(snapshot);
      throw err;
    }
  }

  // --- Financial Calculations & Fee Management ---
  public recalculateFeeObligation(obligationId: string) {
    const ob = this.state.feeObligations.find((o) => o.id === obligationId);
    if (!ob) return;

    // Recalculate paid amount from active (non-reversed) payments
    const activePayments = this.state.payments.filter(
      (p) => p.feeObligationId === obligationId && !p.reversed
    );
    const totalPaid = activePayments.reduce((sum, p) => sum + p.amount, 0);

    ob.adjustedFee = Math.max(0, ob.baseFee - ob.discount);
    ob.paidAmount = totalPaid;
    ob.outstandingBalance = Math.max(0, ob.adjustedFee - totalPaid);

    const nowStr = new Date().toISOString().slice(0, 10);
    if (ob.outstandingBalance <= 0) {
      ob.status = 'paid';
    } else if (ob.paidAmount > 0) {
      ob.status = ob.dueDate < nowStr ? 'overdue' : 'partial';
    } else {
      ob.status = ob.dueDate < nowStr ? 'overdue' : 'pending';
    }
  }

  public recordPayment(params: {
    feeObligationId: string;
    amount: number;
    paymentMethod: 'bKash' | 'Cash' | 'Nagad' | 'Bank';
    transactionId?: string;
    submissionId?: string;
    recordedBy: string;
    notes?: string;
  }): PaymentRecord {
    return this.runTransaction(() => {
      const ob = this.state.feeObligations.find((o) => o.id === params.feeObligationId);
      if (!ob) throw new Error('Fee obligation not found');

      if (params.amount <= 0) throw new Error('Payment amount must be greater than 0');
      if (params.amount > ob.outstandingBalance) {
        throw new Error(`Payment amount (৳${params.amount}) exceeds outstanding balance (৳${ob.outstandingBalance})`);
      }

      // Check duplicate transaction ID for bKash
      if (params.transactionId && params.paymentMethod === 'bKash') {
        const existing = this.state.payments.find(
          (p) => !p.reversed && p.transactionId?.toUpperCase() === params.transactionId?.toUpperCase()
        );
        if (existing) {
          throw new Error(`bKash Transaction ID '${params.transactionId}' has already been processed (Receipt: ${existing.receiptNumber})`);
        }
      }

      const receiptNumber = `REC-${new Date().getFullYear()}-${1000 + this.state.payments.length + 1}`;
      const payment: PaymentRecord = {
        id: `pay-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        receiptNumber,
        feeObligationId: ob.id,
        studentId: ob.studentId,
        studentName: ob.studentName,
        amount: params.amount,
        paymentMethod: params.paymentMethod,
        transactionId: params.transactionId?.trim().toUpperCase(),
        submissionId: params.submissionId,
        paymentDate: new Date().toISOString().slice(0, 10),
        recordedBy: params.recordedBy,
        notes: params.notes,
        createdAt: new Date().toISOString(),
      };

      this.state.payments.unshift(payment);
      ob.lastPaymentDate = payment.paymentDate;
      this.recalculateFeeObligation(ob.id);

      this.logAudit(
        params.recordedBy,
        params.recordedBy,
        'RECORD_PAYMENT',
        'PaymentRecord',
        payment.id,
        `Recorded ${params.paymentMethod} payment of ৳${params.amount} for student ${ob.studentName} (${ob.monthDisplay}). Receipt: ${receiptNumber}`
      );

      return payment;
    });
  }

  // --- bKash Submissions Workflow ---
  public submitBkashPayment(params: {
    studentId: string;
    feeObligationId: string;
    amount: number;
    bKashNumber: string;
    transactionId: string;
    screenshotUrl?: string;
  }): BkashSubmission {
    return this.runTransaction(() => {
      const student = this.state.students.find((s) => s.id === params.studentId);
      if (!student) throw new Error('Student not found');

      const ob = this.state.feeObligations.find((o) => o.id === params.feeObligationId);
      if (!ob) throw new Error('Fee obligation not found');

      const cleanTrx = params.transactionId.trim().toUpperCase();
      if (!cleanTrx || cleanTrx.length < 8) {
        throw new Error('Valid bKash Transaction ID must be at least 8 alphanumeric characters');
      }

      // Check if this transaction ID was already submitted or approved
      const duplicateSubmission = this.state.bkashSubmissions.find(
        (s) => s.transactionId.toUpperCase() === cleanTrx && s.status !== 'rejected'
      );
      if (duplicateSubmission) {
        throw new Error(`Transaction ID '${cleanTrx}' has already been submitted and is currently ${duplicateSubmission.status}.`);
      }

      const duplicatePayment = this.state.payments.find(
        (p) => !p.reversed && p.transactionId?.toUpperCase() === cleanTrx
      );
      if (duplicatePayment) {
        throw new Error(`Transaction ID '${cleanTrx}' has already been approved (Receipt ${duplicatePayment.receiptNumber}).`);
      }

      const submission: BkashSubmission = {
        id: `bkash-sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        studentId: student.id,
        studentName: student.name,
        feeObligationId: ob.id,
        monthDisplay: ob.monthDisplay,
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        amount: params.amount,
        bKashNumber: params.bKashNumber,
        transactionId: cleanTrx,
        paymentDate: new Date().toISOString().slice(0, 10),
        screenshotUrl: params.screenshotUrl,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      this.state.bkashSubmissions.unshift(submission);

      this.logAudit(
        'parent-portal',
        student.parentName,
        'BKASH_SUBMISSION_CREATED',
        'BkashSubmission',
        submission.id,
        `Submitted bKash TrxID ${cleanTrx} for ৳${params.amount} (${ob.monthDisplay})`
      );

      return submission;
    });
  }

  public approveBkashSubmission(submissionId: string, reviewedBy: string): { submission: BkashSubmission; payment: PaymentRecord } {
    return this.runTransaction(() => {
      const sub = this.state.bkashSubmissions.find((s) => s.id === submissionId);
      if (!sub) throw new Error('bKash submission not found');
      if (sub.status !== 'pending') throw new Error(`Submission is already ${sub.status}`);

      const ob = this.state.feeObligations.find((o) => o.id === sub.feeObligationId);
      if (!ob) throw new Error('Fee obligation for this submission no longer exists');

      // Record the formal payment
      const payment = this.recordPayment({
        feeObligationId: ob.id,
        amount: sub.amount,
        paymentMethod: 'bKash',
        transactionId: sub.transactionId,
        submissionId: sub.id,
        recordedBy: reviewedBy,
        notes: `bKash verification approved by ${reviewedBy}. Sender bKash: ${sub.bKashNumber}`,
      });

      sub.status = 'approved';
      sub.reviewedBy = reviewedBy;
      sub.reviewedAt = new Date().toISOString();

      this.logAudit(
        reviewedBy,
        reviewedBy,
        'BKASH_SUBMISSION_APPROVED',
        'BkashSubmission',
        sub.id,
        `Approved bKash submission TrxID ${sub.transactionId} for student ${sub.studentName}. Created receipt ${payment.receiptNumber}.`
      );

      return { submission: sub, payment };
    });
  }

  public rejectBkashSubmission(submissionId: string, reason: string, reviewedBy: string): BkashSubmission {
    return this.runTransaction(() => {
      const sub = this.state.bkashSubmissions.find((s) => s.id === submissionId);
      if (!sub) throw new Error('bKash submission not found');
      if (sub.status !== 'pending') throw new Error(`Submission is already ${sub.status}`);

      sub.status = 'rejected';
      sub.rejectionReason = reason || 'Payment could not be verified in bKash statement';
      sub.reviewedBy = reviewedBy;
      sub.reviewedAt = new Date().toISOString();

      this.logAudit(
        reviewedBy,
        reviewedBy,
        'BKASH_SUBMISSION_REJECTED',
        'BkashSubmission',
        sub.id,
        `Rejected bKash submission TrxID ${sub.transactionId} for student ${sub.studentName}. Reason: ${sub.rejectionReason}`
      );

      return sub;
    });
  }

  // --- Attendance Management ---
  public saveAttendanceBatch(
    classBatchId: string,
    date: string,
    records: Array<{ studentId: string; status: 'P' | 'A' | 'L'; notes?: string }>,
    recordedBy: string
  ): AttendanceRecord[] {
    return this.runTransaction(() => {
      const savedRecords: AttendanceRecord[] = [];

      for (const item of records) {
        const student = this.state.students.find((s) => s.id === item.studentId);
        if (!student) continue;

        // Check for existing record on that date & batch (prevent duplicates, update if exists with audit)
        const existingIndex = this.state.attendance.findIndex(
          (a) => a.classBatchId === classBatchId && a.studentId === item.studentId && a.date === date
        );

        if (existingIndex >= 0) {
          const old = this.state.attendance[existingIndex];
          if (old.status !== item.status) {
            this.logAudit(
              recordedBy,
              recordedBy,
              'ATTENDANCE_CORRECTION',
              'AttendanceRecord',
              old.id,
              `Corrected attendance for ${student.name} on ${date} from ${old.status} to ${item.status}`
            );
          }
          old.status = item.status;
          old.notes = item.notes;
          old.updatedAt = new Date().toISOString();
          savedRecords.push(old);
        } else {
          const newRecord: AttendanceRecord = {
            id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            classBatchId,
            studentId: student.id,
            studentName: student.name,
            parentName: student.parentName,
            parentPhone: student.parentPhone,
            date,
            status: item.status,
            recordedBy,
            notes: item.notes,
            createdAt: new Date().toISOString(),
          };
          this.state.attendance.unshift(newRecord);
          savedRecords.push(newRecord);
        }
      }

      this.logAudit(
        recordedBy,
        recordedBy,
        'SAVE_ATTENDANCE_BATCH',
        'AttendanceBatch',
        classBatchId,
        `Saved attendance for batch ${classBatchId} on ${date} (${records.length} students)`
      );

      return savedRecords;
    });
  }

  public getConsecutiveAbsences(studentId: string, classBatchId: string): number {
    const records = this.state.attendance
      .filter((a) => a.studentId === studentId && a.classBatchId === classBatchId)
      .sort((a, b) => b.date.localeCompare(a.date));

    let consecutive = 0;
    for (const r of records) {
      if (r.status === 'A') {
        consecutive++;
      } else {
        break;
      }
    }
    return consecutive;
  }

  // --- Weekly Test Reports & Standard Competition Ranking (1224) ---
  public recalculateTestRanks(testId: string) {
    const test = this.state.tests.find((t) => t.id === testId);
    if (!test) return;

    const results = this.state.testResults.filter((r) => r.testId === testId);
    if (results.length === 0) return;

    // Sort by marks descending
    results.sort((a, b) => b.obtainedMarks - a.obtainedMarks);

    // Standard Competition Ranking (1224):
    // Tied scores receive the same rank, and the next rank skips by the number of ties.
    let currentRank = 1;
    for (let i = 0; i < results.length; i++) {
      if (i > 0 && results[i].obtainedMarks === results[i - 1].obtainedMarks) {
        results[i].rank = results[i - 1].rank;
      } else {
        results[i].rank = i + 1;
      }
      results[i].percentage = Math.round((results[i].obtainedMarks / test.maxMarks) * 1000) / 10;
    }
  }
}

export const db = new DatabaseManager();

// --- Secure Authentication & Session Management ---
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, generatedSalt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt: generatedSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const computed = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computed, 'hex'));
  } catch (err) {
    return false;
  }
}

export interface ActiveSession {
  token: string;
  userId: string;
  userName: string;
  email: string;
  role: string;
  createdAt: string;
  expiresAt: string;
}

// Global active sessions store (supports long-lived persistent sessions)
export const sessionStore = new Map<string, ActiveSession>();

export function createSession(user: User): ActiveSession {
  const token = 'adm_' + crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days session
  const session: ActiveSession = {
    token,
    userId: user.id,
    userName: user.name,
    email: user.email,
    role: user.role,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };
  sessionStore.set(token, session);
  return session;
}

export function validateSession(tokenHeader?: string): ActiveSession | null {
  if (!tokenHeader) return null;
  const cleanToken = tokenHeader.startsWith('Bearer ') ? tokenHeader.slice(7).trim() : tokenHeader.trim();
  const session = sessionStore.get(cleanToken);
  if (!session) return null;
  if (new Date(session.expiresAt) < new Date()) {
    sessionStore.delete(cleanToken);
    return null;
  }
  return session;
}

export function destroySession(tokenHeader?: string) {
  if (!tokenHeader) return;
  const cleanToken = tokenHeader.startsWith('Bearer ') ? tokenHeader.slice(7).trim() : tokenHeader.trim();
  sessionStore.delete(cleanToken);
}

