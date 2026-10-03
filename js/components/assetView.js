import { assetService } from '../services/assetService.js';
import { transferService } from '../services/transferService.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';

export async function renderAssets() {
  const assetListEl = document.getElementById('asset-list');
  const liabilityListEl = document.getElementById('liability-list');
  const totalAssetEl = document.getElementById('total-asset-val');
  const totalLiabilityEl = document.getElementById('total-liability-val');
  const netWorthEl = document.getElementById('net-worth-val');

  if (!assetListEl || !liabilityListEl) return;

  try {
    const items = await assetService.getAssetsAndLiabilities();

    let totalAsset = 0;
    let totalLiability = 0;

    assetListEl.innerHTML = '';
    liabilityListEl.innerHTML = '';

    const assets = items.filter(i => i.type === 'asset');
    const liabilities = items.filter(i => i.type === 'liability');

    if (assets.length === 0) {
      assetListEl.innerHTML = `<p class="text-xs text-slate-400 py-3 text-center">Belum ada aset terdaftar.</p>`;
    } else {
      assets.forEach(item => {
        totalAsset += Number(item.amount);
        assetListEl.appendChild(createItemCard(item));
      });
    }

    if (liabilities.length === 0) {
      liabilityListEl.innerHTML = `<p class="text-xs text-slate-400 py-3 text-center">Belum ada liabilitas/utang.</p>`;
    } else {
      liabilities.forEach(item => {
        totalLiability += Number(item.amount);
        liabilityListEl.appendChild(createItemCard(item));
      });
    }

    const netWorth = totalAsset - totalLiability;
    if (totalAssetEl) totalAssetEl.textContent = formatCurrency(totalAsset);
    if (totalLiabilityEl) totalLiabilityEl.textContent = formatCurrency(totalLiability);
    if (netWorthEl) netWorthEl.textContent = `${netWorth >= 0 ? '+' : ''}${formatCurrency(netWorth)}`;

    // Re-load Select Dropdown Transfer & Render Histori
    await loadTransferAccountsSelect(items);
    await renderTransferHistory();

    if (window.lucide) window.lucide.createIcons();

  } catch (err) {
    console.error('Gagal memuat aset/liabilitas:', err);
  }
}

function createItemCard(item) {
  const div = document.createElement('div');
  const isAsset = item.type === 'asset';
  div.className = 'flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-all';
  
  div.innerHTML = `
    <div>
      <div class="font-semibold text-slate-800 text-sm">${item.name}</div>
      <div class="text-xs text-slate-400">${item.category} ${item.note ? '• ' + item.note : ''}</div>
    </div>
    <div class="flex items-center space-x-3">
      <span class="font-bold text-sm ${isAsset ? 'text-emerald-600' : 'text-rose-600'}">
        ${formatCurrency(item.amount, item.currency)}
      </span>
      <button data-id="${item.id}" class="btn-delete-asset text-slate-400 hover:text-rose-600 transition-colors">
        <i data-lucide="trash-2" class="w-4 h-4"></i>
      </button>
    </div>
  `;

  div.querySelector('.btn-delete-asset').addEventListener('click', async () => {
    if (confirm(`Hapus ${item.name}?`)) {
      await assetService.deleteAssetOrLiability(item.id);
      renderAssets();
    }
  });

  return div;
}

