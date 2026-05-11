import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { LocalStorageDB } from '@/lib/LocalStorageDB';
import { useAuth } from '@/contexts/AuthProvider';
import { useToast } from '@/components/ui/use-toast';
import { withTimeout, safeSetCache } from '@/lib/utils';

const CACHE_KEY = 'clients_metadata_cache';
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

const useClientManagement = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);
  const isMounted = useRef(true);
  const loadingRef = useRef(false);
  const { isLocalMode } = useAuth() || {};
  const { toast } = useToast();

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchClients = useCallback(async (force = false) => {
    if ((hasFetched && !force) || loadingRef.current) return;
    
    loadingRef.current = true;
    if (isMounted.current) {
        setLoading(true);
        setError(null);
    }
    
    console.log('[useClientManagement] Starting fetchClients...', { force, isLocalMode });

    try {
      if (isLocalMode) {
        if (isMounted.current) {
            setClients(LocalStorageDB.getData('customers') || []);
            setHasFetched(true);
        }
        loadingRef.current = false;
        if (isMounted.current) setLoading(false);
        return;
      }
      
      if (!force) {
        try {
          const cached = localStorage.getItem(CACHE_KEY);
          if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL && isMounted.current && clients.length === 0) {
              console.log('[useClientManagement] Initializing with cached metadata');
              setClients(data);
            }
          }
        } catch (e) {
          console.warn('[useClientManagement] Failed to read cache', e);
        }
      }

      let attempt = 0;
      const maxRetries = 3;
      let lastError = null;
      let fetchedData = null;

      while (attempt < maxRetries) {
        console.log(`[useClientManagement] Fetch attempt ${attempt + 1}/${maxRetries}`);
        try {
          // Explicitly selecting all required fields including legacy and jsonb arrays
          const { data, error: fetchError } = await withTimeout(
            supabase
              .from('customers')
              .select(`
                id, customer_id, customer_name, contact_person, contact_number, email, address, state, state_code, gstin, created_at, 
                department1, department2, department3, department4, department5, 
                user1, user2, user3, user4, user5, 
                department_name_1, department_name_2, department_name_3, department_name_4, department_name_5,
                contact_number_dept1, contact_number_dept2, contact_number_dept3, contact_number_dept4, contact_number_dept5,
                email_dept1, email_dept2, email_dept3, email_dept4, email_dept5,
                contact_persons, departments
              `)
              .order('customer_name', { ascending: true }),
            15000,
            'Fetch Clients'
          );

          if (fetchError) {
             console.error(`[useClientManagement] Supabase query error on attempt ${attempt + 1}:`, fetchError);
             throw fetchError;
          }
          
          console.log(`[useClientManagement] Successfully fetched ${data?.length || 0} clients`);
          fetchedData = data || [];
          break;
        } catch (err) {
          lastError = err;
          console.error(`[useClientManagement] Fetch failed on attempt ${attempt + 1}:`, err);
          attempt++;
          if (attempt < maxRetries) {
            const backoffMs = Math.pow(2, attempt) * 1000;
            console.warn(`[useClientManagement] Retrying in ${backoffMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
          }
        }
      }

      if (!fetchedData && lastError) {
        throw lastError;
      }
      
      if (isMounted.current) {
          setClients(fetchedData);
          setHasFetched(true);
          
          // CRITICAL FIX: Include department data in cache to prevent dropdowns from showing empty arrays on initial render
          const essentialData = fetchedData.map(c => ({
            id: c.id,
            customer_id: c.customer_id,
            customer_name: c.customer_name,
            contact_number: c.contact_number,
            departments: c.departments,
            department1: c.department1,
            department2: c.department2,
            department3: c.department3,
            department4: c.department4,
            department5: c.department5,
            department_name_1: c.department_name_1,
            department_name_2: c.department_name_2,
            department_name_3: c.department_name_3,
            department_name_4: c.department_name_4,
            department_name_5: c.department_name_5,
            user1: c.user1,
            user2: c.user2,
            user3: c.user3,
            user4: c.user4,
            user5: c.user5,
          }));
          
          safeSetCache(CACHE_KEY, {
            data: essentialData,
            timestamp: Date.now()
          });
      }
    } catch (err) {
      console.error('[useClientManagement] Final error fetching clients:', err);
      if (isMounted.current) {
          setError(err);
          const cachedData = LocalStorageDB.getData('customers') || [];
          if (cachedData.length > 0 && clients.length === 0) {
             setClients(cachedData);
             console.info('[useClientManagement] Using old local fallback data');
          } else if (clients.length === 0) {
             toast({ 
               title: 'Error Loading Customers', 
               description: err.message || 'Failed to load customers from server. Please check your connection.', 
               variant: 'destructive' 
             });
          }
      }
    } finally {
      if (isMounted.current) {
          setLoading(false);
      }
      loadingRef.current = false;
    }
  }, [isLocalMode, hasFetched, clients.length, toast]);

  useEffect(() => {
    if (!hasFetched) {
      fetchClients();
    }
  }, [fetchClients, hasFetched]);

  const addClient = async (clientData) => {
    if (isLocalMode) {
      const newClient = { ...clientData, id: Date.now().toString(), created_at: new Date().toISOString() };
      LocalStorageDB.saveData('customers', newClient);
      setClients(prev => [newClient, ...prev]);
      return { data: newClient, error: null };
    }
    const { data, error } = await withTimeout(
      supabase.from('customers').insert([clientData]).select(),
      15000,
      'Add Client'
    );
    if (!error && data && isMounted.current) {
      setClients(prev => [data[0], ...prev]);
      fetchClients(true);
    }
    return { data, error };
  };

  const updateClient = async (id, clientData) => {
    if (isLocalMode) {
      const updated = LocalStorageDB.updateData('customers', id, clientData);
      setClients(prev => prev.map(c => c.id === id ? updated : c));
      return { data: updated, error: null };
    }
    const { data, error } = await withTimeout(
      supabase.from('customers').update(clientData).eq('id', id).select(),
      15000,
      'Update Client'
    );
    if (!error && data && isMounted.current) {
      setClients(prev => prev.map(c => c.id === id ? data[0] : c));
      fetchClients(true);
    }
    return { data, error };
  };

  const deleteClient = async (id) => {
    if (isLocalMode) {
      LocalStorageDB.deleteData('customers', id);
      setClients(prev => prev.filter(c => c.id !== id));
      return { error: null };
    }
    const { error } = await withTimeout(
      supabase.from('customers').delete().eq('id', id),
      15000,
      'Delete Client'
    );
    if (!error && isMounted.current) {
      setClients(prev => prev.filter(c => c.id !== id));
      fetchClients(true);
    }
    return { error };
  };

  return { 
    clients, 
    loading, 
    error,
    addClient, 
    updateClient, 
    deleteClient, 
    fetchClients: () => fetchClients(true),
    refreshClients: () => fetchClients(true) 
  };
};

export default useClientManagement;