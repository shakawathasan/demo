import { apiRequest } from './api.js';
import { BulkWhatsAppWizard, buildWhatsAppUrl } from './whatsapp.js';

export class AttendanceViewController {
  constructor(app) {
    this.app = app;
    this.currentBatch = 'batch-1';
    this.currentDate = '2026-10-26';
    this.roster = [];
    this.isRecorded = false;
  }

  async init() {
    this.renderContainer();
    this.bindEvents();
    await this.loadBatches();
    await this.loadRoster();
  }

  renderContainer() {
    const container = document.getElementById('view-attendance');
    if (!container) return;

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Top Title & Toolbar -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Attendance Register</h1>
            <p class="text-xs sm:text-sm text-slate-500 mt-0.5">Fast attendance marking, consecutive absence warnings, and WhatsApp parent alerts.</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button id="btn-mark-all-present" class="px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg flex items-center gap-1.5 shadow-sm">
              <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              Mark All Present
            </button>
            <button id="btn-send-absence-alerts" class="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 shadow-sm">
              <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.941-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.299.144.347.491 1.199.534 1.286.043.087.072.188.014.303-.058.116-.087.188-.173.289l-.26.303c-.087.087-.179.182-.077.357.101.174.449.741.964 1.201.662.591 1.221.774 1.394.861.173.086.275.072.376-.044.101-.116.433-.506.549-.679.116-.173.231-.144.39-.087s1.011.477 1.184.564.289.13.332.202c.043.073.043.419-.101.824z"/></svg>
              Send Absence Alerts
            </button>
            <button id="btn-save-attendance" class="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg flex items-center gap-1.5 shadow-sm">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
              Save Attendance
            </button>
          </div>
        </div>

        <!-- Class & Date Selection Toolbar -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-500 mb-1">Select Batch *</label>
              <select id="att-select-batch" class="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 font-medium">
                <!-- Batches injected -->
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-500 mb-1">Attendance Date *</label>
              <input type="date" id="att-select-date" value="${this.currentDate}" class="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 font-mono">
            </div>
            <div id="att-summary-strip" class="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <!-- Summary pills -->
            </div>
          </div>
        </div>

        <!-- Attendance Roster Container (Dual Responsive Mode) -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <!-- Mobile Cards Container (< 768px) -->
          <div id="att-mobile-cards" class="block md:hidden p-3 space-y-3 bg-slate-50"></div>

          <!-- Desktop Table (>= 768px) -->
          <div class="hidden md:block overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th class="py-3 px-4 w-16">Roll</th>
                  <th class="py-3 px-4">Student Name & ID</th>
                  <th class="py-3 px-4">Parent / Contact</th>
                  <th class="py-3 px-4 text-center">Consecutive Absences</th>
                  <th class="py-3 px-4 text-center">Monthly Rate</th>
                  <th class="py-3 px-4 text-center w-64">Attendance Status</th>
                  <th class="py-3 px-4 text-center">Absence WhatsApp</th>
                </tr>
              </thead>
              <tbody id="att-table-body" class="divide-y divide-slate-100 text-slate-700">
                <tr><td colspan="7" class="py-8 text-center text-slate-400">Loading student roster...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    document.getElementById('att-select-batch')?.addEventListener('change', (e) => {
      this.currentBatch = e.target.value;
      this.loadRoster();
    });

    document.getElementById('att-select-date')?.addEventListener('change', (e) => {
      this.currentDate = e.target.value;
      this.loadRoster();
    });

    document.getElementById('btn-mark-all-present')?.addEventListener('click', () => {
      this.markAllPresent();
    });

    document.getElementById('btn-save-attendance')?.addEventListener('click', () => {
      this.saveAttendance();
    });

    document.getElementById('btn-send-absence-alerts')?.addEventListener('click', () => {
      this.handleSendAbsenceAlerts();
    });
  }

  async loadBatches() {
    try {
      const res = await apiRequest('/admin/batches');
      const select = document.getElementById('att-select-batch');
      if (select && res.batches) {
        select.innerHTML = res.batches.map((b) => `<option value="${b.id}">${b.name}</option>`).join('');
        if (res.batches.length > 0 && !res.batches.some((b) => b.id === this.currentBatch)) {
          this.currentBatch = res.batches[0].id;
        }
      }
    } catch (e) {
      console.error('Failed to load batches:', e);
    }
  }

