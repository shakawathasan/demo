import { apiRequest } from './api.js';
import { buildWhatsAppUrl } from './whatsapp.js';

export class TestsViewController {
  constructor(app) {
    this.app = app;
    this.currentBatch = 'all';
    this.currentSubject = 'all';
    this.selectedTestId = null;
    this.testData = null;
  }

  async init() {
    this.renderContainer();
    this.bindEvents();
    await this.loadBatches();
    await this.loadTestsList();
  }

  renderContainer() {
    const container = document.getElementById('view-tests');
    if (!container) return;

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Top Title & Toolbar -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Weekly Test Reports & Ranks</h1>
            <p class="text-xs sm:text-sm text-slate-500 mt-0.5">Test creation, marks entry, automated competition ranking (1224), and WhatsApp scorecards.</p>
          </div>
          <div class="flex items-center gap-2">
            <button id="btn-create-test" class="px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg flex items-center gap-1.5 shadow-sm">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Create Weekly Test
            </button>
          </div>
        </div>

        <!-- Filter & Test Selection Bar -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-500 mb-1">Filter by Batch</label>
              <select id="test-filter-batch" class="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500">
                <option value="all">All Batches</option>
              </select>
            </div>
            <div class="sm:col-span-2">
              <label class="block text-xs font-medium text-slate-500 mb-1">Select Test to View / Grade *</label>
              <select id="test-select-active" class="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800">
                <option value="">Loading tests...</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Active Test Overview & Statistics Box -->
        <div id="test-stats-card" class="hidden bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <!-- Injected dynamically -->
        </div>

        <!-- Marks Grading & Rankings Table -->
        <div id="test-results-container" class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50">
            <div>
              <h2 id="active-test-title" class="text-sm font-bold text-slate-900">Student Results & Rankings</h2>
              <p id="active-test-meta" class="text-xs text-slate-500">Standard Competition Ranking (1224) - Tied scores share equal ranks.</p>
            </div>
            <div class="flex items-center gap-2">
              <button id="btn-save-marks" class="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm">
                Save Marks Draft
              </button>
              <button id="btn-publish-test" class="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm">
                Publish & Enable Parent Reports
              </button>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th class="py-3 px-4 w-16 text-center">Rank</th>
                  <th class="py-3 px-4 w-16">Roll</th>
                  <th class="py-3 px-4">Student Name & ID</th>
                  <th class="py-3 px-4 text-center w-32">Marks Obtained</th>
                  <th class="py-3 px-4 text-center">Percentage</th>
                  <th class="py-3 px-4 text-center">Progress</th>
                  <th class="py-3 px-4">Teacher Feedback / Notes</th>
                  <th class="py-3 px-4 text-center">WhatsApp Report</th>
                  <th class="py-3 px-4 text-right">Card</th>
                </tr>
              </thead>
              <tbody id="test-table-body" class="divide-y divide-slate-100 text-slate-700">
                <tr><td colspan="9" class="py-8 text-center text-slate-400">Please select a test above.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    document.getElementById('test-filter-batch')?.addEventListener('change', (e) => {
      this.currentBatch = e.target.value;
      this.loadTestsList();
    });

    document.getElementById('test-select-active')?.addEventListener('change', (e) => {
      this.selectedTestId = e.target.value;
      if (this.selectedTestId) {
        this.loadTestDetails(this.selectedTestId);
      }
    });

    document.getElementById('btn-create-test')?.addEventListener('click', () => {
      this.showCreateTestModal();
    });

    document.getElementById('btn-save-marks')?.addEventListener('click', () => {
      this.saveMarks(false);
    });

    document.getElementById('btn-publish-test')?.addEventListener('click', () => {
      this.saveMarks(true);
    });
  }

  async loadBatches() {
    try {
      const res = await apiRequest('/admin/batches');
      const select = document.getElementById('test-filter-batch');
      if (select && res.batches) {
        select.innerHTML = `<option value="all">All Batches</option>` +
          res.batches.map((b) => `<option value="${b.id}">${b.name}</option>`).join('');
      }
    } catch (e) {
      console.error('Failed to load batches:', e);
    }
  }

