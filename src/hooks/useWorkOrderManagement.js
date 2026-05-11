import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const useWorkOrderManagement = () => {
  const [workOrders, setWorkOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchWorkOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from('work_orders')
      .select(`
        *,
        customers (
          customer_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error fetching work orders', description: error.message, variant: 'destructive' });
    } else {
      setWorkOrders(data);
    }
  }, [toast]);

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  const addWorkOrder = async (newWorkOrderData) => {
    const { data, error } = await supabase
      .from('work_orders')
      .insert([newWorkOrderData])
      .select();

    if (error) {
      toast({ title: 'Error adding work order', description: error.message, variant: 'destructive' });
      return null;
    } else if (data) {
      await fetchWorkOrders();
      toast({ title: 'Success', description: 'New work order added successfully.' });
      return data[0];
    }
    return null;
  };

  const deleteWorkOrder = async (workOrderId) => {
    const { error } = await supabase.from('work_orders').delete().eq('id', workOrderId);

    if (error) {
      toast({ title: 'Error deleting work order', description: error.message, variant: 'destructive' });
    } else {
      setWorkOrders(prev => prev.filter(wo => wo.id !== workOrderId));
      toast({ title: 'Success', description: 'Work order deleted.' });
    }
  };

  const filteredWorkOrders = useMemo(() => {
    if (!searchTerm) return workOrders;
    const lowercasedFilter = searchTerm.toLowerCase();
    return workOrders.filter(wo =>
      wo.work_order_number.toLowerCase().includes(lowercasedFilter) ||
      (wo.customers && wo.customers.customer_name.toLowerCase().includes(lowercasedFilter)) ||
      (wo.item_name && wo.item_name.toLowerCase().includes(lowercasedFilter))
    );
  }, [workOrders, searchTerm]);

  return {
    workOrders,
    filteredWorkOrders,
    searchTerm,
    setSearchTerm,
    addWorkOrder,
    deleteWorkOrder,
    fetchWorkOrders,
  };
};

export default useWorkOrderManagement;