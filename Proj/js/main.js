import { renderDashboard } from './components/dashboardView.js';
import { setupTransactionForm } from './components/transactionForm.js';
import { renderAssets, setupAssetForm } from './components/assetView.js';

// Switcher 3 Tab
window.switchTab = function (tabName) {
  const dashboardTab = document.getElementById('tab-dashboard');
  const transactionTab = document.getElementById('tab-transaction');
  const assetsTab = document.getElementById('tab-assets');

  const btnDashboard = document.getElementById('btn-tab-dashboard');
  const btnTransaction = document.getElementById('btn-tab-transaction');
  const btnAssets = document.getElementById('btn-tab-assets');

  // Hide All
  dashboardTab?.classList.add('hidden');
  transactionTab?.classList.add('hidden');
  assetsTab?.classList.add('hidden');

  btnDashboard?.classList.remove('tab-active');
  btnTransaction?.classList.remove('tab-active');
  btnAssets?.classList.remove('tab-active');

  if (tabName === 'dashboard') {
    dashboardTab?.classList.remove('hidden');
    btnDashboard?.classList.add('tab-active');
  } else if (tabName === 'transaction') {
    transactionTab?.classList.remove('hidden');
    btnTransaction?.classList.add('tab-active');
  } else if (tabName === 'assets') {
    assetsTab?.classList.remove('hidden');
    btnAssets?.classList.add('tab-active');
    renderAssets(); // Render assets saat tab dibuka
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  renderDashboard(firstDay, lastDay);

  setupTransactionForm(() => {
    window.switchTab('dashboard');
    renderDashboard(firstDay, lastDay);
  });

  setupAssetForm();

  const btnApplyFilter = document.querySelector('#tab-dashboard button');
  if (btnApplyFilter) {
    btnApplyFilter.addEventListener('click', () => {
      const dates = document.querySelectorAll('#tab-dashboard input[type="date"]');
      if (dates.length >= 2) {
        renderDashboard(dates[0].value, dates[1].value);
      }
    });
  }
});