import { transactionService } from '../services/transactionService.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';

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

    tableBody.innerHTML = '';

    if (transactions.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-400">Belum ada transaksi di periode ini.</td></tr>`;
    }

    transactions.forEach(tx => {
      if (tx.type === 'income') totalIncome += Number(tx.amount);
      if (tx.type === 'expense') totalExpense += Number(tx.amount);

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

    if (window.lucide) window.lucide.createIcons();

  } catch (err) {
    console.error('Gagal merender dashboard:', err);
  }
}