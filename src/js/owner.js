import { apiRequest } from './api.js';

export class OwnerViewController {
  constructor(app) {
    this.app = app;
    this.data = null;
    this.currentMonth = '2026-10';
  }

  async init() {
    this.renderContainer();
    this.bindEvents();
    await this.refresh();
  }

  renderContainer() {
    const container = document.getElementById('view-owner');
    if (!container) return;

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Top Title & Month Filter -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Owner Business & Financial Analytics</h1>
            <p class="text-xs sm:text-sm text-slate-500 mt-0.5">High-level institutional KPIs, fee collection reconciliation, and student admission pipeline.</p>
          </div>
          <div class="flex items-center gap-2">
            <select id="owner-month-select" class="text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium">
              <option value="2026-10" selected>October 2026</option>
              <option value="2026-09">September 2026</option>
              <option value="all">All Academic Months</option>
            </select>
            <button id="btn-new-enquiry" class="px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg flex items-center gap-1.5 shadow-sm">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Log Referral / Enquiry
            </button>
          </div>
        </div>

        <!-- KPI Metric Cards Grid -->
        <div id="owner-kpi-grid" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <!-- Dynamically populated -->
        </div>

        <!-- Financial Reconciliation Banner -->
        <div id="reconciliation-banner" class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <!-- Reconciled status -->
        </div>

        <!-- 2-Column Split: Monthly Collection Breakdown & Recent Verified Payments -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Monthly Collection Trends -->
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-bold text-slate-900">Monthly Revenue & Collection Rates</h3>
              <span class="text-xs text-slate-500">Academic Year 2026-2027</span>
            </div>
            <div id="owner-monthly-bars" class="space-y-3">
              <!-- Rendered dynamically -->
            </div>
          </div>

          <!-- Recent Verified Payments & Audit Receipts -->
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-bold text-slate-900">Recent Approved Receipts</h3>
              <span class="text-xs text-slate-400">Live verified payments</span>
            </div>
            <div id="owner-recent-payments" class="divide-y divide-slate-100 text-xs">
              <!-- Injected dynamically -->
            </div>
          </div>
        </div>

        <!-- Refer-a-Friend & Admissions Pipeline -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 class="text-sm font-bold text-slate-900">Admissions & Referral Enquiries Pipeline</h3>
              <p class="text-xs text-slate-500">Track prospective students, trial classes, and referral rewards.</p>
            </div>
            <div class="flex items-center gap-2">
              <select id="ref-status-filter" class="text-xs bg-white border border-slate-300 rounded-lg p-1.5">
                <option value="all">All Stages</option>
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Trial Scheduled">Trial Scheduled</option>
                <option value="Enrolled">Enrolled</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th class="py-3 px-4">Student & Target Class</th>
                  <th class="py-3 px-4">Parent / Phone</th>
                  <th class="py-3 px-4">Referrer / Source</th>
                  <th class="py-3 px-4">Date</th>
                  <th class="py-3 px-4">Pipeline Stage</th>
                  <th class="py-3 px-4 text-center">Referral Reward</th>
                  <th class="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody id="referrals-table-body" class="divide-y divide-slate-100 text-slate-700">
                <!-- Injected dynamically -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    document.getElementById('owner-month-select')?.addEventListener('change', (e) => {
      this.currentMonth = e.target.value;
      this.refresh();
    });

    document.getElementById('ref-status-filter')?.addEventListener('change', () => {
      this.loadReferrals();
    });

    document.getElementById('btn-new-enquiry')?.addEventListener('click', () => {
      this.showNewEnquiryModal();
    });
  }

  async refresh() {
    await Promise.all([this.loadDashboard(), this.loadReferrals()]);
  }

