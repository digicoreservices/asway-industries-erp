
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';

/**
 * Custom hook for managing product units from centralized products table
 * Provides functions to fetch, add, and delete units
 */
const useProductUnits = () => {
  const { toast } = useToast();
  
  const unitsCache = useRef(null);
  const hasFetched = useRef(false);
  
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch all unique units from products table
   * Excludes null/empty values and sorts alphabetically
   */
  const fetchUnits = useCallback(async () => {
    // Use cache if available
    if (hasFetched.current && unitsCache.current) {
      console.log('[useProductUnits] Using cached units');
      return unitsCache.current;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[useProductUnits] Fetching unique units from products table...');
      
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('unit')
        .not('unit', 'is', null)
        .neq('unit', '');

      if (fetchError) throw fetchError;

      // Extract unique units and sort alphabetically
      const uniqueUnits = [...new Set(data.map(item => item.unit))].sort();
      
      console.log(`[useProductUnits] ✅ Fetched ${uniqueUnits.length} unique units:`, uniqueUnits);
      
      unitsCache.current = uniqueUnits;
      hasFetched.current = true;
      setUnits(uniqueUnits);
      
      return uniqueUnits;
    } catch (err) {
      console.error('[useProductUnits] ❌ Error fetching units:', err);
      setError(err.message);
      
      toast({
        title: 'Error Loading Units',
        description: 'Could not load unit types from database.',
        variant: 'destructive'
      });
      
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch units on mount
  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  /**
   * Get all unique units (memoized)
   * @returns {string[]} Array of unit names
   */
  const getUnits = useCallback(() => {
    return unitsCache.current || units;
  }, [units]);

  /**
   * Add a new unit to the system
   * Note: Since we don't have a separate units table, this adds a dummy product
   * with the new unit type, which will then be picked up by fetchUnits()
   * 
   * @param {string} unitName - Name of the unit to add
   * @returns {Promise<boolean>} Success status
   */
  const addUnit = useCallback(async (unitName) => {
    if (!unitName || unitName.trim() === '') {
      toast({
        title: 'Validation Error',
        description: 'Unit name cannot be empty.',
        variant: 'destructive'
      });
      return false;
    }

    const trimmedUnit = unitName.trim();
    
    // Check if unit already exists
    const existingUnits = unitsCache.current || units;
    if (existingUnits.includes(trimmedUnit)) {
      toast({
        title: 'Duplicate Unit',
        description: `Unit "${trimmedUnit}" already exists.`,
        variant: 'destructive'
      });
      return false;
    }

    try {
      console.log(`[useProductUnits] Adding new unit: "${trimmedUnit}"`);
      
      // Create a placeholder product with this unit to register it in the system
      const { error } = await supabase
        .from('products')
        .insert({
          product_name: `[Unit Placeholder - ${trimmedUnit}]`,
          product_type: 'Sale',
          unit: trimmedUnit,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      console.log('[useProductUnits] ✅ Unit added successfully');

      // Refresh cache
      hasFetched.current = false;
      await fetchUnits();

      toast({
        title: 'Success',
        description: `Unit "${trimmedUnit}" added successfully.`
      });

      return true;
    } catch (err) {
      console.error('[useProductUnits] ❌ Error adding unit:', err);
      
      toast({
        title: 'Error Adding Unit',
        description: err.message,
        variant: 'destructive'
      });
      
      return false;
    }
  }, [units, fetchUnits, toast]);

  /**
   * Delete a unit from the system
   * Only allows deletion if no products are using this unit
   * 
   * @param {string} unitName - Name of the unit to delete
   * @returns {Promise<boolean>} Success status
   */
  const deleteUnit = useCallback(async (unitName) => {
    if (!unitName || unitName.trim() === '') {
      toast({
        title: 'Validation Error',
        description: 'Unit name cannot be empty.',
        variant: 'destructive'
      });
      return false;
    }

    try {
      console.log(`[useProductUnits] Checking if unit "${unitName}" is in use...`);
      
      // Check if any products are using this unit
      const { data: productsUsingUnit, error: checkError } = await supabase
        .from('products')
        .select('id, product_name')
        .eq('unit', unitName)
        .not('product_name', 'ilike', '%[Unit Placeholder%');

      if (checkError) throw checkError;

      if (productsUsingUnit && productsUsingUnit.length > 0) {
        console.warn(`[useProductUnits] ⚠️ Cannot delete unit "${unitName}" - used by ${productsUsingUnit.length} products`);
        
        toast({
          title: 'Cannot Delete Unit',
          description: `Unit "${unitName}" is in use by ${productsUsingUnit.length} product(s) and cannot be deleted.`,
          variant: 'destructive'
        });
        
        return false;
      }

      console.log(`[useProductUnits] Deleting unit placeholder for "${unitName}"...`);
      
      // Delete only the placeholder product for this unit
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('unit', unitName)
        .ilike('product_name', '%[Unit Placeholder%');

      if (deleteError) throw deleteError;

      console.log('[useProductUnits] ✅ Unit deleted successfully');

      // Refresh cache
      hasFetched.current = false;
      await fetchUnits();

      toast({
        title: 'Success',
        description: `Unit "${unitName}" deleted successfully.`
      });

      return true;
    } catch (err) {
      console.error('[useProductUnits] ❌ Error deleting unit:', err);
      
      toast({
        title: 'Error Deleting Unit',
        description: err.message,
        variant: 'destructive'
      });
      
      return false;
    }
  }, [fetchUnits, toast]);

  return {
    units, // Array of unique unit names (sorted alphabetically)
    loading, // Boolean indicating loading state
    error, // Error message if fetch failed
    getUnits, // Function to get all units
    fetchUnits, // Function to manually refresh units
    addUnit, // Function to add new unit
    deleteUnit // Function to delete unit (only if not in use)
  };
};

export default useProductUnits;
