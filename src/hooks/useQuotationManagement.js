import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const useQuotationManagement = () => {
  const [quotations, setQuotations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchQuotations = useCallback(async () => {
    const { data, error } = await supabase
      .from('quotations')
      .select(`
        *,
        customers (
          customer_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error fetching quotations', description: error.message, variant: 'destructive' });
    } else {
      setQuotations(data || []);
    }
  }, [toast]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const addQuotationWithItems = async (quotationData, itemsData) => {
    // Step 1: Insert the main quotation
    const { data: quotationResult, error: quotationError } = await supabase
      .from('quotations')
      .insert([quotationData])
      .select()
      .single();

    if (quotationError) {
      toast({ title: 'Error saving quotation', description: quotationError.message, variant: 'destructive' });
      return false;
    }

    if (!quotationResult) {
      toast({ title: 'Error saving quotation', description: 'Could not get the new quotation ID.', variant: 'destructive' });
      return false;
    }

    // Step 2: Prepare and insert the quotation items
    const itemsWithQuotationId = itemsData.map(item => ({
      ...item,
      quotation_id: quotationResult.id,
    }));

    const { error: itemsError } = await supabase
      .from('quotation_items')
      .insert(itemsWithQuotationId);

    if (itemsError) {
      // Rollback the quotation if items fail to insert
      await supabase.from('quotations').delete().eq('id', quotationResult.id);
      toast({ title: 'Error saving items', description: itemsError.message, variant: 'destructive' });
      return false;
    }

    // Step 3: Success
    toast({ title: 'Success!', description: 'Quotation and all items saved successfully.' });
    await fetchQuotations();
    return true;
  };

  const deleteQuotation = async (quotationId) => {
    // First delete related items
    const { error: itemsError } = await supabase.from('quotation_items').delete().eq('quotation_id', quotationId);
    if (itemsError) {
      toast({ title: 'Error deleting quotation items', description: itemsError.message, variant: 'destructive' });
      return;
    }

    // Then delete the quotation
    const { error } = await supabase.from('quotations').delete().eq('id', quotationId);

    if (error) {
      toast({ title: 'Error deleting quotation', description: error.message, variant: 'destructive' });
    } else {
      setQuotations(prev => prev.filter(q => q.id !== quotationId));
      toast({ title: 'Success', description: 'Quotation deleted.' });
    }
  };

  const filteredQuotations = useMemo(() => {
    if (!searchTerm) return quotations;
    const lowercasedFilter = searchTerm.toLowerCase();
    return quotations.filter(q =>
      q.quotation_id.toLowerCase().includes(lowercasedFilter) ||
      (q.customers && q.customers.customer_name.toLowerCase().includes(lowercasedFilter))
    );
  }, [quotations, searchTerm]);

  return {
    quotations,
    filteredQuotations,
    searchTerm,
    setSearchTerm,
    addQuotationWithItems,
    deleteQuotation,
    fetchQuotations,
  };
};

export default useQuotationManagement;