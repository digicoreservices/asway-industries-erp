
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';

// CRITICAL: Centralized Product Storage
// The "products" table in Supabase is the SINGLE SOURCE OF TRUTH for all product data
// All forms (OrderReceiptForm, AddQuotationForm, CreateInvoiceForm) query from this table
// Hardcoded fallback lists are ONLY used if database query fails

// Hardcoded fallback lists (kept as backup if database fails)
const FALLBACK_SALE_PRODUCTS = [
  "Barrigation", "Bench", "Blower", "Boom Lifter", "Brackets", "Cage Bin", "Cage Box", 
  "Car lift", "Cupboard", "Duct", "Fencing", "Foldable Pallet", "Foldable Skids", 
  "Forklift", "Grating", "Ladder -Fix", "Ladder -Movable", "Metal Box", 
  "Mechanical Fixtures", "Pallets", "PEB Structure", "Pressjob", "Railing", 
  "Sale BRM - As It Is", "Scaffolding", "Sizzer lift", "Skids", "Storage Rack", 
  "Table", "Tool Lifting Tackle", "Tray", "Trolley", "Trolley Hydraulic Lifting"
].sort();

const FALLBACK_SERVICE_PRODUCTS = [
  "Civil work coupled with aluminium /glass window / door repair/ modification.",
  "Dismantling & Transport for relocation", "Inspection & Maintenance",
  "Installation, Commissioning & Erection.", "Laser Cutting",
  "Loading Unloading Activities", "Machining", "Packaging services",
  "Planting", "Powder Coating", "Reair & modification.",
  "Undertake AMC (Annual Maint Contract) - Manpower, with -without implied resourse supply",
  "Water pneumatic pipe le installation -with control panel automation / loto arragement."
].sort();

