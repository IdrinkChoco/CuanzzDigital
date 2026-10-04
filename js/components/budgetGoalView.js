import { transactionService } from '../services/transactionService.js';
import { assetService } from '../services/assetService.js';
import { budgetGoalService } from '../services/budgetGoalService.js';
import { formatCurrency } from '../utils/formatters.js';

export async function renderBudgetAndGoals() {
  await renderBudgetLimits();
  await renderSavingsGoals();
  await renderEmergencyFundHealth();
}

// 1. Render Budgeting Limit Kategori + Progress Bar & Indikator Warna
async function renderBudgetLimits() {
  const container = document.getElementById('budget-categories-list');
  if (!container) return;

  try {
    const categories = await transactionService.getCategories('expense');
    
    // Ambil transaksi bulan ini untuk hitung total pengeluaran per kategori
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    
    const transactions = await transactionService.getTransactions({ startDate: firstDay, endDate: lastDay });

    const expenseTotals = {};
    transactions.forEach(tx => {
      if (tx.type === 'expense' && tx.category_id) {
        expenseTotals[tx.category_id] = (expenseTotals[tx.category_id] || 0) + Number(tx.amount);
      }
    });

    container.innerHTML = '';

    categories.forEach(cat => {
      const spent = expenseTotals[cat.id] || 0;
      const limit = Number(cat.budget_limit) || 0;
      const percentage = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;

      // Logika Indikator Warna
      let barColor = 'bg-emerald-500';
      let textColor = 'text-emerald-700';
      let badgeText = 'Aman';

      if (limit > 0) {
        if (percentage >= 100) {
          barColor = 'bg-rose-600';
          textColor = 'text-rose-700';
          badgeText = 'Over Budget!';
        } else if (percentage >= 80) {
          barColor = 'bg-amber-500';
          textColor = 'text-amber-700';
          badgeText = 'Waspada (80%+)';
        }
      }

      const card = document.createElement('div');
      card.className = 'p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2';
      card.innerHTML = `
        <div class="flex items-center justify-between text-xs">
          <div class="font-bold text-slate-800">${cat.name}</div>
          <div class="flex items-center space-x-2">
            <span class="font-semibold ${textColor}">${badgeText}</span>
            <button data-id="${cat.id}" data-name="${cat.name}" data-limit="${limit}" class="btn-edit-budget text-blue-600 hover:underline text-[11px]">Set Limit</button>
          </div>
        </div>

        <div class="flex items-center justify-between text-xs text-slate-500">
          <span>Terpakai: <strong>${formatCurrency(spent)}</strong></span>
          <span>Batas: <strong>${limit > 0 ? formatCurrency(limit) : 'Belum di-set'}</strong></span>
        </div>

        <div class="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
          <div class="${barColor} h-2 transition-all duration-500" style="width: ${limit > 0 ? percentage : 0}%"></div>
        </div>
      `;

      card.querySelector('.btn-edit-budget').addEventListener('click', async () => {
        const newLimit = prompt(`Masukkan batas pengeluaran bulanan untuk "${cat.name}":`, limit);
        if (newLimit !== null) {
          const parsed = parseFloat(newLimit);
          if (!isNaN(parsed) && parsed >= 0) {
            await budgetGoalService.updateCategoryBudget(cat.id, parsed);
            renderBudgetLimits();
          }
        }
      });

      container.appendChild(card);
    });

  } catch (err) {
    console.error('Gagal memuat budget limits:', err);
  }
}

