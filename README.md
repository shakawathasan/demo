# ShikhoTuition BD — Tuition & Coaching Management Web App

A complete, full-stack tuition and coaching management web application designed for tuition teachers and coaching-centre owners in Bangladesh.

Built with a mobile-first philosophy, Bangladeshi currency (৳ BDT), bKash manual payment verification, Bangladesh-standard mobile number normalization (+8801...), and personalized WhatsApp click-to-chat messaging.

---

## 🚀 Key Feature Modules

1. **Fees Pending & Collection**
   - KPI metrics: Total Enrolled, Expected Fees, Fees Collected, Outstanding, Overdue, Collection Rate.
   - Student fee obligations table with instant search, multi-month filters, sorting, and pagination.
   - Record manual cash/bKash/bank payments with duplicate prevention.
   - Sibling discounts, scholarship waivers, and audited fee adjustments.
   - Official printable money receipts (`REC-YYYY-XXXX`) with tuition header and signatures.
   - Personalized WhatsApp fee reminder button per student and bulk "Remind All Overdue Parents" runner.
   - Export fee records to CSV.

2. **Attendance Register**
   - Class batch and date picker with roster status.
   - Single-click "Mark All Present" and individual P (Present), A (Absent), L (Leave) pill toggles.
   - Consecutive absence detection (flags students absent 2+ days consecutively).
   - Low attendance warning (< 75% monthly attendance).
   - Personalized WhatsApp absence alerts for absent students with step-by-step chat launcher.

3. **Weekly Test Reports & Ranks**
   - Test creator: Class, Subject, Test Date, Maximum Marks.
   - Marks grading table with strict input range validation ($0 \le marks \le maxMarks$).
   - Standard Competition Ranking (1224) algorithm for consistent tie handling.
   - Class statistics: Highest Marks, Lowest Marks, Class Average, and Progress Delta vs prior test.
   - One-click WhatsApp student test scorecard sender.
   - Individual printable performance report card.

4. **Parent App**
   - Clean mobile-first interface for parents.
   - Secure multi-child tab switcher (e.g., Parent Abdul Karim switching between Tanvir in Class 10 and Sumaiya in Class 9).
   - Today's attendance indicator, monthly history, and attendance rate.
   - Fee obligation ledger with outstanding amounts and payment history.
   - bKash payment portal with Copy Number button, QR Code view, and TrxID submission.
   - Published weekly test report cards with teacher feedback.
   - Homework assignments and academy announcements.

5. **Owner Business Dashboard**
   - High-level business overview: Active students, expected revenue, collection rate, overdue fees.
   - Monthly collection trend bars with historical reconciliation.
   - Admissions & Refer-a-Friend enquiry pipeline with workflow stages: `New` → `Contacted` → `Trial Scheduled` → `Enrolled` → `Closed`.
   - Referral reward tracking (e.g. ৳500 tuition discount).

6. **Full Administrative Control Panel**
   - Complete CRUD management for Students, Classes/Batches, bKash Submissions, Templates, and Global Settings.
   - bKash verification queue: Review submitted TrxIDs against bank SMS, approve or reject with audited reason.
   - Safe deletion rules: Automatically archives students with historical financial records to prevent corrupting ledgers.
   - WhatsApp message templates editor with dynamic tags (`{{parent_name}}`, `{{student_name}}`, `{{outstanding_amount}}`, etc.).
   - Full immutable audit log trail.
   - Automated QA Suite runner evaluating all 23 prompt conditions.

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: Pure HTML5 (`index.html`), CSS (`src/styles.css` with Tailwind CSS), and modular Vanilla JavaScript (`src/js/*.js`). Strictly no React/JSX/TSX in frontend application code.
- **Backend**: Express & TypeScript (`server.ts`) running on Node.js.
- **Database**: Relational file-backed ACID store (`data/database.json`) with transactions, foreign keys, unique constraints, and atomic persistence.
- **Integrations**: Free WhatsApp click-to-chat links (`wa.me/8801...`), bKash manual verification, and Multer file uploads for receipts and QR codes.

---

## 💻 Local Setup & Development Instructions

### Prerequisites
- Node.js v18+ or v20+ / v22+
- npm v9+

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default parameters are pre-configured:
```env
PORT=3000
NODE_ENV=development
APP_URL=http://localhost:3000
```

### 3. Start the Server
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

---

## 🧪 Automated Testing
Run the automated test runner in the Admin Panel by clicking **"Run Automated QA Suite (23 Tests)"** or call:
```bash
curl http://localhost:3000/api/qa/run-tests
```
All 23 criteria are verified with a 100% pass score.
