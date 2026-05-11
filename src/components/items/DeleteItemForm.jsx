import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import useItemManagement from '@/hooks/useItemManagement';
import useProductList from '@/hooks/useProductList';
import { supabase } from '@/lib/customSupabaseClient';
import { Search, Loader2 } from 'lucide-react';

const DeleteItemForm = ({ onClose }) => {
  const { toast } = useToast();
  const { reduceItemStock } = useItemManagement();
  const { categoryList, itemMap } = useProductList();
  
  const [suppliers, setSuppliers] = useState([]);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState('');

  const [category, setCategory] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemNames, setItemNames] = useState([]);
  
  // Note: Department, User, and Unit fields have been removed as requested.
  
  const [availableQuantity, setAvailableQuantity] = useState('');
  const [quantityToDelete, setQuantityToDelete] = useState('');
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [foundItemUnit, setFoundItemUnit] = useState('');

  const fetchSuppliers = useCallback(async () => {
    const { data, error } = await supabase
        .from('suppliers')
        .select('id, supplier_name')
        .order('supplier_name', { ascending: true });

    if (error) toast({ title: 'Error fetching suppliers', description: error.message, variant: 'destructive' });
    else setSuppliers(data || []);
  }, [toast]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const filteredSuppliers = useMemo(() => {
    if (!supplierSearchTerm) return [];
    const lower = supplierSearchTerm.toLowerCase();
    return suppliers.filter(s => s.supplier_name.toLowerCase().includes(lower)).slice(0, 5);
  }, [suppliers, supplierSearchTerm]);

  const handleSupplierSearchChange = (e) => {
      setSupplierSearchTerm(e.target.value);
      setSelectedSupplier(null);
      setShowSupplierSuggestions(true);
      // Reset downstream fields
      setInvoices([]);
      setSelectedInvoice('');
      resetFields();
  };

  const selectSupplier = async (supplier) => {
      setSupplierSearchTerm(supplier.supplier_name);
      setSelectedSupplier(supplier);
      setShowSupplierSuggestions(false);
      
      // Fetch invoices
      const { data, error } = await supabase
        .from('items')
        .select('supplier_invoice_number')
        .eq('supplier_id', supplier.id);
      
      if (error) {
        toast({ title: 'Error fetching invoices', description: error.message, variant: 'destructive' });
        setInvoices([]);
      } else {
        const uniqueInvoices = [...new Set(data.map(item => item.supplier_invoice_number).filter(Boolean))];
        setInvoices(uniqueInvoices);
      }
  };

  const resetFields = () => {
    setCategory('');
    setItemName('');
    setAvailableQuantity('');
    setQuantityToDelete('');
    setSelectedItemId(null);
    setFoundItemUnit('');
  };

  const handleInvoiceChange = (invoice) => {
    setSelectedInvoice(invoice);
    resetFields();
  };

  useEffect(() => {
    if (category) {
      setItemNames(itemMap[category] || []);
      setItemName('');
      setAvailableQuantity('');
      setQuantityToDelete('');
      setSelectedItemId(null);
      setFoundItemUnit('');
    } else {
      setItemNames([]);
    }
  }, [category, itemMap]);

  const handleCheckStock = async () => {
    if (!selectedSupplier || !selectedInvoice || !category || !itemName) {
      toast({
        title: 'Incomplete Selection',
        description: 'Please select all fields to check stock.',
        variant: 'destructive',
      });
      return;
    }

    // Query to find specific item
    // Note: Removed department, user, and unit filters as requested.
    let query = supabase
      .from('items')
      .select('id, quantity, used_quantity, unit')
      .eq('supplier_id', selectedSupplier.id)
      .eq('supplier_invoice_number', selectedInvoice)
      .eq('category', category)
      .eq('item_name', itemName);

    const { data, error } = await query.limit(1).single();

    if (error || !data) {
      toast({ title: 'Error checking stock', description: error ? error.message : 'Item not found.', variant: 'destructive' });
      setAvailableQuantity('');
      setSelectedItemId(null);
      setFoundItemUnit('');
      return;
    }

    const available = (parseFloat(data.quantity) || 0) - (parseFloat(data.used_quantity) || 0);
    setAvailableQuantity(available);
    setSelectedItemId(data.id);
    setFoundItemUnit(data.unit || '');
    
    toast({
      title: 'Stock Checked',
      description: `Available quantity for ${itemName} (${data.unit || 'N/A'}) is ${available}.`,
    });
  };

  const handleDelete = async () => {
    const toDelete = parseFloat(quantityToDelete);
    if (!selectedItemId || !toDelete || toDelete <= 0) {
      toast({ title: 'Invalid Input', description: 'Please check stock and enter a valid quantity to delete.', variant: 'destructive' });
      return;
    }

    if (toDelete > parseFloat(availableQuantity)) {
      toast({ title: 'Error', description: 'Quantity to delete cannot be greater than available quantity.', variant: 'destructive' });
      return;
    }

    const success = await reduceItemStock(selectedItemId, toDelete);
    if (success) {
      toast({ title: 'Success', description: `${toDelete} units of ${itemName} have been marked as used.` });
      onClose();
    }
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
      <Card className="border-0 shadow-none">
        <CardHeader>
          <CardTitle>Delete Item Stock</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-3">
          
          {/* Supplier Search */}
          <div className="space-y-2 relative md:col-span-2">
            <Label>Supplier Name</Label>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                    placeholder="Search Supplier..."
                    value={supplierSearchTerm}
                    onChange={handleSupplierSearchChange}
                    className="pl-9"
                    autoComplete="off"
                />
            </div>
            {showSupplierSuggestions && filteredSuppliers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredSuppliers.map((s) => (
                        <div
                            key={s.id}
                            className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                            onClick={() => selectSupplier(s)}
                        >
                            {s.supplier_name}
                        </div>
                    ))}
                </div>
            )}
          </div>

          {/* Invoice Selection */}
          <div className="space-y-2">
            <Label>Invoice Number</Label>
            <Select onValueChange={handleInvoiceChange} value={selectedInvoice} disabled={!selectedSupplier}>
              <SelectTrigger><SelectValue placeholder="Select an invoice" /></SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                {invoices.map(inv => <SelectItem key={inv} value={inv}>{inv}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select onValueChange={setCategory} value={category} disabled={!selectedInvoice}>
              <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                {categoryList.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Item Name Selection */}
          <div className="space-y-2">
            <Label>Item Name</Label>
            <Select onValueChange={setItemName} value={itemName} disabled={!category}>
              <SelectTrigger><SelectValue placeholder="Select an item name" /></SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                {itemNames.map((name, index) => <SelectItem key={`${name}-${index}`} value={name}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 col-span-full flex justify-end">
            <Button type="button" onClick={handleCheckStock} disabled={!itemName} className="bg-blue-600 hover:bg-blue-700 text-white">Check Stock</Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Available Quantity {foundItemUnit && `(${foundItemUnit})`}</Label>
            <Input id="quantity" type="number" placeholder="Available quantity" value={availableQuantity} readOnly className="bg-gray-100" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantityToDelete">Quantity to Delete</Label>
            <Input
              id="quantityToDelete"
              type="number"
              placeholder="Enter quantity"
              value={quantityToDelete}
              onChange={(e) => setQuantityToDelete(e.target.value)}
              disabled={!selectedItemId}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button type="button" onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white">Close</Button>
          <Button type="button" onClick={handleDelete} disabled={!quantityToDelete} className="bg-blue-600 hover:bg-blue-700 text-white">Delete</Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default DeleteItemForm;