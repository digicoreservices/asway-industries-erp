import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { LocalStorageDB } from '@/lib/LocalStorageDB';
import { useAuth } from '@/contexts/AuthProvider';
import { useToast } from '@/components/ui/use-toast';
import { withTimeout, safeSetCache } from '@/lib/utils';

const CACHE_KEY = 'suppliers_metadata_cache';
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const useSupplierManagement = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);
  
  const { isLocalMode } = useAuth() || {};
  const { toast } = useToast();
  const isFetchingRef = useRef(false);

  const fetchSuppliers = useCallback(async (force = false) => {
    if (isFetchingRef.current) return;
    if (hasFetched && !force) return;

    isFetchingRef.current = true;
    setLoading(true);
    setError(null);
    
    console.log('[useSupplierManagement] Starting fetchSuppliers...', { force, isLocalMode });

    try {
      if (isLocalMode) {
        setSuppliers(LocalStorageDB.getData('suppliers') || []);
        setHasFetched(true);
        isFetchingRef.current = false;
        setLoading(false);
        return;
      }

      // Try to load essential metadata from cache for quick initial render,
      // but STILL proceed to fetch fresh full data from Supabase.
      if (!force) {
        try {
          const cached = localStorage.getItem(CACHE_KEY);
          if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL && suppliers.length === 0) {
              console.log('[useSupplierManagement] Initializing with cached metadata');
              setSuppliers(data);
            }
          }
        } catch (e) {
          console.warn('[useSupplierManagement] Failed to read cache', e);
        }
      }

      let attempt = 0;
      const maxRetries = 3;
      let lastError = null;
      let fetchedData = null;

      while (attempt < maxRetries) {
        console.log(`[useSupplierManagement] Fetch attempt ${attempt + 1}/${maxRetries}`);
        try {
          const { data, error: fetchError } = await withTimeout(
            supabase
              .from('suppliers')
              .select('id, supplier_id, supplier_name, contact_person, contact_number, email, address, departments, contact_persons')
              .order('supplier_name', { ascending: true }),
            15000, // 15s timeout
            'Fetch Suppliers'
          );

          if (fetchError) {
             console.error(`[useSupplierManagement] Supabase query error on attempt ${attempt + 1}:`, fetchError);
             throw fetchError;
          }
          
          console.log(`[useSupplierManagement] Successfully fetched ${data?.length || 0} suppliers`);
          fetchedData = data || [];
          break; // Success, exit retry loop
        } catch (err) {
          lastError = err;
          console.error(`[useSupplierManagement] Fetch failed on attempt ${attempt + 1}:`, err);
          attempt++;
          if (attempt < maxRetries) {
            const backoffMs = Math.pow(2, attempt) * 1000; // 2s, 4s
            console.warn(`[useSupplierManagement] Retrying in ${backoffMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
          }
        }
      }

      if (!fetchedData && lastError) {
        throw lastError;
      }

      setSuppliers(fetchedData);
      setHasFetched(true);
      
      // Only cache essential metadata to prevent storage quota issues
      const essentialData = fetchedData.map(s => ({
        id: s.id,
        supplier_id: s.supplier_id,
        supplier_name: s.supplier_name,
        contact_number: s.contact_number
      }));
      
      safeSetCache(CACHE_KEY, {
        data: essentialData,
        timestamp: Date.now()
      });

    } catch (err) {
      console.error('[useSupplierManagement] Final error fetching suppliers:', err);
      setError(err);
      
      const fallbackData = LocalStorageDB.getData('suppliers') || [];
      if (fallbackData.length > 0 && suppliers.length === 0) {
        setSuppliers(fallbackData);
        console.info('[useSupplierManagement] Using local fallback data');
      } else if (suppliers.length === 0) {
        toast({
          title: "Error Loading Suppliers",
          description: err.message || "Failed to load supplier data. Please check connection.",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [isLocalMode, hasFetched, suppliers.length, toast]);

  useEffect(() => {
    if (!hasFetched) {
      fetchSuppliers();
    }
  }, [fetchSuppliers, hasFetched]);

  const addSupplier = async (supplierData) => {
    try {
      // 1. Generate unique identifiers
      const id = supplierData.id || generateUUID();
      // Generate a formatted supplier_id if one isn't provided
      const supplier_id = supplierData.supplier_id || `SUP-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

      // 2. Ensure all required fields are included
      const payload = {
        ...supplierData,
        id,
        supplier_id,
        departments: supplierData.departments || [],
      };

      if (!payload.supplier_id) {
        throw new Error("Validation Error: supplier_id could not be generated.");
      }

      if (isLocalMode) {
        const newSupplier = { ...payload, created_at: new Date().toISOString() };
        LocalStorageDB.saveData('suppliers', newSupplier);
        setSuppliers(prev => {
          const updated = [newSupplier, ...prev].sort((a, b) => (a.supplier_name || '').localeCompare(b.supplier_name || ''));
          return updated;
        });
        return { data: newSupplier, error: null };
      }

      // 3. Insert into Supabase and select the complete returned record
      const { data, error } = await withTimeout(
        supabase.from('suppliers').insert([payload]).select(),
        15000,
        'Add Supplier'
      );

      if (error) {
        console.error("[useSupplierManagement] Error adding supplier:", error);
        throw error;
      }

      if (data && data.length > 0) {
        const newSupplier = data[0];
        
        // Update local state immediately to avoid requiring a page refresh
        setSuppliers(prev => {
          const updated = [newSupplier, ...prev].sort((a, b) => (a.supplier_name || '').localeCompare(b.supplier_name || ''));
          return updated;
        });
        
        // 4. Return the complete supplier object
        return { data: newSupplier, error: null };
      }
      
      throw new Error("Failed to retrieve the inserted supplier data.");

    } catch (err) {
      console.error("[useSupplierManagement] addSupplier Exception:", err);
      return { data: null, error: err };
    }
  };

  const updateSupplier = async (supplierData) => {
    const { id, ...rest } = supplierData;
    if (isLocalMode) {
      const updated = LocalStorageDB.updateData('suppliers', id, rest);
      setSuppliers(prev => prev.map(s => s.id === id ? updated : s));
      return { data: updated, error: null };
    }
    const { data, error } = await withTimeout(
      supabase.from('suppliers').update(rest).eq('id', id).select(),
      15000,
      'Update Supplier'
    );
    if (!error && data) {
      setSuppliers(prev => {
        const updated = prev.map(s => s.id === id ? data[0] : s);
        return updated;
      });
      fetchSuppliers(true);
    }
    return { data, error };
  };

  const deleteSupplier = async (id) => {
    if (isLocalMode) {
      LocalStorageDB.deleteData('suppliers', id);
      setSuppliers(prev => prev.filter(s => s.id !== id));
      return { error: null };
    }
    const { error } = await withTimeout(
      supabase.from('suppliers').delete().eq('id', id),
      15000,
      'Delete Supplier'
    );
    if (!error) {
      setSuppliers(prev => {
        const updated = prev.filter(s => s.id !== id);
        return updated;
      });
      fetchSuppliers(true);
    }
    return { error };
  };

  return { 
    suppliers, 
    loading, 
    error,
    addSupplier, 
    updateSupplier, 
    deleteSupplier, 
    fetchSuppliers: () => fetchSuppliers(true),
    refreshSuppliers: () => fetchSuppliers(true) 
  };
};

export default useSupplierManagement;