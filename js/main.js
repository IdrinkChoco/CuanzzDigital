import { renderDashboard } from './components/dashboardView.js';
import { setupTransactionForm } from './components/transactionForm.js';
import { renderAssets, setupAssetForm } from './components/assetView.js';
import { renderBills, setupBillForm } from './components/billView.js';

window.switchTab = function (tabName) {
  const dashboardTab = document.getElementById('tab-dashboard');
  const transactionTab = document.getElementById('tab-transaction');
  const assetsTab = document.getElementById('tab-assets');
  const billsTab = document.getElementById('tab-bills');

  const btnDashboard = document.getElementById('btn-tab-dashboard');
  const btnTransaction = document.getElementById('btn-tab-transaction');
  const btnAssets = document.getElementById('btn-tab-assets');
  const btnBills = document.getElementById('btn-tab-bills');

  [dashboardTab, transactionTab, assetsTab, billsTab].forEach(t => t?.classList.add('hidden'));
  [btnDashboard, btnTransaction, btnAssets, btnBills].forEach(b => b?.classList.remove('tab-active'));

  if (tabName === 'dashboard') {
    dashboardTab?.classList.remove('hidden');
    btnDashboard?.classList.add('tab-active');
  } else if (tabName === 'transaction') {
    transactionTab?.classList.remove('hidden');
    btnTransaction?.classList.add('tab-active');
  } else if (tabName === 'assets') {
    assetsTab?.classList.remove('hidden');
    btnAssets?.classList.add('tab-active');
    renderAssets();
  } else if (tabName === 'bills') {
    billsTab?.classList.remove('hidden');
    btnBills?.classList.add('tab-active');
    renderBills();
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
  setupBillForm();

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