export function setupAssetForm() {
  const formAsset = document.getElementById('form-asset');
  const formTransfer = document.getElementById('form-transfer');

  if (formAsset) {
    setupTypeToggle(formAsset);

    formAsset.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = formAsset.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      try {
        const type = formAsset.querySelector('input[name="asset_type"]:checked').value;
        const name = document.getElementById('asset-name').value.trim();
        const category = document.getElementById('asset-category').value;
        const currency = document.getElementById('asset-currency').value;
        const amount = parseFloat(document.getElementById('asset-amount').value);
        const note = document.getElementById('asset-note').value.trim();

        await assetService.createAssetOrLiability({ type, name, category, currency, amount, note });

        formAsset.reset();
        alert('Aset/Liabilitas berhasil disimpan!');
        renderAssets();
      } catch (err) {
        alert('Gagal menyimpan: ' + err.message);
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  // Handle Form Transfer
  if (formTransfer) {
    const tfDateEl = document.getElementById('tf-date');
    if (tfDateEl && !tfDateEl.value) tfDateEl.value = new Date().toISOString().split('T')[0];

    formTransfer.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = formTransfer.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      try {
        const fromAccountId = document.getElementById('tf-from-account').value;
        const toAccountId = document.getElementById('tf-to-account').value;
        const amount = parseFloat(document.getElementById('tf-amount').value);
        const date = document.getElementById('tf-date').value;
        const note = document.getElementById('tf-note').value.trim();

        await transferService.createTransfer({
          from_account_id: fromAccountId,
          to_account_id: toAccountId,
          amount,
          transfer_date: date,
          note
        });

        formTransfer.reset();
        if (tfDateEl) tfDateEl.value = new Date().toISOString().split('T')[0];

        alert('Transfer antar rekening berhasil!');
        renderAssets(); // Reload saldo
      } catch (err) {
        alert('Gagal transfer: ' + err.message);
      } finally {
        submitBtn.disabled = false;
      }
    });
  }
}

function setupTypeToggle(form) {
  const radioButtons = form.querySelectorAll('input[name="asset_type"]');
  radioButtons.forEach(radio => {
    radio.addEventListener('change', () => {
      radioButtons.forEach(r => {
        const parentLabel = r.closest('label');
        if (r.checked) {
          if (r.value === 'asset') {
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

// Populate Dropdown Transfer
async function loadTransferAccountsSelect(items) {
  const fromSelect = document.getElementById('tf-from-account');
  const toSelect = document.getElementById('tf-to-account');

  if (!fromSelect || !toSelect) return;

  fromSelect.innerHTML = '<option value="">-- Pilih Akun Asal --</option>';
  toSelect.innerHTML = '<option value="">-- Pilih Akun Tujuan --</option>';

  items.forEach(item => {
    const optFrom = document.createElement('option');
    optFrom.value = item.id;
    optFrom.textContent = `${item.name} (${formatCurrency(item.amount)})`;

    const optTo = optFrom.cloneNode(true);

    fromSelect.appendChild(optFrom);
    toSelect.appendChild(optTo);
  });
}

// Render Histori Transfer
async function renderTransferHistory() {
  const historyListEl = document.getElementById('transfer-history-list');
  if (!historyListEl) return;

  try {
    const transfers = await transferService.getTransfers();
    historyListEl.innerHTML = '';

    if (transfers.length === 0) {
      historyListEl.innerHTML = `<p class="text-xs text-slate-400 py-2 text-center">Belum ada riwayat transfer.</p>`;
      return;
    }

    transfers.forEach(tf => {
      const div = document.createElement('div');
      div.className = 'flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs';
      
      div.innerHTML = `
        <div>
          <div class="font-semibold text-slate-800">
            ${tf.from_account?.name || 'Akun'} <span class="text-blue-600 font-bold">➔</span> ${tf.to_account?.name || 'Akun'}
          </div>
          <div class="text-slate-400 text-[11px]">${formatDate(tf.transfer_date)} ${tf.note ? '• ' + tf.note : ''}</div>
        </div>
        <div class="flex items-center space-x-2">
          <span class="font-bold text-blue-600">${formatCurrency(tf.amount)}</span>
          <button class="btn-del-tf text-slate-400 hover:text-rose-600">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      `;

      div.querySelector('.btn-del-tf').addEventListener('click', async () => {
        if (confirm(`Batalkan/Hapus transfer ini? (Saldo kedua akun akan dikembalikan)`)) {
          await transferService.deleteTransfer(tf.id);
          renderAssets();
        }
      });

      historyListEl.appendChild(div);
    });
  } catch (err) {
    console.error('Gagal memuat riwayat transfer:', err);
  }
}