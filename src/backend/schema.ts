/**
 * Database Schema Definition for Tuition & Coaching Management System (Bangladesh)
 *
 * Models and Relational Constraints:
 * 1. Users: id (PK), name, email (UNIQUE), phone, role ('admin' | 'teacher' | 'parent'), linkedStudentIds (JSON)
 * 2. Classes & Batches: id (PK), name, grade, shift, monthlyFee (INTEGER minor units/BDT), subjectNames, academicYear
 * 3. Students: id (PK), studentId (UNIQUE, e.g. "BD-STU-1001"), name, classBatchId (FK -> Batches.id), rollNo, parentName, parentPhone (11-digit BD standard), monthlyFee
 * 4. Fee Obligations: id (PK), studentId (FK -> Students.id), month ("YYYY-MM"), baseFee, discount, adjustedFee, paidAmount, outstandingBalance, dueDate, status ('paid'|'partial'|'pending'|'overdue')
 *    - UNIQUE constraint: (studentId, month)
 * 5. Payment Records: id (PK), receiptNumber (UNIQUE, e.g. "REC-2026-1001"), feeObligationId (FK -> FeeObligations.id), studentId (FK -> Students.id), amount, paymentMethod ('bKash'|'Cash'|'Nagad'|'Bank'), transactionId
 *    - UNIQUE constraint: transactionId (when electronic)
 * 6. bKash Submissions: id (PK), studentId (FK), feeObligationId (FK), amount, bKashNumber, transactionId (UNIQUE), screenshotUrl, status ('pending'|'approved'|'rejected')
 * 7. Attendance Records: id (PK), classBatchId (FK), studentId (FK), date ("YYYY-MM-DD"), status ('P'|'A'|'L')
 *    - UNIQUE constraint: (classBatchId, studentId, date)
 * 8. Weekly Tests: id (PK), title, classBatchId (FK), subject, testDate, maxMarks, status ('draft'|'published'|'archived')
 * 9. Test Results: id (PK), testId (FK -> WeeklyTests.id), studentId (FK -> Students.id), obtainedMarks, percentage, rank (1224 Standard Competition Ranking)
 *    - UNIQUE constraint: (testId, studentId)
 * 10. Homework: id (PK), title, classBatchId (FK), subject, description, assignedDate, dueDate
 * 11. Announcements: id (PK), title, content, targetAudience ('all'|'students'|'parents'), date, isImportant
 * 12. Referral Enquiries: id (PK), referralCode, referrerName, prospectiveStudentName, parentPhone, targetClass, status ('New'|'Contacted'|'Trial Scheduled'|'Enrolled'|'Closed')
 * 13. WhatsApp Templates: id (PK), type, name, templateText, availableVariables
 * 14. Tuition Settings: tuitionName, tagline, ownerName, phone, email, address, bkashNumber, bkashAccountType, bkashQrUrl, bkashInstructions
 * 15. Audit Logs: id (PK), timestamp, userId, userName, action, entityType, entityId, details
 */

export const DATABASE_SCHEMA_VERSION = 1;