// 2. Render Target Tabungan (Savings Goals)
async function renderSavingsGoals() {
  const container = document.getElementById('savings-goals-list');
  if (!container) return;

  try {
    const goals = await budgetGoalService.getSavingsGoals();
    container.innerHTML = '';

    if (goals.length === 0) {
      container.innerHTML = `<p class="text-xs text-slate-400 py-3 text-center">Belum ada target tabungan.</p>`;
      return;
    }

    goals.forEach(goal => {
      const current = Number(goal.current_amount);
      const target = Number(goal.target_amount);
      const percentage = Math.min(100, Math.round((current / target) * 100));

      const card = document.createElement('div');
      card.className = 'p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3';
      card.innerHTML = `
        <div class="flex items-center justify-between">
          <div>
            <h4 class="font-bold text-slate-800 text-sm">${goal.name}</h4>
            <p class="text-[11px] text-slate-400">Akun: ${goal.assets_liabilities?.name || 'Umum'} ${goal.target_date ? '• Target: ' + goal.target_date : ''}</p>
          </div>
          <button data-id="${goal.id}" class="btn-del-goal text-slate-400 hover:text-rose-600">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>

        <div class="flex items-center justify-between text-xs">
          <span class="text-slate-600 font-medium">${formatCurrency(current)} / <strong>${formatCurrency(target)}</strong></span>
          <span class="font-bold text-blue-600">${percentage}%</span>
        </div>

        <div class="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
          <div class="bg-blue-600 h-2.5 transition-all duration-500" style="width: ${percentage}%"></div>
        </div>

        <button data-id="${goal.id}" class="btn-add-progress text-xs w-full py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-700 font-semibold transition-colors">
          + Tambah Saldo Tabungan
        </button>
      `;

      card.querySelector('.btn-add-progress').addEventListener('click', async () => {
        const added = prompt(`Tambah saldo untuk target "${goal.name}":`);
        if (added) {
          const val = parseFloat(added);
          if (!isNaN(val) && val > 0) {
            await budgetGoalService.addProgressToGoal(goal.id, val);
            renderSavingsGoals();
          }
        }
      });

      card.querySelector('.btn-del-goal').addEventListener('click', async () => {
        if (confirm(`Hapus target tabungan "${goal.name}"?`)) {
          await budgetGoalService.deleteSavingsGoal(goal.id);
          renderSavingsGoals();
        }
      });

      container.appendChild(card);
    });

    if (window.lucide) window.lucide.createIcons();

  } catch (err) {
    console.error('Gagal memuat target tabungan:', err);
  }
}

// 3. Render Fitur Tambahan: Dana Darurat (Emergency Fund Calculator)
async function renderEmergencyFundHealth() {
  const scoreEl = document.getElementById('emergency-fund-months');
  if (!scoreEl) return;

  try {
    const assets = await assetService.getAssetsAndLiabilities();
    const liquidAssets = assets
      .filter(a => a.type === 'asset' && (a.category === 'Kas & Rekening' || a.category === 'Investasi'))
      .reduce((sum, a) => sum + Number(a.amount), 0);

    // Hitung rata-rata pengeluaran bulan ini
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const txs = await transactionService.getTransactions({ startDate: firstDay, endDate: lastDay });
    
    const monthlyExpense = txs
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    if (monthlyExpense === 0) {
      scoreEl.textContent = '∞ Bulan';
      return;
    }

    const monthsCovered = (liquidAssets / monthlyExpense).toFixed(1);
    scoreEl.textContent = `${monthsCovered} Bulan`;

  } catch (err) {
    console.error('Gagal kalkulasi dana darurat:', err);
  }
}

export function setupBudgetGoalForms() {
  const form = document.getElementById('form-savings-goal');
  if (!form) return;

  loadAccountsDropdown();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('goal-name').value.trim();
    const targetAmount = parseFloat(document.getElementById('goal-target').value);
    const accountId = document.getElementById('goal-account').value || null;
    const targetDate = document.getElementById('goal-date').value || null;

    try {
      await budgetGoalService.createSavingsGoal({
        name,
        target_amount: targetAmount,
        account_id: accountId,
        target_date: targetDate
      });

      form.reset();
      alert('Target tabungan berhasil dibuat!');
      renderSavingsGoals();
    } catch (err) {
      alert('Gagal membuat target: ' + err.message);
    }
  });
}

async function loadAccountsDropdown() {
  const sel = document.getElementById('goal-account');
  if (!sel) return;

  try {
    const items = await assetService.getAssetsAndLiabilities();
    sel.innerHTML = '<option value="">-- Pilih Akun Penampung (Opsional) --</option>';
    items.filter(i => i.type === 'asset').forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = a.name;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.error('Gagal load dropdown akun goal:', e);
  }
}