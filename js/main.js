import { renderDashboard } from './components/dashboardView.js';
import { setupTransactionForm } from './components/transactionForm.js';
import { renderBills, setupBillForm } from './components/billView.js';
import { renderAssets, setupAssetForm } from './components/assetView.js';
import { renderBudgetAndGoals, setupBudgetGoalForms } from './components/budgetGoalView.js';

document.addEventListener('DOMContentLoaded', () => {
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
});