import { apiRequest } from './api.js';
import { BulkWhatsAppWizard, buildWhatsAppUrl } from './whatsapp.js';

export class FeesViewController {
  constructor(app) {
    this.app = app;
    this.currentMonth = '2026-10';
    this.currentBatch = 'all';
    this.currentStatus = 'all';
    this.searchQuery = '';
    this.currentPage = 1;
    this.sortBy = 'studentName';
    this.sortOrder = 'asc';
  }

  async init() {
    this.renderContainer();
    this.bindEvents();
    await this.loadBatches();
    await this.refresh();
  }

  renderContainer() {
    const container = document.getElementById('view-fees');
    if (!container) return;

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Top Title & Primary Actions -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Fees Pending & Collection</h1>
            <p class="text-xs sm:text-sm text-slate-500 mt-0.5">Track obligations, record manual bKash/cash payments, and issue personalized WhatsApp reminders.</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button id="btn-export-fees" class="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 shadow-sm">
              <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              Export CSV
            </button>
            <button id="btn-remind-all-overdue" class="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 shadow-sm">
              <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.941-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.299.144.347.491 1.199.534 1.286.043.087.072.188.014.303-.058.116-.087.188-.173.289l-.26.303c-.087.087-.179.182-.077.357.101.174.449.741.964 1.201.662.591 1.221.774 1.394.861.173.086.275.072.376-.044.101-.116.433-.506.549-.679.116-.173.231-.144.39-.087s1.011.477 1.184.564.289.13.332.202c.043.073.043.419-.101.824z"/></svg>
              Remind All Overdue Parents
            </button>
            <button id="btn-create-fee-obligation" class="px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg flex items-center gap-1.5 shadow-sm">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Create Obligation
            </button>
          </div>
        </div>

        <!-- Dashboard Summary KPI Strip -->
        <div id="fees-summary-cards" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
          <!-- Populated dynamically -->
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-500 mb-1">Fee Month</label>
              <select id="fee-filter-month" class="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500">
                <option value="2026-10" selected>October 2026 (Current)</option>
                <option value="2026-09">September 2026</option>
                <option value="all">All Months</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-500 mb-1">Class / Batch</label>
              <select id="fee-filter-batch" class="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500">
                <option value="all">All Batches</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-500 mb-1">Payment Status</label>
              <select id="fee-filter-status" class="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500">
                <option value="all">All Statuses</option>
                <option value="overdue">Overdue</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid in Full</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-500 mb-1">Search Student / Parent</label>
              <div class="relative">
                <input id="fee-search-input" type="text" placeholder="Search name, phone, ID..." class="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 pl-8 focus:ring-2 focus:ring-blue-500">
                <svg class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Student Fee Obligations Table (Dual Mode: Mobile Cards & Desktop Table) -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <!-- Mobile Cards Container (< 768px) -->
          <div id="fee-mobile-cards" class="block md:hidden p-3 space-y-3 bg-slate-50"></div>

          <!-- Desktop Table (>= 768px) -->
          <div class="hidden md:block overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th class="py-3 px-4">Student & ID</th>
                  <th class="py-3 px-4">Class / Batch</th>
                  <th class="py-3 px-4">Parent Details</th>
                  <th class="py-3 px-4 text-right">Fee (BDT)</th>
                  <th class="py-3 px-4 text-right">Paid (BDT)</th>
                  <th class="py-3 px-4 text-right">Outstanding</th>
                  <th class="py-3 px-4">Due Date</th>
                  <th class="py-3 px-4">Status</th>
                  <th class="py-3 px-4 text-center">WhatsApp Reminder</th>
                  <th class="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody id="fee-table-body" class="divide-y divide-slate-100 text-slate-700">
                <tr><td colspan="10" class="py-8 text-center text-slate-400">Loading fee records...</td></tr>
              </tbody>
            </table>
          </div>

          <!-- Table Pagination Footer -->
          <div id="fee-pagination" class="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <!-- Populated dynamically -->
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    document.getElementById('fee-filter-month')?.addEventListener('change', (e) => {
      this.currentMonth = e.target.value;
      this.refresh();
    });

    document.getElementById('fee-filter-batch')?.addEventListener('change', (e) => {
      this.currentBatch = e.target.value;
      this.refresh();
    });

    document.getElementById('fee-filter-status')?.addEventListener('change', (e) => {
      this.currentStatus = e.target.value;
      this.refresh();
    });

    let debounceTimer;
    document.getElementById('fee-search-input')?.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.searchQuery = e.target.value;
        this.refresh();
      }, 300);
    });

    document.getElementById('btn-export-fees')?.addEventListener('click', () => {
      const url = `/api/fees/export-csv?month=${this.currentMonth}&classBatchId=${this.currentBatch}`;
      window.location.href = url;
    });

    document.getElementById('btn-remind-all-overdue')?.addEventListener('click', () => {
      this.handleRemindAllOverdue();
    });

    document.getElementById('btn-create-fee-obligation')?.addEventListener('click', () => {
      this.showCreateObligationModal();
    });
  }

  async loadBatches() {
    try {
      const res = await apiRequest('/admin/batches');
      const select = document.getElementById('fee-filter-batch');
      if (select && res.batches) {
        select.innerHTML = `<option value="all">All Batches</option>` +
          res.batches.map((b) => `<option value="${b.id}">${b.name}</option>`).join('');
      }
    } catch (e) {
      console.error('Failed to load batches:', e);
    }
  }

  async refresh() {
    await Promise.all([this.loadSummary(), this.loadObligations()]);
  }

  async loadSummary() {
    try {
      const res = await apiRequest(`/fees/summary?month=${this.currentMonth}&classBatchId=${this.currentBatch}`);
      const strip = document.getElementById('fees-summary-cards');
      if (!strip) return;

      strip.innerHTML = `
        <div class="bg-white p-3 rounded-lg border border-slate-200">
          <div class="text-[11px] text-slate-500 font-medium">Total Enrolled</div>
          <div class="text-base font-bold text-slate-900 mt-1 tabular-nums">${res.totalEnrolledStudents} Students</div>
        </div>
        <div class="bg-white p-3 rounded-lg border border-slate-200">
          <div class="text-[11px] text-slate-500 font-medium">Expected Fees</div>
          <div class="text-base font-bold text-slate-900 mt-1 tabular-nums">৳${res.expectedFees.toLocaleString()}</div>
        </div>
        <div class="bg-white p-3 rounded-lg border border-slate-200">
          <div class="text-[11px] text-emerald-600 font-medium">Collected</div>
          <div class="text-base font-bold text-emerald-700 mt-1 tabular-nums">৳${res.feesCollected.toLocaleString()}</div>
        </div>
        <div class="bg-white p-3 rounded-lg border border-slate-200">
          <div class="text-[11px] text-amber-600 font-medium">Outstanding</div>
          <div class="text-base font-bold text-amber-700 mt-1 tabular-nums">৳${res.totalOutstanding.toLocaleString()}</div>
        </div>
        <div class="bg-white p-3 rounded-lg border border-slate-200">
          <div class="text-[11px] text-red-600 font-medium">Overdue Fees</div>
          <div class="text-base font-bold text-red-700 mt-1 tabular-nums">৳${res.overdueFees.toLocaleString()}</div>
        </div>
        <div class="bg-white p-3 rounded-lg border border-slate-200">
          <div class="text-[11px] text-slate-500 font-medium">Pending Count</div>
          <div class="text-base font-bold text-slate-900 mt-1 tabular-nums">${res.pendingStudentsCount} Students</div>
        </div>
        <div class="bg-white p-3 rounded-lg border border-slate-200">
          <div class="text-[11px] text-blue-600 font-medium">Collection Rate</div>
          <div class="text-base font-bold text-blue-700 mt-1 tabular-nums">${res.collectionPercentage}%</div>
        </div>
      `;
    } catch (e) {
      console.error('Failed to load summary:', e);
    }
  }

  async loadObligations() {
    try {
      const query = new URLSearchParams({
        month: this.currentMonth,
        classBatchId: this.currentBatch,
        status: this.currentStatus,
        search: this.searchQuery,
        page: this.currentPage,
        sortBy: this.sortBy,
        sortOrder: this.sortOrder,
      });

      const res = await apiRequest(`/fees/obligations?${query.toString()}`);
      const tbody = document.getElementById('fee-table-body');
      const mobileContainer = document.getElementById('fee-mobile-cards');
      if (!tbody) return;

      if (!res.data || res.data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="py-8 text-center text-slate-400">No fee obligations matching current filters.</td></tr>`;
        if (mobileContainer) mobileContainer.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">No fee obligations found.</div>`;
        return;
      }

      // 1. Desktop Table Body
      tbody.innerHTML = res.data.map((o) => {
        let statusBadge = '';
        if (o.status === 'paid') {
          statusBadge = '<span class="text-emerald-700 font-medium text-xs">Paid in Full</span>';
        } else if (o.status === 'overdue') {
          statusBadge = '<span class="text-red-700 font-medium text-xs">Overdue</span>';
        } else if (o.status === 'partial') {
          statusBadge = '<span class="text-amber-700 font-medium text-xs">Partial</span>';
        } else {
          statusBadge = '<span class="text-slate-600 font-medium text-xs">Pending</span>';
        }

        const isFullyPaid = o.outstandingBalance <= 0;

        return `
          <tr class="hover:bg-slate-50/80 transition-colors">
            <td class="py-3 px-4">
              <div class="font-semibold text-slate-900">${o.studentName}</div>
              <div class="text-[11px] text-slate-400 font-mono">${o.studentId}</div>
            </td>
            <td class="py-3 px-4">
              <div class="text-slate-800">${o.classBatchName}</div>
              <div class="text-[11px] text-slate-400">${o.monthDisplay}</div>
            </td>
            <td class="py-3 px-4">
              <div class="text-slate-800">${o.parentName}</div>
              <div class="text-[11px] text-slate-500 font-mono">${o.parentPhone}</div>
            </td>
            <td class="py-3 px-4 text-right tabular-nums">
              ৳${o.adjustedFee}
              ${o.discount > 0 ? `<div class="text-[10px] text-slate-400 line-through">৳${o.baseFee}</div>` : ''}
            </td>
            <td class="py-3 px-4 text-right tabular-nums text-emerald-700 font-medium">৳${o.paidAmount}</td>
            <td class="py-3 px-4 text-right tabular-nums font-bold ${o.outstandingBalance > 0 ? 'text-red-600' : 'text-slate-400'}">৳${o.outstandingBalance}</td>
            <td class="py-3 px-4 text-slate-600 tabular-nums">${o.dueDate}</td>
            <td class="py-3 px-4">${statusBadge}</td>
            <td class="py-3 px-4 text-center">
              ${isFullyPaid ? `
                <span class="text-[11px] text-slate-400 italic">No Balance</span>
              ` : `
                <button data-action="wa-remind" data-id="${o.id}" class="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded flex items-center justify-center gap-1 mx-auto transition-colors">
                  <svg class="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.941-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.299.144.347.491 1.199.534 1.286.043.087.072.188.014.303-.058.116-.087.188-.173.289l-.26.303c-.087.087-.179.182-.077.357.101.174.449.741.964 1.201.662.591 1.221.774 1.394.861.173.086.275.072.376-.044.101-.116.433-.506.549-.679.116-.173.231-.144.39-.087s1.011.477 1.184.564.289.13.332.202c.043.073.043.419-.101.824z"/></svg>
                  Remind
                </button>
              `}
            </td>
            <td class="py-3 px-4 text-right">
              <div class="flex items-center justify-end gap-1.5">
                ${!isFullyPaid ? `
                  <button data-action="pay" data-id="${o.id}" class="px-2 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200">
                    Record Pay
                  </button>
                ` : ''}
                <button data-action="adjust" data-id="${o.id}" class="px-2 py-1 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded">
                  Adjust
                </button>
                <button data-action="history" data-id="${o.id}" class="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900">
                  History
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      // 2. Mobile Cards View (< 768px)
      if (mobileContainer) {
        mobileContainer.innerHTML = res.data.map((o) => {
          let statusBadge = '';
          if (o.status === 'paid') {
            statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">Paid</span>';
          } else if (o.status === 'overdue') {
            statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-800">Overdue</span>';
          } else if (o.status === 'partial') {
            statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">Partial</span>';
          } else {
            statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">Pending</span>';
          }
          const isFullyPaid = o.outstandingBalance <= 0;

          return `
            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <h4 class="font-bold text-slate-900 text-sm truncate">${o.studentName}</h4>
                  <div class="text-xs text-blue-700 font-medium">${o.classBatchName} • <span class="font-mono text-slate-400 text-[10px]">${o.studentId}</span></div>
                </div>
                ${statusBadge}
              </div>

              <div class="bg-slate-50 p-2.5 rounded-lg text-xs space-y-1">
                <div class="flex justify-between"><span class="text-slate-400">Guardian:</span><span class="font-medium text-slate-800">${o.parentName} (${o.parentPhone})</span></div>
                <div class="flex justify-between"><span class="text-slate-400">Total Obligation:</span><span class="font-bold text-slate-900 tabular-nums">৳${o.adjustedFee}</span></div>
                <div class="flex justify-between"><span class="text-slate-400">Paid Amount:</span><span class="font-bold text-emerald-700 tabular-nums">৳${o.paidAmount}</span></div>
                <div class="flex justify-between"><span class="text-slate-400">Outstanding:</span><span class="font-bold ${o.outstandingBalance > 0 ? 'text-red-600' : 'text-slate-500'} tabular-nums">৳${o.outstandingBalance}</span></div>
                <div class="flex justify-between"><span class="text-slate-400">Due Date:</span><span class="font-mono text-slate-600">${o.dueDate}</span></div>
              </div>

              <div class="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
                ${!isFullyPaid ? `
                  <button data-action="pay" data-id="${o.id}" class="flex-1 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg min-h-[38px] touch-manipulation">
                    Record Pay
                  </button>
                  <button data-action="wa-remind" data-id="${o.id}" class="flex-1 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg min-h-[38px] touch-manipulation flex items-center justify-center gap-1">
                    WhatsApp Remind
                  </button>
                ` : `
                  <button data-action="history" data-id="${o.id}" class="flex-1 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg min-h-[38px]">
                    Receipt History
                  </button>
                `}
                <button data-action="adjust" data-id="${o.id}" class="px-3 py-2 text-xs text-slate-600 bg-slate-100 rounded-lg min-h-[38px]">
                  Adjust
                </button>
              </div>
            </div>
          `;
        }).join('');
      }

      // Bind row actions across both containers
      document.querySelectorAll('#fee-table-body button[data-action], #fee-mobile-cards button[data-action]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const action = (btn).dataset.action;
          const id = (btn).dataset.id;
          const ob = res.data.find((item) => item.id === id);
          if (!ob) return;

          if (action === 'wa-remind') this.handleSingleWhatsAppReminder(ob);
          if (action === 'pay') this.showRecordPaymentModal(ob);
          if (action === 'adjust') this.showAdjustmentModal(ob);
          if (action === 'history') this.showPaymentHistoryModal(ob);
        });
      });

      // Pagination
      const paginationEl = document.getElementById('fee-pagination');
      if (paginationEl && res.pagination) {
        paginationEl.innerHTML = `
          <span>Showing ${(res.pagination.page - 1) * res.pagination.limit + 1}–${Math.min(res.pagination.total, res.pagination.page * res.pagination.limit)} of ${res.pagination.total} obligations</span>
          <div class="flex items-center gap-2">
            <button id="fee-page-prev" ${res.pagination.page <= 1 ? 'disabled class="opacity-50 cursor-not-allowed"' : 'class="hover:text-slate-800"'}>Previous</button>
            <span>Page ${res.pagination.page} of ${res.pagination.totalPages || 1}</span>
            <button id="fee-page-next" ${res.pagination.page >= res.pagination.totalPages ? 'disabled class="opacity-50 cursor-not-allowed"' : 'class="hover:text-slate-800"'}>Next</button>
          </div>
        `;

        document.getElementById('fee-page-prev')?.addEventListener('click', () => {
          if (this.currentPage > 1) {
            this.currentPage--;
            this.loadObligations();
          }
        });
        document.getElementById('fee-page-next')?.addEventListener('click', () => {
          if (this.currentPage < res.pagination.totalPages) {
            this.currentPage++;
            this.loadObligations();
          }
        });
      }
    } catch (e) {
      console.error('Failed to load obligations:', e);
    }
  }

  async handleSingleWhatsAppReminder(ob) {
    try {
      const res = await apiRequest('/fees/whatsapp-reminder', {
        method: 'POST',
        body: { feeObligationId: ob.id },
      });

      this.app.showModal({
        title: 'Send Fee Reminder via WhatsApp',
        content: `
          <div class="space-y-3">
            <div class="p-3 bg-blue-50 border border-blue-100 rounded text-xs space-y-1">
              <div><strong class="text-slate-700">Recipient:</strong> ${res.parentName} (${res.displayPhone})</div>
              <div><strong class="text-slate-700">Student:</strong> ${res.studentName}</div>
              <div><strong class="text-slate-700">Pending Amount:</strong> ৳${res.outstandingAmount}</div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Pre-filled Message:</label>
              <textarea id="single-wa-text" rows="4" class="w-full text-xs font-sans p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-800">${res.message}</textarea>
            </div>
            <p class="text-[11px] text-slate-400">Opening WhatsApp will not automatically send. You will review and tap Send inside WhatsApp.</p>
          </div>
        `,
        actions: [
          {
            label: 'Cancel',
            className: 'text-slate-600 hover:bg-slate-100',
            onClick: () => this.app.closeModal(),
          },
          {
            label: 'Open WhatsApp Chat',
            className: 'bg-emerald-600 text-white hover:bg-emerald-700 font-semibold',
            onClick: () => {
              const editedMsg = document.getElementById('single-wa-text').value;
              const directUrl = buildWhatsAppUrl(res.displayPhone, editedMsg);
              if (directUrl) {
                window.open(directUrl, '_blank');
                this.app.showToast('WhatsApp chat launched. Review and send.', 'success');
              }
              this.app.closeModal();
            },
          },
        ],
      });
    } catch (err) {
      this.app.showToast(err.message, 'error');
    }
  }

  async handleRemindAllOverdue() {
    try {
      const res = await apiRequest(`/fees/bulk-overdue-reminders?month=${this.currentMonth}&classBatchId=${this.currentBatch}`);
      if (res.count === 0) {
        this.app.showToast('No overdue students found matching current filters.', 'info');
        return;
      }

      const wizard = new BulkWhatsAppWizard({
        title: `Overdue Fee Reminders (${res.validCount} Parents)`,
        recipients: res.reminders.filter((r) => r.isValidPhone),
        onComplete: (sent, total) => {
          this.app.showToast(`Completed WhatsApp reminder runner: ${sent} of ${total} chats opened.`, 'success');
        },
      });

      wizard.start();
    } catch (err) {
      this.app.showToast(err.message, 'error');
    }
  }

  showRecordPaymentModal(ob) {
    this.app.showModal({
      title: `Record Payment: ${ob.studentName}`,
      content: `
        <form id="record-pay-form" class="space-y-3">
          <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <div class="flex justify-between"><span>Month:</span> <span class="font-semibold">${ob.monthDisplay}</span></div>
            <div class="flex justify-between"><span>Outstanding Balance:</span> <span class="font-bold text-red-600">৳${ob.outstandingBalance}</span></div>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Payment Amount (৳ BDT) *</label>
            <input type="number" id="pay-amount" min="1" max="${ob.outstandingBalance}" value="${ob.outstandingBalance}" required class="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono font-bold">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-700 mb-1">Method *</label>
              <select id="pay-method" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg">
                <option value="bKash">bKash (Manual / TrxID)</option>
                <option value="Cash" selected>Cash at Desk</option>
                <option value="Nagad">Nagad</option>
                <option value="Bank">Bank Deposit</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-700 mb-1">Transaction ID (if electronic)</label>
              <input type="text" id="pay-trx" placeholder="e.g. BK984X7Q11" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg font-mono uppercase">
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Payment Notes / Receipt Memo</label>
            <input type="text" id="pay-notes" placeholder="Optional notes" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg">
          </div>
        </form>
      `,
      actions: [
        {
          label: 'Cancel',
          className: 'text-slate-600 hover:bg-slate-100',
          onClick: () => this.app.closeModal(),
        },
        {
          label: 'Confirm & Issue Receipt',
          className: 'bg-blue-700 text-white hover:bg-blue-800 font-semibold',
          onClick: async () => {
            const amount = Number(document.getElementById('pay-amount').value);
            const method = document.getElementById('pay-method').value;
            const trx = document.getElementById('pay-trx').value;
            const notes = document.getElementById('pay-notes').value;

            if (amount <= 0 || amount > ob.outstandingBalance) {
              alert('Please enter a valid payment amount.');
              return;
            }

            try {
              const res = await apiRequest('/fees/payments', {
                method: 'POST',
                body: {
                  feeObligationId: ob.id,
                  amount,
                  paymentMethod: method,
                  transactionId: trx,
                  recordedBy: this.app.currentUser?.name || 'Admin',
                  notes,
                },
              });

              this.app.closeModal();
              this.app.showToast(`Payment of ৳${amount} recorded! Receipt: ${res.payment.receiptNumber}`, 'success');
              this.refresh();
              this.showReceiptModal(res.payment.receiptNumber);
            } catch (err) {
              alert(err.message);
            }
          },
        },
      ],
    });
  }

  showAdjustmentModal(ob) {
    this.app.showModal({
      title: `Authorized Adjustment: ${ob.studentName}`,
      content: `
        <form id="adjust-fee-form" class="space-y-3">
          <div class="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
            <div class="flex justify-between"><span>Base Fee:</span> <span class="font-mono">৳${ob.baseFee}</span></div>
            <div class="flex justify-between"><span>Current Discount:</span> <span class="font-mono">৳${ob.discount}</span></div>
            <div class="flex justify-between"><span>Already Paid:</span> <span class="font-mono text-emerald-600">৳${ob.paidAmount}</span></div>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Updated Base Fee (৳)</label>
            <input type="number" id="adj-base" value="${ob.baseFee}" class="w-full text-xs p-2 border border-slate-300 rounded font-mono">
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Authorized Discount / Concession (৳)</label>
            <input type="number" id="adj-discount" value="${ob.discount}" class="w-full text-xs p-2 border border-slate-300 rounded font-mono">
            <p class="text-[11px] text-slate-400 mt-0.5">e.g. Sibling discount, scholarship, or special waiver</p>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Reason for Adjustment *</label>
            <input type="text" id="adj-reason" required placeholder="Mandatory audit explanation" class="w-full text-xs p-2 border border-slate-300 rounded">
          </div>
        </form>
      `,
      actions: [
        { label: 'Cancel', className: 'text-slate-600', onClick: () => this.app.closeModal() },
        {
          label: 'Apply Adjustment',
          className: 'bg-slate-900 text-white hover:bg-slate-800',
          onClick: async () => {
            const baseFee = Number(document.getElementById('adj-base').value);
            const discount = Number(document.getElementById('adj-discount').value);
            const notes = document.getElementById('adj-reason').value;

            if (!notes.trim()) {
              alert('Please enter a reason for the adjustment.');
              return;
            }

            try {
              await apiRequest(`/fees/obligations/${ob.id}/adjust`, {
                method: 'PATCH',
                body: { baseFee, discount, notes, userId: this.app.currentUser?.name || 'Admin' },
              });
              this.app.closeModal();
              this.app.showToast('Fee obligation adjusted and audited.', 'success');
              this.refresh();
            } catch (err) {
              alert(err.message);
            }
          },
        },
      ],
    });
  }

  async showPaymentHistoryModal(ob) {
    try {
      const res = await apiRequest(`/fees/payments?feeObligationId=${ob.id}`);
      this.app.showModal({
        title: `Payment History: ${ob.studentName}`,
        content: `
          <div class="space-y-3">
            <div class="text-xs text-slate-500">Obligation for ${ob.monthDisplay} (Class: ${ob.classBatchName})</div>
            ${res.payments.length === 0 ? `
              <div class="p-4 text-center text-slate-400 text-xs">No payments recorded for this obligation yet.</div>
            ` : `
              <div class="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                ${res.payments.map((p) => `
                  <div class="p-3 bg-white flex items-center justify-between text-xs">
                    <div>
                      <div class="font-semibold text-slate-900">${p.receiptNumber} · ৳${p.amount}</div>
                      <div class="text-[11px] text-slate-500">${p.paymentMethod} ${p.transactionId ? `(TrxID: ${p.transactionId})` : ''} · ${p.paymentDate}</div>
                      ${p.notes ? `<div class="text-[10px] text-slate-400 italic">${p.notes}</div>` : ''}
                    </div>
                    <button class="btn-view-rec px-2.5 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100" data-rec="${p.receiptNumber}">
                      View Receipt
                    </button>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        `,
        actions: [{ label: 'Close', className: 'text-slate-600', onClick: () => this.app.closeModal() }],
      });

      document.querySelectorAll('.btn-view-rec').forEach((btn) => {
        btn.onclick = () => this.showReceiptModal(btn.dataset.rec);
      });
    } catch (err) {
      this.app.showToast(err.message, 'error');
    }
  }

  async showReceiptModal(receiptNumber) {
    try {
      const res = await apiRequest(`/fees/receipts/${receiptNumber}`);
      this.app.showModal({
        title: `Money Receipt: ${receiptNumber}`,
        content: `
          <div id="printable-section" class="p-4 bg-white border border-slate-200 rounded-lg space-y-4 text-xs font-sans">
            <!-- Header -->
            <div class="text-center border-b border-slate-200 pb-3">
              <h2 class="text-base font-bold text-slate-900">${res.settings.tuitionName}</h2>
              <p class="text-[11px] text-slate-500">${res.settings.address}</p>
              <p class="text-[11px] text-slate-500">Helpline: ${res.settings.phone} · Email: ${res.settings.email}</p>
              <div class="mt-2 inline-block px-3 py-0.5 bg-slate-100 text-slate-800 font-bold rounded uppercase text-[10px] tracking-wider">
                Official Tuition Fee Receipt
              </div>
            </div>

            <!-- Receipt Meta -->
            <div class="grid grid-cols-2 gap-2 text-slate-700">
              <div><strong>Receipt No:</strong> <span class="font-mono">${res.payment.receiptNumber}</span></div>
              <div class="text-right"><strong>Date:</strong> ${res.payment.paymentDate}</div>
              <div><strong>Student:</strong> ${res.student?.name} (${res.student?.studentId})</div>
              <div class="text-right"><strong>Batch:</strong> ${res.student?.classBatchName}</div>
              <div><strong>Parent / Guardian:</strong> ${res.student?.parentName}</div>
              <div class="text-right"><strong>Contact:</strong> ${res.student?.parentPhone}</div>
            </div>

            <!-- Payment Table -->
            <table class="w-full border-collapse border border-slate-200 text-slate-800">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-200">
                  <th class="p-2 text-left">Description</th>
                  <th class="p-2 text-right">Amount (BDT)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="p-2">Tuition Fee for ${res.obligation?.monthDisplay} (${res.payment.paymentMethod} ${res.payment.transactionId ? `- TrxID: ${res.payment.transactionId}` : ''})</td>
                  <td class="p-2 text-right font-mono font-bold">৳${res.payment.amount}</td>
                </tr>
              </tbody>
            </table>

            <!-- Signatures -->
            <div class="pt-8 flex justify-between text-slate-500 text-[11px]">
              <div class="border-t border-slate-300 pt-1 w-32 text-center">Received By (${res.payment.recordedBy})</div>
              <div class="border-t border-slate-300 pt-1 w-32 text-center">Authorized Signature</div>
            </div>
          </div>
        `,
        actions: [
          { label: 'Close', className: 'text-slate-600', onClick: () => this.app.closeModal() },
          {
            label: 'Print Receipt / Save PDF',
            className: 'bg-blue-700 text-white hover:bg-blue-800 font-semibold',
            onClick: () => window.print(),
          },
        ],
      });
    } catch (err) {
      this.app.showToast(err.message, 'error');
    }
  }

  showCreateObligationModal() {
    this.app.showModal({
      title: 'Create Fee Obligation',
      content: `
        <form id="create-fee-form" class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Select Student *</label>
            <select id="new-fee-student" required class="w-full text-xs p-2.5 border border-slate-300 rounded-lg">
              <option value="">Loading students...</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-700 mb-1">Month (YYYY-MM) *</label>
              <input type="month" id="new-fee-month" value="2026-11" required class="w-full text-xs p-2.5 border border-slate-300 rounded-lg font-mono">
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-700 mb-1">Due Date *</label>
              <input type="date" id="new-fee-due" value="2026-11-10" required class="w-full text-xs p-2.5 border border-slate-300 rounded-lg font-mono">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-700 mb-1">Base Fee (৳) *</label>
              <input type="number" id="new-fee-base" value="2500" required class="w-full text-xs p-2.5 border border-slate-300 rounded-lg font-mono">
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-700 mb-1">Discount (৳)</label>
              <input type="number" id="new-fee-disc" value="0" class="w-full text-xs p-2.5 border border-slate-300 rounded-lg font-mono">
            </div>
          </div>
        </form>
      `,
      actions: [
        { label: 'Cancel', className: 'text-slate-600', onClick: () => this.app.closeModal() },
        {
          label: 'Create Obligation',
          className: 'bg-blue-700 text-white hover:bg-blue-800 font-semibold',
          onClick: async () => {
            const studentId = document.getElementById('new-fee-student').value;
            const month = document.getElementById('new-fee-month').value;
            const dueDate = document.getElementById('new-fee-due').value;
            const baseFee = Number(document.getElementById('new-fee-base').value);
            const discount = Number(document.getElementById('new-fee-disc').value);

            if (!studentId || !month || !baseFee) {
              alert('Please complete all required fields.');
              return;
            }

            try {
              await apiRequest('/fees/obligations', {
                method: 'POST',
                body: { studentId, month, dueDate, baseFee, discount },
              });
              this.app.closeModal();
              this.app.showToast('Fee obligation created successfully.', 'success');
              this.refresh();
            } catch (err) {
              alert(err.message);
            }
          },
        },
      ],
    });

    // Populate students dropdown
    apiRequest('/admin/students').then((res) => {
      const select = document.getElementById('new-fee-student');
      if (select && res.students) {
        select.innerHTML = `<option value="">Choose a student...</option>` +
          res.students.filter((s) => s.status === 'active').map((s) => `
            <option value="${s.id}">${s.name} (${s.studentId} - ${s.classBatchName})</option>
          `).join('');
      }
    });
  }
}
