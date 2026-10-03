import { supabase } from '../config/supabase.js';

export const transferService = {
  // 1. Ambil Histori Transfer
  async getTransfers() {
    const { data, error } = await supabase
      .from('account_transfers')
      .select(`
        *,
        from_account:from_account_id ( name, category ),
        to_account:to_account_id ( name, category )
      `)
      .order('transfer_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // 2. Eksekusi Transfer & Update Saldo Kedua Akun
  async createTransfer(transferData) {
    const { from_account_id, to_account_id, amount } = transferData;

    if (from_account_id === to_account_id) {
      throw new Error('Akun asal dan akun tujuan tidak boleh sama!');
    }

    // A. Simpan Log Transfer
    const { data: newTransfer, error: transferErr } = await supabase
      .from('account_transfers')
      .insert([transferData])
      .select()
      .single();

    if (transferErr) throw transferErr;

    // B. Kurangi Saldo Akun Asal
    await this.adjustAccountBalance(from_account_id, amount, 'deduct');

    // C. Tambah Saldo Akun Tujuan
    await this.adjustAccountBalance(to_account_id, amount, 'add');

    return newTransfer;
  },

  // 3. Hapus Transfer & Rollback Saldo Kedua Akun
  async deleteTransfer(id) {
    const { data: tf, error: fetchErr } = await supabase
      .from('account_transfers')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !tf) throw new Error('Data transfer tidak ditemukan');

    // Rollback: Kembalikan saldo asal & kurangi saldo tujuan
    await this.adjustAccountBalance(tf.from_account_id, tf.amount, 'add');
    await this.adjustAccountBalance(tf.to_account_id, tf.amount, 'deduct');

    const { error } = await supabase.from('account_transfers').delete().eq('id', id);
    if (error) throw error;
  },

  // Helper Adjust Balance Aset/Liabilitas
  async adjustAccountBalance(accountId, amount, operation) {
    const { data: account, error } = await supabase
      .from('assets_liabilities')
      .select('amount')
      .eq('id', accountId)
      .single();

    if (error || !account) return;

    let currentBalance = Number(account.amount);
    let newBalance = operation === 'add' 
      ? currentBalance + Number(amount) 
      : currentBalance - Number(amount);

    await supabase
      .from('assets_liabilities')
      .update({ amount: Math.max(0, newBalance) })
      .eq('id', accountId);
  }
};