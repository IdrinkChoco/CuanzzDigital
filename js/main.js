import { authService } from './services/authService.js';
import { renderDashboard } from './components/dashboardView.js';
import { setupTransactionForm } from './components/transactionForm.js';
import { renderBills, setupBillForm } from './components/billView.js';
import { renderAssets, setupAssetForm } from './components/assetView.js';
import { renderBudgetAndGoals, setupBudgetGoalForms } from './components/budgetGoalView.js';

let isSignUpMode = false;

document.addEventListener('DOMContentLoaded', () => {
  setupAuthHandlers();

  // Monitor status sesi Supabase
  authService.onAuthStateChange((session) => {
    const authScreen = document.getElementById('auth-screen');
    const mainApp = document.getElementById('main-app');
    const userEmailDisplay = document.getElementById('user-email-display');

    if (session) {
      if (authScreen) authScreen.classList.add('hidden');
      if (mainApp) mainApp.classList.remove('hidden');
      if (userEmailDisplay) userEmailDisplay.textContent = session.user.email;

      initAppViews();
    } else {
      if (authScreen) authScreen.classList.remove('hidden');
      if (mainApp) mainApp.classList.add('hidden');
    }
  });
});

function setupAuthHandlers() {
  const formAuth = document.getElementById('form-auth');
  const btnToggle = document.getElementById('btn-toggle-auth-mode');
  const authTitle = document.getElementById('auth-title');
  const btnSubmit = document.getElementById('btn-auth-submit');
  const btnLogout = document.getElementById('btn-logout');

  if (btnToggle) {
    btnToggle.addEventListener('click', () => {
      isSignUpMode = !isSignUpMode;
      authTitle.textContent = isSignUpMode ? 'Daftar Akun Baru' : 'Masuk ke CashFlow';
      btnSubmit.innerHTML = `<span>${isSignUpMode ? 'Daftar' : 'Masuk'}</span>`;
      btnToggle.textContent = isSignUpMode ? 'Sudah punya akun? Masuk di sini' : 'Belum punya akun? Daftar sekarang';
    });
  }

  if (formAuth) {
    formAuth.addEventListener('submit', async () => {
      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value;

      btnSubmit.disabled = true;

      try {
        if (isSignUpMode) {
          await authService.signUp(email, password);
          alert('Pendaftaran berhasil! Silakan cek email kamu atau langsung masuk.');
        } else {
          await authService.signIn(email, password);
        }
      } catch (err) {
        alert('Gagal otentikasi: ' + err.message);
      } finally {
        btnSubmit.disabled = false;
      }
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      if (confirm('Keluar dari aplikasi?')) {
        await authService.signOut();
      }
    });
  }
}

function initAppViews() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  renderDashboard(firstDay, lastDay);

  setupTransactionForm(() => {
    renderDashboard(firstDay, lastDay);
  });

  setupBillForm();
  setupAssetForm();
  setupBudgetGoalForms();

  window.switchTab = function(tabName) {
    const tabs = ['dashboard', 'transaction', 'bills', 'assets', 'goals'];

    tabs.forEach(tab => {
      const sec = document.getElementById(`tab-${tab}`);
      const btn = document.getElementById(`btn-tab-${tab}`);

      if (sec) sec.classList.add('hidden');
      if (btn) {
        btn.classList.remove('tab-active');
        btn.classList.add('text-slate-500');
      }
    });

    const activeSec = document.getElementById(`tab-${tabName}`);
    const activeBtn = document.getElementById(`btn-tab-${tabName}`);

    if (activeSec) activeSec.classList.remove('hidden');
    if (activeBtn) {
      activeBtn.classList.add('tab-active');
      activeBtn.classList.remove('text-slate-500');
    }

    if (tabName === 'dashboard') renderDashboard(firstDay, lastDay);
    if (tabName === 'bills') renderBills();
    if (tabName === 'assets') renderAssets();
    if (tabName === 'goals') renderBudgetAndGoals();

    if (window.lucide) window.lucide.createIcons();
  };
}