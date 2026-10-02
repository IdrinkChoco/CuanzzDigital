import { assetService } from '../services/assetService.js';
import { formatCurrency } from '../utils/formatters.js';

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

    // Render Aset List
    if (assets.length === 0) {
      assetListEl.innerHTML = `<p class="text-xs text-slate-400 py-3 text-center">Belum ada aset terdaftar.</p>`;
    } else {
      assets.forEach(item => {
        totalAsset += Number(item.amount);
        assetListEl.appendChild(createItemCard(item));
      });
    }

    // Render Liabilitas List
    if (liabilities.length === 0) {
      liabilityListEl.innerHTML = `<p class="text-xs text-slate-400 py-3 text-center">Belum ada liabilitas/utang.</p>`;
    } else {
      liabilities.forEach(item => {
        totalLiability += Number(item.amount);
        liabilityListEl.appendChild(createItemCard(item));
      });
    }

    // Update Summary Net Worth
    const netWorth = totalAsset - totalLiability;
    if (totalAssetEl) totalAssetEl.textContent = formatCurrency(totalAsset);
    if (totalLiabilityEl) totalLiabilityEl.textContent = formatCurrency(totalLiability);
    if (netWorthEl) netWorthEl.textContent = `${netWorth >= 0 ? '+' : ''}${formatCurrency(netWorth)}`;

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

  // Event Listener Hapus Aset/Liabilitas
  div.querySelector('.btn-delete-asset').addEventListener('click', async () => {
    if (confirm(`Hapus ${item.name}?`)) {
      await assetService.deleteAssetOrLiability(item.id);
      renderAssets();
    }
  });

  return div;
}

export function setupAssetForm() {
  const form = document.getElementById('form-asset');
  if (!form) return;

  // Toggle visual tombol Aset vs Liabilitas
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

  // Submit Handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const type = form.querySelector('input[name="asset_type"]:checked').value;
      const name = document.getElementById('asset-name').value.trim();
      const category = document.getElementById('asset-category').value;
      const currency = document.getElementById('asset-currency').value;
      const amount = parseFloat(document.getElementById('asset-amount').value);
      const note = document.getElementById('asset-note').value.trim();

      await assetService.createAssetOrLiability({
        type,
        name,
        category,
        currency,
        amount,
        note
      });

      form.reset();
      alert('Aset/Liabilitas berhasil disimpan!');
      renderAssets();

    } catch (err) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      submitBtn.disabled = false;
    }
  });
}