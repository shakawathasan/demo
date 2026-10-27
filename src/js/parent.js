import { apiRequest } from './api.js';
import { buildWhatsAppUrl } from './whatsapp.js';

export class ParentViewController {
  constructor(app) {
    this.app = app;
    this.portalData = null;
    this.activeStudentId = null;
  }

  async init() {
    this.renderContainer();
    await this.refresh();
  }

  renderContainer() {
    const container = document.getElementById('view-parent');
    if (!container) return;

    container.innerHTML = `
      <div class="max-w-4xl mx-auto space-y-6">
        <!-- Parent Header -->
        <div id="parent-header-card" class="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">Parent Portal</span>
              <span id="parent-user-name" class="text-sm font-bold text-slate-800">Parent Account</span>
            </div>
            <p class="text-xs text-slate-500 mt-1">Real-time attendance, fee records, bKash payments, and test performance.</p>
          </div>
          <!-- Child Switcher Tabs (Supports Multiple Children!) -->
          <div id="parent-child-tabs" class="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
            <!-- Injected dynamically -->
          </div>
        </div>

        <!-- Student Quick Status Hero Card -->
        <div id="parent-hero-strip" class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <!-- Today Attendance, Outstanding Fees, Latest Result -->
        </div>

        <!-- bKash Quick Payment Banner -->
        <div class="bg-gradient-to-r from-pink-500 to-rose-600 rounded-xl p-4 sm:p-5 text-white shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">bKash Manual Payment</span>
              <span id="bkash-type-badge" class="text-xs font-medium bg-black/20 px-2 py-0.5 rounded">Merchant</span>
            </div>
            <div class="text-lg font-bold mt-1 flex items-center gap-2">
              <span id="bkash-display-num">01712345678</span>
              <button id="btn-copy-bkash" class="px-2 py-0.5 text-xs font-semibold bg-white text-pink-700 rounded hover:bg-white/90 shadow-sm">
                Copy Number
              </button>
            </div>
            <p class="text-xs text-pink-100 mt-0.5">Pay via bKash app or *247# and submit the TrxID below for verification.</p>
          </div>
          <div class="flex items-center gap-2">
            <button id="btn-view-qr-code" class="px-3.5 py-2 text-xs font-semibold text-pink-900 bg-white hover:bg-pink-50 rounded-lg shadow-sm">
              View QR Code
            </button>
            <button id="btn-open-submit-bkash" class="px-4 py-2 text-xs font-bold text-white bg-pink-800 hover:bg-pink-900 rounded-lg shadow-sm">
              Submit TrxID Payment
            </button>
          </div>
        </div>

        <!-- Navigation Tabs: Fees, Attendance, Tests, Homework, Notices -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="flex border-b border-slate-200 overflow-x-auto text-xs font-semibold text-slate-600 bg-slate-50">
            <button class="parent-subtab py-3 px-4 border-b-2 border-blue-700 text-blue-700 font-bold whitespace-nowrap" data-tab="fees">
              Fees & bKash Submissions
            </button>
            <button class="parent-subtab py-3 px-4 border-b-2 border-transparent hover:text-slate-900 whitespace-nowrap" data-tab="attendance">
              Attendance Records
            </button>
            <button class="parent-subtab py-3 px-4 border-b-2 border-transparent hover:text-slate-900 whitespace-nowrap" data-tab="tests">
              Weekly Test Scorecards
            </button>
            <button class="parent-subtab py-3 px-4 border-b-2 border-transparent hover:text-slate-900 whitespace-nowrap" data-tab="homework">
              Homework & Assignments
            </button>
            <button class="parent-subtab py-3 px-4 border-b-2 border-transparent hover:text-slate-900 whitespace-nowrap" data-tab="notices">
              Academy Notices
            </button>
          </div>

          <!-- Subtab Panels -->
          <div class="p-4 sm:p-6">
            <!-- 1. Fees Panel -->
            <div id="parent-tab-fees" class="parent-panel space-y-4">
              <!-- Obligations & Submissions list -->
            </div>

            <!-- 2. Attendance Panel -->
            <div id="parent-tab-attendance" class="parent-panel hidden space-y-4">
              <!-- Attendance statistics & calendar -->
            </div>

            <!-- 3. Tests Panel -->
            <div id="parent-tab-tests" class="parent-panel hidden space-y-4">
              <!-- Test results -->
            </div>

            <!-- 4. Homework Panel -->
            <div id="parent-tab-homework" class="parent-panel hidden space-y-4">
              <!-- Homework cards -->
            </div>

            <!-- 5. Notices Panel -->
            <div id="parent-tab-notices" class="parent-panel hidden space-y-4">
              <!-- Announcements -->
            </div>
          </div>
        </div>

        <!-- Direct Teacher WhatsApp Contact Card -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <h4 class="text-xs font-bold text-slate-900">Need academic counseling or fee assistance?</h4>
            <p class="text-xs text-slate-500">Directly contact tuition administration via WhatsApp.</p>
          </div>
          <button id="btn-parent-contact-teacher" class="px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.941-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.299.144.347.491 1.199.534 1.286.043.087.072.188.014.303-.058.116-.087.188-.173.289l-.26.303c-.087.087-.179.182-.077.357.101.174.449.741.964 1.201.662.591 1.221.774 1.394.861.173.086.275.072.376-.044.101-.116.433-.506.549-.679.116-.173.231-.144.39-.087s1.011.477 1.184.564.289.13.332.202c.043.073.043.419-.101.824z"/></svg>
            Chat with Academy
          </button>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // Copy bKash button
    document.getElementById('btn-copy-bkash')?.addEventListener('click', () => {
      const num = this.portalData?.tuitionSettings?.bkashNumber || '01712345678';
      navigator.clipboard.writeText(num).then(() => {
        this.app.showToast(`bKash number ${num} copied to clipboard!`, 'success');
      }).catch(() => {
        alert(`bKash number: ${num}`);
      });
    });

    // View QR Code
    document.getElementById('btn-view-qr-code')?.addEventListener('click', () => {
      this.showQrModal();
    });

    // Submit TrxID button
    document.getElementById('btn-open-submit-bkash')?.addEventListener('click', () => {
      this.showSubmitBkashModal();
    });

    // Subtab switching
    document.querySelectorAll('.parent-subtab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        document.querySelectorAll('.parent-subtab').forEach((t) => {
          t.className = 'parent-subtab py-3 px-4 border-b-2 border-transparent text-slate-600 hover:text-slate-900 whitespace-nowrap';
        });
        tab.className = 'parent-subtab py-3 px-4 border-b-2 border-blue-700 text-blue-700 font-bold whitespace-nowrap';

        document.querySelectorAll('.parent-panel').forEach((p) => p.classList.add('hidden'));
        document.getElementById(`parent-tab-${target}`)?.classList.remove('hidden');
      });
    });

    // Contact Teacher
    document.getElementById('btn-parent-contact-teacher')?.addEventListener('click', () => {
      const phone = this.portalData?.tuitionSettings?.phone || '01712345678';
      const studentName = this.portalData?.currentStudent?.name || 'my child';
      const msg = `Hello Al-Ameen Coaching, I am ${this.portalData?.parent?.name}, parent of ${studentName}. I would like to inquire about academic progress.`;
      const url = buildWhatsAppUrl(phone, msg);
      if (url) window.open(url, '_blank');
    });
  }

  async refresh() {
    try {
      const parentId = this.app.currentUser?.id;
      const query = new URLSearchParams();
      if (parentId) query.set('parentId', parentId);
      if (this.activeStudentId) query.set('studentId', this.activeStudentId);

      const res = await apiRequest(`/parent/portal-data?${query.toString()}`);
      this.portalData = res;

      // Update parent name in header
      const nameEl = document.getElementById('parent-user-name');
      if (nameEl && res.parent) nameEl.textContent = res.parent.name;

      // Update bKash header info
      const bkashNumEl = document.getElementById('bkash-display-num');
      const bkashTypeEl = document.getElementById('bkash-type-badge');
      if (bkashNumEl && res.tuitionSettings) {
        bkashNumEl.textContent = res.tuitionSettings.bkashNumber;
        bkashTypeEl.textContent = `${res.tuitionSettings.bkashAccountType} Account`;
      }

      // Render Child Switcher Tabs
      this.renderChildTabs();

      // Render Hero Status Strip
      this.renderHeroStrip();

      // Render Subtabs
      this.renderFeesTab();
      this.renderAttendanceTab();
      this.renderTestsTab();
      this.renderHomeworkTab();
      this.renderNoticesTab();
    } catch (e) {
      console.error('Failed to load parent portal data:', e);
    }
  }

  renderChildTabs() {
    const tabsContainer = document.getElementById('parent-child-tabs');
    if (!tabsContainer || !this.portalData?.linkedStudents) return;

    if (this.portalData.linkedStudents.length <= 1) {
      tabsContainer.innerHTML = `<span class="text-xs font-semibold px-3 py-1 text-slate-800">${this.portalData.currentStudent?.name || 'Child'} (${this.portalData.currentStudent?.classBatchName})</span>`;
      return;
    }

    tabsContainer.innerHTML = this.portalData.linkedStudents.map((s) => {
      const isActive = s.id === (this.activeStudentId || this.portalData.currentStudent?.id);
      return `
        <button class="btn-child-tab px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${isActive ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}" data-id="${s.id}">
          ${s.name.split(' ')[0]} (${s.classBatchName.split(' - ')[0]})
        </button>
      `;
    }).join('');

    tabsContainer.querySelectorAll('.btn-child-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeStudentId = btn.dataset.id;
        this.refresh();
      });
    });
  }

  renderHeroStrip() {
    const strip = document.getElementById('parent-hero-strip');
    if (!strip || !this.portalData) return;

    const todayAtt = this.portalData.todayAttendance;
    let attColor = 'text-slate-500';
    let attText = todayAtt;
    if (todayAtt === 'P') { attColor = 'text-emerald-700'; attText = 'Present (P)'; }
    if (todayAtt === 'A') { attColor = 'text-red-700'; attText = 'Absent (A)'; }
    if (todayAtt === 'L') { attColor = 'text-amber-700'; attText = 'Approved Leave (L)'; }

    const outstanding = this.portalData.feeSummary?.totalOutstanding || 0;
    const latestTest = this.portalData.tests?.[0];

    strip.innerHTML = `
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div class="text-xs text-slate-500 font-medium">Today's Attendance</div>
        <div class="text-base font-bold ${attColor} mt-1">${attText}</div>
        <div class="text-[11px] text-slate-400 mt-0.5">Overall: ${this.portalData.attendanceStats.percentage}% present</div>
      </div>
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div class="text-xs text-slate-500 font-medium">Outstanding Fees</div>
        <div class="text-base font-bold ${outstanding > 0 ? 'text-red-600' : 'text-emerald-600'} mt-1 tabular-nums">
          ৳${outstanding.toLocaleString()} BDT
        </div>
        <div class="text-[11px] text-slate-400 mt-0.5">
          ${outstanding > 0 ? 'Payment pending for tuition' : 'All obligations up to date'}
        </div>
      </div>
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div class="text-xs text-slate-500 font-medium">Latest Test Score</div>
        <div class="text-base font-bold text-blue-700 mt-1 tabular-nums">
          ${latestTest ? `${latestTest.percentage}% (Rank #${latestTest.rank})` : 'No test results'}
        </div>
        <div class="text-[11px] text-slate-400 mt-0.5">${latestTest ? latestTest.testTitle : 'Awaiting publication'}</div>
      </div>
    `;
  }

  renderFeesTab() {
    const panel = document.getElementById('parent-tab-fees');
    if (!panel || !this.portalData) return;

    const obligations = this.portalData.feeSummary?.obligations || [];
    const submissions = this.portalData.feeSummary?.submissions || [];

    panel.innerHTML = `
      <div class="space-y-4">
        <!-- Pending Submissions Verification Queue -->
        ${submissions.length > 0 ? `
          <div class="space-y-2">
            <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider">bKash Payment Submissions</h3>
            <div class="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
              ${submissions.map((sub) => `
                <div class="p-3 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-slate-900">৳${sub.amount}</span>
                      <span class="font-mono text-slate-500">TrxID: ${sub.transactionId}</span>
                      <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${sub.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : sub.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}">
                        ${sub.status === 'pending' ? 'Pending Admin Verification' : sub.status.toUpperCase()}
                      </span>
                    </div>
                    <div class="text-[11px] text-slate-500 mt-0.5">Submitted on ${sub.paymentDate} for ${sub.monthDisplay}</div>
                    ${sub.rejectionReason ? `<div class="text-[11px] text-red-600 mt-0.5 font-medium">Rejection reason: ${sub.rejectionReason}</div>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Monthly Fee Obligations -->
        <div class="space-y-2">
          <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Tuition Fee Ledger</h3>
          <div class="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            ${obligations.map((o) => `
              <div class="p-3.5 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                <div>
                  <div class="font-bold text-slate-900 text-sm">${o.monthDisplay}</div>
                  <div class="text-slate-500 text-[11px]">Due Date: ${o.dueDate} · Base Fee: ৳${o.baseFee} ${o.discount > 0 ? `(Discount: ৳${o.discount})` : ''}</div>
                  <div class="text-[11px] text-emerald-700 font-medium">Amount Paid: ৳${o.paidAmount}</div>
                </div>
                <div class="flex items-center gap-3">
                  <div class="text-right">
                    <div class="text-xs text-slate-500">Outstanding:</div>
                    <div class="text-sm font-bold ${o.outstandingBalance > 0 ? 'text-red-600' : 'text-slate-400'} tabular-nums">৳${o.outstandingBalance}</div>
                  </div>
                  ${o.outstandingBalance > 0 ? `
                    <button class="btn-pay-single-bkash px-3 py-1.5 text-xs font-bold text-white bg-pink-600 hover:bg-pink-700 rounded-lg shadow-sm" data-id="${o.id}" data-amount="${o.outstandingBalance}" data-month="${o.monthDisplay}">
                      Pay bKash
                    </button>
                  ` : `
                    <span class="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded">Fully Paid</span>
                  `}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    panel.querySelectorAll('.btn-pay-single-bkash').forEach((btn) => {
      btn.onclick = () => {
        this.showSubmitBkashModal({
          obligationId: btn.dataset.id,
          amount: btn.dataset.amount,
          month: btn.dataset.month,
        });
      };
    });
  }

  renderAttendanceTab() {
    const panel = document.getElementById('parent-tab-attendance');
    if (!panel || !this.portalData) return;

    const stats = this.portalData.attendanceStats;
    panel.innerHTML = `
      <div class="space-y-4">
        <div class="grid grid-cols-4 gap-2 text-center text-xs">
          <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div class="text-slate-500">Total Classes</div>
            <div class="text-base font-bold text-slate-900 mt-1">${stats.totalDays}</div>
          </div>
          <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div class="text-emerald-600">Present</div>
            <div class="text-base font-bold text-emerald-700 mt-1">${stats.presentDays}</div>
          </div>
          <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div class="text-red-600">Absent</div>
            <div class="text-base font-bold text-red-700 mt-1">${stats.absentDays}</div>
          </div>
          <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div class="text-blue-600">Attendance Rate</div>
            <div class="text-base font-bold text-blue-700 mt-1">${stats.percentage}%</div>
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Recent Daily Log</h4>
          <div class="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            ${stats.history.map((h) => `
              <div class="p-3 bg-white flex items-center justify-between text-xs">
                <div>
                  <div class="font-semibold text-slate-800">${h.date}</div>
                  ${h.notes ? `<div class="text-[11px] text-slate-400 italic">${h.notes}</div>` : ''}
                </div>
                <div>
                  <span class="px-2.5 py-0.5 rounded text-xs font-bold ${h.status === 'P' ? 'bg-emerald-100 text-emerald-800' : h.status === 'A' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}">
                    ${h.status === 'P' ? 'Present' : h.status === 'A' ? 'Absent' : 'Leave'}
                  </span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  renderTestsTab() {
    const panel = document.getElementById('parent-tab-tests');
    if (!panel || !this.portalData) return;

    const tests = this.portalData.tests || [];
    panel.innerHTML = `
      <div class="space-y-3">
        ${tests.length === 0 ? `
          <div class="p-6 text-center text-slate-400 text-xs">No published weekly test reports yet.</div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${tests.map((t) => `
              <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                <div class="flex items-start justify-between">
                  <div>
                    <h4 class="font-bold text-slate-900">${t.testTitle}</h4>
                    <p class="text-[11px] text-slate-500">${t.testSubject} · ${t.testDate}</p>
                  </div>
                  <span class="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-xs">
                    Rank #${t.rank}
                  </span>
                </div>
                <div class="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200">
                  <div>
                    <div class="text-[10px] text-slate-400">Score</div>
                    <div class="text-sm font-bold text-slate-900 font-mono">${t.obtainedMarks} / ${t.maxMarks}</div>
                  </div>
                  <div>
                    <div class="text-[10px] text-slate-400 text-right">Percentage</div>
                    <div class="text-sm font-bold text-emerald-600 tabular-nums">${t.percentage}%</div>
                  </div>
                </div>
                ${t.feedback ? `
                  <div class="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-100 italic">
                    "${t.feedback}"
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  }

  renderHomeworkTab() {
    const panel = document.getElementById('parent-tab-homework');
    if (!panel || !this.portalData) return;

    const hw = this.portalData.homework || [];
    panel.innerHTML = `
      <div class="space-y-3">
        ${hw.length === 0 ? `
          <div class="p-6 text-center text-slate-400 text-xs">No active homework assignments for this batch.</div>
        ` : `
          <div class="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            ${hw.map((item) => `
              <div class="p-4 bg-white space-y-1.5 text-xs">
                <div class="flex items-center justify-between">
                  <h4 class="font-bold text-slate-900">${item.title}</h4>
                  <span class="text-[11px] font-mono text-slate-500">Due: ${item.dueDate}</span>
                </div>
                <div class="text-slate-600 text-[11px]">${item.description}</div>
                <div class="text-[10px] text-slate-400">Assigned by: ${item.createdBy} on ${item.assignedDate}</div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  }

  renderNoticesTab() {
    const panel = document.getElementById('parent-tab-notices');
    if (!panel || !this.portalData) return;

    const notices = this.portalData.announcements || [];
    panel.innerHTML = `
      <div class="space-y-3">
        ${notices.length === 0 ? `
          <div class="p-6 text-center text-slate-400 text-xs">No notices posted.</div>
        ` : `
          <div class="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            ${notices.map((n) => `
              <div class="p-4 bg-white space-y-1 text-xs ${n.isImportant ? 'border-l-4 border-l-amber-500' : ''}">
                <div class="flex items-center justify-between">
                  <h4 class="font-bold text-slate-900">${n.title}</h4>
                  <span class="text-[11px] text-slate-400">${n.date}</span>
                </div>
                <p class="text-slate-700 text-[11px]">${n.content}</p>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  }

  showQrModal() {
    const qrUrl = this.portalData?.tuitionSettings?.bkashQrUrl || '/uploads/bkash_qr_sample.png';
    const num = this.portalData?.tuitionSettings?.bkashNumber || '01712345678';
    const type = this.portalData?.tuitionSettings?.bkashAccountType || 'Merchant';

    this.app.showModal({
      title: 'Scan bKash QR Code',
      content: `
        <div class="text-center space-y-3 p-2">
          <div class="p-3 bg-pink-50 rounded-lg border border-pink-100 text-xs">
            <span class="font-bold text-pink-700">bKash ${type} Number:</span>
            <span class="font-mono text-slate-900 font-bold ml-1">${num}</span>
          </div>
          <div class="flex justify-center p-4 bg-white border border-slate-200 rounded-xl">
            <!-- Fallback SVG styled QR Code for reliable offline/online rendering -->
            <svg class="w-48 h-48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="100" height="100" fill="white"/>
              <!-- Corner anchors -->
              <rect x="5" y="5" width="25" height="25" stroke="#E2136E" stroke-width="3" fill="none"/>
              <rect x="11" y="11" width="13" height="13" fill="#E2136E"/>
              <rect x="70" y="5" width="25" height="25" stroke="#E2136E" stroke-width="3" fill="none"/>
              <rect x="76" y="11" width="13" height="13" fill="#E2136E"/>
              <rect x="5" y="70" width="25" height="25" stroke="#E2136E" stroke-width="3" fill="none"/>
              <rect x="11" y="76" width="13" height="13" fill="#E2136E"/>
              <!-- Data matrix pattern simulating real bKash QR -->
              <rect x="36" y="10" width="6" height="6" fill="#E2136E"/>
              <rect x="46" y="16" width="6" height="6" fill="#E2136E"/>
              <rect x="56" y="10" width="6" height="6" fill="#E2136E"/>
              <rect x="36" y="24" width="6" height="6" fill="#E2136E"/>
              <rect x="10" y="36" width="6" height="6" fill="#E2136E"/>
              <rect x="24" y="44" width="6" height="6" fill="#E2136E"/>
              <rect x="40" y="40" width="20" height="20" fill="#E2136E" rx="3"/>
              <text x="50" y="54" fill="white" font-size="10" font-weight="bold" text-anchor="middle">bKash</text>
              <rect x="70" y="40" width="6" height="6" fill="#E2136E"/>
              <rect x="80" y="50" width="6" height="6" fill="#E2136E"/>
              <rect x="36" y="70" width="6" height="6" fill="#E2136E"/>
              <rect x="48" y="76" width="6" height="6" fill="#E2136E"/>
              <rect x="64" y="80" width="6" height="6" fill="#E2136E"/>
              <rect x="80" y="70" width="6" height="6" fill="#E2136E"/>
            </svg>
          </div>
          <p class="text-[11px] text-slate-500">Scan using bKash App > Tap Make Payment / Send Money > Enter amount and Student ID in Reference.</p>
        </div>
      `,
      actions: [{ label: 'Done', className: 'text-slate-700', onClick: () => this.app.closeModal() }],
    });
  }

  showSubmitBkashModal(prefill = {}) {
    const student = this.portalData?.currentStudent;
    const obligations = this.portalData?.feeSummary?.obligations || [];
    const pendingObligations = obligations.filter((o) => o.outstandingBalance > 0);

    this.app.showModal({
      title: 'Submit bKash Payment Details',
      content: `
        <form id="bkash-submit-form" class="space-y-3">
          <div class="p-3 bg-pink-50 border border-pink-100 rounded-lg text-xs">
            <div class="font-bold text-pink-800">Payment Instructions:</div>
            <div class="text-[11px] text-pink-700 mt-1 whitespace-pre-line">${this.portalData?.tuitionSettings?.bkashInstructions}</div>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Fee Obligation / Month *</label>
            <select id="bkash-ob-id" required class="w-full text-xs p-2.5 border border-slate-300 rounded-lg">
              ${pendingObligations.map((o) => `
                <option value="${o.id}" ${o.id === prefill.obligationId ? 'selected' : ''} data-amount="${o.outstandingBalance}">
                  ${o.monthDisplay} (Outstanding: ৳${o.outstandingBalance})
                </option>
              `).join('')}
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-700 mb-1">Amount Paid (৳) *</label>
              <input type="number" id="bkash-amount" min="1" value="${prefill.amount || pendingObligations[0]?.outstandingBalance || 2500}" required class="w-full text-xs p-2.5 border border-slate-300 rounded-lg font-mono font-bold">
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-700 mb-1">Your bKash Number *</label>
              <input type="text" id="bkash-sender-phone" placeholder="017XXXXXXXX" value="${this.portalData?.parent?.phone || ''}" required class="w-full text-xs p-2.5 border border-slate-300 rounded-lg font-mono">
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">bKash Transaction ID (TrxID) *</label>
            <input type="text" id="bkash-trx-id" placeholder="e.g. BL984X7Q11" required maxlength="15" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg font-mono font-bold uppercase focus:ring-2 focus:ring-pink-500">
            <p class="text-[10px] text-slate-400 mt-0.5">Found in your bKash SMS or App transaction history</p>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Payment Screenshot (Optional)</label>
            <input type="file" id="bkash-screenshot" accept="image/*,.pdf" class="w-full text-xs p-1.5 border border-slate-300 rounded-lg bg-slate-50">
          </div>
        </form>
      `,
      actions: [
        { label: 'Cancel', className: 'text-slate-600', onClick: () => this.app.closeModal() },
        {
          label: 'Submit for Verification',
          className: 'bg-pink-600 text-white hover:bg-pink-700 font-bold',
          onClick: async () => {
            const obId = document.getElementById('bkash-ob-id').value;
            const amount = Number(document.getElementById('bkash-amount').value);
            const bKashNumber = document.getElementById('bkash-sender-phone').value;
            const transactionId = document.getElementById('bkash-trx-id').value;
            const fileInput = document.getElementById('bkash-screenshot');

            if (!obId || !amount || !bKashNumber || !transactionId) {
              alert('Please complete all required fields.');
              return;
            }

            const formData = new FormData();
            formData.append('studentId', student.id);
            formData.append('feeObligationId', obId);
            formData.append('amount', String(amount));
            formData.append('bKashNumber', bKashNumber);
            formData.append('transactionId', transactionId);
            if (fileInput.files[0]) {
              formData.append('screenshot', fileInput.files[0]);
            }

            try {
              const res = await apiRequest('/bkash/submit', {
                method: 'POST',
                body: formData,
              });

              this.app.closeModal();
              this.app.showToast('bKash payment submitted! Status: Pending Admin Verification.', 'success');
              this.refresh();
            } catch (err) {
              alert(err.message);
            }
          },
        },
      ],
    });
  }
}