  async loadTestsList() {
    try {
      const res = await apiRequest(`/tests?classBatchId=${this.currentBatch}`);
      const select = document.getElementById('test-select-active');
      if (!select) return;

      if (!res.tests || res.tests.length === 0) {
        select.innerHTML = `<option value="">No tests found for this batch. Create one!</option>`;
        const tbodyEl = document.getElementById('test-table-body');
        if (tbodyEl) tbodyEl.innerHTML = `<tr><td colspan="9" class="py-8 text-center text-slate-400">No tests created yet.</td></tr>`;
        return;
      }

      select.innerHTML = res.tests.map((t) => `
        <option value="${t.id}" ${t.id === this.selectedTestId ? 'selected' : ''}>
          ${t.title} (${t.subject} · ${t.testDate} · Max: ${t.maxMarks}m · Status: ${t.status.toUpperCase()})
        </option>
      `).join('');

      if (!this.selectedTestId || !res.tests.some((t) => t.id === this.selectedTestId)) {
        this.selectedTestId = res.tests[0].id;
      }

      await this.loadTestDetails(this.selectedTestId);
    } catch (e) {
      console.error('Failed to load tests list:', e);
    }
  }

  async loadTestDetails(testId) {
    try {
      const res = await apiRequest(`/tests/${testId}`);
      this.testData = res;

      const statsCard = document.getElementById('test-stats-card');
      if (statsCard) {
        statsCard.classList.remove('hidden');
        statsCard.innerHTML = `
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div class="text-sm font-bold text-slate-900">${res.test.title}</div>
              <div class="text-xs text-slate-500">${res.test.classBatchName} · Subject: <strong>${res.test.subject}</strong> · Date: <strong>${res.test.testDate}</strong></div>
            </div>
            <div>
              ${res.test.status === 'published' ? `
                <span class="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-100 text-emerald-800">Published to Parents</span>
              ` : `
                <span class="px-2.5 py-1 text-xs font-semibold rounded bg-amber-100 text-amber-800">Draft / Unpublished</span>
              `}
            </div>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <div class="text-[11px] text-slate-500">Participants</div>
              <div class="text-sm font-bold text-slate-900 tabular-nums">${res.statistics.totalStudents}</div>
            </div>
            <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <div class="text-[11px] text-slate-500">Highest Marks</div>
              <div class="text-sm font-bold text-emerald-600 tabular-nums">${res.statistics.highestMarks} / ${res.test.maxMarks}</div>
            </div>
            <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <div class="text-[11px] text-slate-500">Lowest Marks</div>
              <div class="text-sm font-bold text-red-600 tabular-nums">${res.statistics.lowestMarks} / ${res.test.maxMarks}</div>
            </div>
            <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <div class="text-[11px] text-slate-500">Class Average</div>
              <div class="text-sm font-bold text-blue-600 tabular-nums">${res.statistics.averageMarks} (${res.statistics.averagePercentage}%)</div>
            </div>
            <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <div class="text-[11px] text-slate-500">Pass Rate (≥40%)</div>
              <div class="text-sm font-bold text-slate-900 tabular-nums">${res.statistics.passingCount} Students</div>
            </div>
          </div>
        `;
      }

      const tbody = document.getElementById('test-table-body');
      if (!tbody) return;

      tbody.innerHTML = res.results.map((r) => {
        let rankBadge = `<span class="font-bold text-slate-700">#${r.rank}</span>`;
        if (r.rank === 1) rankBadge = `<span class="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-xs">🥇 Rank 1</span>`;
        if (r.rank === 2) rankBadge = `<span class="inline-block px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-bold text-xs">🥈 Rank 2</span>`;
        if (r.rank === 3) rankBadge = `<span class="inline-block px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-bold text-xs">🥉 Rank 3</span>`;

        let progressHtml = '<span class="text-slate-400">—</span>';
        if (r.progressDelta !== null) {
          if (r.progressDelta > 0) {
            progressHtml = `<span class="text-emerald-600 font-bold tabular-nums">+${r.progressDelta}% ↑</span>`;
          } else if (r.progressDelta < 0) {
            progressHtml = `<span class="text-red-600 font-bold tabular-nums">${r.progressDelta}% ↓</span>`;
          } else {
            progressHtml = `<span class="text-slate-500 tabular-nums">0% =</span>`;
          }
        }

        return `
          <tr class="hover:bg-slate-50/80 transition-colors" data-student-id="${r.studentId}">
            <td class="py-3 px-4 text-center tabular-nums">${rankBadge}</td>
            <td class="py-3 px-4 font-mono font-bold text-slate-600">${r.rollNo}</td>
            <td class="py-3 px-4">
              <div class="font-semibold text-slate-900">${r.studentName}</div>
              <div class="text-[11px] text-slate-500">${r.parentName} · <span class="font-mono">${r.parentPhone}</span></div>
            </td>
            <td class="py-3 px-4 text-center">
              <div class="inline-flex items-center gap-1">
                <input type="number" min="0" max="${res.test.maxMarks}" value="${r.obtainedMarks}" class="input-marks w-16 text-center text-xs p-1.5 border border-slate-300 rounded font-mono font-bold focus:ring-2 focus:ring-blue-500" data-student-id="${r.studentId}">
                <span class="text-slate-400 font-mono text-[11px]">/ ${res.test.maxMarks}</span>
              </div>
            </td>
            <td class="py-3 px-4 text-center tabular-nums font-bold ${r.percentage >= 80 ? 'text-emerald-600' : r.percentage < 40 ? 'text-red-600' : 'text-slate-800'}">
              ${r.percentage}%
            </td>
            <td class="py-3 px-4 text-center text-xs">
              ${progressHtml}
            </td>
            <td class="py-3 px-4">
              <input type="text" value="${r.feedback || ''}" placeholder="Teacher feedback..." class="input-feedback w-full text-xs p-1.5 border border-slate-200 rounded focus:bg-white" data-student-id="${r.studentId}">
            </td>
            <td class="py-3 px-4 text-center">
              <button data-action="wa-report" data-student-id="${r.studentId}" class="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded flex items-center justify-center gap-1 mx-auto transition-colors">
                <svg class="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.941-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.299.144.347.491 1.199.534 1.286.043.087.072.188.014.303-.058.116-.087.188-.173.289l-.26.303c-.087.087-.179.182-.077.357.101.174.449.741.964 1.201.662.591 1.221.774 1.394.861.173.086.275.072.376-.044.101-.116.433-.506.549-.679.116-.173.231-.144.39-.087s1.011.477 1.184.564.289.13.332.202c.043.073.043.419-.101.824z"/></svg>
                Send
              </button>
            </td>
            <td class="py-3 px-4 text-right">
              <button data-action="view-card" data-student-id="${r.studentId}" class="px-2 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100">
                Card
              </button>
            </td>
          </tr>
        `;
      }).join('');

      // Bind row events
      tbody.querySelectorAll('button[data-action="wa-report"]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.handleSingleWhatsAppReport(btn.dataset.studentId);
        });
      });

      tbody.querySelectorAll('button[data-action="view-card"]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.showReportCardModal(btn.dataset.studentId);
        });
      });
    } catch (e) {
      console.error('Failed to load test details:', e);
    }
  }

  async saveMarks(isPublish = false) {
    if (!this.selectedTestId || !this.testData) return;

    const entries = [];
    let hasValidationError = false;

    document.querySelectorAll('#test-table-body tr[data-student-id]').forEach((row) => {
      const studentId = row.dataset.studentId;
      const marksInput = row.querySelector('.input-marks');
      const feedbackInput = row.querySelector('.input-feedback');

      const marks = Number(marksInput.value);
      if (isNaN(marks) || marks < 0 || marks > this.testData.test.maxMarks) {
        hasValidationError = true;
        marksInput.classList.add('border-red-500', 'bg-red-50');
      } else {
        marksInput.classList.remove('border-red-500', 'bg-red-50');
      }

      entries.push({
        studentId,
        obtainedMarks: marks,
        feedback: feedbackInput ? feedbackInput.value : '',
      });
    });

    if (hasValidationError) {
      this.app.showToast(`Marks must be between 0 and ${this.testData.test.maxMarks}.`, 'error');
      return;
    }

    try {
      await apiRequest(`/tests/${this.selectedTestId}/marks`, {
        method: 'POST',
        body: {
          entries,
          publishStatus: isPublish ? 'published' : 'draft',
        },
      });

      this.app.showToast(isPublish ? 'Test marks published and rankings updated!' : 'Draft marks saved successfully!', 'success');
      await this.loadTestDetails(this.selectedTestId);
    } catch (err) {
      this.app.showToast(err.message, 'error');
    }
  }

  async handleSingleWhatsAppReport(studentId) {
    if (!this.testData) return;

    if (this.testData.test.status !== 'published') {
      this.app.showToast('Please publish the test first before sending reports to parents.', 'warning');
      return;
    }

    try {
      const res = await apiRequest('/tests/whatsapp-result', {
        method: 'POST',
        body: {
          testId: this.testData.test.id,
          studentId,
        },
      });

      this.app.showModal({
        title: `Send Test Report: ${res.studentName}`,
        content: `
          <div class="space-y-3">
            <div class="p-3 bg-blue-50 border border-blue-100 rounded text-xs space-y-1">
              <div><strong class="text-slate-700">Recipient:</strong> ${res.parentName} (${res.normalizedPhone})</div>
              <div><strong class="text-slate-700">Result:</strong> ${res.percentage}% · Rank #${res.rank}</div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Pre-filled Report Message:</label>
              <textarea id="wa-report-text" rows="4" class="w-full text-xs font-sans p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-800">${res.message}</textarea>
            </div>
            <p class="text-[11px] text-slate-400">Opens WhatsApp click-to-chat. Teacher reviews and taps Send.</p>
          </div>
        `,
        actions: [
          { label: 'Cancel', className: 'text-slate-600', onClick: () => this.app.closeModal() },
          {
            label: 'Open WhatsApp Chat',
            className: 'bg-emerald-600 text-white hover:bg-emerald-700 font-semibold',
            onClick: () => {
              const text = document.getElementById('wa-report-text').value;
              const directUrl = buildWhatsAppUrl(res.normalizedPhone, text);
              if (directUrl) {
                window.open(directUrl, '_blank');
                this.app.showToast('WhatsApp launched with student test report.', 'success');
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

  async showReportCardModal(studentId) {
    if (!this.selectedTestId) return;

    try {
      const res = await apiRequest(`/tests/report-card/${this.selectedTestId}/${studentId}`);
      this.app.showModal({
        title: `Report Card: ${res.student.name}`,
        content: `
          <div id="printable-section" class="p-4 bg-white border border-slate-200 rounded-lg space-y-4 text-xs font-sans">
            <!-- Header -->
            <div class="text-center border-b border-slate-200 pb-3">
              <h2 class="text-base font-bold text-slate-900">${res.settings.tuitionName}</h2>
              <p class="text-[11px] text-slate-500">${res.settings.tagline}</p>
              <div class="mt-2 inline-block px-3 py-0.5 bg-blue-50 text-blue-800 font-bold rounded uppercase text-[10px] tracking-wider border border-blue-200">
                Official Weekly Test Performance Card
              </div>
            </div>

            <!-- Student & Test Meta -->
            <div class="grid grid-cols-2 gap-2 text-slate-700 border-b border-slate-100 pb-3">
              <div><strong>Student:</strong> ${res.student.name}</div>
              <div class="text-right"><strong>Roll No:</strong> ${res.student.rollNo} (ID: ${res.student.studentId})</div>
              <div><strong>Batch:</strong> ${res.batch.name}</div>
              <div class="text-right"><strong>Subject:</strong> ${res.test.subject}</div>
              <div><strong>Test Title:</strong> ${res.test.title}</div>
              <div class="text-right"><strong>Date:</strong> ${res.test.testDate}</div>
            </div>

            <!-- Score Summary Cards -->
            <div class="grid grid-cols-4 gap-2 text-center">
              <div class="p-2 bg-slate-50 border border-slate-200 rounded">
                <div class="text-[10px] text-slate-500">Marks Obtained</div>
                <div class="text-sm font-bold text-slate-900 tabular-nums">${res.result.obtainedMarks} / ${res.test.maxMarks}</div>
              </div>
              <div class="p-2 bg-slate-50 border border-slate-200 rounded">
                <div class="text-[10px] text-slate-500">Percentage</div>
                <div class="text-sm font-bold text-blue-600 tabular-nums">${res.result.percentage}%</div>
              </div>
              <div class="p-2 bg-slate-50 border border-slate-200 rounded">
                <div class="text-[10px] text-slate-500">Class Rank</div>
                <div class="text-sm font-bold text-amber-600 tabular-nums">Rank #${res.result.rank}</div>
              </div>
              <div class="p-2 bg-slate-50 border border-slate-200 rounded">
                <div class="text-[10px] text-slate-500">Class Highest</div>
                <div class="text-sm font-bold text-emerald-600 tabular-nums">${res.context.highestMarks} / ${res.test.maxMarks}</div>
              </div>
            </div>

            <!-- Feedback -->
            <div class="p-3 bg-slate-50 border border-slate-200 rounded">
              <strong class="text-slate-800 block mb-1">Teacher Evaluation & Improvement Notes:</strong>
              <p class="text-slate-700 italic">${res.result.feedback || 'Consistent effort noted. Keep practicing numerical questions.'}</p>
            </div>

            <!-- Signature block -->
            <div class="pt-8 flex justify-between text-slate-500 text-[11px]">
              <div class="border-t border-slate-300 pt-1 w-32 text-center">Subject Teacher</div>
              <div class="border-t border-slate-300 pt-1 w-32 text-center">Academic Director</div>
            </div>
          </div>
        `,
        actions: [
          { label: 'Close', className: 'text-slate-600', onClick: () => this.app.closeModal() },
          {
            label: 'Print / Save PDF',
            className: 'bg-blue-700 text-white hover:bg-blue-800 font-semibold',
            onClick: () => window.print(),
          },
        ],
      });
    } catch (err) {
      this.app.showToast(err.message, 'error');
    }
  }

  showCreateTestModal() {
    this.app.showModal({
      title: 'Create Weekly Test',
      content: `
        <form id="create-test-form" class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Test Title *</label>
            <input type="text" id="new-test-title" placeholder="e.g. Weekly Test 4: Vectors and Dynamics" required class="w-full text-xs p-2.5 border border-slate-300 rounded-lg">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-700 mb-1">Target Batch *</label>
              <select id="new-test-batch" required class="w-full text-xs p-2.5 border border-slate-300 rounded-lg">
                <!-- populated -->
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-700 mb-1">Subject *</label>
              <input type="text" id="new-test-subject" placeholder="e.g. Physics" required class="w-full text-xs p-2.5 border border-slate-300 rounded-lg">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-700 mb-1">Test Date *</label>
              <input type="date" id="new-test-date" value="${new Date().toISOString().slice(0, 10)}" required class="w-full text-xs p-2.5 border border-slate-300 rounded-lg font-mono">
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-700 mb-1">Maximum Marks *</label>
              <input type="number" id="new-test-max" value="50" min="1" required class="w-full text-xs p-2.5 border border-slate-300 rounded-lg font-mono font-bold">
            </div>
          </div>
        </form>
      `,
      actions: [
        { label: 'Cancel', className: 'text-slate-600', onClick: () => this.app.closeModal() },
        {
          label: 'Create Test Roster',
          className: 'bg-blue-700 text-white hover:bg-blue-800 font-semibold',
          onClick: async () => {
            const title = document.getElementById('new-test-title').value;
            const classBatchId = document.getElementById('new-test-batch').value;
            const subject = document.getElementById('new-test-subject').value;
            const testDate = document.getElementById('new-test-date').value;
            const maxMarks = Number(document.getElementById('new-test-max').value);

            if (!title || !classBatchId || !subject || !maxMarks) {
              alert('Please complete all required fields.');
              return;
            }

            try {
              const res = await apiRequest('/tests', {
                method: 'POST',
                body: { title, classBatchId, subject, testDate, maxMarks },
              });
              this.app.closeModal();
              this.app.showToast('Test created! Student marks roster generated.', 'success');
              this.selectedTestId = res.test.id;
              await this.loadTestsList();
            } catch (err) {
              alert(err.message);
            }
          },
        },
      ],
    });

    // Populate batches in modal
    apiRequest('/admin/batches').then((res) => {
      const select = document.getElementById('new-test-batch');
      if (select && res.batches) {
        select.innerHTML = res.batches.map((b) => `<option value="${b.id}">${b.name}</option>`).join('');
      }
    });
  }
}
