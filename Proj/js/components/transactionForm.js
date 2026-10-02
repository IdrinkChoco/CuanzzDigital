import { transactionService } from '../services/transactionService.js';
import { supabase } from '../config/supabase.js';

export function setupTransactionForm(onSuccessCallback) {
  const form = document.getElementById('form-transaction');
  if (!form) return;

  // 1. Set default tanggal hari ini
  const dateInput = document.getElementById('tx-date');
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  // 2. Load Kategori Dinamis dari Supabase
  loadCategories();

  // 3. Setup Toggle Tombol Income / Expense
  setupTypeToggle();

  // 4. Setup Modal Kategori Baru
  setupCategoryModal();

  // 5. Handle Form Submit Transaksi
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
      const tagsEl = document.getElementById('tx-tags');
      const dateEl = document.getElementById('tx-date');

      const type = typeEl ? typeEl.value : 'expense';
      const currency = currencyEl ? currencyEl.value : 'IDR';
      const amount = amountEl ? parseFloat(amountEl.value) : 0;
      const title = titleEl ? titleEl.value : '';
      const categoryId = (categoryEl && categoryEl.value) ? categoryEl.value : null;
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
        transaction_date: date
      };

      await transactionService.createTransaction(newTxData, tagsArray);

      form.reset();
      if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];

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

// Load Kategori dari Database ke Dropdown Select
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

// Handler Toggle Visual Tombol Income / Expense
function setupTypeToggle() {
  const radioButtons = document.querySelectorAll('input[name="transaction_type"]');
  radioButtons.forEach(radio => {
    radio.addEventListener('change', () => {
      radioButtons.forEach(r => {
        const parentLabel = r.closest('label');
        if (r.checked) {
          if (r.value === 'income') {
            parentLabel.className = 'relative flex items-center justify-center p-3 rounded-lg border-2 border-emerald-500 bg-emerald-50/50 cursor-pointer text-emerald-700 font-semibold text-sm transition-all';
          } else {
            parentLabel.className = 'relative flex items-center justify-center p-3 rounded-lg border-2 border-rose-500 bg-rose-50/50 cursor-pointer text-rose-700 font-semibold text-sm transition-all';
          }
        } else {
          parentLabel.className = 'relative flex items-center justify-center p-3 rounded-lg border-2 border-slate-200 hover:border-slate-300 bg-white cursor-pointer text-slate-600 font-medium text-sm transition-all';
        }
      });
    });
  });
}

// Handler Modal Pop-up Kategori Baru
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
      await loadCategories(newCategory.id); // Reload dropdown & pilih kategori baru
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