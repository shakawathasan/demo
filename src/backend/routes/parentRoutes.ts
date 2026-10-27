import { Router } from 'express';
import { db } from '../db.ts';

export const parentRouter = Router();

// Get parent's linked children and full portal data
parentRouter.get('/portal-data', (req, res) => {
  const { parentId, studentId } = req.query;
  const state = db.getState();

  // Find parent user or fallback to first parent
  let parentUser = state.users.find((u) => u.id === parentId);
  if (!parentUser || parentUser.role !== 'parent') {
    parentUser = state.users.find((u) => u.role === 'parent') || state.users[2];
  }

  // Get linked students
  const linkedIds = parentUser.linkedStudentIds || [];
  const linkedStudents = state.students.filter(
    (s) => linkedIds.includes(s.id) || s.parentPhone === parentUser?.phone
  );

  if (linkedStudents.length === 0) {
    return res.json({
      parent: parentUser,
      linkedStudents: [],
      currentStudent: null,
      message: 'No students currently linked to this parent account.',
    });
  }

  // Select active student (either specified or first linked child)
  let activeStudent = linkedStudents.find((s) => s.id === studentId);
  if (!activeStudent) {
    activeStudent = linkedStudents[0];
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  // 1. Today's attendance
  const todayAttendance = state.attendance.find(
    (a) => a.studentId === activeStudent?.id && a.date === todayStr
  );

  // 2. Attendance history & rate
  const allStudentAttendance = state.attendance
    .filter((a) => a.studentId === activeStudent?.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalAttDays = allStudentAttendance.length;
  const presentDays = allStudentAttendance.filter((a) => a.status === 'P').length;
  const attendancePercentage = totalAttDays > 0 ? Math.round((presentDays / totalAttDays) * 100) : 100;

  // 3. Fee obligations & payments
  const obligations = state.feeObligations
    .filter((o) => o.studentId === activeStudent?.id && !o.archived)
    .sort((a, b) => b.month.localeCompare(a.month));

  const totalOutstanding = obligations.reduce((sum, o) => sum + o.outstandingBalance, 0);

  const studentPayments = state.payments
    .filter((p) => p.studentId === activeStudent?.id && !p.reversed)
    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

  const studentSubmissions = state.bkashSubmissions
    .filter((s) => s.studentId === activeStudent?.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // 4. Published Weekly Test Results
  const studentResults = state.testResults
    .filter((r) => r.studentId === activeStudent?.id && r.reportPublished)
    .map((r) => {
      const test = state.tests.find((t) => t.id === r.testId);
      return {
        ...r,
        testTitle: test?.title || 'Weekly Test',
        testSubject: test?.subject || 'Subject',
        testDate: test?.testDate || '',
      };
    })
    .sort((a, b) => b.testDate.localeCompare(a.testDate));

  // 5. Homework
  const studentHomework = state.homework
    .filter((h) => h.classBatchId === activeStudent?.classBatchId)
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate));

  // 6. Announcements
  const announcements = state.announcements
    .filter((a) => a.targetAudience === 'all' || a.targetAudience === 'parents')
    .sort((a, b) => b.date.localeCompare(a.date));

  // 7. Settings for bKash & tuition contact
  const settings = state.settings;

  res.json({
    parent: {
      id: parentUser.id,
      name: parentUser.name,
      phone: parentUser.phone,
      email: parentUser.email,
    },
    linkedStudents: linkedStudents.map((s) => ({
      id: s.id,
      studentId: s.studentId,
      name: s.name,
      classBatchName: s.classBatchName,
      rollNo: s.rollNo,
    })),
    currentStudent: activeStudent,
    todayAttendance: todayAttendance ? todayAttendance.status : 'Not marked yet',
    attendanceStats: {
      totalDays: totalAttDays,
      presentDays,
      absentDays: allStudentAttendance.filter((a) => a.status === 'A').length,
      leaveDays: allStudentAttendance.filter((a) => a.status === 'L').length,
      percentage: attendancePercentage,
      history: allStudentAttendance.slice(0, 10),
    },
    feeSummary: {
      totalOutstanding,
      obligations,
      payments: studentPayments,
      submissions: studentSubmissions,
    },
    tests: studentResults,
    homework: studentHomework,
    announcements,
    tuitionSettings: settings,
  });
});
