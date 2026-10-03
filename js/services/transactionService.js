import { supabase } from '../config/supabase.js';

export const transactionService = {
  // 1. Ambil Kategori
  async getCategories(type) {
    let query = supabase.from('categories').select('*').order('name', { ascending: true });
    if (type) query = query.eq('type', type);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // 2. Ambil Transaksi (Beserta relasi Akun/Aset)
  async getTransactions({ startDate, endDate }) {
    let query = supabase
      .from('transactions')
      .select(`
        *,
        categories ( name, icon ),
        assets_liabilities ( id, name, type ),
        transaction_tags (
          tags ( id, name )
        )
      `)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('transaction_date', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // 3. Helper Tag Otomatis
  async getOrCreateTag(tagName) {
    const cleanName = tagName.trim().toLowerCase().replace(/^#/, '');
    if (!cleanName) return null;

    const { data: existingTag } = await supabase
      .from('tags')
      .select('id')
      .eq('name', cleanName)
      .maybeSingle();

    if (existingTag) return existingTag.id;

    const { data: newTag, error } = await supabase
      .from('tags')
      .insert([{ name: cleanName }])
      .select('id')
      .single();

    if (error) throw error;
    return newTag.id;
  },

  // 4. Simpan Transaksi Baru + AUTO-UPDATE SALDO ASET/LIABILITAS
  async createTransaction(transactionData, tagNamesArray = []) {
    // A. Insert data utama transaksi
    const { data: newTransaction, error: txError } = await supabase
      .from('transactions')
      .insert([transactionData])
      .select()
      .single();

    if (txError) throw txError;

    // B. Olah Tags jika ada
    if (tagNamesArray.length > 0) {
      for (const tagName of tagNamesArray) {
        const tagId = await this.getOrCreateTag(tagName);
        if (tagId) {
          await supabase.from('transaction_tags').insert([
            { transaction_id: newTransaction.id, tag_id: tagId }
          ]);
        }
      }
    }

    // C. INTEGRASI: Update Saldo Aset / Liabilitas jika account_id dipilih
    if (transactionData.account_id) {
      await this.adjustAccountBalance(
        transactionData.account_id, 
        transactionData.amount, 
        transactionData.type
      );
    }

    return newTransaction;
  },

  // 5. Hapus Transaksi + ROLLBACK SALDO
  async deleteTransaction(id) {
    // Ambil data transaksi dulu sebelum dihapus untuk rollback saldo
    const { data: tx } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (tx && tx.account_id) {
      // Kebalikan dari operasi awal untuk me-rollback saldo
      const reverseType = tx.type === 'income' ? 'expense' : 'income';
      await this.adjustAccountBalance(tx.account_id, tx.amount, reverseType);
    }

    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
  },

  // 6. Helper Adjust Balance Aset/Liabilitas
  async adjustAccountBalance(accountId, amount, transactionType) {
    const { data: account, error: fetchErr } = await supabase
      .from('assets_liabilities')
      .select('*')
      .eq('id', accountId)
      .single();

    if (fetchErr || !account) return;

    let currentBalance = Number(account.amount);
    let newBalance = currentBalance;

    if (account.type === 'asset') {
      // Pemasukan menambah saldo aset, Pengeluaran mengurangi
      newBalance = transactionType === 'income' 
        ? currentBalance + Number(amount) 
        : currentBalance - Number(amount);
    } else if (account.type === 'liability') {
      // Pengeluaran untuk liabilitas mengurangi jumlah utang, Pemasukan menambah utang
      newBalance = transactionType === 'expense' 
        ? currentBalance - Number(amount) 
        : currentBalance + Number(amount);
    }

    // Update saldo baru ke database
    await supabase
      .from('assets_liabilities')
      .update({ amount: Math.max(0, newBalance) })
      .eq('id', accountId);
  }
};