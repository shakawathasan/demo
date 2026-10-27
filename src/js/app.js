import { apiRequest, setAuthToken, clearAuthToken, getAuthToken, isAuthenticated } from './api.js';
import { FeesViewController } from './fees.js';
import { AttendanceViewController } from './attendance.js';
import { TestsViewController } from './tests.js';
import { ParentViewController } from './parent.js';
import { OwnerViewController } from './owner.js';
import { AdminViewController } from './admin.js';

class App {
  constructor() {
    this.currentView = 'fees';
    this.currentAdmin = null;
    this.settings = null;
    this.controllers = {};
  }

  get currentUser() {
    return this.currentAdmin;
  }

  setupToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    container.className = 'fixed bottom-20 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none';
  }

  async init() {
    this.setupToastContainer();
    this.setupAuthEventListener();

    // 1. Instantiate all view controllers immediately
    this.controllers.fees = new FeesViewController(this);
    this.controllers.attendance = new AttendanceViewController(this);
    this.controllers.tests = new TestsViewController(this);
    this.controllers.parent = new ParentViewController(this);
    this.controllers.owner = new OwnerViewController(this);
    this.controllers.admin = new AdminViewController(this);

    // 2. Setup navigation event listeners immediately so buttons work instantly
    this.setupNavigation();
    this.renderAuthUI();

    // 3. Setup hashchange listener for responsive deep-linking
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '') || 'fees';
      this.switchView(hash);
    });

    // 4. Render initial view immediately (never leave user with a blank screen)
    const initialHash = window.location.hash.replace('#', '') || 'fees';
    this.switchView(initialHash);

    // 5. In background: check auth session & fetch branding asynchronously without blocking UI
    this.checkAuthSession()
      .then(() => {
        this.renderAuthUI();
        if (this.currentAdmin && (this.currentView === 'admin' || this.currentView === 'owner')) {
          this.switchView(this.currentView);
        }
      })
      .catch((err) => console.warn('Auth session check notice:', err));

    this.loadBrandingSettings().catch((err) => console.warn('Branding settings notice:', err));
  }

  setupAuthEventListener() {
    window.addEventListener('auth:unauthorized', () => {
      this.currentAdmin = null;
      clearAuthToken();
      this.renderAuthUI();
      if (this.currentView === 'admin' || this.currentView === 'owner') {
        this.showToast('Session expired or admin privileges required. Please log in.', 'warning');
        this.switchView('admin-login');
      }
    });
  }

  async checkAuthSession() {
    const token = getAuthToken();
    if (!token) {
      this.currentAdmin = null;
      return;
    }

    try {
      const res = await apiRequest('/auth/me');
      if (res && res.user && res.isAdmin) {
        this.currentAdmin = res.user;
      } else {
        this.currentAdmin = null;
        clearAuthToken();
      }
    } catch (err) {
      this.currentAdmin = null;
      clearAuthToken();
    }
  }

  async loadBrandingSettings() {
    try {
      // First try the public branding endpoint
      let res = await fetch('/api/auth/branding');
      if (!res.ok) {
        // Fallback to admin settings if authenticated
        res = await fetch('/api/admin/settings', {
          headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
        });
      }
      if (res.ok) {
        const data = await res.json();
        this.settings = data.settings;
        this.applyBranding();
      }
    } catch (e) {
      // Non-blocking branding fallback
    }
  }

  applyBranding() {
    if (!this.settings) return;

    // Apply Website Name to title and header
    if (this.settings.tuitionName) {
      document.title = `${this.settings.tuitionName} - Tuition & Coaching Management`;
      const headerName = document.getElementById('header-tuition-name');
      if (headerName) headerName.textContent = this.settings.tuitionName;
    }

    // Apply Logo if available
    const logoContainer = document.getElementById('header-logo-container');
    if (logoContainer && this.settings.logoUrl) {
      logoContainer.innerHTML = `<img src="${this.settings.logoUrl}" alt="Logo" class="w-6 h-6 object-contain rounded" />`;
    }

    // Apply Footer text and contact info
    const footerText = document.getElementById('footer-branding-text');
    if (footerText && this.settings.footerText) {
      footerText.textContent = this.settings.footerText;
    }

    const footerContact = document.getElementById('footer-contact-info');
    if (footerContact) {
      footerContact.textContent = `${this.settings.phone || ''} | ${this.settings.email || ''}`;
    }

    // Apply primary theme color if customized
    if (this.settings.themeColor) {
      document.documentElement.style.setProperty('--primary', this.settings.themeColor);
    }
  }

  renderAuthUI() {
    const container = document.getElementById('auth-status-container');
    const drawerAction = document.getElementById('mobile-drawer-auth-action');

    if (!container) return;

    if (this.currentAdmin) {
      container.innerHTML = `
        <div class="flex items-center gap-2">
          <div class="hidden sm:flex flex-col text-right leading-tight">
            <span class="text-xs font-bold text-slate-800 truncate max-w-[120px]">${this.currentAdmin.name}</span>
            <span class="text-[10px] font-mono text-emerald-700 font-bold">ADMIN ACTIVE</span>
          </div>
          <button id="btn-logout" class="px-2.5 py-1.5 sm:px-3 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg flex items-center gap-1.5 touch-manipulation transition-colors shadow-xs" title="Sign out from Administrator session">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            <span class="hidden sm:inline">Logout</span>
          </button>
        </div>
      `;

      if (drawerAction) {
        drawerAction.innerHTML = `
          <button id="btn-drawer-logout" class="w-full py-2.5 px-3 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg flex items-center justify-center gap-2 border border-red-200">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            Sign Out (${this.currentAdmin.name})
          </button>
        `;
        document.getElementById('btn-drawer-logout')?.addEventListener('click', () => this.handleLogout());
      }

      document.getElementById('btn-logout')?.addEventListener('click', () => this.handleLogout());
    } else {
      container.innerHTML = `
        <a href="#admin-login" class="px-2.5 sm:px-3.5 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg flex items-center gap-1.5 shadow-sm touch-manipulation transition-colors">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          <span class="whitespace-nowrap">Admin Login</span>
        </a>
      `;

      if (drawerAction) {
        drawerAction.innerHTML = `
          <a href="#admin-login" class="mobile-drawer-link w-full py-2.5 px-3 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg flex items-center justify-center gap-2 shadow-sm" data-view="admin-login">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            Admin Sign In
          </a>
        `;
      }
    }
  }

  async handleLogout() {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (e) {
      // Continue client cleanup even if network fails
    }

    clearAuthToken();
    this.currentAdmin = null;
    this.renderAuthUI();
    this.showToast('You have been securely logged out.', 'info');
    this.switchView('fees');
  }

  setupNavigation() {
    // Desktop Nav Links
    document.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.dataset.view;
        this.switchView(view);
      });
    });

    // Mobile Bottom Nav Links
    document.querySelectorAll('.mobile-nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        this.switchView(view);
      });
    });

    // Mobile Drawer Hamburger Toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-toggle');
    const mobileMenuDrawer = document.getElementById('mobile-menu-drawer');
    if (mobileMenuBtn && mobileMenuDrawer) {
      mobileMenuBtn.addEventListener('click', () => {
        mobileMenuDrawer.classList.toggle('hidden');
      });

      // Close on outside click
      document.addEventListener('click', (e) => {
        if (!mobileMenuDrawer.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
          mobileMenuDrawer.classList.add('hidden');
        }
      });

      mobileMenuDrawer.querySelectorAll('.mobile-drawer-link').forEach((link) => {
        link.addEventListener('click', () => {
          const view = link.dataset.view;
          if (view) this.switchView(view);
          mobileMenuDrawer.classList.add('hidden');
        });
      });
    }
  }

  switchView(viewName) {
    // Handle admin-protected routes
    if ((viewName === 'admin' || viewName === 'owner') && !this.currentAdmin) {
      this.renderAdminLoginView(viewName);
      return;
    }

    if (viewName === 'admin-login') {
      if (this.currentAdmin) {
        this.switchView('admin');
        return;
      }
      this.renderAdminLoginView('admin');
      return;
    }

    if (!['fees', 'attendance', 'tests', 'parent', 'owner', 'admin'].includes(viewName)) {
      viewName = 'fees';
    }

    this.currentView = viewName;
    if (window.location.hash !== `#${viewName}`) {
      window.location.hash = viewName;
    }

    // Scroll to top of viewport safely across all browsers
    try {
      window.scrollTo(0, 0);
    } catch (e) {
      // Ignore scroll failures
    }

    // Update Desktop Nav Active indicator
    document.querySelectorAll('.nav-link').forEach((link) => {
      if (link.dataset.view === viewName) {
        link.className = 'nav-link text-xs font-bold text-blue-700 border-b-2 border-blue-700 py-4 px-1 whitespace-nowrap';
      } else {
        link.className = 'nav-link text-xs font-medium text-slate-600 hover:text-slate-900 border-b-2 border-transparent py-4 px-1 whitespace-nowrap transition-colors';
      }
    });

    // Update Mobile Bottom Nav Active indicator
    document.querySelectorAll('.mobile-nav-btn').forEach((btn) => {
      if (btn.dataset.view === viewName) {
        btn.classList.add('text-blue-700', 'font-bold');
        btn.classList.remove('text-slate-500');
      } else {
        btn.classList.remove('text-blue-700', 'font-bold');
        btn.classList.add('text-slate-500');
      }
    });

    // Hide all view containers and display the target view
    document.querySelectorAll('.app-view').forEach((el) => el.classList.add('hidden'));
    const targetViewEl = document.getElementById(`view-${viewName}`);
    if (targetViewEl) {
      targetViewEl.classList.remove('hidden');
    }

    // Initialize or refresh target controller
    if (this.controllers[viewName]) {
      this.controllers[viewName].init();
    }
  }

  renderAdminLoginView(redirectAfterLogin = 'admin') {
    this.currentView = 'admin-login';
    window.location.hash = 'admin-login';

    document.querySelectorAll('.app-view').forEach((el) => el.classList.add('hidden'));
    const loginContainer = document.getElementById('view-admin-login');
    if (!loginContainer) return;

    loginContainer.classList.remove('hidden');
    loginContainer.innerHTML = `
      <div class="min-h-[75vh] flex items-center justify-center p-3 sm:p-4">
        <div class="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
          <!-- Card Header -->
          <div class="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 p-6 text-white text-center">
            <div class="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-sm border border-white/20 shadow-inner">
              <svg class="w-6 h-6 text-blue-200" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg>
            </div>
            <h2 class="text-xl font-bold tracking-tight">${this.settings?.tuitionName || 'ShikhoTuition BD'}</h2>
            <p class="text-xs text-blue-200/90 mt-1">Administrator Control Portal</p>
          </div>

          <!-- Card Body / Form -->
          <form id="admin-login-form" class="p-6 sm:p-8 space-y-4">
            <div id="login-error-alert" class="hidden p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
              <svg class="w-4 h-4 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span id="login-error-message">Invalid credentials</span>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1.5">Administrator Email</label>
              <div class="relative">
                <input 
                  type="email" 
                  id="login-email" 
                  required 
                  autocomplete="username"
                  placeholder="admin@example.com" 
                  value="shakawatthasan@gmail.com" 
                  class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 pl-10 focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all"
                />
                <svg class="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"/></svg>
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="block text-xs font-bold text-slate-700">Password</label>
                <button type="button" id="btn-toggle-password" class="text-[11px] text-blue-700 hover:text-blue-900 font-medium">Show</button>
              </div>
              <div class="relative">
                <input 
                  type="password" 
                  id="login-password" 
                  required 
                  autocomplete="current-password"
                  placeholder="••••••••••••" 
                  value="Admin@2026#BD"
                  class="w-full text-base sm:text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 pl-10 focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all font-mono"
                />
                <svg class="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              </div>
            </div>

            <div class="flex items-center justify-between text-xs text-slate-600 pt-1">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="login-remember" checked class="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" />
                <span>Keep me signed in</span>
              </label>
            </div>

            <button 
              type="submit" 
              id="btn-submit-login" 
              class="w-full py-3 px-4 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 touch-manipulation min-h-[44px]"
            >
              <span>Sign In to Admin Dashboard</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </button>

            <!-- Quick Demo Credentials Hint Box -->
            <div class="p-3.5 bg-blue-50/80 rounded-xl border border-blue-100 text-xs text-blue-900 space-y-1">
              <div class="font-bold flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span>Default Admin Setup Credentials</span>
              </div>
              <p class="text-[11px] text-blue-800/80">Email: <span class="font-mono font-bold">shakawatthasan@gmail.com</span></p>
              <p class="text-[11px] text-blue-800/80">Password: <span class="font-mono font-bold">Admin@2026#BD</span></p>
              <p class="text-[10px] text-blue-600 italic">You can change your password anytime inside Admin Dashboard > Settings & Security.</p>
            </div>
          </form>

          <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 text-center">
            <a href="#fees" class="text-xs text-slate-500 hover:text-slate-800 font-medium flex items-center justify-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
              <span>Return to Public Website</span>
            </a>
          </div>
        </div>
      </div>
    `;

    // Toggle password visibility
    const pwdInput = document.getElementById('login-password');
    const toggleBtn = document.getElementById('btn-toggle-password');
    if (toggleBtn && pwdInput) {
      toggleBtn.onclick = () => {
        if (pwdInput.type === 'password') {
          pwdInput.type = 'text';
          toggleBtn.textContent = 'Hide';
        } else {
          pwdInput.type = 'password';
          toggleBtn.textContent = 'Show';
        }
      };
    }

    // Handle Login Submit
    const form = document.getElementById('admin-login-form');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      const submitBtn = document.getElementById('btn-submit-login');
      const errorAlert = document.getElementById('login-error-alert');
      const errorMsg = document.getElementById('login-error-message');

      if (submitBtn) {
        submitBtn.setAttribute('disabled', 'true');
        submitBtn.innerHTML = `<span>Signing in...</span>`;
      }
      if (errorAlert) errorAlert.classList.add('hidden');

      try {
        const res = await apiRequest('/auth/login', {
          method: 'POST',
          body: { email, password },
        });

        if (res.token && res.user) {
          setAuthToken(res.token);
          this.currentAdmin = res.user;
          this.renderAuthUI();
          this.showToast(`Welcome back, ${res.user.name}!`, 'success');
          this.switchView(redirectAfterLogin || 'admin');
        }
      } catch (err) {
        if (errorAlert && errorMsg) {
          errorMsg.textContent = err.message || 'Invalid email or password.';
          errorAlert.classList.remove('hidden');
        }
        this.showToast(err.message || 'Authentication failed', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.removeAttribute('disabled');
          submitBtn.innerHTML = `
            <span>Sign In to Admin Dashboard</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          `;
        }
      }
    });
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    let bg = 'bg-slate-900 text-white';
    if (type === 'success') bg = 'bg-emerald-700 text-white';
    if (type === 'error') bg = 'bg-red-700 text-white';
    if (type === 'warning') bg = 'bg-amber-600 text-white';

    const toast = document.createElement('div');
    toast.className = `toast px-4 py-3 rounded-xl text-xs font-semibold ${bg} flex items-center justify-between gap-3 shadow-xl break-anywhere`;
    toast.innerHTML = `
      <span class="flex-1">${message}</span>
      <button class="text-white/70 hover:text-white font-bold p-1 leading-none text-base shrink-0">&times;</button>
    `;

    toast.querySelector('button')?.addEventListener('click', () => toast.remove());

    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 4500);
  }

  showModal({ title, content, actions = [] }) {
    this.closeModal();

    const backdrop = document.createElement('div');
    backdrop.id = 'app-active-modal';
    backdrop.className = 'fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-3 sm:p-4';

    backdrop.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-200">
        <div class="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <h3 class="text-sm sm:text-base font-bold text-slate-900 truncate pr-2">${title}</h3>
          <button id="modal-top-close" class="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg text-lg leading-none shrink-0" aria-label="Close modal">&times;</button>
        </div>
        <div class="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          ${content}
        </div>
        ${actions.length > 0 ? `
          <div class="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 shrink-0" id="modal-actions-container"></div>
        ` : ''}
      </div>
    `;

    document.body.appendChild(backdrop);

    // Close on backdrop click (outside modal content)
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this.closeModal();
    });

    const closeBtn = document.getElementById('modal-top-close');
    if (closeBtn) closeBtn.onclick = () => this.closeModal();

    if (actions.length > 0) {
      const actionsContainer = document.getElementById('modal-actions-container');
      actions.forEach((act) => {
        const btn = document.createElement('button');
        btn.className = `w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-bold rounded-xl transition-colors min-h-[42px] touch-manipulation ${act.className || 'bg-slate-200 text-slate-800'}`;
        btn.textContent = act.label;
        btn.onclick = act.onClick;
        actionsContainer?.appendChild(btn);
      });
    }
  }

  closeModal() {
    const modal = document.getElementById('app-active-modal');
    if (modal) modal.remove();
  }
}

// Bootstrap on DOM ready or immediately if DOM is already ready
function startApplication() {
  try {
    const app = new App();
    window.tuitionApp = app;
    app.init().catch((err) => {
      console.error('TuitionApp init error:', err);
    });
  } catch (err) {
    console.error('Failed to instantiate TuitionApp:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApplication);
} else {
  // DOM is already ready (module executed after or during interactive state)
  startApplication();
}