  async loadDashboard() {
    try {
      const res = await apiRequest(`/owner/dashboard?month=${this.currentMonth}`);
      this.data = res;

      // Render KPI cards
      const kpi = res.kpi;
      const kpiGrid = document.getElementById('owner-kpi-grid');
      if (kpiGrid) {
        kpiGrid.innerHTML = `
          <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div class="text-[11px] text-slate-500 font-medium">Active Students</div>
            <div class="text-xl font-bold text-slate-900 mt-1 tabular-nums">${kpi.activeStudents}</div>
            <div class="text-[10px] text-slate-400 mt-0.5">${kpi.totalBatches} Active Batches</div>
          </div>
          <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div class="text-[11px] text-slate-500 font-medium">Expected Revenue</div>
            <div class="text-xl font-bold text-slate-900 mt-1 tabular-nums">৳${kpi.expectedFees.toLocaleString()}</div>
            <div class="text-[10px] text-slate-400 mt-0.5">Month of ${this.currentMonth}</div>
          </div>
          <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div class="text-[11px] text-emerald-600 font-medium">Collected Revenue</div>
            <div class="text-xl font-bold text-emerald-700 mt-1 tabular-nums">৳${kpi.feesCollected.toLocaleString()}</div>
            <div class="text-[10px] text-emerald-600 font-medium mt-0.5">${kpi.collectionPercentage}% collected</div>
          </div>
          <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div class="text-[11px] text-red-600 font-medium">Overdue Fees</div>
            <div class="text-xl font-bold text-red-700 mt-1 tabular-nums">৳${kpi.overdueFees.toLocaleString()}</div>
            <div class="text-[10px] text-slate-400 mt-0.5">Total: ৳${kpi.outstandingFees.toLocaleString()} pending</div>
          </div>
          <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div class="text-[11px] text-blue-600 font-medium">Referral Enquiries</div>
            <div class="text-xl font-bold text-blue-700 mt-1 tabular-nums">${kpi.newEnquiriesCount} New</div>
            <div class="text-[10px] text-slate-500 mt-0.5">${kpi.enrolledReferralsCount} Enrolled</div>
          </div>
        `;
      }

      // Reconciliation banner
      const recBanner = document.getElementById('reconciliation-banner');
      if (recBanner && res.reconciliation) {
        recBanner.innerHTML = `
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full ${res.reconciliation.isReconciled ? 'bg-emerald-500' : 'bg-red-500'}"></span>
            <div>
              <span class="font-bold text-slate-900">Financial Audit Reconciliation:</span>
              <span class="text-slate-600 ml-1">
                ${res.reconciliation.isReconciled ? 'All system fee obligations exactly reconcile with verified receipts.' : 'Variance detected in ledger.'}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-4 text-slate-500 tabular-nums">
            <div>Verified Receipts: <strong class="text-slate-800">৳${res.reconciliation.totalApprovedPayments.toLocaleString()}</strong></div>
            <div>Obligations Paid: <strong class="text-slate-800">৳${res.reconciliation.totalObligationsPaid.toLocaleString()}</strong></div>
            <div>Pending bKash Submissions: <strong class="text-amber-600">${res.kpi.pendingBkashCount} (Unverified)</strong></div>
          </div>
        `;
      }

      // Monthly Collection Trends
      const barsContainer = document.getElementById('owner-monthly-bars');
      if (barsContainer && res.monthlyCollections) {
        barsContainer.innerHTML = res.monthlyCollections.map((m) => {
          const rate = m.expected > 0 ? Math.round((m.collected / m.expected) * 100) : 0;
          return `
            <div class="space-y-1">
              <div class="flex justify-between text-xs font-medium">
                <span class="text-slate-800">${m.monthDisplay}</span>
                <span class="text-slate-600 tabular-nums">৳${m.collected.toLocaleString()} / ৳${m.expected.toLocaleString()} (${rate}%)</span>
              </div>
              <div class="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
                <div class="bg-emerald-600 h-2.5 rounded-full" style="width: ${rate}%"></div>
              </div>
            </div>
          `;
        }).join('');
      }

      // Recent Approved Payments
      const recContainer = document.getElementById('owner-recent-payments');
      if (recContainer && res.recentPayments) {
        recContainer.innerHTML = res.recentPayments.map((p) => `
          <div class="py-2.5 flex items-center justify-between">
            <div>
              <div class="font-semibold text-slate-900">${p.studentName}</div>
              <div class="text-[11px] text-slate-500 font-mono">${p.receiptNumber} · ${p.paymentMethod} ${p.transactionId ? `(TrxID: ${p.transactionId})` : ''}</div>
            </div>
            <div class="text-right">
              <div class="font-bold text-emerald-700 font-mono tabular-nums">+৳${p.amount}</div>
              <div class="text-[10px] text-slate-400">${p.paymentDate}</div>
            </div>
          </div>
        `).join('');
      }
    } catch (e) {
      console.error('Failed to load owner dashboard:', e);
    }
  }

