
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import useCategories from '@/hooks/useCategories';
import useItemsMaster from '@/hooks/useItemsMaster';

const CheckStockForm = ({ onClose }) => {
  const { toast } = useToast();
  
  // Centralized data hooks - same as EditSupplierInvoiceForm.jsx
  const { categories, loading: categoriesLoading } = useCategories();
  const { items: itemsMaster, loading: itemsLoading } = useItemsMaster();

  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedItemName, setSelectedItemName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stockData, setStockData] = useState([]);

  // FIXED: Searchable Dropdown States - Same pattern as EditSupplierInvoiceForm.jsx
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const categoryAutocompleteRef = useRef(null);

  const [itemNameSearchTerm, setItemNameSearchTerm] = useState('');
  const [showItemNameSuggestions, setShowItemNameSuggestions] = useState(false);
  const itemNameAutocompleteRef = useRef(null);

  // Filter items based on selected category - same pattern as EditSupplierInvoiceForm.jsx
  const availableItems = useMemo(() => {
    if (selectedCategoryId && itemsMaster.length > 0) {
      return itemsMaster
        .filter(item => item.category_id === selectedCategoryId)
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    return [];
  }, [selectedCategoryId, itemsMaster]);

  // Reset item selection when category changes
  useEffect(() => {
    if (selectedCategoryId) {
      // Clear item name if it's not in the new filtered list
      if (selectedItemName && !availableItems.some(item => item.name === selectedItemName)) {
        setSelectedItemName('');
        setItemNameSearchTerm('');
        setStockData([]);
      }
    }
  }, [selectedCategoryId, availableItems, selectedItemName]);

  // Click outside handler for autocomplete dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (categoryAutocompleteRef.current && !categoryAutocompleteRef.current.contains(event.target)) {
        setShowCategorySuggestions(false);
      }
      if (itemNameAutocompleteRef.current && !itemNameAutocompleteRef.current.contains(event.target)) {
        setShowItemNameSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // FIXED: Category Searchable Dropdown Handlers - Same pattern as EditSupplierInvoiceForm.jsx
  const handleCategorySearchChange = (e) => {
    const value = e.target.value;
    setCategorySearchTerm(value);
    setShowCategorySuggestions(true);
    setSelectedCategory('');
    setSelectedCategoryId(null);
    setSelectedItemName('');
    setItemNameSearchTerm('');
    setStockData([]);
  };

  const handleCategorySelect = (category) => {
    setCategorySearchTerm(category.name);
    setShowCategorySuggestions(false);
    setSelectedCategory(category.name);
    setSelectedCategoryId(category.id);
    setSelectedItemName('');
    setItemNameSearchTerm('');
    setStockData([]);
  };

  const filteredCategories = useMemo(() => {
    if (!categorySearchTerm) return categories;
    const lowercasedFilter = categorySearchTerm.toLowerCase();
    return categories.filter(c => c.name.toLowerCase().includes(lowercasedFilter));
  }, [categories, categorySearchTerm]);

  // FIXED: Item Name Searchable Dropdown Handlers - Same pattern as EditSupplierInvoiceForm.jsx
  const handleItemNameSearchChange = (e) => {
    const value = e.target.value;
    setItemNameSearchTerm(value);
    setShowItemNameSuggestions(true);
    setSelectedItemName('');
    setStockData([]);
  };

  const handleItemNameSelect = (itemName) => {
    setItemNameSearchTerm(itemName);
    setShowItemNameSuggestions(false);
    setSelectedItemName(itemName);
    setStockData([]);
  };

  const filteredItemNames = useMemo(() => {
    if (!itemNameSearchTerm) return availableItems;
    const lowercasedFilter = itemNameSearchTerm.toLowerCase();
    return availableItems.filter(i => i.name.toLowerCase().includes(lowercasedFilter));
  }, [availableItems, itemNameSearchTerm]);

  const handleCheckStock = async () => {
    if (!selectedCategory) {
      toast({ title: 'Please select a category', variant: 'destructive' });
      return;
    }
    if (!selectedItemName) {
      toast({
        title: 'Please select an item',
        description: 'You must select an item name to check its stock.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('item_name', selectedItemName)
        .eq('category', selectedCategory);

      if (error) throw error;

      // Group by Unit and Calculate Total Available Quantity
      const grouped = {};
      
      data.forEach(item => {
        const unit = item.unit || 'N/A';
        if (!grouped[unit]) {
          grouped[unit] = {
            unit: unit,
            totalQuantity: 0
          };
        }
        
        const qty = parseFloat(item.quantity) || 0;
        const used = parseFloat(item.used_quantity) || 0;
        const available = qty - used;
        
        grouped[unit].totalQuantity += available;
      });

      const results = Object.values(grouped);
      
      setStockData(results);
      
      if (results.length === 0) {
        toast({ title: 'No Stock Found', description: `No stock records found for ${selectedItemName}.` });
      } else {
        toast({ title: 'Stock Checked', description: `Found ${results.length} unit variant(s) for ${selectedItemName}.` });
      }

    } catch (err) {
      console.error("Error checking stock:", err);
      toast({
        title: 'Error',
        description: 'Failed to check stock. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isDataLoading = categoriesLoading || itemsLoading;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
      <Card className="border-0 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Check Item Stock</CardTitle>
          <Button type="button" onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white">
            Go Back
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 max-h-[70vh] overflow-y-auto pr-3">
          {isDataLoading && (
            <div className="px-6 py-4 bg-blue-50 border-l-4 border-blue-500">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="text-sm text-blue-800 font-medium">Loading categories and items from database...</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 
              FIXED: CATEGORY DROPDOWN - Using EditSupplierInvoiceForm.jsx pattern
              Complete autocomplete implementation with search input and suggestions dropdown
            */}
            <div className="space-y-2">
              <Label>Category</Label>
              <div className="space-y-2 relative" ref={categoryAutocompleteRef}>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={categorySearchTerm}
                    onChange={handleCategorySearchChange}
                    onFocus={() => setShowCategorySuggestions(true)}
                    placeholder={categoriesLoading ? "Loading categories..." : "Search category..."}
                    disabled={categoriesLoading}
                    className="pl-8 bg-white text-gray-900"
                  />
                </div>
                {showCategorySuggestions && filteredCategories.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredCategories.map(c => (
                      <div
                        key={c.id}
                        className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm text-gray-900"
                        onClick={() => handleCategorySelect(c)}
                      >
                        <div className="font-medium">{c.name}</div>
                        {c.description && <div className="text-xs text-gray-500">{c.description}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 
              FIXED: ITEM NAME DROPDOWN - Using EditSupplierInvoiceForm.jsx pattern
              Complete autocomplete implementation with search input and suggestions dropdown
            */}
            <div className="space-y-2">
              <Label>Item Name</Label>
              <div className="space-y-2 relative" ref={itemNameAutocompleteRef}>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={itemNameSearchTerm}
                    onChange={handleItemNameSearchChange}
                    onFocus={() => setShowItemNameSuggestions(true)}
                    placeholder={!selectedCategory ? "Select Category First" : (itemsLoading ? "Loading items..." : "Search item name...")}
                    disabled={!selectedCategory || itemsLoading}
                    className="pl-8 bg-white text-gray-900"
                  />
                </div>
                {showItemNameSuggestions && filteredItemNames.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredItemNames.map((item) => (
                      <div
                        key={item.id}
                        className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm text-gray-900"
                        onClick={() => handleItemNameSelect(item.name)}
                      >
                        {item.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-2">
            <Button 
              type="button" 
              onClick={handleCheckStock} 
              disabled={isLoading || !selectedItemName || isDataLoading} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Check Stock
            </Button>
          </div>

          {stockData.length > 0 && (
            <div className="border rounded-md mt-4 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-gray-900 font-semibold">Unit</TableHead>
                    <TableHead className="text-right text-gray-900 font-semibold">Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium text-gray-900">{row.unit}</TableCell>
                      <TableCell className="text-right text-gray-900">{row.totalQuantity.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {stockData.length === 0 && !isLoading && selectedItemName && (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg mt-4">
              No stock data to display. Click "Check Stock" to verify availability.
            </div>
          )}

        </CardContent>
      </Card>
    </motion.div>
  );
};

export default CheckStockForm;
