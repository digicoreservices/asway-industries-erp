import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { isAfter, parseISO } from 'date-fns';

const usePurchaseOrderReceiptManagement = () => {
  const [receipts, setReceipts] = useState([]);
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('All');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [allUsers, setAllUsers] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const isInitialized = useRef(false);

  const fetchAllUsers = useCallback(async () => {
    try {
      console.log("usePurchaseOrderReceiptManagement: Fetching all users...");
      const { data, error } = await supabase
        .from('purchase_order_receipts')
        .select('user');
      
      if (error) throw error;

      if (data) {
        const uniqueUsers = [...new Set(data.map(item => item.user).filter(Boolean))];
        setAllUsers(uniqueUsers);
      }
    } catch (error) {
      console.error("fetchAllUsers error:", error);
      toast({ title: 'Error fetching users', description: error.message, variant: 'destructive' });
    }
  }, [toast]);

  const fetchWorkOrders = useCallback(async () => {
    setLoading(true);
    try {
      console.log("usePurchaseOrderReceiptManagement: Fetching work orders...");
      const { data, error } = await supabase
        .from('work_orders')
        .select('id, work_order_number, purchase_order_receipt_id, work_order_date');
      
      if (error) throw error;
      
      setWorkOrders(data || []);
      return data || [];
    } catch (error) {
      console.error("fetchWorkOrders error:", error);
      toast({ title: 'Error fetching work orders', description: error.message, variant: 'destructive' });
      setWorkOrders([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    try {
      console.log("usePurchaseOrderReceiptManagement: Fetching receipts...");
      const { data, error } = await supabase
        .from('purchase_order_receipts')
        .select('*, customers:customer_id (customer_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setReceipts(data || []);
    } catch (error) {
      console.error("fetchReceipts error:", error);
      toast({ title: 'Error fetching receipts', description: error.message, variant: 'destructive' });
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  const fetchItems = useCallback(async (receiptId) => {
    if (!receiptId) return;
    setLoading(true);
    try {
      console.log(`usePurchaseOrderReceiptManagement: Fetching items for receipt ${receiptId}...`);
      const { data, error } = await supabase
        .from('purchase_order_receipt_items')
        .select('*')
        .eq('receipt_id', receiptId);

      if (error) throw error;
      
      setItems(data || []);
    } catch (error) {
      console.error("fetchItems error:", error);
      toast({ title: 'Error fetching items', description: error.message, variant: 'destructive' });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchReceiptDetails = useCallback(async (receiptId) => {
    setLoading(true);
    try {
      console.log(`usePurchaseOrderReceiptManagement: Fetching details for receipt ${receiptId}...`);
      const { data: receiptData, error: receiptError } = await supabase
        .from('purchase_order_receipts')
        .select('*, customer:customers(customer_name)')
        .eq('id', receiptId)
        .single();

      if (receiptError) throw receiptError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('purchase_order_receipt_items')
        .select('*, delivery_schedules:purchase_order_receipt_items_delivery_schedules(*)')
        .eq('receipt_id', receiptId);

      if (itemsError) throw itemsError;
      
      return { ...receiptData, items: itemsData };
    } catch (error) {
      console.error("fetchReceiptDetails error:", error);
      toast({ title: 'Error fetching receipt details', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // Use a ref to strictly prevent infinite loops on mount if dependencies change unexpectedly
    if (!isInitialized.current) {
      isInitialized.current = true;
      fetchReceipts();
      fetchAllUsers();
    }
  }, [fetchReceipts, fetchAllUsers]);

  const addReceiptWithItems = async (receiptData, itemsData) => {
    setLoading(true);
    try {
      console.log("usePurchaseOrderReceiptManagement: Adding new receipt...", receiptData);
      const { data: receiptResult, error: receiptError } = await supabase
        .from('purchase_order_receipts')
        .insert([receiptData])
        .select()
        .single();

      if (receiptError) throw receiptError;

      for (const item of itemsData) {
          const { delivery_schedules, ...itemDetails } = item;
          const itemPayload = { ...itemDetails, receipt_id: receiptResult.id };

          const { data: itemResult, error: itemError } = await supabase
              .from('purchase_order_receipt_items')
              .insert([itemPayload])
              .select()
              .single();

          if (itemError) {
              await supabase.from('purchase_order_receipts').delete().eq('id', receiptResult.id); // Rollback
              throw itemError;
          }

          if (delivery_schedules && delivery_schedules.length > 0) {
              const schedulesPayload = delivery_schedules.map(schedule => ({
                  ...schedule,
                  item_id: itemResult.id
              }));
              const { error: scheduleError } = await supabase
                  .from('purchase_order_receipt_items_delivery_schedules')
                  .insert(schedulesPayload);
              
              if (scheduleError) {
                   await supabase.from('purchase_order_receipts').delete().eq('id', receiptResult.id); // Rollback
                   throw scheduleError;
              }
          }
      }

      toast({ title: 'Success', description: 'Purchase order receipt created successfully.' });
      await fetchReceipts();
      await fetchAllUsers();
      return true;
    } catch (error) {
      console.error("addReceiptWithItems error:", error);
      toast({ title: 'Error creating receipt', description: error.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateReceiptWithItems = async (receiptId, receiptData, itemsData) => {
    setLoading(true);
    try {
        console.log(`usePurchaseOrderReceiptManagement: Updating receipt ${receiptId}...`);
        // Update main receipt
        const { error: receiptError } = await supabase.from('purchase_order_receipts').update(receiptData).eq('id', receiptId);
        if (receiptError) throw receiptError;

        const existingDbItems = (await supabase.from('purchase_order_receipt_items').select('id').eq('receipt_id', receiptId)).data || [];
        const existingDbItemIds = existingDbItems.map(i => i.id);
        const incomingItemIds = itemsData.map(i => i.id).filter(Boolean);

        const itemsToInsert = itemsData.filter(i => !i.id);
        const itemsToUpdate = itemsData.filter(i => i.id);
        const itemIdsToDelete = existingDbItemIds.filter(id => !incomingItemIds.includes(id));
        
        // Delete items no longer present
        if (itemIdsToDelete.length > 0) {
            await supabase.from('purchase_order_receipt_items_delivery_schedules').delete().in('item_id', itemIdsToDelete);
            const { error } = await supabase.from('purchase_order_receipt_items').delete().in('id', itemIdsToDelete);
            if (error) throw error;
        }

        // Update existing items
        for (const item of itemsToUpdate) {
            const { id, delivery_schedules, ...itemDetails } = item;
            const { error: itemUpdateError } = await supabase.from('purchase_order_receipt_items').update(itemDetails).eq('id', id);
            if (itemUpdateError) throw itemUpdateError;
            
            const existingSchedules = (await supabase.from('purchase_order_receipt_items_delivery_schedules').select('id').eq('item_id', id)).data || [];
            const existingScheduleIds = existingSchedules.map(s => s.id);
            const incomingScheduleIds = (delivery_schedules || []).map(s => s.id).filter(Boolean);

            const schedulesToInsert = (delivery_schedules || []).filter(s => !s.id).map(s => ({...s, item_id: id}));
            const schedulesToUpdate = (delivery_schedules || []).filter(s => s.id);
            const scheduleIdsToDelete = existingScheduleIds.filter(id => !incomingScheduleIds.includes(id));

            if (scheduleIdsToDelete.length > 0) {
                 const { error } = await supabase.from('purchase_order_receipt_items_delivery_schedules').delete().in('id', scheduleIdsToDelete);
                 if (error) throw error;
            }
            for (const schedule of schedulesToUpdate) {
                const {id: scheduleId, ...scheduleDetails} = schedule;
                const { error } = await supabase.from('purchase_order_receipt_items_delivery_schedules').update(scheduleDetails).eq('id', scheduleId);
                if (error) throw error;
            }
            if (schedulesToInsert.length > 0) {
                 const { error } = await supabase.from('purchase_order_receipt_items_delivery_schedules').insert(schedulesToInsert);
                 if (error) throw error;
            }
        }
        
        // Insert new items
        for (const item of itemsToInsert) {
            const { delivery_schedules, ...itemDetails } = item;
            const { data: newItem, error: itemInsertError } = await supabase.from('purchase_order_receipt_items').insert({...itemDetails, receipt_id: receiptId}).select().single();
            if (itemInsertError) throw itemInsertError;
            if (delivery_schedules && delivery_schedules.length > 0) {
                const schedulesPayload = delivery_schedules.map(s => ({...s, item_id: newItem.id}));
                const { error: scheduleError } = await supabase.from('purchase_order_receipt_items_delivery_schedules').insert(schedulesPayload);
                if (scheduleError) throw scheduleError;
            }
        }
        
        toast({ title: 'Success', description: 'Receipt updated successfully.' });
        await fetchReceipts();
        await fetchAllUsers();
        return true;
    } catch (error) {
        console.error("updateReceiptWithItems error:", error);
        toast({ title: 'Error updating receipt', description: error.message, variant: 'destructive' });
        return false;
    } finally {
        setLoading(false);
    }
  };
  
  const addRemainingPayment = async (receiptId, paymentDetails) => { 
    setLoading(true);
    try {
      console.log(`usePurchaseOrderReceiptManagement: Adding remaining payment for ${receiptId}...`);
      const { error } = await supabase
        .from('purchase_order_receipts')
        .update(paymentDetails)
        .eq('id', receiptId);

      if (error) throw error;

      toast({ title: 'Success', description: 'Remaining payment details added.' });
      await fetchReceipts();
      return true;
    } catch (error) {
      console.error("addRemainingPayment error:", error);
      toast({ title: 'Error Adding Payment', description: error.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteReceipt = async (receiptId) => {
     setLoading(true);
     try {
        console.log(`usePurchaseOrderReceiptManagement: Deleting receipt ${receiptId}...`);
        const { data: items, error: itemFetchError } = await supabase.from('purchase_order_receipt_items').select('id').eq('receipt_id', receiptId);
        if (itemFetchError) throw itemFetchError;

        const itemIds = items.map(i => i.id);
        if (itemIds.length > 0) {
          const { error: scheduleError } = await supabase.from('purchase_order_receipt_items_delivery_schedules').delete().in('item_id', itemIds);
          if (scheduleError) throw scheduleError;

          const { error: itemsError } = await supabase.from('purchase_order_receipt_items').delete().eq('receipt_id', receiptId);
          if (itemsError) throw itemsError;
        }

        const { error: receiptError } = await supabase.from('purchase_order_receipts').delete().eq('id', receiptId);
        if (receiptError) throw receiptError;
        
        toast({ title: 'Success', description: 'Receipt and all its items have been deleted.' });
        await fetchReceipts();
        await fetchAllUsers();
        return true;

    } catch (error) {
        console.error("deleteReceipt error:", error);
        toast({ title: 'Error Deleting Receipt', description: error.message, variant: 'destructive' });
        return false;
    } finally {
      setLoading(false);
    }
  };
  
  const fetchAllReceiptsWithItems = useCallback(async () => {
    setLoading(true);
    try {
      console.log("usePurchaseOrderReceiptManagement: Fetching all receipts with items...");
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: allReceipts, error: receiptsError } = await supabase
        .from('purchase_order_receipts')
        .select('*, customers:customer_id (customer_name)')
        .order('created_at', { ascending: false });

      if (receiptsError) throw receiptsError;

      const { data: allItems, error: itemsError } = await supabase
        .from('purchase_order_receipt_items')
        .select('id, receipt_id, quantity, delivery_schedules:purchase_order_receipt_items_delivery_schedules(delivery_date, quantity)');
      
      if (itemsError) throw itemsError;

      const receiptsWithDeliveryStatus = allReceipts.map(receipt => {
        const receiptItems = allItems.filter(item => item.receipt_id === receipt.id);
        
        if (receiptItems.length === 0) {
          return { ...receipt, delivery_status: 'Not Delivered' };
        }
        
        const allItemsDelivered = receiptItems.every(item => {
          if (!item.delivery_schedules || item.delivery_schedules.length === 0) {
            return item.quantity === 0;
          }
          
          const totalScheduledQty = item.delivery_schedules.reduce((sum, s) => sum + (s.quantity || 0), 0);
          
          if (totalScheduledQty < item.quantity) {
            return false;
          }

          return item.delivery_schedules.every(s => isAfter(today, parseISO(s.delivery_date)));
        });

        return { ...receipt, delivery_status: allItemsDelivered ? 'Delivered' : 'Not Delivered' };
      });
      
      return receiptsWithDeliveryStatus;
    } catch (error) {
      console.error("fetchAllReceiptsWithItems error:", error);
      toast({ title: 'Error fetching receipts', description: error.message, variant: 'destructive' });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const filteredReceipts = useMemo(() => {
    return receipts.filter(receipt => {
      const customerName = receipt.customers?.customer_name || '';
      const matchesCustomer = filterCustomer === 'All' || customerName === filterCustomer;
      const matchesSearch = searchTerm === '' ||
        (receipt.order_receipt_id && receipt.order_receipt_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (customerName && customerName.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCustomer && matchesSearch;
    });
  }, [receipts, searchTerm, filterCustomer]);
  
  const customerNames = useMemo(() => {
    return ['All', ...new Set(receipts.map(r => r.customers?.customer_name).filter(Boolean))];
  }, [receipts]);

  return {
    receipts,
    items,
    setItems,
    filteredReceipts,
    searchTerm,
    setSearchTerm,
    filterCustomer,
    setFilterCustomer,
    customerNames,
    allUsers,
    workOrders, 
    fetchWorkOrders,
    fetchReceipts,
    fetchItems,
    fetchReceiptDetails,
    addReceiptWithItems,
    updateReceiptWithItems,
    addRemainingPayment,
    deleteReceipt,
    fetchAllReceiptsWithItems,
    loading,
  };
};

export default usePurchaseOrderReceiptManagement;