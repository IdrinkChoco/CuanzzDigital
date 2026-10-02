// Helper Format Currency
export function formatCurrency(amount, currencyCode = 'IDR') {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0
  }).format(amount);
}

// Helper Format Tanggal (Contoh: 12 Aug 2026)
export function formatDate(dateString) {
  const options = { day: 'numeric', month: 'short', year: 'numeric' };
  return new Date(dateString).toLocaleDateString('id-ID', options);
}