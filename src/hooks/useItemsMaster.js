
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';

const useItemsMaster = (categoryId = null) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('items_master')
        .select('id, name, category_id, description, categories(name)')
        .order('name', { ascending: true });

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      
      setItems(data || []);
    } catch (err) {
      console.error('Error fetching items:', err);
      setError(err);
      toast({
        title: 'Error Loading Items',
        description: err.message || 'Failed to load items from database.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [categoryId, toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = async (itemData) => {
    try {
      const { data, error: insertError } = await supabase
        .from('items_master')
        .insert([{
          name: itemData.name,
          category_id: itemData.category_id,
          description: itemData.description || null
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      setItems(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      
      toast({
        title: 'Item Added',
        description: `Item "${itemData.name}" has been added successfully.`
      });

      return { data, error: null };
    } catch (err) {
      console.error('Error adding item:', err);
      toast({
        title: 'Error Adding Item',
        description: err.message || 'Failed to add item to database.',
        variant: 'destructive'
      });
      return { data: null, error: err };
    }
  };

  const deleteItem = async (itemId) => {
    try {
      const { error: deleteError } = await supabase
        .from('items_master')
        .delete()
        .eq('id', itemId);

      if (deleteError) throw deleteError;

      setItems(prev => prev.filter(item => item.id !== itemId));
      
      toast({
        title: 'Item Deleted',
        description: 'Item has been deleted successfully.'
      });

      return { error: null };
    } catch (err) {
      console.error('Error deleting item:', err);
      toast({
        title: 'Error Deleting Item',
        description: err.message || 'Failed to delete item from database.',
        variant: 'destructive'
      });
      return { error: err };
    }
  };

  return {
    items,
    loading,
    error,
    addItem,
    deleteItem,
    refreshItems: fetchItems
  };
};

export default useItemsMaster;
