import { Router } from 'express';
import { db } from '../db.ts';
import { generateWhatsAppLink, interpolateTemplate, normalizeBdPhoneNumber } from '../whatsappHelper.ts';

export const feesRouter = Router();

// 1. Get Fee Summary & Dashboard KPIs
feesRouter.get('/summary', (req, res) => {
  const { month, classBatchId } = req.query;
  const state = db.getState();

  let obligations = state.feeObligations.filter((o) => !o.archived);
  if (month) {
    obligations = obligations.filter((o) => o.month === month);
  }
  if (classBatchId) {
    obligations = obligations.filter((o) => o.classBatchId === classBatchId);
  }

  const totalEnrolledStudents = state.students.filter((s) => s.status === 'active').length;
  const expectedFees = obligations.reduce((sum, o) => sum + o.adjustedFee, 0);
  const feesCollected = obligations.reduce((sum, o) => sum + o.paidAmount, 0);
  const totalOutstanding = obligations.reduce((sum, o) => sum + o.outstandingBalance, 0);

  const nowStr = new Date().toISOString().slice(0, 10);
  const overdueFees = obligations
    .filter((o) => o.outstandingBalance > 0 && o.dueDate < nowStr)
    .reduce((sum, o) => sum + o.outstandingBalance, 0);

  const pendingStudentsCount = new Set(
    obligations.filter((o) => o.outstandingBalance > 0).map((o) => o.studentId)
  ).size;

  const collectionPercentage = expectedFees > 0 ? Math.round((feesCollected / expectedFees) * 1000) / 10 : 0;

  res.json({
    totalEnrolledStudents,
    expectedFees,
    feesCollected,
    totalOutstanding,
    overdueFees,
    pendingStudentsCount,
    collectionPercentage,
  });
});