const useProductManagement = () => {
  const { toast } = useToast();
  
  // Use ref to cache products and prevent re-fetching on re-renders
  const productsCache = useRef(null);
  const hasFetched = useRef(false);
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [useFallback, setUseFallback] = useState(false);

  // Fetch products from centralized products table (SINGLE SOURCE OF TRUTH)
  const fetchProducts = useCallback(async () => {
    // Don't fetch if already fetched
    if (hasFetched.current && productsCache.current) {
      console.log('[useProductManagement] Using cached products');
      return productsCache.current;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[useProductManagement] Fetching products from centralized products table...');
      
      // Query centralized products table with correct column names
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('id, product_name, product_type, created_at, updated_at')
        .order('product_name', { ascending: true });

      if (fetchError) throw fetchError;

      console.log(`[useProductManagement] ✅ Successfully fetched ${data?.length || 0} products from database`);
      console.log(`[useProductManagement] Sale products: ${data?.filter(p => p.product_type === 'Sale').length}`);
      console.log(`[useProductManagement] Service products: ${data?.filter(p => p.product_type === 'Service').length}`);
      
      // Cache the results
      productsCache.current = data || [];
      hasFetched.current = true;
      setProducts(data || []);
      setUseFallback(false);
      
      return data || [];
    } catch (err) {
      console.error('[useProductManagement] ❌ Error fetching products:', err);
      setError(err.message);
      
      // Fallback to hardcoded lists ONLY if database fails
      console.warn('[useProductManagement] ⚠️ Falling back to hardcoded product lists');
      const fallbackData = [
        ...FALLBACK_SALE_PRODUCTS.map(name => ({ product_name: name, product_type: 'Sale' })),
        ...FALLBACK_SERVICE_PRODUCTS.map(name => ({ product_name: name, product_type: 'Service' }))
      ];
      
      productsCache.current = fallbackData;
      hasFetched.current = true;
      setProducts(fallbackData);
      setUseFallback(true);
      
      toast({
        title: 'Using Cached Products',
        description: 'Could not load latest products from database. Using local backup.',
        variant: 'default'
      });
      
      return fallbackData;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch on mount
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Get products filtered by type (memoized)
  const getProductsByType = useCallback((type) => {
    if (!type) return products;
    
    const cached = productsCache.current || products;
    const filtered = cached.filter(p => p.product_type === type);
    
    console.log(`[useProductManagement] getProductsByType('${type}') returned ${filtered.length} products`);
    return filtered;
  }, [products]);

  // Memoized filtered products for Sale
  const saleProducts = useMemo(() => {
    const products = getProductsByType('Sale').map(p => p.product_name).sort();
    console.log(`[useProductManagement] saleProducts computed: ${products.length} products`);
    return products;
  }, [getProductsByType]);

  // Memoized filtered products for Service
  const serviceProducts = useMemo(() => {
    const products = getProductsByType('Service').map(p => p.product_name).sort();
    console.log(`[useProductManagement] serviceProducts computed: ${products.length} products`);
    return products;
  }, [getProductsByType]);

  // Method to get Sale products (for backward compatibility)
  const getSaleProducts = useCallback(() => {
    console.log('[useProductManagement] getSaleProducts() called');
    return saleProducts;
  }, [saleProducts]);

  // Method to get Service products (newly added for consistency)
  const getServiceProducts = useCallback(() => {
    console.log('[useProductManagement] getServiceProducts() called');
    return serviceProducts;
  }, [serviceProducts]);

  // Search products (client-side filtering, memoized)
  const searchProducts = useCallback((query, type = null) => {
    if (!query || query.trim() === '') {
      return type ? getProductsByType(type) : products;
    }

    const lowercaseQuery = query.toLowerCase();
    const cached = productsCache.current || products;
    
    let filtered = cached.filter(p => 
      p.product_name.toLowerCase().includes(lowercaseQuery)
    );
    
    if (type) {
      filtered = filtered.filter(p => p.product_type === type);
    }
    
    console.log(`[useProductManagement] searchProducts('${query}', '${type}') returned ${filtered.length} results`);
    return filtered;
  }, [products, getProductsByType]);

  // Add new product to centralized products table
  const addProduct = useCallback(async (productName, productType) => {
    try {
      console.log(`[useProductManagement] Adding product: "${productName}" (${productType})`);
      
      const { data, error } = await supabase
        .from('products')
        .insert({
          product_name: productName,
          product_type: productType,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      console.log('[useProductManagement] ✅ Product added successfully');

      // Refresh cache
      hasFetched.current = false;
      await fetchProducts();

      toast({
        title: 'Success',
        description: `Product "${productName}" added successfully.`
      });

      return data;
    } catch (err) {
      console.error('[useProductManagement] ❌ Error adding product:', err);
      
      if (err.code === '23505') {
        toast({
          title: 'Duplicate Product',
          description: `Product "${productName}" already exists.`,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Error adding product',
          description: err.message,
          variant: 'destructive'
        });
      }
      return null;
    }
  }, [fetchProducts, toast]);

  // Delete product from centralized products table
  const deleteProduct = useCallback(async (productName, productType) => {
    try {
      console.log(`[useProductManagement] Deleting product: "${productName}" (${productType})`);
      
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('product_name', productName)
        .eq('product_type', productType);

      if (error) throw error;

      console.log('[useProductManagement] ✅ Product deleted successfully');

      // Refresh cache
      hasFetched.current = false;
      await fetchProducts();

      toast({
        title: 'Success',
        description: `Product "${productName}" deleted successfully.`
      });

      return true;
    } catch (err) {
      console.error('[useProductManagement] ❌ Error deleting product:', err);
      toast({
        title: 'Error deleting product',
        description: err.message,
        variant: 'destructive'
      });
      return false;
    }
  }, [fetchProducts, toast]);

  return {
    products, // Array of { id, product_name, product_type, created_at, updated_at }
    saleProducts, // Array of product_name strings for Sale type (sorted alphabetically)
    serviceProducts, // Array of product_name strings for Service type (sorted alphabetically)
    loading, // Boolean indicating loading state
    error, // Error message if fetch failed
    useFallback, // Boolean indicating if using fallback data
    getProductsByType, // Function to filter by type (returns full objects)
    getSaleProducts, // Function returning Sale product names (for backward compatibility)
    getServiceProducts, // Function returning Service product names (NEW - added for consistency)
    searchProducts, // Function to search products
    fetchProducts, // Function to manually refresh products
    addProduct, // Function to add new product
    deleteProduct // Function to delete product
  };
};

export default useProductManagement;
