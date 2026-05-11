export const clearOversizedCache = () => {
  try {
    const keysToRemove = [
      'db_customers', 
      'suppliers_data_cache', 
      'clients_data_cache',
      'customers'
    ];
    
    let clearedCount = 0;
    
    keysToRemove.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`[Cache Cleanup] Removed cache entry: ${key}`);
        clearedCount++;
      }
    });

    if (clearedCount > 0) {
      console.log(`[Cache Cleanup] Successfully cleared ${clearedCount} old/oversized cache entries.`);
    } else {
      console.log(`[Cache Cleanup] No oversized cache entries found. Storage is clean.`);
    }
  } catch (error) {
    console.error('[Cache Cleanup] Error occurred during cache cleanup:', error);
  }
};