import { supabase } from '../config/supabase.js';

export const billService = {
  // Ambil semua master tagihan
  async getBills() {
    const { data, error } = await supabase
      .from('recurring_bills')
      .select('*, categories(name)')
      .order('due_day', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  // Buat Master Tagihan Baru
  async createBill(billData) {
    const { data, error } = await supabase
      .from('recurring_bills')
      .insert([billData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Hapus Master Tagihan
  async deleteBill(id) {
    const { error } = await supabase.from('recurring_bills').delete().eq('id', id);
    if (error) throw error;
  },

  // Generate / Sync Tagihan Bulan Ini
  async syncMonthlyBills(periodMonth) { // periodMonth ex: "2026-08"
    const bills = await this.getBills();
    if (bills.length === 0) return [];

    // Ambil log yang sudah ada di bulan ini
    const { data: existingLogs } = await supabase
      .from('bill_logs')
      .select('*')
      .eq('period_month', periodMonth);

    const existingBillIds = (existingLogs || []).map(l => l.bill_id);
    const newLogs = [];

    // Jika ada master tagihan yang belum masuk log bulan ini, buatkan log-nya
    for (const bill of bills) {
      if (!existingBillIds.includes(bill.id)) {
        newLogs.push({
          bill_id: bill.id,
          period_month: periodMonth,
          status: 'pending',
          amount: bill.amount,
          is_cashflow_added: false
        });
      }
    }

    if (newLogs.length > 0) {
      await supabase.from('bill_logs').insert(newLogs);
    }

    // Ambil ulang data log lengkap gabung dengan master
    const { data: currentLogs, error } = await supabase
      .from('bill_logs')
      .select('*, recurring_bills(*, categories(name))')
      .eq('period_month', periodMonth);

    if (error) throw error;
    return currentLogs || [];
  },

  // Update Status Tagihan (Paid / Pending) & Opsional Masuk ke Cashflow
  async toggleBillPaidStatus(log, shouldAddToCashflow = true) {
    const newStatus = log.status === 'pending' ? 'paid' : 'pending';
    let txId = log.transaction_id;

    // Jika diubah jadi PAID dan user minta masuk cashflow
    if (newStatus === 'paid' && shouldAddToCashflow && !log.is_cashflow_added) {
      const today = new Date().toISOString().split('T')[0];
      const { data: newTx, error: txErr } = await supabase
        .from('transactions')
        .insert([{
          type: 'expense',
          currency: 'IDR',
          amount: log.amount,
          title: `[Iuran] ${log.recurring_bills.name}`,
          category_id: log.recurring_bills.category_id,
          transaction_date: today
        }])
        .select()
        .single();

      if (!txErr) {
        txId = newTx.id;
      }
    }

    // Update status log
    const { error } = await supabase
      .from('bill_logs')
      .update({
        status: newStatus,
        is_cashflow_added: newStatus === 'paid' ? shouldAddToCashflow : false,
        transaction_id: newStatus === 'paid' ? txId : null
      })
      .eq('id', log.id);

    if (error) throw error;
  }
};