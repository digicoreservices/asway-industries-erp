import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const useSupplierPOReceiptManagement = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('supplier_purchase_order_receipts').select(`
      id,
      po_from_supplier_no,
      supplier_id
    `);
    if (error) {
      toast({
        title: 'Error fetching receipts',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setReceipts(data || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const addReceiptWithItems = async (receiptData, itemsData) => {
    setLoading(true);
    
    const { data: receipt, error: receiptError } = await supabase
      .from('supplier_purchase_order_receipts')
      .insert([receiptData])
      .select()
      .single();

    if (receiptError) {
      setLoading(false);
      toast({
        title: 'Error saving supplier PO receipt',
        description: receiptError.message,
        variant: 'destructive',
      });
      return false;
    }

    const itemsWithReceiptId = itemsData.map(item => ({
      ...item,
      receipt_id: receipt.id,
    }));

    const { error: itemsError } = await supabase
      .from('supplier_purchase_order_receipt_items')
      .insert(itemsWithReceiptId);

    if (itemsError) {
      await supabase.from('supplier_purchase_order_receipts').delete().eq('id', receipt.id);
      
      setLoading(false);
      toast({
        title: 'Error saving items for supplier PO',
        description: `The receipt was not saved. ${itemsError.message}`,
        variant: 'destructive',
      });
      return false;
    }

    setLoading(false);
    toast({
      title: 'Success',
      description: 'Supplier purchase order receipt saved successfully.',
    });
    fetchReceipts();
    return true;
  };

  const fetchReceiptsBySupplier = useCallback(async (supplierId) => {
    if (!supplierId) return [];
    setLoading(true);
    const { data, error } = await supabase
      .from('supplier_purchase_order_receipts')
      .select('id, po_from_supplier_no')
      .eq('supplier_id', supplierId);
    
    setLoading(false);
    if (error) {
      toast({ title: 'Error', description: 'Could not fetch POs for supplier.', variant: 'destructive' });
      return [];
    }
    return data;
  }, [toast]);

  const fetchReceiptDetails = useCallback(async (receiptId) => {
    if (!receiptId) return null;
    setLoading(true);
    const { data, error } = await supabase
      .from('supplier_purchase_order_receipts')
      .select(`
        *,
        suppliers ( * ),
        supplier_purchase_order_receipt_items ( * )
      `)
      .eq('id', receiptId)
      .single();

    setLoading(false);
    if (error) {
      toast({ title: 'Error', description: 'Could not fetch receipt details.', variant: 'destructive' });
      return null;
    }
    return data;
  }, [toast]);

  const updateRemainingPayment = async (receiptId, paymentData) => {
    setLoading(true);
    const { error } = await supabase
      .from('supplier_purchase_order_receipts')
      .update(paymentData)
      .eq('id', receiptId);

    setLoading(false);
    if (error) {
      toast({ title: 'Error', description: 'Failed to update remaining payment.', variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: 'Remaining payment updated successfully.' });
    fetchReceipts();
    return true;
  };

  const deleteReceipt = async (receiptId) => {
    setLoading(true);

    const { error: itemsError } = await supabase
      .from('supplier_purchase_order_receipt_items')
      .delete()
      .eq('receipt_id', receiptId);

    if (itemsError) {
      setLoading(false);
      toast({ title: 'Error deleting items', description: itemsError.message, variant: 'destructive' });
      return false;
    }

    const { error: receiptError } = await supabase
      .from('supplier_purchase_order_receipts')
      .delete()
      .eq('id', receiptId);

    if (receiptError) {
      setLoading(false);
      toast({ title: 'Error deleting receipt', description: receiptError.message, variant: 'destructive' });
      return false;
    }

    setLoading(false);
    fetchReceipts();
    return true;
  };

  return { receipts, loading, fetchReceipts, addReceiptWithItems, fetchReceiptsBySupplier, fetchReceiptDetails, updateRemainingPayment, deleteReceipt };
};

export default useSupplierPOReceiptManagement;