  async loadReferrals() {
    try {
      const statusFilter = document.getElementById('ref-status-filter')?.value || 'all';
      const res = await apiRequest(`/owner/referrals?status=${statusFilter}`);
      const tbody = document.getElementById('referrals-table-body');
      if (!tbody) return;

      if (!res.referrals || res.referrals.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400">No referral enquiries found.</td></tr>`;
        return;
      }

      tbody.innerHTML = res.referrals.map((r) => {
        let badgeColor = 'bg-slate-100 text-slate-800';
        if (r.status === 'New') badgeColor = 'bg-blue-100 text-blue-800';
        if (r.status === 'Contacted') badgeColor = 'bg-purple-100 text-purple-800';
        if (r.status === 'Trial Scheduled') badgeColor = 'bg-amber-100 text-amber-800';
        if (r.status === 'Enrolled') badgeColor = 'bg-emerald-100 text-emerald-800 font-bold';
        if (r.status === 'Closed') badgeColor = 'bg-slate-200 text-slate-600';

        return `
          <tr class="hover:bg-slate-50/80 transition-colors">
            <td class="py-3 px-4">
              <div class="font-semibold text-slate-900">${r.prospectiveStudentName}</div>
              <div class="text-[11px] text-slate-500">${r.targetClass}</div>
            </td>
            <td class="py-3 px-4">
              <div class="text-slate-800">${r.parentName}</div>
              <div class="text-[11px] text-slate-500 font-mono">${r.parentPhone}</div>
            </td>
            <td class="py-3 px-4">
              <div class="text-slate-800">${r.referrerName}</div>
              <div class="text-[11px] text-slate-400">${r.source} ${r.referralCode ? `(${r.referralCode})` : ''}</div>
            </td>
            <td class="py-3 px-4 text-slate-600 tabular-nums">${r.enquiryDate}</td>
            <td class="py-3 px-4">
              <select class="ref-status-select text-xs p-1 rounded border border-slate-300 font-medium ${badgeColor}" data-id="${r.id}">
                <option value="New" ${r.status === 'New' ? 'selected' : ''}>New</option>
                <option value="Contacted" ${r.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
                <option value="Trial Scheduled" ${r.status === 'Trial Scheduled' ? 'selected' : ''}>Trial Scheduled</option>
                <option value="Enrolled" ${r.status === 'Enrolled' ? 'selected' : ''}>Enrolled</option>
                <option value="Closed" ${r.status === 'Closed' ? 'selected' : ''}>Closed</option>
              </select>
            </td>
            <td class="py-3 px-4 text-center">
              ${r.rewardClaimed ? `
                <span class="text-emerald-700 font-bold text-xs">Claimed (৳500)</span>
              ` : r.status === 'Enrolled' ? `
                <button data-action="claim-reward" data-id="${r.id}" class="px-2 py-0.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded hover:bg-emerald-100">
                  Approve ৳500 Reward
                </button>
              ` : `
                <span class="text-slate-400 italic text-[11px]">Upon Enrollment</span>
              `}
            </td>
            <td class="py-3 px-4 text-right">
              <button data-action="wa-contact" data-phone="${r.parentPhone}" data-student="${r.prospectiveStudentName}" class="px-2 py-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-900">
                WhatsApp
              </button>
            </td>
          </tr>
        `;
      }).join('');

      // Status change listeners
      tbody.querySelectorAll('.ref-status-select').forEach((select) => {
        select.addEventListener('change', async (e) => {
          const id = select.dataset.id;
          const status = select.value;
          try {
            await apiRequest(`/owner/referrals/${id}/status`, {
              method: 'PATCH',
              body: { status },
            });
            this.app.showToast(`Enquiry stage updated to ${status}`, 'success');
            this.refresh();
          } catch (err) {
            alert(err.message);
          }
        });
      });

      // Claim reward button
      tbody.querySelectorAll('button[data-action="claim-reward"]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          try {
            await apiRequest(`/owner/referrals/${id}/status`, {
              method: 'PATCH',
              body: { rewardClaimed: true },
            });
            this.app.showToast('Referral reward of ৳500 authorized!', 'success');
            this.refresh();
          } catch (err) {
            alert(err.message);
          }
        });
      });

      // Contact prospect via WhatsApp
      tbody.querySelectorAll('button[data-action="wa-contact"]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const phone = btn.dataset.phone;
          const student = btn.dataset.student;
          const msg = `Hello, greetings from Al-Ameen Coaching Academy regarding admission inquiry for ${student}. May we assist you with class schedules and fee details?`;
          window.open(`https://wa.me/88${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
        });
      });
    } catch (e) {
      console.error('Failed to load referrals:', e);
    }
  }

  showNewEnquiryModal() {
    this.app.showModal({
      title: 'Log New Admission / Referral Enquiry',
      content: `
        <form id="new-enquiry-form" class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-700 mb-1">Prospective Student Name *</label>
              <input type="text" id="enq-student" required placeholder="Student's name" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg">
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-700 mb-1">Target Class / Batch *</label>
              <input type="text" id="enq-class" required placeholder="e.g. Class 10 Science" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-700 mb-1">Parent Name</label>
              <input type="text" id="enq-parent" placeholder="Parent / Guardian" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg">
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-700 mb-1">Parent Phone (Bangladesh) *</label>
              <input type="text" id="enq-phone" required placeholder="017XXXXXXXX" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg font-mono">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-700 mb-1">Source</label>
              <select id="enq-source" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg">
                <option value="Refer-a-Friend">Refer-a-Friend (Parent/Student)</option>
                <option value="Walk-in">Walk-in Inquiry</option>
                <option value="Facebook">Facebook Page</option>
                <option value="Flyer">Flyer / Banner</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-700 mb-1">Referrer Name (if referred)</label>
              <input type="text" id="enq-referrer" placeholder="Existing parent / student name" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg">
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Notes</label>
            <input type="text" id="enq-notes" placeholder="Notes from phone conversation" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg">
          </div>
        </form>
      `,
      actions: [
        { label: 'Cancel', className: 'text-slate-600', onClick: () => this.app.closeModal() },
        {
          label: 'Save Enquiry',
          className: 'bg-blue-700 text-white hover:bg-blue-800 font-semibold',
          onClick: async () => {
            const prospectiveStudentName = document.getElementById('enq-student').value;
            const targetClass = document.getElementById('enq-class').value;
            const parentName = document.getElementById('enq-parent').value;
            const parentPhone = document.getElementById('enq-phone').value;
            const source = document.getElementById('enq-source').value;
            const referrerName = document.getElementById('enq-referrer').value;
            const notes = document.getElementById('enq-notes').value;

            if (!prospectiveStudentName || !parentPhone) {
              alert('Student name and phone are required.');
              return;
            }

            try {
              await apiRequest('/owner/referrals', {
                method: 'POST',
                body: { prospectiveStudentName, targetClass, parentName, parentPhone, source, referrerName, notes },
              });
              this.app.closeModal();
              this.app.showToast('Enquiry saved to admissions pipeline!', 'success');
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
