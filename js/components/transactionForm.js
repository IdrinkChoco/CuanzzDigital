import { transactionService } from '../services/transactionService.js';
import { assetService } from '../services/assetService.js';
import { billService } from '../services/billService.js';
import { supabase } from '../config/supabase.js';

export function setupTransactionForm(onSuccessCallback) {
  const form = document.getElementById('form-transaction');
  if (!form) return;

  const dateInput = document.getElementById('tx-date');
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  loadCategories();
  loadAccountsSelect();
  setupTypeToggle();
  setupCategoryModal();
  setupBillIntegration(); // Inisialisasi Integrasi Iuran

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerText = 'Menyimpan...';

    try {
      const typeEl = form.querySelector('input[name="transaction_type"]:checked');
      const currencyEl = document.getElementById('tx-currency');
      const amountEl = document.getElementById('tx-amount');
      const titleEl = document.getElementById('tx-title');
      const categoryEl = document.getElementById('tx-category');
      const accountEl = document.getElementById('tx-account');
      const tagsEl = document.getElementById('tx-tags');
      const dateEl = document.getElementById('tx-date');
      const billSelectEl = document.getElementById('tx-bill-select');

      const type = typeEl ? typeEl.value : 'expense';
      const currency = currencyEl ? currencyEl.value : 'IDR';
      const amount = amountEl ? parseFloat(amountEl.value) : 0;
      const title = titleEl ? titleEl.value : '';
      const categoryId = (categoryEl && categoryEl.value) ? categoryEl.value : null;
      const accountId = (accountEl && accountEl.value) ? accountEl.value : null;
      const rawTags = tagsEl ? tagsEl.value : '';
      const date = dateEl ? dateEl.value : new Date().toISOString().split('T')[0];

      const tagsArray = rawTags ? rawTags.split(',').map(t => t.trim()).filter(Boolean) : [];

      const { data: { session } } = await supabase.auth.getSession();

      const newTxData = {
        user_id: session?.user?.id || null,
        type,
        currency,
        amount,
        title,
        category_id: categoryId,
        account_id: accountId,
        transaction_date: date
      };

      // 1. Simpan Transaksi utama
      const createdTx = await transactionService.createTransaction(newTxData, tagsArray);

      // 2. Jika transaksi ini untuk bayar iuran, tandai iuran sebagai TERBAYAR (PAID)
      if (type === 'expense' && billSelectEl && billSelectEl.value) {
        await billService.markBillAsPaidByTransaction(billSelectEl.value, createdTx.id);
      }

      form.reset();
      if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];
      document.getElementById('wrapper-bill-select')?.classList.add('hidden');

      alert('Transaksi berhasil disimpan!');
      if (onSuccessCallback) onSuccessCallback();

    } catch (err) {
      alert('Gagal menyimpan transaksi: ' + err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i data-lucide="check-circle" class="w-5 h-5"></i><span>Simpan Transaksi</span>`;
      if (window.lucide) window.lucide.createIcons();
    }
  });
}

// Logika Checkbox & Dropdown Pembayaran Iuran
function setupBillIntegration() {
  const chkIsBill = document.getElementById('chk-is-bill');
  const wrapperBillSelect = document.getElementById('wrapper-bill-select');
  const billSelect = document.getElementById('tx-bill-select');

  if (!chkIsBill || !wrapperBillSelect) return;

  chkIsBill.addEventListener('change', async () => {
    if (chkIsBill.checked) {
      wrapperBillSelect.classList.remove('hidden');
      await loadPendingBillsDropdown();
    } else {
      wrapperBillSelect.classList.add('hidden');
      if (billSelect) billSelect.value = '';
    }
  });

  // Saat Iuran dipilih, isi otomatis nominal, judul, & kategori
  billSelect?.addEventListener('change', () => {
    const selectedOption = billSelect.options[billSelect.selectedIndex];
    if (!selectedOption || !selectedOption.value) return;

    const amount = selectedOption.getAttribute('data-amount');
    const title = selectedOption.getAttribute('data-title');
    const categoryId = selectedOption.getAttribute('data-category');

    if (amount) document.getElementById('tx-amount').value = amount;
    if (title) document.getElementById('tx-title').value = `[Iuran] ${title}`;
    if (categoryId) document.getElementById('tx-category').value = categoryId;
  });
}

async function loadPendingBillsDropdown() {
  const billSelect = document.getElementById('tx-bill-select');
  if (!billSelect) return;

  try {
    const pendingBills = await billService.getPendingBillsThisMonth();
    billSelect.innerHTML = '<option value="">-- Pilih Iuran Yang Dibayar --</option>';

    if (pendingBills.length === 0) {
      billSelect.innerHTML = '<option value="">Semua iuran bulan ini sudah lunas!</option>';
      return;
    }

    pendingBills.forEach(log => {
      const b = log.recurring_bills;
      const opt = document.createElement('option');
      opt.value = log.id;
      opt.textContent = `${b.name} (Rp ${Number(log.amount).toLocaleString('id-ID')}) - Tgl ${b.due_day}`;
      opt.setAttribute('data-amount', log.amount);
      opt.setAttribute('data-title', b.name);
      opt.setAttribute('data-category', b.category_id || '');
      billSelect.appendChild(opt);
    });
  } catch (err) {
    console.error('Gagal memuat iuran pending:', err);
  }
}

async function loadAccountsSelect() {
  const accountSelect = document.getElementById('tx-account');
  if (!accountSelect) return;

  try {
    const items = await assetService.getAssetsAndLiabilities();
    accountSelect.innerHTML = '<option value="">-- Pilih Akun / Rekening --</option>';

    if (!items || items.length === 0) return;

    const assetsGroup = document.createElement('optgroup');
    assetsGroup.label = 'Aset (Kas & Bank)';

    const liabilitiesGroup = document.createElement('optgroup');
    liabilitiesGroup.label = 'Liabilitas (Kartu Kredit / Utang)';

    items.forEach(item => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = `${item.name} (${item.category})`;

      if (item.type === 'asset') {
        assetsGroup.appendChild(option);
      } else {
        liabilitiesGroup.appendChild(option);
      }
    });

    if (assetsGroup.children.length > 0) accountSelect.appendChild(assetsGroup);
    if (liabilitiesGroup.children.length > 0) accountSelect.appendChild(liabilitiesGroup);

  } catch (err) {
    console.error('Gagal memuat daftar akun:', err);
  }
}

async function loadCategories(selectedId = null) {
  const categorySelect = document.getElementById('tx-category');
  if (!categorySelect) return;

  try {
    const categories = await transactionService.getCategories();
    categorySelect.innerHTML = '<option value="">-- Pilih Kategori --</option>';

    if (!categories || categories.length === 0) return;

    const incomeGroup = document.createElement('optgroup');
    incomeGroup.label = 'Pemasukan (Income)';

    const expenseGroup = document.createElement('optgroup');
    expenseGroup.label = 'Pengeluaran (Expense)';

    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.name;
      if (selectedId && cat.id === selectedId) option.selected = true;

      if (cat.type === 'income') {
        incomeGroup.appendChild(option);
      } else {
        expenseGroup.appendChild(option);
      }
    });

    if (incomeGroup.children.length > 0) categorySelect.appendChild(incomeGroup);
    if (expenseGroup.children.length > 0) categorySelect.appendChild(expenseGroup);

  } catch (err) {
    console.error('Gagal memuat kategori:', err);
  }
}

function setupTypeToggle() {
  const radioButtons = document.querySelectorAll('input[name="transaction_type"]');
  const billSection = document.getElementById('section-pay-bill');

  radioButtons.forEach(radio => {
    radio.addEventListener('change', () => {
      radioButtons.forEach(r => {
        const parentLabel = r.closest('label');
        if (r.checked) {
          if (r.value === 'income') {
            parentLabel.className = 'relative flex items-center justify-center p-3 rounded-lg border-2 border-emerald-500 bg-emerald-50/50 cursor-pointer text-emerald-700 font-semibold text-sm transition-all';
            // Sembunyikan opsi iuran jika tipe Pemasukan
            if (billSection) billSection.classList.add('hidden');
          } else {
            parentLabel.className = 'relative flex items-center justify-center p-3 rounded-lg border-2 border-rose-500 bg-rose-50/50 cursor-pointer text-rose-700 font-semibold text-sm transition-all';
            // Tampilkan opsi iuran jika tipe Pengeluaran
            if (billSection) billSection.classList.remove('hidden');
          }
        } else {
          parentLabel.className = 'relative flex items-center justify-center p-3 rounded-lg border-2 border-slate-200 hover:border-slate-300 bg-white cursor-pointer text-slate-600 font-medium text-sm transition-all';
        }
      });
    });
  });
}

function setupCategoryModal() {
  const modal = document.getElementById('modal-category');
  const btnOpen = document.getElementById('btn-open-modal-category');
  const btnClose = document.getElementById('btn-close-modal-category');
  const btnCancel = document.getElementById('btn-cancel-category');
  const btnSave = document.getElementById('btn-save-category');

  if (!modal || !btnOpen) return;

  const showModal = () => modal.classList.remove('hidden');
  const hideModal = () => {
    modal.classList.add('hidden');
    document.getElementById('new-cat-name').value = '';
  };

  btnOpen.addEventListener('click', showModal);
  btnClose?.addEventListener('click', hideModal);
  btnCancel?.addEventListener('click', hideModal);

  btnSave?.addEventListener('click', async () => {
    const nameInput = document.getElementById('new-cat-name');
    const typeSelect = document.getElementById('new-cat-type');

    const name = nameInput.value.trim();
    const type = typeSelect.value;

    if (!name) {
      alert('Nama kategori tidak boleh kosong!');
      return;
    }

    btnSave.disabled = true;
    btnSave.innerText = 'Menyimpan...';

    try {
      const newCategory = await transactionService.createCategory(name, type);
      await loadCategories(newCategory.id);
      hideModal();
      alert('Kategori baru berhasil dibuat!');
    } catch (err) {
      alert('Gagal membuat kategori: ' + err.message);
    } finally {
      btnSave.disabled = false;
      btnSave.innerText = 'Simpan Kategori';
    }
  });
}