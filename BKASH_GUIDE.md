# bKash Manual Payment & Verification Guide

This document outlines the workflow, fraud protection, and configuration of the bKash manual payment system in ShikhoTuition BD.

---

## 1. Overview & Bangladesh Payment Context

In Bangladesh, tuition centres and private academic coaching facilities predominantly receive tuition fees through **bKash** (Personal "Send Money" or Merchant "Make Payment").

ShikhoTuition BD provides a complete, transparent, and auditable verification loop without requiring expensive or restricted payment gateway merchant contracts.

---

## 2. Parent Payment Workflow

1. **Viewing Details**: In the Parent App, parents can see:
   - Tuition academy's bKash number (`017XXXXXXXX`).
   - Account Type (`Merchant` or `Personal`).
   - One-click **Copy Number** button with immediate clipboard feedback.
   - **View QR Code** action displaying the academy's official bKash QR code.
2. **Executing Payment**: Parent opens their personal bKash app or dials `*247#` to pay the fee, entering the Student ID in the reference field.
3. **Submitting Proof**: Parent submits:
   - Target fee month obligation.
   - Amount paid (৳ BDT).
   - Parent's bKash phone number.
   - 10-character alphanumeric **Transaction ID (TrxID)** (e.g. `BL984X7Q11`).
   - Optional payment screenshot image or PDF.
4. **Immediate Status**: The submission is marked as **Pending Verification**. It does **NOT** reduce the student's debt or inflate collected revenue until verified by an administrator.

---

## 3. Teacher / Admin Verification Workflow

1. Administrator opens Admin Panel > **bKash Verification Queue**.
2. Reviews the submitted TrxID, sender phone number, amount, and payment screenshot against their bKash SMS notifications or merchant statement.
3. **Approval**:
   - Taps **Approve & Issue Receipt**.
   - The system records the verified `PaymentRecord`, assigns a unique sequential money receipt number (`REC-2026-XXXX`), recalculates the fee obligation, and marks the obligation as `paid` or `partial`.
4. **Rejection**:
   - Taps **Reject** and inputs a mandatory explanation (e.g., "TrxID not found in bKash statement" or "Incorrect amount").
   - Parent immediately sees the rejection notice and reason in the Parent App.

---

## 4. Fraud Prevention & Data Integrity Safeguards

- **Duplicate Prevention**: The system enforces a unique constraint on Transaction IDs across both active payments and pending submissions. If a parent attempts to submit an already-used TrxID, the submission is rejected immediately.
- **No Secret Storage**: The application never asks for or stores the user's 5-digit bKash PIN or password.
- **Financial Reconciliation**: Unverified pending submissions are completely excluded from the tuition owner's collected revenue totals.
