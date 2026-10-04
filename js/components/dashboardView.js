import { transactionService } from '../services/transactionService.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';

let chartCategoryInstance = null;
let chartTrendInstance = null;

export async function renderDashboard(startDate, endDate) {
  const tableBody = document.querySelector('table tbody');
  const totalIncomeEl = document.querySelector('.text-emerald-600.text-2xl');
  const totalExpenseEl = document.querySelector('.text-rose-600.text-2xl');
  const netCashflowEl = document.querySelector('.text-blue-600.text-2xl');

  if (!tableBody) return;

  try {
    const transactions = await transactionService.getTransactions({ startDate, endDate });

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryTotals = {};

    tableBody.innerHTML = '';

    if (transactions.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-400">Belum ada transaksi di periode ini.</td></tr>`;
    }

    transactions.forEach(tx => {
      const amount = Number(tx.amount);

      if (tx.type === 'income') {
        totalIncome += amount;
      } else if (tx.type === 'expense') {
        totalExpense += amount;
        const catName = tx.categories ? tx.categories.name : 'Umum';
        categoryTotals[catName] = (categoryTotals[catName] || 0) + amount;
      }

      const tagsHTML = tx.transaction_tags
        .map(tt => `<span class="inline-block bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded mr-1">#${tt.tags.name}</span>`)
        .join('');

      const accountName = tx.assets_liabilities ? tx.assets_liabilities.name : 'Umum';
      const isIncome = tx.type === 'income';

      const row = document.createElement('tr');
      row.className = 'hover:bg-slate-50/80 transition-colors';
      row.innerHTML = `
        <td class="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">${formatDate(tx.transaction_date)}</td>
        <td class="py-3 px-4">
          <div class="font-medium text-slate-900">${tx.title}</div>
          <div class="text-xs text-slate-400">Sumber: ${accountName} ${tx.note ? '• ' + tx.note : ''}</div>
        </td>
        <td class="py-3 px-4">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isIncome ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'} border">
            ${tx.categories ? tx.categories.name : 'Umum'}
          </span>
        </td>
        <td class="py-3 px-4">${tagsHTML}</td>
        <td class="py-3 px-4 text-right font-semibold ${isIncome ? 'text-emerald-600' : 'text-rose-600'} whitespace-nowrap">
          ${isIncome ? '+' : '-'}${formatCurrency(tx.amount, tx.currency)}
        </td>
        <td class="py-3 px-4 text-center">
          <button data-id="${tx.id}" class="btn-delete-tx text-slate-400 hover:text-rose-600 transition-colors">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </td>
      `;

      row.querySelector('.btn-delete-tx').addEventListener('click', async () => {
        if (confirm(`Hapus transaksi "${tx.title}"? (Saldo akun terkait akan dikembalikan)`)) {
          await transactionService.deleteTransaction(tx.id);
          renderDashboard(startDate, endDate);
        }
      });

      tableBody.appendChild(row);
    });

    const netCashflow = totalIncome - totalExpense;
    if (totalIncomeEl) totalIncomeEl.textContent = formatCurrency(totalIncome);
    if (totalExpenseEl) totalExpenseEl.textContent = formatCurrency(totalExpense);
    if (netCashflowEl) netCashflowEl.textContent = `${netCashflow >= 0 ? '+' : ''}${formatCurrency(netCashflow)}`;

    // Render Both Charts
    renderCategoryDonutChart(categoryTotals);
    await render6MonthTrendChart();

    if (window.lucide) window.lucide.createIcons();

  } catch (err) {
    console.error('Gagal merender dashboard:', err);
  }
}

// 1. Render Donut Chart (Pengeluaran per Kategori)
function renderCategoryDonutChart(categoryData) {
  const ctx = document.getElementById('chart-category');
  if (!ctx) return;

  if (chartCategoryInstance) {
    chartCategoryInstance.destroy();
  }

  const labels = Object.keys(categoryData);
  const dataValues = Object.values(categoryData);

  if (labels.length === 0) {
    chartCategoryInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Belum Ada Pengeluaran'],
        datasets: [{ data: [1], backgroundColor: ['#e2e8f0'] }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
    return;
  }

  chartCategoryInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: dataValues,
        backgroundColor: [
          '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } }
      }
    }
  });
}

// 2. Render Bar Chart Tren Cashflow 6 Bulan Terakhir
async function render6MonthTrendChart() {
  const ctx = document.getElementById('chart-cashflow-trend');
  if (!ctx) return;

  if (chartTrendInstance) {
    chartTrendInstance.destroy();
  }

  // Hitung rentang 6 bulan terakhir
  const months = [];
  const incomeData = [];
  const expenseData = [];

  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
    const monthLabel = d.toLocaleDateString('id-ID', { month: 'short' });

    months.push(monthLabel);

    try {
      const txs = await transactionService.getTransactions({ startDate: firstDay, endDate: lastDay });
      let inc = 0;
      let exp = 0;
      txs.forEach(t => {
        if (t.type === 'income') inc += Number(t.amount);
        if (t.type === 'expense') exp += Number(t.amount);
      });
      incomeData.push(inc);
      expenseData.push(exp);
    } catch (e) {
      incomeData.push(0);
      expenseData.push(0);
    }
  }

  chartTrendInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        { label: 'Pemasukan', data: incomeData, backgroundColor: '#10b981', borderRadius: 4 },
        { label: 'Pengeluaran', data: expenseData, backgroundColor: '#ef4444', borderRadius: 4 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, ticks: { font: { size: 10 } } },
        x: { ticks: { font: { size: 10 } } }
      },
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10 } } }
      }
    }
  });
}