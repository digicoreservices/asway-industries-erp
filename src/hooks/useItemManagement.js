import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { LocalStorageDB } from '@/lib/LocalStorageDB';
import { useAuth } from '@/contexts/AuthProvider';
import { useToast } from '@/components/ui/use-toast';
import { withTimeout } from '@/lib/utils';

const useItemManagement = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const { isLocalMode } = useAuth() || {};
  const { toast } = useToast();

  const fetchItems = useCallback(async (force = false) => {
    if (hasFetched && !force) return;

    try {
      setLoading(true);
      if (isLocalMode) {
        setItems(LocalStorageDB.getData('items') || []);
        setHasFetched(true);
        return;
      }
      
      const { data, error } = await withTimeout(
        supabase
          .from('items')
          .select('id, supplier_id, supplier_invoice_number, invoice_date, category, item_name, unit, quantity, price, total_price, supplier_name, used_quantity, cgst, sgst, igst, total_price_with_gst, department, user_name, created_at')
          .order('created_at', { ascending: false })
          .limit(300),
        25000,
        'Fetch Items'
      );
      
      if (error) throw error;
      setItems(data || []);
      setHasFetched(true);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast({ 
        title: 'Network Warning', 
        description: 'Failed to load items. Showing cached data if available.', 
        variant: 'destructive' 
      });
      if (items.length === 0) setItems(LocalStorageDB.getData('items') || []);
    } finally {
      setLoading(false);
    }
  }, [isLocalMode, hasFetched, items.length, toast]);

  useEffect(() => {
    if (!hasFetched) fetchItems();
  }, [fetchItems, hasFetched]);

  const addItem = async (itemData) => {
    if (isLocalMode) {
      const newItem = { ...itemData, id: Date.now().toString(), created_at: new Date().toISOString() };
      LocalStorageDB.saveData('items', newItem);
      setItems(prev => [newItem, ...prev]);
      return { data: newItem, error: null };
    }
    const { data, error } = await withTimeout(
      supabase.from('items').insert([itemData]).select(),
      15000,
      'Add Item'
    );
    if (!error && data) setItems(prev => [data[0], ...prev]);
    return { data, error };
  };

  const addItems = async (itemsArray) => {
    if (!itemsArray || itemsArray.length === 0) {
      return { data: [], error: null };
    }
    
    if (isLocalMode) {
      const newItems = itemsArray.map(item => ({
        ...item,
        id: item.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString()
      }));
      
      newItems.forEach(item => LocalStorageDB.saveData('items', item));
      setItems(prev => [...newItems, ...prev]);
      return { data: newItems, error: null };
    }
    
    try {
      const { data, error } = await withTimeout(
        supabase.from('items').insert(itemsArray).select(),
        15000,
        'Add Multiple Items'
      );
      
      if (error) {
        console.error("Supabase insert error:", error);
        throw error;
      }
      
      if (data) {
        setItems(prev => [...data, ...prev]);
      }
      
      return { data, error: null };
    } catch (err) {
      console.error("Hook addItems error:", err);
      return { data: null, error: err };
    }
  };

  const updateItem = async (id, itemData) => {
    if (isLocalMode) {
      const updated = LocalStorageDB.updateData('items', id, itemData);
      setItems(prev => prev.map(i => i.id === id ? updated : i));
      return { data: updated, error: null };
    }
    const { data, error } = await withTimeout(
      supabase.from('items').update(itemData).eq('id', id).select(),
      15000,
      'Update Item'
    );
    if (!error && data) setItems(prev => prev.map(i => i.id === id ? data[0] : i));
    return { data, error };
  };

  const deleteItem = async (id) => {
    if (isLocalMode) {
      LocalStorageDB.deleteData('items', id);
      setItems(prev => prev.filter(i => i.id !== id));
      return { error: null };
    }
    const { error } = await withTimeout(
      supabase.from('items').delete().eq('id', id),
      15000,
      'Delete Item'
    );
    if (!error) setItems(prev => prev.filter(i => i.id !== id));
    return { error };
  };

  return { 
    items, 
    loading, 
    addItem, 
    addItems, // Newly added function for bulk insert
    updateItem, 
    deleteItem, 
    refreshItems: () => fetchItems(true) 
  };
};

export default useItemManagement;