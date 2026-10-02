import { supabase } from '../config/supabase.js';

export const assetService = {
  // Ambil semua Aset & Liabilitas
  async getAssetsAndLiabilities() {
    const { data, error } = await supabase
      .from('assets_liabilities')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Buat Aset/Liabilitas Baru
  async createAssetOrLiability(itemData) {
    const { data, error } = await supabase
      .from('assets_liabilities')
      .insert([itemData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Hapus Aset/Liabilitas
  async deleteAssetOrLiability(id) {
    const { error } = await supabase
      .from('assets_liabilities')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};