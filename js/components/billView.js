import { billService } from '../services/billService.js';
import { transactionService } from '../services/transactionService.js';
import { formatCurrency } from '../utils/formatters.js';

// 1. EXPORT FUNGSI RENDER BILLS
export async function renderBills() {
  const billNoticeEl = document.getElementById('bill-notice-list');
  const billMasterEl = document.getElementById('bill-master-list');
  const totalBillAmountEl = document.getElementById('total-bill-amount');
  const totalBillPaidEl = document.getElementById('total-bill-paid');

  if (!billNoticeEl || !billMasterEl) return;

  const currentPeriod = new Date().toISOString().slice(0, 7); // Format: "YYYY-MM"

  try {
    const logs = await billService.syncMonthlyBills(currentPeriod);
    const masters = await billService.getBills();

    let totalNeeded = 0;
    let totalPaid = 0;

    billNoticeEl.innerHTML = '';
    billMasterEl.innerHTML = '';

    if (!logs || logs.length === 0) {
      billNoticeEl.innerHTML = `<p class="text-xs text-slate-400 py-3 text-center">Belum ada tagihan bulanan terdaftar.</p>`;
    } else {
      logs.forEach(log => {
        totalNeeded += Number(log.amount);
        if (log.status === 'paid') totalPaid += Number(log.amount);

        billNoticeEl.appendChild(createBillNoticeCard(log));
      });
    }

    if (!masters || masters.length === 0) {
      billMasterEl.innerHTML = `<p class="text-xs text-slate-400 py-3 text-center">Belum ada master tagihan.</p>`;
    } else {
      masters.forEach(m => {
        billMasterEl.appendChild(createBillMasterCard(m));
      });
    }

    if (totalBillAmountEl) totalBillAmountEl.textContent = formatCurrency(totalNeeded);
    if (totalBillPaidEl) totalBillPaidEl.textContent = formatCurrency(totalPaid);

    if (window.lucide) window.lucide.createIcons();

  } catch (err) {
    console.error('Gagal memuat tagihan:', err);
    billNoticeEl.innerHTML = `<p class="text-xs text-rose-500 py-3 text-center">Terjadi kesalahan memuat data iuran.</p>`;
  }
}

function createBillNoticeCard(log) {
  const div = document.createElement('div');
  const isPaid = log.status === 'paid';
  const bill = log.recurring_bills || {};

  div.className = `flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg border ${isPaid ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/50 border-amber-200'} transition-all gap-3`;

  div.innerHTML = `
    <div class="flex items-center space-x-3">
      <div class="p-2 rounded-lg ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
        <i data-lucide="${isPaid ? 'check-circle-2' : 'clock'}" class="w-5 h-5"></i>
      </div>
      <div>
        <div class="font-bold text-slate-800 text-sm">${bill.name || 'Iuran'}</div>
        <div class="text-xs text-slate-500">Jatuh Tempo: Tgl ${bill.due_day || '-'} • Kategori: ${bill.categories?.name || 'Umum'}</div>
      </div>
    </div>

    <div class="flex items-center justify-between sm:justify-end space-x-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/60">
      <div class="text-right">
        <div class="font-bold text-sm text-slate-900">${formatCurrency(log.amount)}</div>
        <span class="text-[11px] font-medium px-2 py-0.5 rounded-full ${isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
          ${isPaid ? 'Terbayar' : 'Harus Disiapkan'}
        </span>
      </div>

      <div class="flex items-center space-x-2">
        ${!isPaid ? `
          <label class="flex items-center text-[11px] text-slate-600 cursor-pointer mr-1">
            <input type="checkbox" id="cashflow-chk-${log.id}" checked class="mr-1 rounded text-blue-600">
            Cashflow
          </label>
        ` : ''}

        <button class="btn-toggle-status px-3 py-1.5 rounded-lg text-xs font-semibold ${isPaid ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-blue-600 text-white hover:bg-blue-700'} transition-colors">
          ${isPaid ? 'Batal Bayar' : 'Tandai Bayar'}
        </button>
      </div>
    </div>
  `;

  div.querySelector('.btn-toggle-status').addEventListener('click', async () => {
    const chk = div.querySelector(`#cashflow-chk-${log.id}`);
    const shouldAddCashflow = chk ? chk.checked : false;
    
    await billService.toggleBillPaidStatus(log, shouldAddCashflow);
    renderBills();
  });

  return div;
}

function createBillMasterCard(master) {
  const div = document.createElement('div');
  div.className = 'flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs';
  
  div.innerHTML = `
    <div>
      <span class="font-semibold text-slate-800">${master.name}</span>
      <span class="text-slate-400 text-[11px] block">Tiap tgl ${master.due_day} • ${formatCurrency(master.amount)}</span>
    </div>
    <button class="btn-del-master text-slate-400 hover:text-rose-600">
      <i data-lucide="trash-2" class="w-4 h-4"></i>
    </button>
  `;

  div.querySelector('.btn-del-master').addEventListener('click', async () => {
    if (confirm(`Hapus master tagihan ${master.name}?`)) {
      await billService.deleteBill(master.id);
      renderBills();
    }
  });

  return div;
}

// 2. EXPORT FUNGSI SETUP BILL FORM
export function setupBillForm() {
  const form = document.getElementById('form-bill');
  if (!form) return;

  loadCategoriesSelect();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('bill-name').value.trim();
    const amount = parseFloat(document.getElementById('bill-amount').value);
    const dueDay = parseInt(document.getElementById('bill-due-day').value);
    const categoryId = document.getElementById('bill-category').value || null;

    try {
      await billService.createBill({
        name,
        amount,
        due_day: dueDay,
        category_id: categoryId
      });

      form.reset();
      alert('Master Iuran Bulanan berhasil ditambahkan!');
      renderBills();
    } catch (err) {
      alert('Gagal menyimpan iuran: ' + err.message);
    }
  });
}

async function loadCategoriesSelect() {
  const sel = document.getElementById('bill-category');
  if (!sel) return;
  try {
    const categories = await transactionService.getCategories('expense');
    sel.innerHTML = '<option value="">-- Pilih Kategori --</option>';
    categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.error('Gagal memuat kategori iuran:', e);
  }
}