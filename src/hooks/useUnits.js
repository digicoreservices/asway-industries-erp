
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';

const useUnits = () => {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const fetchUnits = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('units')
        .select('id, name, symbol')
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      
      setUnits(data || []);
    } catch (err) {
      console.error('Error fetching units:', err);
      setError(err);
      toast({
        title: 'Error Loading Units',
        description: err.message || 'Failed to load units from database.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const addUnit = async (unitData) => {
    try {
      const { data, error: insertError } = await supabase
        .from('units')
        .insert([{
          name: unitData.name,
          symbol: unitData.symbol || unitData.name
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      setUnits(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      
      toast({
        title: 'Unit Added',
        description: `Unit "${unitData.name}" has been added successfully.`
      });

      return { data, error: null };
    } catch (err) {
      console.error('Error adding unit:', err);
      toast({
        title: 'Error Adding Unit',
        description: err.message || 'Failed to add unit to database.',
        variant: 'destructive'
      });
      return { data: null, error: err };
    }
  };

  const deleteUnit = async (unitId) => {
    try {
      const { error: deleteError } = await supabase
        .from('units')
        .delete()
        .eq('id', unitId);

      if (deleteError) throw deleteError;

      setUnits(prev => prev.filter(unit => unit.id !== unitId));
      
      toast({
        title: 'Unit Deleted',
        description: 'Unit has been deleted successfully.'
      });

      return { error: null };
    } catch (err) {
      console.error('Error deleting unit:', err);
      toast({
        title: 'Error Deleting Unit',
        description: err.message || 'Failed to delete unit from database.',
        variant: 'destructive'
      });
      return { error: err };
    }
  };

  return {
    units,
    loading,
    error,
    addUnit,
    deleteUnit,
    refreshUnits: fetchUnits
  };
};

export default useUnits;
