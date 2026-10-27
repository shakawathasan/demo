import { Router } from 'express';
import { db } from '../db.ts';
import { requireAdminAuth } from './authRoutes.ts';

export const ownerRouter = Router();

// Protect owner analytics with admin authentication
ownerRouter.use(requireAdminAuth);

ownerRouter.get('/dashboard', (req, res) => {
  const { dateRange, month, classBatchId } = req.query;
  const state = db.getState();

  const totalStudents = state.students.length;
  const activeStudents = state.students.filter((s) => s.status === 'active').length;
  const totalBatches = state.batches.filter((b) => !b.archived).length;

  let obligations = state.feeObligations.filter((o) => !o.archived);
  if (month && month !== 'all') {
    obligations = obligations.filter((o) => o.month === month);
  }
  if (classBatchId && classBatchId !== 'all') {
    obligations = obligations.filter((o) => o.classBatchId === classBatchId);
  }

  const expectedFees = obligations.reduce((sum, o) => sum + o.adjustedFee, 0);
  const feesCollected = obligations.reduce((sum, o) => sum + o.paidAmount, 0);
  const outstandingFees = obligations.reduce((sum, o) => sum + o.outstandingBalance, 0);

  const nowStr = new Date().toISOString().slice(0, 10);
  const overdueFees = obligations
    .filter((o) => o.outstandingBalance > 0 && o.dueDate < nowStr)
    .reduce((sum, o) => sum + o.outstandingBalance, 0);

  const collectionPercentage = expectedFees > 0 ? Math.round((feesCollected / expectedFees) * 1000) / 10 : 0;

  // Enquiries & Referrals
  const newEnquiriesCount = state.referrals.filter((r) => r.status === 'New').length;
  const enrolledReferralsCount = state.referrals.filter((r) => r.status === 'Enrolled').length;

  // Monthly Collection Breakdown
  const monthsMap = new Map<string, { month: string; monthDisplay: string; expected: number; collected: number; outstanding: number }>();
  state.feeObligations.forEach((ob) => {
    if (!monthsMap.has(ob.month)) {
      monthsMap.set(ob.month, {
        month: ob.month,
        monthDisplay: ob.monthDisplay,
        expected: 0,
        collected: 0,
        outstanding: 0,
      });
    }
    const item = monthsMap.get(ob.month)!;
    item.expected += ob.adjustedFee;
    item.collected += ob.paidAmount;
    item.outstanding += ob.outstandingBalance;
  });

  const monthlyCollections = Array.from(monthsMap.values()).sort((a, b) => b.month.localeCompare(a.month));

  // Recent payments
  const recentPayments = state.payments
    .filter((p) => !p.reversed)
    .slice(0, 8);

  // Unverified pending submissions count
  const pendingBkashCount = state.bkashSubmissions.filter((s) => s.status === 'pending').length;

  // Reconciled financial check:
  // Total payments recorded across the system vs total fee obligations paidAmount
  const totalSystemApprovedPayments = state.payments
    .filter((p) => !p.reversed)
    .reduce((sum, p) => sum + p.amount, 0);

  const totalFeeObligationsPaid = state.feeObligations
    .filter((o) => !o.archived)
    .reduce((sum, o) => sum + o.paidAmount, 0);

  const isReconciled = totalSystemApprovedPayments === totalFeeObligationsPaid;

  res.json({
    kpi: {
      totalStudents,
      activeStudents,
      totalBatches,
      expectedFees,
      feesCollected,
      outstandingFees,
      overdueFees,
      collectionPercentage,
      newEnquiriesCount,
      enrolledReferralsCount,
      pendingBkashCount,
    },
    reconciliation: {
      isReconciled,
      totalApprovedPayments: totalSystemApprovedPayments,
      totalObligationsPaid: totalFeeObligationsPaid,
      variance: totalSystemApprovedPayments - totalFeeObligationsPaid,
    },
    monthlyCollections,
    recentPayments,
    settings: state.settings,
  });
});

// Referrals & Enquiries Management
ownerRouter.get('/referrals', (req, res) => {
  const { status, source } = req.query;
  const state = db.getState();

  let list = state.referrals;
  if (status && status !== 'all') {
    list = list.filter((r) => r.status === status);
  }
  if (source && source !== 'all') {
    list = list.filter((r) => r.source === source);
  }

  res.json({ referrals: list });
});

ownerRouter.post('/referrals', (req, res) => {
  try {
    const {
      referrerName,
      prospectiveStudentName,
      parentName,
      parentPhone,
      targetClass,
      source = 'Refer-a-Friend',
      notes,
    } = req.body;

    const state = db.getState();

    if (!prospectiveStudentName || !parentPhone) {
      return res.status(400).json({ error: 'Student name and parent phone are required' });
    }

    // Check duplicate enquiry
    const existing = state.referrals.find(
      (r) => r.parentPhone === parentPhone && r.prospectiveStudentName.toLowerCase() === prospectiveStudentName.toLowerCase()
    );
    if (existing) {
      return res.status(400).json({ error: 'An enquiry for this student and parent phone already exists.' });
    }

    const referralCode = `REF-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const newEnquiry = {
      id: `ref-${Date.now()}`,
      referralCode,
      referrerName: referrerName || 'Direct Enquiry',
      prospectiveStudentName: prospectiveStudentName.trim(),
      parentName: parentName || 'Parent',
      parentPhone: parentPhone.trim(),
      targetClass: targetClass || 'General',
      source,
      status: 'New' as const,
      notes,
      enquiryDate: new Date().toISOString().slice(0, 10),
      rewardClaimed: false,
    };

    state.referrals.unshift(newEnquiry);
    db.save();

    db.logAudit(
      'Owner',
      'Owner',
      'CREATE_ENQUIRY',
      'ReferralEnquiry',
      newEnquiry.id,
      `New enquiry logged: ${newEnquiry.prospectiveStudentName} (${newEnquiry.source})`
    );

    res.status(201).json({ success: true, enquiry: newEnquiry });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

ownerRouter.patch('/referrals/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, rewardClaimed } = req.body;
    const state = db.getState();

    const item = state.referrals.find((r) => r.id === id);
    if (!item) return res.status(404).json({ error: 'Enquiry not found' });

    if (status) {
      item.status = status;
    }
    if (notes) {
      item.notes = notes;
    }
    if (rewardClaimed !== undefined) {
      item.rewardClaimed = Boolean(rewardClaimed);
    }

    db.save();

    db.logAudit(
      'Owner',
      'Owner',
      'UPDATE_ENQUIRY_STATUS',
      'ReferralEnquiry',
      item.id,
      `Updated enquiry status to "${item.status}" for ${item.prospectiveStudentName}`
    );

    res.json({ success: true, enquiry: item });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
