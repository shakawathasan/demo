import { apiRequest } from './api.js';

export class AdminViewController {
  constructor(app) {
    this.app = app;
    this.activeTab = 'overview';
    this.students = [];
    this.batches = [];
    this.studentSearch = '';
    this.studentBatchFilter = 'all';
    this.studentStatusFilter = 'all';
    this.studentPage = 1;
    this.pageSize = 10;
  }

  async init() {
    this.renderContainer();
    this.bindEvents();
    await this.loadActiveTabContent();
  }

  renderContainer() {
    const container = document.getElementById('view-admin');
    if (!container) return;

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Top Title & Quick Status -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-800">
                ADMIN CONSOLE
              </span>
              <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Administrator Dashboard</h1>
            </div>
            <p class="text-xs sm:text-sm text-slate-500 mt-0.5">Manage academy operations, enrolled students, batches, bKash verification queue, branding, and security.</p>
          </div>
          <div class="flex items-center gap-2">
            <button id="btn-admin-refresh" class="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl flex items-center gap-1.5 shadow-xs touch-manipulation">
              <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              <span>Refresh</span>
            </button>
            <a href="/api/export/project-zip" download="shikho-tuition-bangladesh.zip" class="hidden sm:flex px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl items-center gap-1.5 shadow-xs">
              <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              <span>Backup ZIP</span>
            </a>
          </div>
        </div>

        <!-- Responsive Admin Navigation Tabs Bar (Horizontally scrollable on mobile) -->
        <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div class="flex border-b border-slate-200 overflow-x-auto text-xs font-semibold text-slate-600 bg-slate-50/70 scrollbar-none">
            <button class="admin-tab py-3.5 px-4 sm:px-5 border-b-2 border-blue-700 text-blue-700 font-bold whitespace-nowrap flex items-center gap-1.5 touch-manipulation" data-tab="overview">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
              <span>Overview</span>
            </button>
            <button class="admin-tab py-3.5 px-4 sm:px-5 border-b-2 border-transparent hover:text-slate-900 whitespace-nowrap flex items-center gap-1.5 touch-manipulation" data-tab="students">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
              <span>Students Roster</span>
            </button>
            <button class="admin-tab py-3.5 px-4 sm:px-5 border-b-2 border-transparent hover:text-slate-900 whitespace-nowrap flex items-center gap-1.5 touch-manipulation" data-tab="batches">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
              <span>Classes & Batches</span>
            </button>
            <button class="admin-tab py-3.5 px-4 sm:px-5 border-b-2 border-transparent hover:text-slate-900 whitespace-nowrap flex items-center gap-1.5 touch-manipulation" data-tab="bkash-queue">
              <svg class="w-4 h-4 text-pink-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/></svg>
              <span>bKash Queue</span>
            </button>
            <button class="admin-tab py-3.5 px-4 sm:px-5 border-b-2 border-transparent hover:text-slate-900 whitespace-nowrap flex items-center gap-1.5 touch-manipulation" data-tab="announcements">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>
              <span>Notices & HW</span>
            </button>
            <button class="admin-tab py-3.5 px-4 sm:px-5 border-b-2 border-transparent hover:text-slate-900 whitespace-nowrap flex items-center gap-1.5 touch-manipulation" data-tab="templates">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.941-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.299.144.347.491 1.199.534 1.286.043.087.072.188.014.303-.058.116-.087.188-.173.289l-.26.303c-.087.087-.179.182-.077.357.101.174.449.741.964 1.201.662.591 1.221.774 1.394.861.173.086.275.072.376-.044.101-.116.433-.506.549-.679.116-.173.231-.144.39-.087s1.011.477 1.184.564.289.13.332.202c.043.073.043.419-.101.824z"/></svg>
              <span>WhatsApp</span>
            </button>
            <button class="admin-tab py-3.5 px-4 sm:px-5 border-b-2 border-transparent hover:text-slate-900 whitespace-nowrap flex items-center gap-1.5 touch-manipulation" data-tab="settings">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/></svg>
              <span>Settings & Branding</span>
            </button>
            <button class="admin-tab py-3.5 px-4 sm:px-5 border-b-2 border-transparent hover:text-slate-900 whitespace-nowrap flex items-center gap-1.5 touch-manipulation" data-tab="security">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              <span>Security</span>
            </button>
            <button class="admin-tab py-3.5 px-4 sm:px-5 border-b-2 border-transparent hover:text-slate-900 whitespace-nowrap flex items-center gap-1.5 touch-manipulation" data-tab="audit">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
              <span>Audit Logs</span>
            </button>
          </div>

          <!-- Tab Content Panes -->
          <div class="p-3 sm:p-6">
            <div id="admin-pane-overview" class="admin-pane space-y-6"></div>
            <div id="admin-pane-students" class="admin-pane hidden space-y-4"></div>
            <div id="admin-pane-batches" class="admin-pane hidden space-y-4"></div>
            <div id="admin-pane-bkash-queue" class="admin-pane hidden space-y-4"></div>
            <div id="admin-pane-announcements" class="admin-pane hidden space-y-4"></div>
            <div id="admin-pane-templates" class="admin-pane hidden space-y-4"></div>
            <div id="admin-pane-settings" class="admin-pane hidden space-y-4"></div>
            <div id="admin-pane-security" class="admin-pane hidden space-y-4"></div>
            <div id="admin-pane-audit" class="admin-pane hidden space-y-4"></div>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    document.querySelectorAll('.admin-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const targetTab = (tab).dataset.tab;
        if (!targetTab) return;
        this.activeTab = targetTab;

        document.querySelectorAll('.admin-tab').forEach((t) => {
          t.className = 'admin-tab py-3.5 px-4 sm:px-5 border-b-2 border-transparent text-slate-600 hover:text-slate-900 whitespace-nowrap flex items-center gap-1.5 touch-manipulation';
        });
        tab.className = 'admin-tab py-3.5 px-4 sm:px-5 border-b-2 border-blue-700 text-blue-700 font-bold whitespace-nowrap flex items-center gap-1.5 touch-manipulation';

        document.querySelectorAll('.admin-pane').forEach((p) => p.classList.add('hidden'));
        document.getElementById(`admin-pane-${this.activeTab}`)?.classList.remove('hidden');

        this.loadActiveTabContent();
      });
    });

    document.getElementById('btn-admin-refresh')?.addEventListener('click', () => {
      this.loadActiveTabContent();
      this.app.showToast('Dashboard refreshed with latest server data', 'info');
    });
  }

  async loadActiveTabContent() {
    if (this.activeTab === 'overview') await this.loadOverview();
    if (this.activeTab === 'students') await this.loadStudents();
    if (this.activeTab === 'batches') await this.loadBatches();
    if (this.activeTab === 'bkash-queue') await this.loadBkashQueue();
    if (this.activeTab === 'announcements') await this.loadAnnouncements();
    if (this.activeTab === 'templates') await this.loadTemplates();
    if (this.activeTab === 'settings') await this.loadSettings();
    if (this.activeTab === 'security') await this.loadSecurity();
    if (this.activeTab === 'audit') await this.loadAuditLogs();
  }

  // ==========================================
  // SECTION A: OVERVIEW
  // ==========================================
  async loadOverview() {
    const pane = document.getElementById('admin-pane-overview');
    if (!pane) return;

    pane.innerHTML = `<div class="py-12 text-center text-slate-400 text-xs">Loading live overview statistics...</div>`;

    try {
      const res = await apiRequest('/admin/overview-stats');
      const stats = res.stats;

      pane.innerHTML = `
        <!-- KPI Statistics Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Enrolled Students</div>
            <div class="text-2xl font-bold text-slate-900 mt-1 tabular-nums">${stats.totalStudents} Active</div>
            <div class="text-[11px] text-blue-700 font-medium mt-0.5">Across ${stats.totalBatches} Class Batches</div>
          </div>

          <div class="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200">
            <div class="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Monthly Fees Collected</div>
            <div class="text-2xl font-bold text-emerald-800 mt-1 tabular-nums">৳${stats.totalCollectedAmount.toLocaleString()}</div>
            <div class="text-[11px] text-emerald-600 font-medium mt-0.5">${stats.collectionPercentage}% Collection Rate</div>
          </div>

          <div class="bg-amber-50/60 p-4 rounded-xl border border-amber-200">
            <div class="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Pending Fee Balance</div>
            <div class="text-2xl font-bold text-amber-800 mt-1 tabular-nums">৳${stats.totalPendingAmount.toLocaleString()}</div>
            <div class="text-[11px] text-amber-600 font-medium mt-0.5">October 2026 Obligations</div>
          </div>

          <div class="bg-pink-50/60 p-4 rounded-xl border border-pink-200">
            <div class="text-[11px] font-bold text-pink-700 uppercase tracking-wider">bKash Verification Queue</div>
            <div class="text-2xl font-bold text-pink-800 mt-1 tabular-nums">${stats.pendingBkashCount} Pending</div>
            <div class="text-[11px] text-pink-600 font-medium mt-0.5">${stats.pendingBkashCount > 0 ? 'Requires Admin Approval' : 'All TrxIDs Verified'}</div>
          </div>
        </div>

        <!-- Quick Actions Panel -->
        <div class="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
          <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Quick Administrative Actions</h3>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button id="btn-quick-add-student" class="p-3 bg-white hover:bg-blue-50 border border-slate-200 rounded-xl text-left transition-all shadow-xs touch-manipulation">
              <div class="text-blue-700 font-bold text-xs flex items-center gap-1.5">+ Enroll Student</div>
              <p class="text-[10px] text-slate-500 mt-0.5">Register new student</p>
            </button>
            <button id="btn-quick-create-batch" class="p-3 bg-white hover:bg-blue-50 border border-slate-200 rounded-xl text-left transition-all shadow-xs touch-manipulation">
              <div class="text-blue-700 font-bold text-xs flex items-center gap-1.5">+ Create Batch</div>
              <p class="text-[10px] text-slate-500 mt-0.5">Set up shift & subjects</p>
            </button>
            <button id="btn-quick-verify-bkash" class="p-3 bg-white hover:bg-pink-50 border border-slate-200 rounded-xl text-left transition-all shadow-xs touch-manipulation">
              <div class="text-pink-700 font-bold text-xs flex items-center gap-1.5">Verify bKash (${stats.pendingBkashCount})</div>
              <p class="text-[10px] text-slate-500 mt-0.5">Review TrxID submissions</p>
            </button>
            <button id="btn-quick-post-notice" class="p-3 bg-white hover:bg-indigo-50 border border-slate-200 rounded-xl text-left transition-all shadow-xs touch-manipulation">
              <div class="text-indigo-700 font-bold text-xs flex items-center gap-1.5">+ Post Notice</div>
              <p class="text-[10px] text-slate-500 mt-0.5">Publish announcement</p>
            </button>
          </div>
        </div>

        <!-- Two Column: Recent Approved Payments & Recent System Audit Activity -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Recent Verified Payments -->
          <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Recent Verified Payments</h3>
              <span class="text-[10px] text-slate-400 font-mono">LIVE RECEIPTS</span>
            </div>
            <div class="divide-y divide-slate-100 text-xs">
              ${res.recentPayments.length === 0 ? `<div class="py-4 text-center text-slate-400">No payment records yet.</div>` : res.recentPayments.map((p) => `
                <div class="py-2.5 flex items-center justify-between gap-2">
                  <div class="min-w-0">
                    <div class="font-bold text-slate-800 truncate">${p.studentName}</div>
                    <div class="text-[10px] text-slate-400 font-mono">${p.receiptNumber} • ${p.paymentMethod}</div>
                  </div>
                  <div class="text-right shrink-0">
                    <div class="font-bold text-emerald-700 tabular-nums">৳${p.amount.toLocaleString()}</div>
                    <div class="text-[10px] text-slate-400">${p.paymentDate}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Recent Audit Logs -->
          <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Administrative Audit Trail</h3>
              <span class="text-[10px] text-slate-400 font-mono">SECURITY LOG</span>
            </div>
            <div class="divide-y divide-slate-100 text-xs">
              ${res.recentActivity.length === 0 ? `<div class="py-4 text-center text-slate-400">No recent logs.</div>` : res.recentActivity.map((log) => `
                <div class="py-2.5 flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <div class="font-semibold text-slate-800 truncate">${log.details}</div>
                    <div class="text-[10px] text-slate-400 font-mono">${log.action} by ${log.userName}</div>
                  </div>
                  <span class="text-[10px] text-slate-400 shrink-0 tabular-nums">${new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;

      // Bind Quick Actions
      document.getElementById('btn-quick-add-student')?.addEventListener('click', () => {
        this.activeTab = 'students';
        this.switchAdminTab('students');
        this.showAddStudentModal();
      });

      document.getElementById('btn-quick-create-batch')?.addEventListener('click', () => {
        this.activeTab = 'batches';
        this.switchAdminTab('batches');
        this.showAddBatchModal();
      });

      document.getElementById('btn-quick-verify-bkash')?.addEventListener('click', () => {
        this.activeTab = 'bkash-queue';
        this.switchAdminTab('bkash-queue');
      });

      document.getElementById('btn-quick-post-notice')?.addEventListener('click', () => {
        this.activeTab = 'announcements';
        this.switchAdminTab('announcements');
        this.showAddAnnouncementModal();
      });
    } catch (err) {
      pane.innerHTML = `<div class="p-4 bg-red-50 text-red-700 text-xs rounded-xl">${err.message}</div>`;
    }
  }

  switchAdminTab(tabName) {
    document.querySelectorAll('.admin-tab').forEach((t) => {
      if ((t).dataset.tab === tabName) {
        t.className = 'admin-tab py-3.5 px-4 sm:px-5 border-b-2 border-blue-700 text-blue-700 font-bold whitespace-nowrap flex items-center gap-1.5 touch-manipulation';
      } else {
        t.className = 'admin-tab py-3.5 px-4 sm:px-5 border-b-2 border-transparent text-slate-600 hover:text-slate-900 whitespace-nowrap flex items-center gap-1.5 touch-manipulation';
      }
    });

    document.querySelectorAll('.admin-pane').forEach((p) => p.classList.add('hidden'));
    document.getElementById(`admin-pane-${tabName}`)?.classList.remove('hidden');
    this.activeTab = tabName;
    this.loadActiveTabContent();
  }

  // ==========================================
  // SECTION B: STUDENTS ROSTER (Mobile Cards + Table)
  // ==========================================
  async loadStudents() {
    const pane = document.getElementById('admin-pane-students');
    if (!pane) return;

    try {
      const [studentsRes, batchesRes] = await Promise.all([
        apiRequest('/admin/students'),
        apiRequest('/admin/batches'),
      ]);
      this.students = studentsRes.students || [];
      this.batches = batchesRes.batches || [];

      this.renderStudentsUI(pane);
    } catch (err) {
      pane.innerHTML = `<div class="p-4 bg-red-50 text-red-700 text-xs rounded-xl">${err.message}</div>`;
    }
  }

  renderStudentsUI(pane) {
    // Filter students
    let filtered = this.students.filter((s) => {
      if (this.studentBatchFilter !== 'all' && s.classBatchId !== this.studentBatchFilter) return false;
      if (this.studentStatusFilter !== 'all' && s.status !== this.studentStatusFilter) return false;
      if (this.studentSearch) {
        const q = this.studentSearch.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.studentId.toLowerCase().includes(q) ||
          s.parentPhone.includes(q) ||
          s.parentName.toLowerCase().includes(q)
        );
      }
      return true;
    });

    pane.innerHTML = `
      <!-- Header Toolbar -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 class="text-sm sm:text-base font-bold text-slate-900">Enrolled Students Roster (${filtered.length})</h3>
          <p class="text-xs text-slate-500">Manage enrollment, fee rates, class allocations, and contact records.</p>
        </div>
        <button id="btn-add-student" class="px-4 py-2.5 sm:py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs flex items-center justify-center gap-1.5 touch-manipulation min-h-[42px]">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          <span>Enroll New Student</span>
        </button>
      </div>

      <!-- Search & Filters Toolbar -->
      <div class="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div>
          <input 
            type="text" 
            id="admin-student-search" 
            placeholder="Search student, ID, parent phone..." 
            value="${this.studentSearch}"
            class="w-full text-base sm:text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <select id="admin-student-batch-filter" class="w-full text-base sm:text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="all">All Batches & Classes</option>
            ${this.batches.map((b) => `<option value="${b.id}" ${this.studentBatchFilter === b.id ? 'selected' : ''}>${b.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <select id="admin-student-status-filter" class="w-full text-base sm:text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="all" ${this.studentStatusFilter === 'all' ? 'selected' : ''}>All Statuses</option>
            <option value="active" ${this.studentStatusFilter === 'active' ? 'selected' : ''}>Active Enrolled</option>
            <option value="inactive" ${this.studentStatusFilter === 'inactive' ? 'selected' : ''}>Inactive</option>
            <option value="archived" ${this.studentStatusFilter === 'archived' ? 'selected' : ''}>Archived</option>
          </select>
        </div>
      </div>

      <!-- Mobile Cards View (< 768px) -->
      <div class="block md:hidden space-y-3" id="students-mobile-cards">
        ${filtered.length === 0 ? `<div class="p-6 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">No students match your criteria.</div>` : filtered.map((s) => `
          <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">${s.studentId} • Roll #${s.rollNo}</span>
                <h4 class="font-bold text-slate-900 text-sm mt-0.5 truncate">${s.name}</h4>
                <div class="text-xs text-blue-700 font-medium">${s.classBatchName}</div>
              </div>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${s.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}">
                ${s.status}
              </span>
            </div>

            <div class="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg space-y-0.5">
              <div class="flex justify-between">
                <span class="text-slate-400">Guardian:</span>
                <span class="font-medium text-slate-800">${s.parentName}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">Phone:</span>
                <span class="font-mono text-slate-800">${s.parentPhone}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">Monthly Fee:</span>
                <span class="font-bold text-slate-900 tabular-nums">৳${s.monthlyFee}</span>
              </div>
            </div>

            <div class="flex items-center gap-2 pt-1 border-t border-slate-100">
              <button class="btn-edit-student flex-1 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg min-h-[38px] touch-manipulation" data-id="${s.id}">
                Edit Profile
              </button>
              <button class="btn-delete-student flex-1 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg min-h-[38px] touch-manipulation" data-id="${s.id}">
                ${s.status === 'archived' ? 'Delete' : 'Archive'}
              </button>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Desktop Table View (>= 768px) -->
      <div class="hidden md:block overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs">
        <table class="w-full text-left text-xs border-collapse">
          <thead class="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase tracking-wider">
            <tr>
              <th class="p-3 w-16">Roll</th>
              <th class="p-3">ID & Student</th>
              <th class="p-3">Class Batch</th>
              <th class="p-3">Parent & Contact</th>
              <th class="p-3 text-right">Fee (BDT)</th>
              <th class="p-3 text-center">Status</th>
              <th class="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-slate-700">
            ${filtered.length === 0 ? `<tr><td colspan="7" class="py-8 text-center text-slate-400">No students found.</td></tr>` : filtered.map((s) => `
              <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="p-3 font-mono font-bold text-slate-500">${s.rollNo}</td>
                <td class="p-3">
                  <div class="font-bold text-slate-900">${s.name}</div>
                  <div class="text-[10px] text-slate-400 font-mono">${s.studentId}</div>
                </td>
                <td class="p-3 font-medium text-slate-800">${s.classBatchName}</td>
                <td class="p-3">
                  <div>${s.parentName}</div>
                  <div class="text-[11px] text-slate-400 font-mono">${s.parentPhone}</div>
                </td>
                <td class="p-3 text-right font-bold text-slate-900 tabular-nums">৳${s.monthlyFee}</td>
                <td class="p-3 text-center">
                  <span class="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${s.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}">
                    ${s.status}
                  </span>
                </td>
                <td class="p-3 text-right space-x-1">
                  <button class="btn-edit-student px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg" data-id="${s.id}">Edit</button>
                  <button class="btn-delete-student px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg" data-id="${s.id}">${s.status === 'archived' ? 'Delete' : 'Archive'}</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Bind Student Events
    document.getElementById('btn-add-student')?.addEventListener('click', () => this.showAddStudentModal());

    const searchInput = document.getElementById('admin-student-search');
    searchInput?.addEventListener('input', (e) => {
      this.studentSearch = (e.target).value;
      this.renderStudentsUI(pane);
    });

    const batchFilter = document.getElementById('admin-student-batch-filter');
    batchFilter?.addEventListener('change', (e) => {
      this.studentBatchFilter = (e.target).value;
      this.renderStudentsUI(pane);
    });

    const statusFilter = document.getElementById('admin-student-status-filter');
    statusFilter?.addEventListener('change', (e) => {
      this.studentStatusFilter = (e.target).value;
      this.renderStudentsUI(pane);
    });

    pane.querySelectorAll('.btn-edit-student').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = (btn).dataset.id;
        const student = this.students.find((s) => s.id === id);
        if (student) this.showEditStudentModal(student);
      });
    });

    pane.querySelectorAll('.btn-delete-student').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = (btn).dataset.id;
        const student = this.students.find((s) => s.id === id);
        if (!student) return;

        if (confirm(`Are you sure you want to ${student.status === 'archived' ? 'permanently remove' : 'archive'} student '${student.name}'?`)) {
          try {
            const res = await apiRequest(`/admin/students/${id}`, { method: 'DELETE' });
            this.app.showToast(res.message || 'Operation successful', 'success');
            await this.loadStudents();
          } catch (err) {
            this.app.showToast(err.message, 'error');
          }
        }
      });
    });
  }

  showAddStudentModal() {
    this.app.showModal({
      title: 'Enroll New Student',
      content: `
        <form id="form-enroll-student" class="space-y-3 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1">Student Full Name *</label>
            <input type="text" id="add-stu-name" required placeholder="e.g. Tanvir Ahmed" class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Class Batch *</label>
            <select id="add-stu-batch" required class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600">
              ${this.batches.map((b) => `<option value="${b.id}">${b.name} (Fee: ৳${b.monthlyFee})</option>`).join('')}
            </select>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Roll Number</label>
              <input type="number" id="add-stu-roll" placeholder="Auto" class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Monthly Fee (BDT)</label>
              <input type="number" id="add-stu-fee" placeholder="Default from batch" class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Parent / Guardian Name *</label>
            <input type="text" id="add-stu-parent-name" required placeholder="e.g. Abdul Karim" class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Parent Mobile Phone (WhatsApp) *</label>
            <input type="tel" id="add-stu-parent-phone" required placeholder="01711223344" class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600 font-mono" />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Special Notes / Medical / Concession</label>
            <input type="text" id="add-stu-notes" placeholder="Optional notes" class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
        </form>
      `,
      actions: [
        {
          label: 'Cancel',
          className: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
          onClick: () => this.app.closeModal(),
        },
        {
          label: 'Confirm Enrollment',
          className: 'bg-blue-700 text-white hover:bg-blue-800 font-bold',
          onClick: async () => {
            const name = (document.getElementById('add-stu-name')).value;
            const classBatchId = (document.getElementById('add-stu-batch')).value;
            const rollNo = (document.getElementById('add-stu-roll')).value;
            const monthlyFee = (document.getElementById('add-stu-fee')).value;
            const parentName = (document.getElementById('add-stu-parent-name')).value;
            const parentPhone = (document.getElementById('add-stu-parent-phone')).value;
            const notes = (document.getElementById('add-stu-notes')).value;

            if (!name || !classBatchId || !parentPhone) {
              this.app.showToast('Please fill all required fields.', 'error');
              return;
            }

            try {
              await apiRequest('/admin/students', {
                method: 'POST',
                body: { name, classBatchId, rollNo, monthlyFee, parentName, parentPhone, notes },
              });
              this.app.showToast(`Student '${name}' enrolled successfully!`, 'success');
              this.app.closeModal();
              await this.loadStudents();
            } catch (err) {
              this.app.showToast(err.message, 'error');
            }
          },
        },
      ],
    });
  }

  showEditStudentModal(student) {
    this.app.showModal({
      title: `Edit Student: ${student.name}`,
      content: `
        <form id="form-edit-student" class="space-y-3 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1">Student Full Name</label>
            <input type="text" id="edit-stu-name" value="${student.name}" required class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Class Batch</label>
            <select id="edit-stu-batch" class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600">
              ${this.batches.map((b) => `<option value="${b.id}" ${b.id === student.classBatchId ? 'selected' : ''}>${b.name}</option>`).join('')}
            </select>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Roll Number</label>
              <input type="number" id="edit-stu-roll" value="${student.rollNo}" class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Monthly Fee (BDT)</label>
              <input type="number" id="edit-stu-fee" value="${student.monthlyFee}" class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Parent / Guardian Name</label>
            <input type="text" id="edit-stu-parent-name" value="${student.parentName}" required class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Parent Phone (WhatsApp)</label>
            <input type="tel" id="edit-stu-parent-phone" value="${student.parentPhone}" required class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600 font-mono" />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Enrollment Status</label>
            <select id="edit-stu-status" class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600">
              <option value="active" ${student.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="inactive" ${student.status === 'inactive' ? 'selected' : ''}>Inactive</option>
              <option value="archived" ${student.status === 'archived' ? 'selected' : ''}>Archived</option>
            </select>
          </div>
        </form>
      `,
      actions: [
        {
          label: 'Cancel',
          className: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
          onClick: () => this.app.closeModal(),
        },
        {
          label: 'Save Changes',
          className: 'bg-blue-700 text-white hover:bg-blue-800 font-bold',
          onClick: async () => {
            const name = (document.getElementById('edit-stu-name')).value;
            const classBatchId = (document.getElementById('edit-stu-batch')).value;
            const rollNo = (document.getElementById('edit-stu-roll')).value;
            const monthlyFee = (document.getElementById('edit-stu-fee')).value;
            const parentName = (document.getElementById('edit-stu-parent-name')).value;
            const parentPhone = (document.getElementById('edit-stu-parent-phone')).value;
            const status = (document.getElementById('edit-stu-status')).value;

            try {
              await apiRequest(`/admin/students/${student.id}`, {
                method: 'PATCH',
                body: { name, classBatchId, rollNo, monthlyFee, parentName, parentPhone, status },
              });
              this.app.showToast('Student profile updated.', 'success');
              this.app.closeModal();
              await this.loadStudents();
            } catch (err) {
              this.app.showToast(err.message, 'error');
            }
          },
        },
      ],
    });
  }

  // ==========================================
  // SECTION C: CLASSES & BATCHES
  // ==========================================
  async loadBatches() {
    const pane = document.getElementById('admin-pane-batches');
    if (!pane) return;

    try {
      const res = await apiRequest('/admin/batches');
      this.batches = res.batches || [];

      pane.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 class="text-sm sm:text-base font-bold text-slate-900">Academic Classes & Shifts (${this.batches.length})</h3>
            <p class="text-xs text-slate-500">Configure batches, curriculum subjects, shifts, and monthly tuition fee rates.</p>
          </div>
          <button id="btn-add-batch" class="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs flex items-center justify-center gap-1.5 touch-manipulation min-h-[42px]">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            <span>Create New Batch</span>
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${this.batches.map((b) => `
            <div class="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <h4 class="font-bold text-slate-900 text-sm sm:text-base">${b.name}</h4>
                  <div class="text-xs text-blue-700 font-medium">${b.shift} • Grade ${b.grade}</div>
                </div>
                <div class="text-right">
                  <span class="font-bold text-emerald-800 text-base tabular-nums">৳${b.monthlyFee}</span>
                  <div class="text-[10px] text-slate-400">/month</div>
                </div>
              </div>

              <div>
                <div class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Subjects Taught</div>
                <div class="flex flex-wrap gap-1.5">
                  ${(b.subjectNames || []).map((sub) => `<span class="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">${sub}</span>`).join('')}
                </div>
              </div>

              <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span class="text-slate-400 font-mono text-[11px]">Academic Year: ${b.academicYear}</span>
                <div class="space-x-1">
                  <button class="btn-edit-batch px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg" data-id="${b.id}">Edit</button>
                  <button class="btn-delete-batch px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg" data-id="${b.id}">Archive</button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      document.getElementById('btn-add-batch')?.addEventListener('click', () => this.showAddBatchModal());

      pane.querySelectorAll('.btn-edit-batch').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = (btn).dataset.id;
          const batch = this.batches.find((b) => b.id === id);
          if (batch) this.showEditBatchModal(batch);
        });
      });

      pane.querySelectorAll('.btn-delete-batch').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = (btn).dataset.id;
          const batch = this.batches.find((b) => b.id === id);
          if (!batch) return;
          if (confirm(`Archive batch '${batch.name}'?`)) {
            await apiRequest(`/admin/batches/${id}`, { method: 'DELETE' });
            this.app.showToast('Batch archived', 'success');
            await this.loadBatches();
          }
        });
      });
    } catch (err) {
      pane.innerHTML = `<div class="p-4 bg-red-50 text-red-700 text-xs rounded-xl">${err.message}</div>`;
    }
  }

  showAddBatchModal() {
    this.app.showModal({
      title: 'Create New Class Batch',
      content: `
        <form class="space-y-3 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1">Batch Name *</label>
            <input type="text" id="add-batch-name" placeholder="e.g. Class 10 - Science Morning" required class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Grade / Level</label>
              <input type="text" id="add-batch-grade" placeholder="e.g. 10 or HSC-1" class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Monthly Fee (BDT) *</label>
              <input type="number" id="add-batch-fee" placeholder="2500" required class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Shift & Timings</label>
            <input type="text" id="add-batch-shift" placeholder="Morning (07:30 AM - 09:30 AM)" class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Subjects (Comma Separated)</label>
            <input type="text" id="add-batch-subjects" placeholder="Physics, Chemistry, Higher Mathematics, Biology" class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
        </form>
      `,
      actions: [
        { label: 'Cancel', className: 'bg-slate-100 text-slate-700', onClick: () => this.app.closeModal() },
        {
          label: 'Create Batch',
          className: 'bg-blue-700 text-white font-bold',
          onClick: async () => {
            const name = (document.getElementById('add-batch-name')).value;
            const grade = (document.getElementById('add-batch-grade')).value;
            const monthlyFee = (document.getElementById('add-batch-fee')).value;
            const shift = (document.getElementById('add-batch-shift')).value;
            const subjectsStr = (document.getElementById('add-batch-subjects')).value;

            if (!name || !monthlyFee) {
              this.app.showToast('Please enter batch name and fee.', 'error');
              return;
            }

            const subjectNames = subjectsStr.split(',').map((s) => s.trim()).filter(Boolean);

            try {
              await apiRequest('/admin/batches', {
                method: 'POST',
                body: { name, grade, monthlyFee, shift, subjectNames },
              });
              this.app.showToast(`Batch '${name}' created.`, 'success');
              this.app.closeModal();
              await this.loadBatches();
            } catch (err) {
              this.app.showToast(err.message, 'error');
            }
          },
        },
      ],
    });
  }

  showEditBatchModal(batch) {
    this.app.showModal({
      title: `Edit Batch: ${batch.name}`,
      content: `
        <form class="space-y-3 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1">Batch Name</label>
            <input type="text" id="edit-batch-name" value="${batch.name}" required class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Grade</label>
              <input type="text" id="edit-batch-grade" value="${batch.grade}" class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Monthly Fee (BDT)</label>
              <input type="number" id="edit-batch-fee" value="${batch.monthlyFee}" required class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Shift</label>
            <input type="text" id="edit-batch-shift" value="${batch.shift}" class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Subjects (Comma separated)</label>
            <input type="text" id="edit-batch-subjects" value="${(batch.subjectNames || []).join(', ')}" class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
        </form>
      `,
      actions: [
        { label: 'Cancel', className: 'bg-slate-100 text-slate-700', onClick: () => this.app.closeModal() },
        {
          label: 'Save Batch',
          className: 'bg-blue-700 text-white font-bold',
          onClick: async () => {
            const name = (document.getElementById('edit-batch-name')).value;
            const grade = (document.getElementById('edit-batch-grade')).value;
            const monthlyFee = (document.getElementById('edit-batch-fee')).value;
            const shift = (document.getElementById('edit-batch-shift')).value;
            const subjectsStr = (document.getElementById('edit-batch-subjects')).value;

            const subjectNames = subjectsStr.split(',').map((s) => s.trim()).filter(Boolean);

            try {
              await apiRequest(`/admin/batches/${batch.id}`, {
                method: 'PATCH',
                body: { name, grade, monthlyFee, shift, subjectNames },
              });
              this.app.showToast('Batch updated.', 'success');
              this.app.closeModal();
              await this.loadBatches();
            } catch (err) {
              this.app.showToast(err.message, 'error');
            }
          },
        },
      ],
    });
  }

  // ==========================================
  // SECTION D: BKASH VERIFICATION QUEUE
  // ==========================================
  async loadBkashQueue() {
    const pane = document.getElementById('admin-pane-bkash-queue');
    if (!pane) return;

    try {
      const res = await apiRequest('/admin/bkash-queue');
      const submissions = res.submissions || [];

      pane.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 class="text-sm sm:text-base font-bold text-slate-900">bKash Payment Submissions Queue (${submissions.length})</h3>
            <p class="text-xs text-slate-500">Cross-reference TrxID against bKash merchant portal. Approvals auto-credit student fees and generate official receipts.</p>
          </div>
        </div>

        <div class="space-y-3">
          ${submissions.length === 0 ? `<div class="p-8 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">No bKash transactions in queue.</div>` : submissions.map((sub) => {
            let statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">Pending Verification</span>`;
            if (sub.status === 'verified') statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">Verified & Approved</span>`;
            if (sub.status === 'rejected') statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-800">Rejected</span>`;

            return `
              <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-mono font-bold text-sm text-pink-700 bg-pink-50 px-2 py-0.5 rounded border border-pink-200">TrxID: ${sub.transactionId}</span>
                      ${statusBadge}
                    </div>
                    <div class="font-bold text-slate-900 text-sm mt-1">${sub.studentName}</div>
                    <div class="text-xs text-slate-500">Sender Phone: <span class="font-mono text-slate-700">${sub.senderNumber}</span> • Submitted: ${sub.submissionDate}</div>
                  </div>

                  <div class="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                    <span class="font-bold text-slate-900 text-lg tabular-nums">৳${sub.claimedAmount.toLocaleString()}</span>
                    ${sub.status === 'pending_verification' ? `
                      <button class="btn-verify-bkash mt-1 px-3 py-1.5 text-xs font-bold text-white bg-pink-700 hover:bg-pink-800 rounded-lg shadow-xs touch-manipulation" data-id="${sub.id}">
                        Review & Verify
                      </button>
                    ` : `
                      <span class="text-[10px] text-slate-400 mt-1">${sub.verifiedBy ? `By ${sub.verifiedBy}` : ''}</span>
                    `}
                  </div>
                </div>

                ${sub.rejectionReason ? `<div class="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg font-medium">Rejection Reason: ${sub.rejectionReason}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      `;

      pane.querySelectorAll('.btn-verify-bkash').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = (btn).dataset.id;
          const sub = submissions.find((s) => s.id === id);
          if (sub) this.showVerifyBkashModal(sub);
        });
      });
    } catch (err) {
      pane.innerHTML = `<div class="p-4 bg-red-50 text-red-700 text-xs rounded-xl">${err.message}</div>`;
    }
  }

  showVerifyBkashModal(sub) {
    this.app.showModal({
      title: `Verify bKash TrxID: ${sub.transactionId}`,
      content: `
        <div class="space-y-3 text-xs">
          <div class="bg-pink-50 p-3 rounded-xl border border-pink-100 text-pink-900 space-y-1">
            <div class="font-bold text-sm">Amount Claimed: ৳${sub.claimedAmount.toLocaleString()}</div>
            <div>Student: <span class="font-semibold">${sub.studentName}</span></div>
            <div>Sender bKash: <span class="font-mono font-semibold">${sub.senderNumber}</span></div>
            <div>TrxID: <span class="font-mono font-bold">${sub.transactionId}</span></div>
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Rejection Reason (Only if rejecting)</label>
            <input type="text" id="bkash-reject-reason" placeholder="e.g. Transaction ID not found in bKash merchant statement" class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
        </div>
      `,
      actions: [
        {
          label: 'Reject Payment',
          className: 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 font-bold',
          onClick: async () => {
            const reason = (document.getElementById('bkash-reject-reason')).value;
            try {
              await apiRequest(`/admin/bkash-verify/${sub.id}`, {
                method: 'POST',
                body: { action: 'reject', rejectionReason: reason },
              });
              this.app.showToast('bKash submission rejected.', 'info');
              this.app.closeModal();
              await this.loadBkashQueue();
            } catch (err) {
              this.app.showToast(err.message, 'error');
            }
          },
        },
        {
          label: 'Approve & Credit Fee (৳' + sub.claimedAmount + ')',
          className: 'bg-emerald-700 text-white font-bold hover:bg-emerald-800',
          onClick: async () => {
            try {
              const res = await apiRequest(`/admin/bkash-verify/${sub.id}`, {
                method: 'POST',
                body: { action: 'approve' },
              });
              this.app.showToast(res.message || 'Payment verified and credited!', 'success');
              this.app.closeModal();
              await this.loadBkashQueue();
            } catch (err) {
              this.app.showToast(err.message, 'error');
            }
          },
        },
      ],
    });
  }

  // ==========================================
  // SECTION E: NOTICES & HOMEWORK
  // ==========================================
  async loadAnnouncements() {
    const pane = document.getElementById('admin-pane-announcements');
    if (!pane) return;

    try {
      const [annRes, hwRes] = await Promise.all([
        apiRequest('/admin/announcements'),
        apiRequest('/admin/homework'),
      ]);
      const announcements = annRes.announcements || [];
      const homework = hwRes.homework || [];

      pane.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 class="text-sm sm:text-base font-bold text-slate-900">Academy Notices & Daily Homework</h3>
            <p class="text-xs text-slate-500">Announcements appear on Parent Portal; homework is assigned per batch.</p>
          </div>
          <div class="flex items-center gap-2">
            <button id="btn-add-notice" class="px-3.5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs touch-manipulation min-h-[42px]">
              + Post Notice
            </button>
            <button id="btn-add-homework" class="px-3.5 py-2 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 rounded-xl shadow-xs touch-manipulation min-h-[42px]">
              + Assign Homework
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Announcements -->
          <div class="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <h4 class="font-bold text-slate-900 text-sm flex items-center justify-between">
              <span>Published Notices (${announcements.length})</span>
            </h4>
            <div class="divide-y divide-slate-100 space-y-3">
              ${announcements.length === 0 ? `<div class="py-4 text-center text-slate-400 text-xs">No notices posted.</div>` : announcements.map((a) => `
                <div class="pt-3 first:pt-0 space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-slate-900 text-xs">${a.title}</span>
                    <button class="btn-del-ann text-red-600 hover:text-red-800 text-[11px] font-semibold" data-id="${a.id}">Delete</button>
                  </div>
                  <p class="text-xs text-slate-600">${a.content}</p>
                  <div class="text-[10px] text-slate-400 font-mono">${a.date} • Audience: ${a.targetAudience}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Homework -->
          <div class="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <h4 class="font-bold text-slate-900 text-sm flex items-center justify-between">
              <span>Assigned Homework (${homework.length})</span>
            </h4>
            <div class="divide-y divide-slate-100 space-y-3">
              ${homework.length === 0 ? `<div class="py-4 text-center text-slate-400 text-xs">No homework assigned.</div>` : homework.map((h) => `
                <div class="pt-3 first:pt-0 space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-slate-900 text-xs">${h.title}</span>
                    <button class="btn-del-hw text-red-600 hover:text-red-800 text-[11px] font-semibold" data-id="${h.id}">Delete</button>
                  </div>
                  <div class="text-xs text-blue-700 font-medium">${h.classBatchName} • ${h.subject}</div>
                  <p class="text-xs text-slate-600">${h.description}</p>
                  <div class="text-[10px] text-slate-400 font-mono">Due: ${h.dueDate}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;

      document.getElementById('btn-add-notice')?.addEventListener('click', () => this.showAddAnnouncementModal());
      document.getElementById('btn-add-homework')?.addEventListener('click', () => this.showAddHomeworkModal());

      pane.querySelectorAll('.btn-del-ann').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = (btn).dataset.id;
          if (confirm('Delete announcement?')) {
            await apiRequest(`/admin/announcements/${id}`, { method: 'DELETE' });
            this.app.showToast('Announcement removed', 'info');
            await this.loadAnnouncements();
          }
        });
      });

      pane.querySelectorAll('.btn-del-hw').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = (btn).dataset.id;
          if (confirm('Delete homework?')) {
            await apiRequest(`/admin/homework/${id}`, { method: 'DELETE' });
            this.app.showToast('Homework removed', 'info');
            await this.loadAnnouncements();
          }
        });
      });
    } catch (err) {
      pane.innerHTML = `<div class="p-4 bg-red-50 text-red-700 text-xs rounded-xl">${err.message}</div>`;
    }
  }

  showAddAnnouncementModal() {
    this.app.showModal({
      title: 'Publish Academy Notice',
      content: `
        <form class="space-y-3 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1">Notice Title *</label>
            <input type="text" id="ann-title" placeholder="e.g. Special SSC Model Test Schedule" required class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Notice Details *</label>
            <textarea id="ann-content" rows="4" placeholder="Enter complete notice announcement..." required class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600"></textarea>
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Target Audience</label>
            <select id="ann-audience" class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600">
              <option value="all">All Students & Parents</option>
              <option value="parents">Parents Only</option>
              <option value="students">Students Only</option>
            </select>
          </div>
        </form>
      `,
      actions: [
        { label: 'Cancel', className: 'bg-slate-100 text-slate-700', onClick: () => this.app.closeModal() },
        {
          label: 'Publish Notice',
          className: 'bg-blue-700 text-white font-bold',
          onClick: async () => {
            const title = (document.getElementById('ann-title')).value;
            const content = (document.getElementById('ann-content')).value;
            const targetAudience = (document.getElementById('ann-audience')).value;

            if (!title || !content) {
              this.app.showToast('Title and content are required', 'error');
              return;
            }

            try {
              await apiRequest('/admin/announcements', {
                method: 'POST',
                body: { title, content, targetAudience },
              });
              this.app.showToast('Notice published successfully!', 'success');
              this.app.closeModal();
              await this.loadAnnouncements();
            } catch (err) {
              this.app.showToast(err.message, 'error');
            }
          },
        },
      ],
    });
  }

  showAddHomeworkModal() {
    this.app.showModal({
      title: 'Assign Daily Homework',
      content: `
        <form class="space-y-3 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1">Homework Title *</label>
            <input type="text" id="hw-title" placeholder="e.g. Physics Chapter 4 Numerical Problems" required class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Assign to Class Batch *</label>
            <select id="hw-batch" class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600">
              ${this.batches.map((b) => `<option value="${b.id}">${b.name}</option>`).join('')}
            </select>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Subject</label>
              <input type="text" id="hw-subject" placeholder="e.g. Physics" class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Due Date</label>
              <input type="date" id="hw-due-date" value="${new Date().toISOString().slice(0, 10)}" class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600 font-mono" />
            </div>
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Homework Description / Questions</label>
            <textarea id="hw-desc" rows="3" placeholder="Complete questions 1 to 15 from NCTB textbook page 84..." class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600"></textarea>
          </div>
        </form>
      `,
      actions: [
        { label: 'Cancel', className: 'bg-slate-100 text-slate-700', onClick: () => this.app.closeModal() },
        {
          label: 'Assign Homework',
          className: 'bg-indigo-700 text-white font-bold',
          onClick: async () => {
            const title = (document.getElementById('hw-title')).value;
            const classBatchId = (document.getElementById('hw-batch')).value;
            const subject = (document.getElementById('hw-subject')).value;
            const dueDate = (document.getElementById('hw-due-date')).value;
            const description = (document.getElementById('hw-desc')).value;

            if (!title || !classBatchId) {
              this.app.showToast('Please enter title and batch', 'error');
              return;
            }

            try {
              await apiRequest('/admin/homework', {
                method: 'POST',
                body: { title, classBatchId, subject, dueDate, description },
              });
              this.app.showToast('Homework assigned.', 'success');
              this.app.closeModal();
              await this.loadAnnouncements();
            } catch (err) {
              this.app.showToast(err.message, 'error');
            }
          },
        },
      ],
    });
  }

  // ==========================================
  // SECTION F: WHATSAPP TEMPLATES
  // ==========================================
  async loadTemplates() {
    const pane = document.getElementById('admin-pane-templates');
    if (!pane) return;

    try {
      const res = await apiRequest('/admin/templates');
      const templates = res.templates || [];

      pane.innerHTML = `
        <div>
          <h3 class="text-sm sm:text-base font-bold text-slate-900">WhatsApp Notification Templates</h3>
          <p class="text-xs text-slate-500">Edit the standardized messages sent to parents. Use dynamic merge tags like <code class="bg-slate-100 px-1 py-0.5 rounded text-blue-700">{{student_name}}</code>, <code class="bg-slate-100 px-1 py-0.5 rounded text-blue-700">{{outstanding_amount}}</code>.</p>
        </div>

        <div class="space-y-4">
          ${templates.map((t) => `
            <div class="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
              <div class="flex items-center justify-between">
                <span class="font-bold text-slate-900 text-sm">${t.name}</span>
                <span class="font-mono text-[10px] text-slate-400 uppercase">${t.type}</span>
              </div>
              <textarea id="tmpl-text-${t.id}" rows="3" class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono outline-none focus:ring-2 focus:ring-blue-600">${t.templateText}</textarea>
              <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div class="text-[11px] text-slate-500">
                  Tags: ${(t.availableVariables || []).map((v) => `<span class="bg-blue-50 text-blue-700 px-1 py-0.5 rounded font-mono text-[10px] mr-1">${v}</span>`).join('')}
                </div>
                <button class="btn-save-tmpl px-3.5 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs touch-manipulation" data-id="${t.id}">
                  Save Template
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      pane.querySelectorAll('.btn-save-tmpl').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = (btn).dataset.id;
          const textarea = document.getElementById(`tmpl-text-${id}`);
          if (!textarea) return;

          try {
            await apiRequest(`/admin/templates/${id}`, {
              method: 'PUT',
              body: { templateText: textarea.value },
            });
            this.app.showToast('Template saved successfully', 'success');
          } catch (err) {
            this.app.showToast(err.message, 'error');
          }
        });
      });
    } catch (err) {
      pane.innerHTML = `<div class="p-4 bg-red-50 text-red-700 text-xs rounded-xl">${err.message}</div>`;
    }
  }

  // ==========================================
  // SECTION G: WEBSITE SETTINGS & BRANDING
  // ==========================================
  async loadSettings() {
    const pane = document.getElementById('admin-pane-settings');
    if (!pane) return;

    try {
      const res = await apiRequest('/admin/settings');
      const s = res.settings;

      pane.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 class="text-sm sm:text-base font-bold text-slate-900">Website Branding & Operational Settings</h3>
            <p class="text-xs text-slate-500">Changes persist in database.json and update the live website immediately upon saving.</p>
          </div>
          <button id="btn-save-all-settings" class="px-5 py-2.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-md touch-manipulation min-h-[42px] flex items-center justify-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            <span>Save All Settings</span>
          </button>
        </div>

        <form id="settings-form" class="space-y-6">
          <!-- 1. Institution Identity & Title -->
          <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h4 class="font-bold text-slate-900 text-xs uppercase tracking-wider text-blue-700">1. Website Identity & Branding</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Tuition / Academy Name *</label>
                <input type="text" id="set-tuition-name" value="${s.tuitionName || ''}" required class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600 font-semibold" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Tagline / Mission</label>
                <input type="text" id="set-tagline" value="${s.tagline || ''}" class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Owner / Director Name</label>
                <input type="text" id="set-owner-name" value="${s.ownerName || ''}" class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Primary Theme Color</label>
                <div class="flex items-center gap-2">
                  <input type="color" id="set-theme-color" value="${s.themeColor || '#1e40af'}" class="w-10 h-10 rounded border border-slate-300 cursor-pointer p-0.5" />
                  <input type="text" id="set-theme-color-text" value="${s.themeColor || '#1e40af'}" class="w-32 text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono" />
                </div>
              </div>
            </div>

            <!-- Logo Upload -->
            <div class="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Website Logo</label>
                <input type="file" id="upload-logo-input" accept="image/*" class="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                <p class="text-[10px] text-slate-400 mt-0.5">Recommended: PNG or SVG with transparent background (Max 5MB)</p>
              </div>
              <div id="logo-preview-box" class="flex items-center gap-3">
                ${s.logoUrl ? `<img src="${s.logoUrl}" alt="Current Logo" class="w-10 h-10 object-contain rounded border border-slate-200 bg-white p-1" />` : `<span class="text-xs text-slate-400">No custom logo</span>`}
              </div>
            </div>
          </div>

          <!-- 2. Contact Information & Social Links -->
          <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h4 class="font-bold text-slate-900 text-xs uppercase tracking-wider text-blue-700">2. Contact Information & Social</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Official Mobile Phone / Helpline</label>
                <input type="text" id="set-phone" value="${s.phone || ''}" class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600 font-mono" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Official Email Address</label>
                <input type="email" id="set-email" value="${s.email || ''}" class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-slate-700 mb-1">Campus Physical Address</label>
                <input type="text" id="set-address" value="${s.address || ''}" class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Facebook Page URL</label>
                <input type="url" id="set-facebook" value="${s.socialFacebook || ''}" placeholder="https://facebook.com/..." class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Footer Copyright Text</label>
                <input type="text" id="set-footer" value="${s.footerText || ''}" class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
            </div>
          </div>

          <!-- 3. bKash Payment Gateway Settings -->
          <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h4 class="font-bold text-slate-900 text-xs uppercase tracking-wider text-pink-700">3. bKash Online & Manual Payment Gateway</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Tuition bKash Account Number *</label>
                <input type="text" id="set-bkash-num" value="${s.bkashNumber || ''}" required class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono font-bold outline-none focus:ring-2 focus:ring-pink-600" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Account Type</label>
                <select id="set-bkash-type" class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-pink-600">
                  <option value="Merchant" ${s.bkashAccountType === 'Merchant' ? 'selected' : ''}>Merchant (Payment)</option>
                  <option value="Personal" ${s.bkashAccountType === 'Personal' ? 'selected' : ''}>Personal (Send Money)</option>
                </select>
              </div>
              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-slate-700 mb-1">bKash Payment Step-by-Step Instructions</label>
                <textarea id="set-bkash-instructions" rows="4" class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-pink-600">${s.bkashInstructions || ''}</textarea>
              </div>
            </div>

            <!-- bKash QR Code Upload -->
            <div class="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">bKash QR Code Image</label>
                <input type="file" id="upload-qr-input" accept="image/*" class="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100" />
                <p class="text-[10px] text-slate-400 mt-0.5">Upload official bKash Merchant / Personal QR image (Max 5MB)</p>
              </div>
              <div id="qr-preview-box" class="flex items-center gap-3">
                ${s.bkashQrUrl ? `<img src="${s.bkashQrUrl}" alt="Current QR" class="w-14 h-14 object-contain rounded-lg border border-slate-200 bg-white p-1" />` : `<span class="text-xs text-slate-400">No QR uploaded</span>`}
              </div>
            </div>
          </div>
        </form>
      `;

      // Color picker sync
      const colorPicker = document.getElementById('set-theme-color');
      const colorText = document.getElementById('set-theme-color-text');
      if (colorPicker && colorText) {
        colorPicker.oninput = () => { colorText.value = colorPicker.value; };
        colorText.oninput = () => { colorPicker.value = colorText.value; };
      }

      // Logo upload handler
      document.getElementById('upload-logo-input')?.addEventListener('change', async (e) => {
        const file = (e.target).files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
          const res = await apiRequest('/admin/upload-image', {
            method: 'POST',
            body: formData,
          });
          s.logoUrl = res.url;
          const box = document.getElementById('logo-preview-box');
          if (box) box.innerHTML = `<img src="${res.url}" class="w-10 h-10 object-contain rounded border border-slate-200 bg-white p-1" />`;
          this.app.showToast('Logo image uploaded successfully. Click "Save All Settings" to apply.', 'success');
        } catch (err) {
          this.app.showToast(err.message, 'error');
        }
      });

      // QR Code upload handler
      document.getElementById('upload-qr-input')?.addEventListener('change', async (e) => {
        const file = (e.target).files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
          const res = await apiRequest('/admin/upload-image', {
            method: 'POST',
            body: formData,
          });
          s.bkashQrUrl = res.url;
          const box = document.getElementById('qr-preview-box');
          if (box) box.innerHTML = `<img src="${res.url}" class="w-14 h-14 object-contain rounded-lg border border-slate-200 bg-white p-1" />`;
          this.app.showToast('bKash QR code uploaded successfully. Click "Save All Settings" to apply.', 'success');
        } catch (err) {
          this.app.showToast(err.message, 'error');
        }
      });

      // Save All Settings
      document.getElementById('btn-save-all-settings')?.addEventListener('click', async () => {
        const tuitionName = (document.getElementById('set-tuition-name')).value;
        const tagline = (document.getElementById('set-tagline')).value;
        const ownerName = (document.getElementById('set-owner-name')).value;
        const themeColor = (document.getElementById('set-theme-color-text')).value;
        const phone = (document.getElementById('set-phone')).value;
        const email = (document.getElementById('set-email')).value;
        const address = (document.getElementById('set-address')).value;
        const socialFacebook = (document.getElementById('set-facebook')).value;
        const footerText = (document.getElementById('set-footer')).value;
        const bkashNumber = (document.getElementById('set-bkash-num')).value;
        const bkashAccountType = (document.getElementById('set-bkash-type')).value;
        const bkashInstructions = (document.getElementById('set-bkash-instructions')).value;

        try {
          const res = await apiRequest('/admin/settings', {
            method: 'PATCH',
            body: {
              tuitionName,
              tagline,
              ownerName,
              themeColor,
              phone,
              email,
              address,
              socialFacebook,
              footerText,
              bkashNumber,
              bkashAccountType,
              bkashInstructions,
              logoUrl: s.logoUrl,
              bkashQrUrl: s.bkashQrUrl,
            },
          });

          this.app.settings = res.settings;
          this.app.applyBranding();
          this.app.showToast('All website settings and branding saved successfully!', 'success');
        } catch (err) {
          this.app.showToast(err.message, 'error');
        }
      });
    } catch (err) {
      pane.innerHTML = `<div class="p-4 bg-red-50 text-red-700 text-xs rounded-xl">${err.message}</div>`;
    }
  }

  // ==========================================
  // SECTION H: SECURITY & PASSWORD
  // ==========================================
  async loadSecurity() {
    const pane = document.getElementById('admin-pane-security');
    if (!pane) return;

    pane.innerHTML = `
      <div class="max-w-xl mx-auto space-y-6">
        <div>
          <h3 class="text-sm sm:text-base font-bold text-slate-900">Administrator Credentials & Access Control</h3>
          <p class="text-xs text-slate-500">Manage administrator account security, update your password, and inspect active session tokens.</p>
        </div>

        <!-- Account Info Card -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-blue-700 text-white font-bold flex items-center justify-center text-sm">
              AD
            </div>
            <div>
              <div class="font-bold text-slate-900 text-sm">${this.app.currentAdmin?.name || 'Administrator'}</div>
              <div class="text-xs text-slate-500 font-mono">${this.app.currentAdmin?.email || 'shakawatthasan@gmail.com'}</div>
            </div>
          </div>
          <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-800 text-xs flex items-center justify-between">
            <span class="font-semibold">Security State: PBKDF2 Password Hashing Protected</span>
            <span class="text-[10px] font-mono font-bold bg-emerald-200 px-1.5 py-0.5 rounded">ACTIVE</span>
          </div>
        </div>

        <!-- Change Password Form -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h4 class="font-bold text-slate-900 text-xs uppercase tracking-wider text-blue-700">Change Admin Password</h4>
          <form id="form-change-password" class="space-y-3 text-xs">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Current Password *</label>
              <input type="password" id="cp-current" required placeholder="••••••••••••" class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">New Password (Min 6 chars) *</label>
              <input type="password" id="cp-new" required placeholder="••••••••••••" class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Confirm New Password *</label>
              <input type="password" id="cp-confirm" required placeholder="••••••••••••" class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
            <button type="submit" id="btn-submit-cp" class="w-full py-2.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs touch-manipulation min-h-[42px]">
              Update Administrator Password
            </button>
          </form>
        </div>

        <!-- Danger Zone: Reset Database Demo Data -->
        <div class="bg-red-50/50 p-5 rounded-2xl border border-red-200 space-y-3">
          <h4 class="font-bold text-red-900 text-xs uppercase tracking-wider">Database Maintenance</h4>
          <p class="text-xs text-red-700">Reset the database to clean verified initial dataset. This clears all modifications made during testing and restores the initial seed.</p>
          <button id="btn-reset-db-confirmed" class="px-4 py-2 text-xs font-bold text-red-700 bg-white border border-red-300 hover:bg-red-50 rounded-xl touch-manipulation min-h-[40px]">
            Reset to Initial Demo Dataset
          </button>
        </div>
      </div>
    `;

    // Handle Change Password
    document.getElementById('form-change-password')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = (document.getElementById('cp-current')).value;
      const newPassword = (document.getElementById('cp-new')).value;
      const confirmPassword = (document.getElementById('cp-confirm')).value;

      if (newPassword !== confirmPassword) {
        this.app.showToast('New passwords do not match', 'error');
        return;
      }

      if (newPassword.length < 6) {
        this.app.showToast('New password must be at least 6 characters long', 'error');
        return;
      }

      try {
        const res = await apiRequest('/auth/change-password', {
          method: 'POST',
          body: { currentPassword, newPassword },
        });
        this.app.showToast(res.message || 'Password updated successfully!', 'success');
        (document.getElementById('form-change-password')).reset();
      } catch (err) {
        this.app.showToast(err.message, 'error');
      }
    });

    // Handle Reset DB
    document.getElementById('btn-reset-db-confirmed')?.addEventListener('click', async () => {
      if (confirm('CRITICAL CONFIRMATION: Are you sure you want to reset the database? This action cannot be undone.')) {
        try {
          await apiRequest('/admin/reset-database', { method: 'POST' });
          this.app.showToast('Database reset to verified initial state.', 'success');
          location.reload();
        } catch (err) {
          this.app.showToast(err.message, 'error');
        }
      }
    });
  }

  // ==========================================
  // SECTION I: AUDIT LOGS TRAIL
  // ==========================================
  async loadAuditLogs() {
    const pane = document.getElementById('admin-pane-audit');
    if (!pane) return;

    try {
      const res = await apiRequest('/admin/audit-logs');
      const logs = res.auditLogs || [];

      pane.innerHTML = `
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm sm:text-base font-bold text-slate-900">Audit Trail & Security Logs (${logs.length})</h3>
            <p class="text-xs text-slate-500">Immutable record of administrative actions, fee modifications, enrollments, and logins.</p>
          </div>
        </div>

        <div class="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th class="p-3 w-40">Timestamp</th>
                <th class="p-3">Admin User</th>
                <th class="p-3">Action Type</th>
                <th class="p-3">Entity</th>
                <th class="p-3">Action Description</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-700">
              ${logs.length === 0 ? `<tr><td colspan="5" class="py-8 text-center text-slate-400">No logs found.</td></tr>` : logs.map((l) => `
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <td class="p-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">${new Date(l.timestamp).toLocaleString()}</td>
                  <td class="p-3 font-semibold text-slate-900">${l.userName}</td>
                  <td class="p-3">
                    <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">${l.action}</span>
                  </td>
                  <td class="p-3 font-mono text-[11px] text-slate-500">${l.entityType}</td>
                  <td class="p-3 text-slate-800 break-anywhere">${l.details}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      pane.innerHTML = `<div class="p-4 bg-red-50 text-red-700 text-xs rounded-xl">${err.message}</div>`;
    }
  }

  // Automated QA Suite
  async runQaSuite() {
    this.app.showToast('Running comprehensive QA Suite...', 'info');
    try {
      const res = await apiRequest('/qa/run', { method: 'POST' });
      this.app.showModal({
        title: `Automated QA Test Results (${res.passed}/${res.total} Passed)`,
        content: `
          <div class="space-y-2 text-xs">
            <div class="p-3 rounded-lg ${res.allPassed ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'} font-bold">
              ${res.allPassed ? 'All 23 Automated Quality Tests Passed!' : `${res.total - res.passed} tests failed.`}
            </div>
            <div class="max-h-60 overflow-y-auto divide-y divide-slate-100">
              ${(res.results || []).map((r) => `
                <div class="py-1.5 flex items-center justify-between">
                  <span class="text-slate-800">${r.name}</span>
                  <span class="font-bold ${r.passed ? 'text-emerald-600' : 'text-red-600'}">${r.passed ? 'PASS' : 'FAIL'}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `,
        actions: [{ label: 'Close', className: 'bg-slate-200 text-slate-800', onClick: () => this.app.closeModal() }],
      });
    } catch (err) {
      this.app.showToast(err.message, 'error');
    }
  }
}
