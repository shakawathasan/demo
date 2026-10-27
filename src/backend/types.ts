export type UserRole = 'admin' | 'teacher' | 'parent';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  passwordHash?: string;
  passwordSalt?: string;
  linkedStudentIds?: string[]; // For parents: IDs of linked children
  createdAt: string;
}

export interface ClassBatch {
  id: string;
  name: string; // e.g. "Class 10 - Science (Morning)", "Class 9 - Regular"
  grade: string; // "8", "9", "10", "HSC-1", "HSC-2"
  shift: string; // "Morning", "Evening"
  monthlyFee: number;
  subjectNames: string[];
  academicYear: string;
  archived?: boolean;
}

export interface Student {
  id: string;
  studentId: string; // formatted ID, e.g. "BD-STU-1001"
  name: string;
  classBatchId: string;
  classBatchName: string;
  rollNo: number;
  parentName: string;
  parentPhone: string; // Bangladesh format, e.g. "01711223344"
  parentEmail?: string;
  monthlyFee: number;
  enrolledDate: string;
  status: 'active' | 'inactive' | 'archived';
  notes?: string;
}

export interface FeeObligation {
  id: string;
  studentId: string;
  studentName: string;
  classBatchId: string;
  classBatchName: string;
  parentName: string;
  parentPhone: string;
  month: string; // "YYYY-MM", e.g. "2026-10"
  monthDisplay: string; // "October 2026"
  baseFee: number;
  discount: number;
  adjustedFee: number;
  paidAmount: number;
  outstandingBalance: number;
  dueDate: string; // "YYYY-MM-DD"
  status: 'paid' | 'partial' | 'pending' | 'overdue';
  lastPaymentDate?: string;
  notes?: string;
  archived?: boolean;
}

export interface PaymentRecord {
  id: string;
  receiptNumber: string; // e.g. "REC-2026-1042"
  feeObligationId: string;
  studentId: string;
  studentName: string;
  amount: number;
  paymentMethod: 'bKash' | 'Cash' | 'Nagad' | 'Bank';
  transactionId?: string;
  submissionId?: string; // If approved from bKash submission
  paymentDate: string;
  recordedBy: string; // user ID / name
  receivedBy?: string;
  notes?: string;
  reversed?: boolean;
  reversalReason?: string;
  createdAt: string;
}

export interface BkashSubmission {
  id: string;
  studentId: string;
  studentName: string;
  feeObligationId: string;
  monthDisplay: string;
  parentName: string;
  parentPhone: string;
  amount: number;
  claimedAmount?: number;
  bKashNumber: string; // Sender's bKash number
  senderNumber?: string;
  transactionId: string;
  paymentDate: string;
  screenshotUrl?: string;
  status: 'pending' | 'approved' | 'rejected' | 'verified';
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  classBatchId: string;
  studentId: string;
  studentName: string;
  parentName: string;
  parentPhone: string;
  date: string; // "YYYY-MM-DD"
  status: 'P' | 'A' | 'L'; // Present, Absent, Leave
  recordedBy: string;
  notes?: string;
  whatsappAlertPrepared?: boolean;
  whatsappAlertOpened?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface WeeklyTest {
  id: string;
  title: string; // e.g. "Weekly Test 4: Newtonian Mechanics & Vectors"
  classBatchId: string;
  classBatchName: string;
  subject: string;
  testDate: string; // "YYYY-MM-DD"
  maxMarks: number;
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
}

export interface TestResult {
  id: string;
  testId: string;
  studentId: string;
  studentName: string;
  rollNo: number;
  parentName: string;
  parentPhone: string;
  obtainedMarks: number;
  maxMarks: number;
  percentage: number;
  rank: number;
  feedback?: string;
  reportPublished: boolean;
  createdAt: string;
}

export interface Homework {
  id: string;
  title: string;
  classBatchId: string;
  classBatchName: string;
  subject: string;
  description: string;
  assignedDate: string;
  dueDate: string;
  attachmentUrl?: string;
  createdBy: string;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  targetAudience: 'all' | 'students' | 'parents';
  date: string;
  isImportant: boolean;
  createdBy: string;
}

export interface ReferralEnquiry {
  id: string;
  referralCode?: string;
  referrerName: string;
  prospectiveStudentName: string;
  parentName: string;
  parentPhone: string;
  targetClass: string;
  source: 'Refer-a-Friend' | 'Walk-in' | 'Facebook' | 'Flyer' | 'Other';
  status: 'New' | 'Contacted' | 'Trial Scheduled' | 'Enrolled' | 'Closed';
  notes?: string;
  enquiryDate: string;
  rewardClaimed?: boolean;
}

export interface WhatsAppTemplate {
  id: string;
  type: 'fee_reminder' | 'absence_alert' | 'test_report' | 'general_announcement';
  name: string;
  templateText: string;
  availableVariables: string[];
}

export interface WhatsAppMessageLog {
  id: string;
  recipientPhone: string;
  recipientName: string;
  studentName: string;
  messageType: 'fee_reminder' | 'absence_alert' | 'test_report' | 'general';
  messageText: string;
  status: 'draft' | 'prepared' | 'whatsapp_opened' | 'manually_confirmed' | 'failed';
  generatedUrl: string;
  relatedEntityId?: string;
  createdAt: string;
  confirmedAt?: string;
}

export interface TuitionSettings {
  tuitionName: string;
  tagline: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  currencySymbol: string;
  timezone: string;
  // Branding & Theme
  logoUrl?: string;
  faviconUrl?: string;
  themeColor?: string;
  socialFacebook?: string;
  socialWhatsApp?: string;
  footerText?: string;
  // bKash settings
  bkashNumber: string;
  bkashAccountType: 'Merchant' | 'Personal';
  bkashQrUrl: string;
  bkashInstructions: string;
  // Referrals
  referralRewardEnabled: boolean;
  referralRewardDescription: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
}
