import { supabase } from '../config/supabase.js';

export const budgetGoalService = {
  // Update Budget Limit Kategori
  async updateCategoryBudget(categoryId, budgetLimit) {
    const { data, error } = await supabase
      .from('categories')
      .update({ budget_limit: budgetLimit })
      .eq('id', categoryId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Ambil Daftar Savings Goals
  async getSavingsGoals() {
    const { data, error } = await supabase
      .from('savings_goals')
      .select('*, assets_liabilities(name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Buat Target Tabungan Baru
  async createSavingsGoal(goalData) {
    const { data, error } = await supabase
      .from('savings_goals')
      .insert([goalData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Tambah Saldo ke Target Tabungan
  async addProgressToGoal(goalId, addedAmount) {
    const { data: goal, error: fetchErr } = await supabase
      .from('savings_goals')
      .select('current_amount')
      .eq('id', goalId)
      .single();

    if (fetchErr || !goal) throw new Error('Target tabungan tidak ditemukan');

    const newAmount = Number(goal.current_amount) + Number(addedAmount);

    const { data, error } = await supabase
      .from('savings_goals')
      .update({ current_amount: newAmount })
      .eq('id', goalId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Hapus Target Tabungan
  async deleteSavingsGoal(id) {
    const { error } = await supabase.from('savings_goals').delete().eq('id', id);
    if (error) throw error;
  }
};