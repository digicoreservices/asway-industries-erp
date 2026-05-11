
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';

const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('id, name, description')
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(err);
      toast({
        title: 'Error Loading Categories',
        description: err.message || 'Failed to load categories from database.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const addCategory = async (categoryData) => {
    try {
      const { data, error: insertError } = await supabase
        .from('categories')
        .insert([{ name: categoryData.name, description: categoryData.description || null }])
        .select()
        .single();

      if (insertError) throw insertError;

      setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      
      toast({
        title: 'Category Added',
        description: `Category "${categoryData.name}" has been added successfully.`
      });

      return { data, error: null };
    } catch (err) {
      console.error('Error adding category:', err);
      toast({
        title: 'Error Adding Category',
        description: err.message || 'Failed to add category to database.',
        variant: 'destructive'
      });
      return { data: null, error: err };
    }
  };

  const deleteCategory = async (categoryId) => {
    try {
      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (deleteError) throw deleteError;

      setCategories(prev => prev.filter(cat => cat.id !== categoryId));
      
      toast({
        title: 'Category Deleted',
        description: 'Category has been deleted successfully.'
      });

      return { error: null };
    } catch (err) {
      console.error('Error deleting category:', err);
      toast({
        title: 'Error Deleting Category',
        description: err.message || 'Failed to delete category from database.',
        variant: 'destructive'
      });
      return { error: err };
    }
  };

  return {
    categories,
    loading,
    error,
    addCategory,
    deleteCategory,
    refreshCategories: fetchCategories
  };
};

export default useCategories;
