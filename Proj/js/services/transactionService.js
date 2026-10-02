import { supabase } from '../config/supabase.js';

export const transactionService = {
  // 1. Ambil Kategori dari Supabase
  async getCategories(type) {
    let query = supabase.from('categories').select('*').order('name', { ascending: true });
    if (type) query = query.eq('type', type);
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // 2. Buat Kategori Baru
  async createCategory(name, type) {
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name, type }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 3. Ambil Transaksi berdasarkan Rentang Tanggal
  async getTransactions({ startDate, endDate }) {
    let query = supabase
      .from('transactions')
      .select(`
        *,
        categories ( name, icon ),
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

  // 4. Helper Tag Otomatis
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

  // 5. Simpan Transaksi Baru
  async createTransaction(transactionData, tagNamesArray = []) {
    const { data: newTransaction, error: txError } = await supabase
      .from('transactions')
      .insert([transactionData])
      .select()
      .single();

    if (txError) throw txError;

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

    return newTransaction;
  },

  // 6. Hapus Transaksi
  async deleteTransaction(id) {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
  }
};