  async loadRoster() {
    try {
      const res = await apiRequest(`/attendance/sheet?classBatchId=${this.currentBatch}&date=${this.currentDate}`);
      this.roster = res.roster || [];
      this.isRecorded = res.isRecorded;

      // Update summary strip
      const strip = document.getElementById('att-summary-strip');
      if (strip) {
        strip.innerHTML = `
          <div>Total: <span class="font-bold text-slate-900">${res.summary.total}</span></div>
          <div>Present: <span class="font-bold text-emerald-600">${res.summary.presentCount}</span></div>
          <div>Absent: <span class="font-bold text-red-600">${res.summary.absentCount}</span></div>
          <div>Leave: <span class="font-bold text-amber-600">${res.summary.leaveCount}</span></div>
          <div>Rate: <span class="font-bold text-blue-600">${res.summary.attendancePercentage}%</span></div>
        `;
      }

      const tbody = document.getElementById('att-table-body');
      const mobileCards = document.getElementById('att-mobile-cards');
      if (!tbody) return;

      if (this.roster.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400">No active students enrolled in this batch.</td></tr>`;
        if (mobileCards) mobileCards.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">No active students enrolled in this batch.</div>`;
        return;
      }

      // 1. Desktop Table View
      tbody.innerHTML = this.roster.map((s) => {
        const status = s.currentStatus || 'P'; // Default to present if unmarked
        const isAbsent = status === 'A';

        return `
          <tr class="hover:bg-slate-50/80 transition-colors ${isAbsent ? 'bg-red-50/20' : ''}">
            <td class="py-3 px-4 font-mono font-bold text-slate-600">${s.rollNo}</td>
            <td class="py-3 px-4">
              <div class="font-semibold text-slate-900">${s.studentName}</div>
              <div class="text-[11px] text-slate-400 font-mono">${s.studentCode}</div>
            </td>
            <td class="py-3 px-4">
              <div class="text-slate-800">${s.parentName}</div>
              <div class="text-[11px] text-slate-500 font-mono">${s.parentPhone}</div>
            </td>
            <td class="py-3 px-4 text-center">
              ${s.consecutiveAbsences >= 2 ? `
                <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800">
                  ⚠️ ${s.consecutiveAbsences} Days In A Row
                </span>
              ` : `
                <span class="text-slate-400">${s.consecutiveAbsences} days</span>
              `}
            </td>
            <td class="py-3 px-4 text-center tabular-nums">
              <span class="font-semibold ${s.isLowAttendance ? 'text-red-600 font-bold' : 'text-slate-700'}">${s.attendanceRate}%</span>
              ${s.isLowAttendance ? `<div class="text-[10px] text-red-500 font-medium">Low Attendance</div>` : ''}
            </td>
            <td class="py-3 px-4 text-center">
              <div class="inline-flex rounded-lg p-1 bg-slate-100 border border-slate-200" data-student-id="${s.studentId}">
                <button type="button" class="btn-status px-3 py-1 text-xs font-semibold rounded ${status === 'P' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}" data-status="P">
                  P
                </button>
                <button type="button" class="btn-status px-3 py-1 text-xs font-semibold rounded ${status === 'A' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}" data-status="A">
                  A
                </button>
                <button type="button" class="btn-status px-3 py-1 text-xs font-semibold rounded ${status === 'L' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}" data-status="L">
                  L
                </button>
              </div>
            </td>
            <td class="py-3 px-4 text-center">
              ${isAbsent ? `
                <button data-action="wa-absence" data-student-id="${s.studentId}" class="px-2.5 py-1 text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded flex items-center justify-center gap-1 mx-auto transition-colors">
                  <svg class="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.941-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.299.144.347.491 1.199.534 1.286.043.087.072.188.014.303-.058.116-.087.188-.173.289l-.26.303c-.087.087-.179.182-.077.357.101.174.449.741.964 1.201.662.591 1.221.774 1.394.861.173.086.275.072.376-.044.101-.116.433-.506.549-.679.116-.173.231-.144.39-.087s1.011.477 1.184.564.289.13.332.202c.043.073.043.419-.101.824z"/></svg>
                  Alert Parent
                </button>
              ` : `
                <span class="text-[11px] text-slate-400">—</span>
              `}
            </td>
          </tr>
        `;
      }).join('');

      // 2. Mobile Cards (< 768px)
      if (mobileCards) {
        mobileCards.innerHTML = this.roster.map((s) => {
          const status = s.currentStatus || 'P';
          const isAbsent = status === 'A';

          return `
            <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3 ${isAbsent ? 'border-red-200 bg-red-50/10' : ''}">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <span class="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">Roll #${s.rollNo}</span>
                  <h4 class="font-bold text-slate-900 text-sm mt-0.5">${s.studentName}</h4>
                  <div class="text-[11px] text-slate-500">${s.parentName} (${s.parentPhone})</div>
                </div>
                <div class="text-right">
                  <span class="text-xs font-bold ${s.isLowAttendance ? 'text-red-600' : 'text-slate-700'}">${s.attendanceRate}%</span>
                  <div class="text-[10px] text-slate-400">Monthly Rate</div>
                </div>
              </div>

              ${s.consecutiveAbsences >= 2 ? `
                <div class="text-[11px] font-bold text-red-700 bg-red-50 p-2 rounded-lg border border-red-200">
                  ⚠️ ${s.consecutiveAbsences} Days In A Row Absent
                </div>
              ` : ''}

              <!-- Status Toggle Buttons -->
              <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                <div class="grid grid-cols-3 gap-1.5 flex-1" data-student-id="${s.studentId}">
                  <button type="button" class="btn-status py-2 text-xs font-bold rounded-lg touch-manipulation min-h-[40px] ${status === 'P' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700'}" data-status="P">
                    Present
                  </button>
                  <button type="button" class="btn-status py-2 text-xs font-bold rounded-lg touch-manipulation min-h-[40px] ${status === 'A' ? 'bg-red-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700'}" data-status="A">
                    Absent
                  </button>
                  <button type="button" class="btn-status py-2 text-xs font-bold rounded-lg touch-manipulation min-h-[40px] ${status === 'L' ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-100 text-slate-700'}" data-status="L">
                    Leave
                  </button>
                </div>
                ${isAbsent ? `
                  <button data-action="wa-absence" data-student-id="${s.studentId}" class="px-3 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg min-h-[40px] touch-manipulation shrink-0 flex items-center gap-1">
                    WhatsApp
                  </button>
                ` : ''}
              </div>
            </div>
          `;
        }).join('');
      }

      // Bind status buttons across both table and mobile cards
      document.querySelectorAll('#att-table-body .btn-status, #att-mobile-cards .btn-status').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const group = btn.closest('[data-student-id]') ;
          if (!group) return;
          const studentId = group.dataset.studentId;
          const status = btn.dataset.status;

          // Update local state
          const student = this.roster.find((s) => s.studentId === studentId);
          if (student && status) {
            student.currentStatus = status;
          }

          // Visual button toggle across all matching elements (syncing desktop and mobile)
          document.querySelectorAll(`[data-student-id="${studentId}"]`).forEach((grp) => {
            grp.querySelectorAll('.btn-status').forEach((b) => {
              b.className = 'btn-status py-2 px-3 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:text-slate-900';
            });
            const activeBtn = grp.querySelector(`[data-status="${status}"]`) ;
            if (activeBtn) {
              if (status === 'P') activeBtn.className = 'btn-status py-2 px-3 text-xs font-bold rounded-lg bg-emerald-600 text-white shadow-xs';
              if (status === 'A') activeBtn.className = 'btn-status py-2 px-3 text-xs font-bold rounded-lg bg-red-600 text-white shadow-xs';
              if (status === 'L') activeBtn.className = 'btn-status py-2 px-3 text-xs font-bold rounded-lg bg-amber-500 text-white shadow-xs';
            }
          });
        });
      });

      // Bind individual absence alert button across both
      document.querySelectorAll('#att-table-body button[data-action="wa-absence"], #att-mobile-cards button[data-action="wa-absence"]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const studentId = btn.dataset.studentId;
          if (studentId) this.handleSingleAbsenceAlert(studentId);
        });
      });
    } catch (e) {
      console.error('Failed to load roster:', e);
    }
  }

  markAllPresent() {
    this.roster.forEach((s) => {
      s.currentStatus = 'P';
    });
    document.querySelectorAll('[data-student-id]').forEach((group) => {
      group.querySelectorAll('.btn-status').forEach((b) => {
        b.className = 'btn-status px-3 py-1 text-xs font-semibold rounded text-slate-600 hover:text-slate-900';
      });
      const pBtn = group.querySelector('[data-status="P"]');
      if (pBtn) pBtn.className = 'btn-status px-3 py-1 text-xs font-semibold rounded bg-emerald-600 text-white shadow-sm';
    });
    this.app.showToast('Marked all students as Present. Tap Save Attendance to persist.', 'info');
  }

  async saveAttendance() {
    try {
      const records = this.roster.map((s) => ({
        studentId: s.studentId,
        status: s.currentStatus || 'P',
        notes: s.notes || '',
      }));

      const res = await apiRequest('/attendance/save', {
        method: 'POST',
        body: {
          classBatchId: this.currentBatch,
          date: this.currentDate,
          records,
          recordedBy: this.app.currentUser?.name || 'Teacher',
        },
      });

      this.app.showToast(`Saved attendance for ${res.count} students!`, 'success');
      this.loadRoster();
    } catch (err) {
      this.app.showToast(err.message, 'error');
    }
  }

  async handleSingleAbsenceAlert(studentId) {
    try {
      // Must save attendance before generating alert
      await this.saveAttendance();

      const res = await apiRequest('/attendance/whatsapp-absence-alert', {
        method: 'POST',
        body: {
          studentId,
          classBatchId: this.currentBatch,
          date: this.currentDate,
        },
      });

      this.app.showModal({
        title: 'Send Absence Alert via WhatsApp',
        content: `
          <div class="space-y-3">
            <div class="p-3 bg-red-50 border border-red-100 rounded text-xs space-y-1">
              <div><strong class="text-slate-700">Recipient Parent:</strong> ${res.parentName}</div>
              <div><strong class="text-slate-700">Student:</strong> ${res.studentName}</div>
              <div><strong class="text-slate-700">Date:</strong> ${res.date}</div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Alert Message:</label>
              <textarea id="single-att-msg" rows="4" class="w-full text-xs font-sans p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-800">${res.message}</textarea>
            </div>
          </div>
        `,
        actions: [
          { label: 'Cancel', className: 'text-slate-600', onClick: () => this.app.closeModal() },
          {
            label: 'Open WhatsApp Chat',
            className: 'bg-emerald-600 text-white hover:bg-emerald-700 font-semibold',
            onClick: () => {
              const text = document.getElementById('single-att-msg').value;
              const directUrl = buildWhatsAppUrl(res.normalizedPhone, text);
              if (directUrl) {
                window.open(directUrl, '_blank');
                this.app.showToast('WhatsApp opened for absence notification.', 'success');
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

  async handleSendAbsenceAlerts() {
    try {
      // Save attendance first
      await this.saveAttendance();

      const res = await apiRequest(`/attendance/bulk-absence-alerts?classBatchId=${this.currentBatch}&date=${this.currentDate}`);
      if (res.count === 0) {
        this.app.showToast('No absent students on this date. Excellent attendance!', 'info');
        return;
      }

      const wizard = new BulkWhatsAppWizard({
        title: `Absence Alerts (${res.validCount} Absent Students)`,
        recipients: res.alerts.filter((a) => a.isValidPhone),
        onComplete: (sent, total) => {
          this.app.showToast(`Completed absence alerts runner: ${sent} of ${total} chats opened.`, 'success');
        },
      });

      wizard.start();
    } catch (err) {
      this.app.showToast(err.message, 'error');
    }
  }
}
