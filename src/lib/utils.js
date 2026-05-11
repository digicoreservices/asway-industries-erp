import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Executes a Promise-returning function with an AbortController, timeout, and exponential backoff retry.
 * @param {Function} queryFn - Function that receives an AbortSignal and returns a Promise.
 * @param {Object} options - Configuration options for timeout and retries.
 * @returns {Promise<{data: any, error: any}>}
 */
export const fetchWithRetry = async (queryFn, options = {}) => {
  const { 
    maxRetries = 2, 
    timeoutMs = 15000, 
    baseDelayMs = 1000, 
    operationName = 'Fetch Operation' 
  } = options;
  
  let attempt = 0;
  let lastError;

  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort(new Error(`Timeout: ${operationName} exceeded ${timeoutMs}ms`));
    }, timeoutMs);

    try {
      const startTime = performance.now();
      
      const query = queryFn(controller.signal);
      
      if (query && typeof query.abortSignal === 'function') {
        query.abortSignal(controller.signal);
      }

      const result = await query;
      clearTimeout(timeoutId);

      if (result && result.error) {
        throw result.error;
      }

      const duration = performance.now() - startTime;
      if (duration > 3000) {
        console.warn(`[Performance] Slow Query: ${operationName} took ${Math.round(duration)}ms`);
      } else {
        console.info(`[Performance] ${operationName} took ${Math.round(duration)}ms`);
      }

      const data = result && 'data' in result ? result.data : result;
      return { data, error: null };

    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;

      if (attempt === maxRetries) {
        console.error(`[Error] ${operationName} failed after ${maxRetries} retries:`, error.message || error);
        return { data: null, error };
      }

      attempt++;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(`[Retry] ${operationName} attempt ${attempt} failed. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return { data: null, error: lastError };
};

/**
 * Legacy wrapper for backwards compatibility
 */
export const withTimeout = async (promise, ms = 15000, operationName = 'Async Operation') => {
  const startTime = performance.now();
  
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Timeout: ${operationName} exceeded ${ms}ms`));
    }, ms);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    const duration = performance.now() - startTime;
    
    if (duration > 3000) {
      console.warn(`[Performance] Slow Query: ${operationName} took ${Math.round(duration)}ms`);
    }
    
    if (result && typeof result === 'object' && ('data' in result || 'error' in result)) {
      return result;
    }
    return { data: result, error: null };
  } catch (error) {
    console.error(`[Error] ${operationName} failed:`, error.message);
    return { data: null, error };
  }
};

/**
 * Safely stores data in localStorage with size limits and quota error handling.
 * @param {string} key - Storage key
 * @param {any} data - Data to store
 * @param {number} maxSizeBytes - Maximum allowed size in bytes (default 5MB)
 * @returns {boolean} - True if successful, false otherwise
 */
export const safeSetCache = (key, data, maxSizeBytes = 5 * 1024 * 1024) => {
  try {
    const serialized = JSON.stringify(data);
    const sizeBytes = new Blob([serialized]).size;
    
    if (sizeBytes > maxSizeBytes) {
      console.warn(`[Cache] Data for ${key} exceeds size limit (${(sizeBytes/1024/1024).toFixed(2)}MB > ${(maxSizeBytes/1024/1024).toFixed(2)}MB). Not caching.`);
      localStorage.removeItem(key); // Clear existing if it got too big
      return false;
    }
    
    localStorage.setItem(key, serialized);
    return true;
  } catch (e) {
    console.warn(`[Cache] Quota exceeded or error setting cache for ${key}:`, e);
    // Attempt to recover space by deleting the key
    try {
      localStorage.removeItem(key);
    } catch (clearErr) {
      console.error(`[Cache] Failed to clear key after error:`, clearErr);
    }
    return false;
  }
};