import { supabase } from '../config/supabase.js';

export const billService = {
  // 1. Ambil semua master tagihan
  async getBills() {
    const { data, error } = await supabase
      .from('recurring_bills')
      .select('*, categories(name)')
      .order('due_day', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  // 2. Buat Master Tagihan Baru
  async createBill(billData) {
    const { data, error } = await supabase
      .from('recurring_bills')
      .insert([billData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // 3. Hapus Master Tagihan
  async deleteBill(id) {
    const { error } = await supabase.from('recurring_bills').delete().eq('id', id);
    if (error) throw error;
  },

  // 4. Sync Log Tagihan Bulan Ini
  async syncMonthlyBills(periodMonth) {
    const bills = await this.getBills();
    if (bills.length === 0) return [];

    const { data: existingLogs } = await supabase
      .from('bill_logs')
      .select('*')
      .eq('period_month', periodMonth);

    const existingBillIds = (existingLogs || []).map(l => l.bill_id);
    const newLogs = [];

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

    const { data: currentLogs, error } = await supabase
      .from('bill_logs')
      .select('*, recurring_bills(*, categories(name))')
      .eq('period_month', periodMonth);

    if (error) throw error;
    return currentLogs || [];
  },

  // 5. Ambil daftar iuran pending bulan ini (DIBUTUHKAN OLEH transactionForm.js)
  async getPendingBillsThisMonth() {
    const currentPeriod = new Date().toISOString().slice(0, 7);
    await this.syncMonthlyBills(currentPeriod); // Pastikan log ter-sync

    const { data, error } = await supabase
      .from('bill_logs')
      .select('*, recurring_bills(*, categories(name))')
      .eq('period_month', currentPeriod)
      .eq('status', 'pending');

    if (error) throw error;
    return data || [];
  },

  // 6. Tandai Iuran Terbayar dari Transaksi (DIBUTUHKAN OLEH transactionForm.js)
  async markBillAsPaidByTransaction(billLogId, transactionId) {
    const { error } = await supabase
      .from('bill_logs')
      .update({
        status: 'paid',
        is_cashflow_added: true,
        transaction_id: transactionId
      })
      .eq('id', billLogId);

    if (error) throw error;
  },

  // 7. Toggle Manual Status di Tab Iuran
  async toggleBillPaidStatus(log, shouldAddToCashflow = true) {
    const newStatus = log.status === 'pending' ? 'paid' : 'pending';
    let txId = log.transaction_id;

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

      if (!txErr) txId = newTx.id;
    }

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