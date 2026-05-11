import { supabase } from '@/lib/customSupabaseClient';
import { fetchWithRetry } from '@/lib/utils';

const cache = new Map();

/**
 * Executes a query with caching
 */
export const getCachedData = async (key, queryFn, ttl = 60000) => {
  const now = Date.now();
  if (cache.has(key)) {
    const { data, expiry } = cache.get(key);
    if (now < expiry) {
      return { data, error: null, cached: true };
    }
  }
  
  const { data, error } = await queryFn();
  if (!error && data) {
    cache.set(key, { data, expiry: now + ttl });
  }
  return { data, error, cached: false };
};

export const clearCachePattern = (pattern) => {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
};

/**
 * Fetches products with pagination and caching
 */
export const getProductsPaginated = async (limit = 50, offset = 0, search = '') => {
  const key = `products_${limit}_${offset}_${search}`;
  return getCachedData(key, async () => {
    return fetchWithRetry(
      (signal) => {
        let query = supabase.from('product_list').select('id, product_name, type').order('product_name');
        if (search) query = query.ilike('product_name', `%${search}%`);
        return query.range(offset, offset + limit - 1).abortSignal(signal);
      },
      { timeoutMs: 15000, operationName: 'Fetch Products Paginated' }
    );
  }, 300000); // 5 min TTL
};

/**
 * Fetches optimized customer list for dropdowns
 */
export const getCachedCustomers = async () => {
  return getCachedData('customers_lite', async () => {
    return fetchWithRetry(
      (signal) => supabase.from('customers')
        .select('id, customer_name, address, gstin, state, state_code, contact_person, contact_number, department_name_1, user1')
        .order('customer_name')
        .abortSignal(signal),
      { timeoutMs: 15000, operationName: 'Fetch Customers Lite' }
    );
  }, 300000);
};

/**
 * Optimized PO items fetch (avoids large json/text blobs)
 */
export const getOptimizedPOItems = async (poId) => {
  return fetchWithRetry(
    (signal) => supabase.from('purchase_order_receipt_items')
      .select('id, product_name, description, price_for_one')
      .eq('receipt_id', poId)
      .abortSignal(signal),
    { timeoutMs: 15000, operationName: 'Fetch PO Items Optimized' }
  );
};

/**
 * Optimized PO Schedules fetch
 */
export const getOptimizedPOSchedules = async (itemIds) => {
  if (!itemIds || itemIds.length === 0) return { data: [] };
  return fetchWithRetry(
    (signal) => supabase.from('purchase_order_receipt_items_delivery_schedules')
      .select('id, item_id, quantity, delivery_date')
      .in('item_id', itemIds)
      .abortSignal(signal),
    { timeoutMs: 15000, operationName: 'Fetch PO Schedules Optimized' }
  );
};