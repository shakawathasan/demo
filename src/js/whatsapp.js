/**
 * Client-side WhatsApp click-to-chat utilities & bulk reminder runner
 */

export function normalizeBdPhone(rawPhone) {
  if (!rawPhone) return { isValid: false, normalized: '', error: 'Phone number is required' };
  let cleaned = String(rawPhone).replace(/[\s\-\+\(\)]/g, '');
  if (cleaned.startsWith('8801')) {
    cleaned = cleaned.slice(2);
  }
  if (cleaned.startsWith('1') && cleaned.length === 10) {
    cleaned = '0' + cleaned;
  }
  const valid = /^01[3-9]\d{8}$/.test(cleaned);
  if (!valid) {
    return {
      isValid: false,
      normalized: '',
      display: cleaned,
      error: 'Invalid Bangladesh mobile number (must be 11 digits starting with 013-019)',
    };
  }
  return {
    isValid: true,
    normalized: '88' + cleaned,
    display: cleaned,
  };
}

export function buildWhatsAppUrl(phone, text) {
  const norm = normalizeBdPhone(phone);
  if (!norm.isValid) return null;
  return `https://wa.me/${norm.normalized}?text=${encodeURIComponent(text)}`;
}

/**
 * Bulk WhatsApp Wizard Controller
 * Walks through recipients one by one, letting teacher review and tap Open Chat
 */
export class BulkWhatsAppWizard {
  constructor({ title, recipients, onComplete }) {
    this.title = title || 'WhatsApp Notification Runner';
    this.recipients = recipients || []; // Array<{ name, phone, message, url, studentName, ... }>
    this.currentIndex = 0;
    this.onComplete = onComplete;
    this.confirmedCount = 0;
  }

  start() {
    if (this.recipients.length === 0) {
      alert('No eligible recipients found.');
      return;
    }
    this.currentIndex = 0;
    this.confirmedCount = 0;
    this.renderModal();
  }

  renderModal() {
    let modal = document.getElementById('bulk-wa-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'bulk-wa-modal';
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4';
      document.body.appendChild(modal);
    }

    const current = this.recipients[this.currentIndex];
    const isLast = this.currentIndex === this.recipients.length - 1;

    modal.innerHTML = `
      <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 class="text-base font-bold text-slate-900">${this.title}</h3>
            <p class="text-xs text-slate-500 mt-0.5">Recipient ${this.currentIndex + 1} of ${this.recipients.length}</p>
          </div>
          <button id="wa-wizard-close" class="text-slate-400 hover:text-slate-600 p-1 text-lg leading-none">&times;</button>
        </div>

        <!-- Body -->
        <div class="p-6 overflow-y-auto space-y-4">
          <!-- Recipient Meta -->
          <div class="bg-blue-50/60 border border-blue-100 rounded-lg p-3 space-y-1">
            <div class="flex justify-between text-xs">
              <span class="text-slate-500">Parent / Guardian:</span>
              <span class="font-semibold text-slate-800">${current.parentName || current.name}</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-slate-500">Student:</span>
              <span class="font-medium text-slate-700">${current.studentName || '-'}</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-slate-500">Phone (Bangladesh):</span>
              <span class="font-mono text-blue-700">${current.parentPhone || current.phone}</span>
            </div>
            ${current.outstandingAmount ? `
              <div class="flex justify-between text-xs pt-1 border-t border-blue-100">
                <span class="text-slate-600 font-medium">Pending Fee:</span>
                <span class="font-mono font-bold text-red-600">৳${current.outstandingAmount} (${current.monthDisplay || ''})</span>
              </div>
            ` : ''}
          </div>

          <!-- Message Preview & Editor -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Personalized Message Preview:</label>
            <textarea id="wa-wizard-message" rows="4" class="w-full text-xs font-sans p-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800">${current.message}</textarea>
            <p class="text-[11px] text-slate-400 mt-1">You may review or edit the text before launching WhatsApp.</p>
          </div>

          <!-- Disclaimer -->
          <div class="p-2.5 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800">
            Note: Clicking below opens WhatsApp with this pre-filled message. You must tap the "Send" button in WhatsApp to dispatch.
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button id="wa-wizard-skip" class="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg">
            Skip Recipient
          </button>
          <div class="flex items-center gap-2">
            <button id="wa-wizard-open-chat" class="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 shadow-sm">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.941-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.299.144.347.491 1.199.534 1.286.043.087.072.188.014.303-.058.116-.087.188-.173.289l-.26.303c-.087.087-.179.182-.077.357.101.174.449.741.964 1.201.662.591 1.221.774 1.394.861.173.086.275.072.376-.044.101-.116.433-.506.549-.679.116-.173.231-.144.39-.087s1.011.477 1.184.564.289.13.332.202c.043.073.043.419-.101.824z"/></svg>
              Open WhatsApp Chat
            </button>
            <button id="wa-wizard-next" class="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg">
              ${isLast ? 'Finish' : 'Next Recipient →'}
            </button>
          </div>
        </div>
      </div>
    `;

    // Hook listeners
    document.getElementById('wa-wizard-close').onclick = () => this.close();
    document.getElementById('wa-wizard-skip').onclick = () => this.next();

    document.getElementById('wa-wizard-open-chat').onclick = () => {
      const msg = document.getElementById('wa-wizard-message').value;
      const targetPhone = current.parentPhone || current.phone;
      const url = buildWhatsAppUrl(targetPhone, msg);
      if (url) {
        window.open(url, '_blank');
        this.confirmedCount++;
      } else {
        alert('Invalid phone number for this recipient.');
      }
    };

    document.getElementById('wa-wizard-next').onclick = () => {
      if (isLast) {
        this.close();
        if (this.onComplete) this.onComplete(this.confirmedCount, this.recipients.length);
      } else {
        this.next();
      }
    };
  }

  next() {
    if (this.currentIndex < this.recipients.length - 1) {
      this.currentIndex++;
      this.renderModal();
    } else {
      this.close();
      if (this.onComplete) this.onComplete(this.confirmedCount, this.recipients.length);
    }
  }

  close() {
    const modal = document.getElementById('bulk-wa-modal');
    if (modal) modal.remove();
  }
}