// 2. Get Fee Obligations with search, filter, sorting, pagination
feesRouter.get('/obligations', (req, res) => {
  const {
    month,
    classBatchId,
    status,
    search,
    sortBy = 'studentName',
    sortOrder = 'asc',
    page = '1',
    limit = '20',
  } = req.query;

  const state = db.getState();
  let list = state.feeObligations.filter((o) => !o.archived);

  // Month filter
  if (month && month !== 'all') {
    list = list.filter((o) => o.month === month);
  }

  // Batch filter
  if (classBatchId && classBatchId !== 'all') {
    list = list.filter((o) => o.classBatchId === classBatchId);
  }

  // Status filter
  if (status && status !== 'all') {
    list = list.filter((o) => o.status === status);
  }

  // Search filter (Student name, parent name, student ID, phone)
  if (search) {
    const q = String(search).toLowerCase().trim();
    list = list.filter(
      (o) =>
        o.studentName.toLowerCase().includes(q) ||
        o.parentName.toLowerCase().includes(q) ||
        o.parentPhone.includes(q) ||
        o.classBatchName.toLowerCase().includes(q)
    );
  }

  // Sorting
  list.sort((a, b) => {
    let valA = a[sortBy as keyof typeof a] ?? '';
    let valB = b[sortBy as keyof typeof b] ?? '';

    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    }
    return sortOrder === 'desc'
      ? String(valB).localeCompare(String(valA))
      : String(valA).localeCompare(String(valB));
  });

  // Pagination
  const pageNum = parseInt(page as string, 10) || 1;
  const limitNum = parseInt(limit as string, 10) || 20;
  const total = list.length;
  const startIndex = (pageNum - 1) * limitNum;
  const paginated = list.slice(startIndex, startIndex + limitNum);

  res.json({
    data: paginated,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

// 3. Record Payment
feesRouter.post('/payments', (req, res) => {
  try {
    const { feeObligationId, amount, paymentMethod, transactionId, recordedBy = 'Admin', notes } = req.body;
    const payment = db.recordPayment({
      feeObligationId,
      amount: Number(amount),
      paymentMethod,
      transactionId,
      recordedBy,
      notes,
    });
    res.status(201).json({ success: true, payment });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 4. Adjust Fee / Apply Discount
feesRouter.patch('/obligations/:id/adjust', (req, res) => {
  try {
    const { id } = req.params;
    const { baseFee, discount, notes, userId = 'Admin' } = req.body;

    const state = db.getState();
    const ob = state.feeObligations.find((o) => o.id === id);
    if (!ob) return res.status(404).json({ error: 'Fee obligation not found' });

    if (baseFee !== undefined && Number(baseFee) >= 0) {
      ob.baseFee = Number(baseFee);
    }
    if (discount !== undefined && Number(discount) >= 0) {
      ob.discount = Number(discount);
    }
    if (notes) {
      ob.notes = notes;
    }

    db.recalculateFeeObligation(ob.id);
    db.save();

    db.logAudit(
      userId,
      userId,
      'FEE_ADJUSTMENT',
      'FeeObligation',
      ob.id,
      `Adjusted fee for ${ob.studentName} (${ob.monthDisplay}): Base: ৳${ob.baseFee}, Discount: ৳${ob.discount}. Outstanding: ৳${ob.outstandingBalance}. Reason: ${notes || 'Admin adjustment'}`
    );

    res.json({ success: true, obligation: ob });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 5. Create new fee obligation
feesRouter.post('/obligations', (req, res) => {
  try {
    const { studentId, month, baseFee, discount = 0, dueDate, notes } = req.body;
    const state = db.getState();

    const student = state.students.find((s) => s.id === studentId);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    // Check duplicate obligation for same student & month
    const existing = state.feeObligations.find(
      (o) => !o.archived && o.studentId === studentId && o.month === month
    );
    if (existing) {
      return res.status(400).json({ error: `Fee obligation for ${student.name} in month ${month} already exists.` });
    }

    const monthDisplay = new Date(`${month}-01`).toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const adjustedFee = Math.max(0, Number(baseFee) - Number(discount));
    const nowStr = new Date().toISOString().slice(0, 10);

    const newOb = {
      id: `fee-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      studentId: student.id,
      studentName: student.name,
      classBatchId: student.classBatchId,
      classBatchName: student.classBatchName,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      month,
      monthDisplay,
      baseFee: Number(baseFee),
      discount: Number(discount),
      adjustedFee,
      paidAmount: 0,
      outstandingBalance: adjustedFee,
      dueDate: dueDate || `${month}-10`,
      status: dueDate && dueDate < nowStr ? ('overdue' as const) : ('pending' as const),
      notes,
    };

    state.feeObligations.unshift(newOb);
    db.save();

    db.logAudit(
      'Admin',
      'Admin',
      'CREATE_FEE_OBLIGATION',
      'FeeObligation',
      newOb.id,
      `Created fee obligation of ৳${adjustedFee} for ${student.name} (${monthDisplay})`
    );

    res.status(201).json({ success: true, obligation: newOb });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 6. Payment History & Receipt Details
feesRouter.get('/payments', (req, res) => {
  const { studentId, feeObligationId } = req.query;
  const state = db.getState();

  let payments = state.payments.filter((p) => !p.reversed);
  if (studentId) {
    payments = payments.filter((p) => p.studentId === studentId);
  }
  if (feeObligationId) {
    payments = payments.filter((p) => p.feeObligationId === feeObligationId);
  }

  res.json({ payments });
});

feesRouter.get('/receipts/:receiptNumber', (req, res) => {
  const { receiptNumber } = req.params;
  const state = db.getState();
  const payment = state.payments.find((p) => p.receiptNumber === receiptNumber);
  if (!payment) return res.status(404).json({ error: 'Receipt not found' });

  const obligation = state.feeObligations.find((o) => o.id === payment.feeObligationId);
  const student = state.students.find((s) => s.id === payment.studentId);
  const settings = state.settings;

  res.json({
    payment,
    obligation,
    student,
    settings,
  });
});

// 7. WhatsApp Personalized Fee Reminder (Single)
feesRouter.post('/whatsapp-reminder', (req, res) => {
  try {
    const { feeObligationId } = req.body;
    const state = db.getState();

    const ob = state.feeObligations.find((o) => o.id === feeObligationId);
    if (!ob) return res.status(404).json({ error: 'Fee obligation not found' });

    if (ob.outstandingBalance <= 0) {
      return res.status(400).json({ error: 'Fee is already fully paid. Normal overdue reminders cannot be generated.' });
    }

    // Get template or default
    const template =
      state.templates.find((t) => t.type === 'fee_reminder')?.templateText ||
      'Hello, {{parent_name}}. This is a friendly reminder that the tuition fee of {{student_name}} for {{fee_month}} is still pending. Outstanding amount: ৳{{outstanding_amount}}. Please let us know once payment is completed. Thank you.';

    const message = interpolateTemplate(template, {
      parent_name: ob.parentName,
      student_name: ob.studentName,
      fee_month: ob.monthDisplay,
      outstanding_amount: ob.outstandingBalance,
      class_name: ob.classBatchName,
    });

    const linkResult = generateWhatsAppLink(ob.parentPhone, message);
    if (!linkResult.success) {
      return res.status(400).json({ error: linkResult.error });
    }

    // Log message preparation without claiming false delivery
    const logEntry = {
      id: `wlog-${Date.now()}`,
      recipientPhone: linkResult.normalizedPhone!,
      recipientName: ob.parentName,
      studentName: ob.studentName,
      messageType: 'fee_reminder' as const,
      messageText: message,
      status: 'prepared' as const,
      generatedUrl: linkResult.url!,
      relatedEntityId: ob.id,
      createdAt: new Date().toISOString(),
    };
    state.whatsappLogs.unshift(logEntry);
    db.save();

    res.json({
      success: true,
      url: linkResult.url,
      message,
      normalizedPhone: linkResult.normalizedPhone,
      displayPhone: ob.parentPhone,
      parentName: ob.parentName,
      studentName: ob.studentName,
      outstandingAmount: ob.outstandingBalance,
      logId: logEntry.id,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Remind All Overdue Parents (Bulk Workflow)
feesRouter.get('/bulk-overdue-reminders', (req, res) => {
  try {
    const { month, classBatchId } = req.query;
    const state = db.getState();
    const nowStr = new Date().toISOString().slice(0, 10);

    let overdueList = state.feeObligations.filter(
      (o) => !o.archived && o.outstandingBalance > 0 && o.dueDate < nowStr
    );

    if (month && month !== 'all') {
      overdueList = overdueList.filter((o) => o.month === month);
    }
    if (classBatchId && classBatchId !== 'all') {
      overdueList = overdueList.filter((o) => o.classBatchId === classBatchId);
    }

    const template =
      state.templates.find((t) => t.type === 'fee_reminder')?.templateText ||
      'Hello, {{parent_name}}. This is a friendly reminder that the tuition fee of {{student_name}} for {{fee_month}} is still pending. Outstanding amount: ৳{{outstanding_amount}}. Please let us know once payment is completed. Thank you.';

    const preparedReminders = overdueList.map((ob) => {
      const phoneVal = normalizeBdPhoneNumber(ob.parentPhone);
      const message = interpolateTemplate(template, {
        parent_name: ob.parentName,
        student_name: ob.studentName,
        fee_month: ob.monthDisplay,
        outstanding_amount: ob.outstandingBalance,
        class_name: ob.classBatchName,
      });

      const waLink = phoneVal.isValid ? generateWhatsAppLink(ob.parentPhone, message) : null;

      return {
        feeObligationId: ob.id,
        studentId: ob.studentId,
        studentName: ob.studentName,
        classBatchName: ob.classBatchName,
        parentName: ob.parentName,
        parentPhone: ob.parentPhone,
        normalizedPhone: phoneVal.normalizedNumber,
        isValidPhone: phoneVal.isValid,
        phoneError: phoneVal.error,
        outstandingAmount: ob.outstandingBalance,
        monthDisplay: ob.monthDisplay,
        message,
        url: waLink?.url,
      };
    });

    res.json({
      count: preparedReminders.length,
      validCount: preparedReminders.filter((r) => r.isValidPhone).length,
      reminders: preparedReminders,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Export Fees to CSV
feesRouter.get('/export-csv', (req, res) => {
  const { month, classBatchId } = req.query;
  const state = db.getState();

  let list = state.feeObligations.filter((o) => !o.archived);
  if (month && month !== 'all') list = list.filter((o) => o.month === month);
  if (classBatchId && classBatchId !== 'all') list = list.filter((o) => o.classBatchId === classBatchId);

  const headers = [
    'Student ID',
    'Student Name',
    'Class / Batch',
    'Parent Name',
    'Parent Phone',
    'Month',
    'Base Fee (BDT)',
    'Discount (BDT)',
    'Adjusted Fee (BDT)',
    'Paid Amount (BDT)',
    'Outstanding Balance (BDT)',
    'Due Date',
    'Status',
  ];

  const rows = list.map((o) => [
    `"${o.studentId}"`,
    `"${o.studentName}"`,
    `"${o.classBatchName}"`,
    `"${o.parentName}"`,
    `"${o.parentPhone}"`,
    `"${o.monthDisplay}"`,
    o.baseFee,
    o.discount,
    o.adjustedFee,
    o.paidAmount,
    o.outstandingBalance,
    `"${o.dueDate}"`,
    `"${o.status}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="fee-report-${month || 'all'}.csv"`);
  res.send('\uFEFF' + csvContent); // BOM for Excel Bangladesh/UTF-8 support
});
