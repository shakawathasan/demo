import { Router } from 'express';
import { db } from '../db.ts';
import { generateWhatsAppLink, interpolateTemplate, normalizeBdPhoneNumber } from '../whatsappHelper.ts';

export const attendanceRouter = Router();

// 1. Get Roster and existing attendance for a class batch and date
attendanceRouter.get('/sheet', (req, res) => {
  const { classBatchId, date } = req.query;
  const state = db.getState();

  if (!classBatchId || !date) {
    return res.status(400).json({ error: 'classBatchId and date are required' });
  }

  const batch = state.batches.find((b) => b.id === classBatchId);
  if (!batch) return res.status(404).json({ error: 'Batch not found' });

  const enrolledStudents = state.students.filter(
    (s) => s.classBatchId === classBatchId && s.status === 'active'
  );

  const existingRecords = state.attendance.filter(
    (a) => a.classBatchId === classBatchId && a.date === date
  );

  const roster = enrolledStudents.map((s) => {
    const record = existingRecords.find((r) => r.studentId === s.id);
    const consecutiveAbsences = db.getConsecutiveAbsences(s.id, classBatchId as string);

    const studentHistory = state.attendance.filter(
      (a) => a.studentId === s.id && a.classBatchId === classBatchId
    );
    const totalDays = studentHistory.length;
    const presentDays = studentHistory.filter((a) => a.status === 'P').length;
    const rate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

    return {
      studentId: s.id,
      studentCode: s.studentId,
      studentName: s.name,
      rollNo: s.rollNo,
      parentName: s.parentName,
      parentPhone: s.parentPhone,
      currentStatus: record ? record.status : null,
      notes: record?.notes || '',
      consecutiveAbsences,
      attendanceRate: rate,
      isLowAttendance: rate < 75 && totalDays >= 3,
      recordId: record?.id,
    };
  });

  const total = enrolledStudents.length;
  const presentCount = existingRecords.filter((r) => r.status === 'P').length;
  const absentCount = existingRecords.filter((r) => r.status === 'A').length;
  const leaveCount = existingRecords.filter((r) => r.status === 'L').length;
  const recorded = existingRecords.length > 0;

  res.json({
    batch,
    date,
    isRecorded: recorded,
    summary: {
      total,
      presentCount,
      absentCount,
      leaveCount,
      unmarkedCount: Math.max(0, total - existingRecords.length),
      attendancePercentage: total > 0 ? Math.round((presentCount / total) * 100) : 0,
    },
    roster,
  });
});

// 2. Save or Update Attendance Batch
attendanceRouter.post('/save', (req, res) => {
  try {
    const { classBatchId, date, records, recordedBy = 'Teacher' } = req.body;

    if (!classBatchId || !date || !Array.isArray(records)) {
      return res.status(400).json({ error: 'classBatchId, date, and records array are required' });
    }

    const saved = db.saveAttendanceBatch(classBatchId, date, records, recordedBy);
    res.json({ success: true, count: saved.length, records: saved });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 3. Generate Single WhatsApp Absence Alert
attendanceRouter.post('/whatsapp-absence-alert', (req, res) => {
  try {
    const { studentId, classBatchId, date } = req.body;
    const state = db.getState();

    const record = state.attendance.find(
      (a) => a.studentId === studentId && a.classBatchId === classBatchId && a.date === date
    );

    if (!record) {
      return res.status(400).json({ error: 'Please save attendance before generating absence alerts.' });
    }

    if (record.status !== 'A') {
      return res.status(400).json({ error: 'Absence alerts can only be generated for students marked Absent (A).' });
    }

    const batch = state.batches.find((b) => b.id === classBatchId);
    const template =
      state.templates.find((t) => t.type === 'absence_alert')?.templateText ||
      'Hello, {{parent_name}}. {{student_name}} was marked absent from {{class_name}} on {{attendance_date}}. Please contact us if you need any clarification.';

    const message = interpolateTemplate(template, {
      parent_name: record.parentName,
      student_name: record.studentName,
      class_name: batch?.name || 'Tuition Batch',
      attendance_date: record.date,
    });

    const linkResult = generateWhatsAppLink(record.parentPhone, message);
    if (!linkResult.success) {
      return res.status(400).json({ error: linkResult.error });
    }

    record.whatsappAlertPrepared = true;
    db.save();

    res.json({
      success: true,
      url: linkResult.url,
      message,
      normalizedPhone: linkResult.normalizedPhone,
      parentName: record.parentName,
      studentName: record.studentName,
      date: record.date,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Bulk Absence Alerts
attendanceRouter.get('/bulk-absence-alerts', (req, res) => {
  try {
    const { classBatchId, date } = req.query;
    const state = db.getState();

    if (!classBatchId || !date) {
      return res.status(400).json({ error: 'classBatchId and date are required' });
    }

    const batch = state.batches.find((b) => b.id === classBatchId);
    const absentRecords = state.attendance.filter(
      (a) => a.classBatchId === classBatchId && a.date === date && a.status === 'A'
    );

    const template =
      state.templates.find((t) => t.type === 'absence_alert')?.templateText ||
      'Hello, {{parent_name}}. {{student_name}} was marked absent from {{class_name}} on {{attendance_date}}. Please contact us if you need any clarification.';

    const alerts = absentRecords.map((r) => {
      const phoneVal = normalizeBdPhoneNumber(r.parentPhone);
      const message = interpolateTemplate(template, {
        parent_name: r.parentName,
        student_name: r.studentName,
        class_name: batch?.name || 'Class Batch',
        attendance_date: r.date,
      });

      const waLink = phoneVal.isValid ? generateWhatsAppLink(r.parentPhone, message) : null;

      return {
        recordId: r.id,
        studentId: r.studentId,
        studentName: r.studentName,
        parentName: r.parentName,
        parentPhone: r.parentPhone,
        normalizedPhone: phoneVal.normalizedNumber,
        isValidPhone: phoneVal.isValid,
        phoneError: phoneVal.error,
        message,
        url: waLink?.url,
      };
    });

    res.json({
      count: alerts.length,
      validCount: alerts.filter((a) => a.isValidPhone).length,
      alerts,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Attendance History
attendanceRouter.get('/history', (req, res) => {
  const { classBatchId, month } = req.query;
  const state = db.getState();

  let records = state.attendance;
  if (classBatchId && classBatchId !== 'all') {
    records = records.filter((a) => a.classBatchId === classBatchId);
  }
  if (month) {
    records = records.filter((a) => a.date.startsWith(month as string));
  }

  const dates = Array.from(new Set(records.map((r) => r.date))).sort().reverse();
  const summaryByDate = dates.map((d) => {
    const dayRecords = records.filter((r) => r.date === d);
    const p = dayRecords.filter((r) => r.status === 'P').length;
    const a = dayRecords.filter((r) => r.status === 'A').length;
    const l = dayRecords.filter((r) => r.status === 'L').length;
    const total = dayRecords.length;
    return {
      date: d,
      total,
      present: p,
      absent: a,
      leave: l,
      rate: total > 0 ? Math.round((p / total) * 100) : 0,
    };
  });

  res.json({ history: summaryByDate });
});
