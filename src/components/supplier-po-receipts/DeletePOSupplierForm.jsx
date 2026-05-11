import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Search, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import useSupplierManagement from '@/hooks/useSupplierManagement';

const DeletePOSupplierForm = ({ onClose }) => {
  const { toast } = useToast();
  const { suppliers } = useSupplierManagement();
  
  // Autocomplete state
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle clicking outside the dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSuppliers = suppliers.filter(s => 
    (s.supplier_name || '').toLowerCase().includes((supplierSearchTerm || '').toLowerCase())
  );

  const handleSupplierSelect = (supplier) => {
    setSupplierSearchTerm(supplier.supplier_name);
    setSelectedSupplierId(supplier.id);
    setShowDropdown(false);
    setResults([]); // Clear results when a new supplier is selected
  };

  const handleClearSupplier = () => {
    setSupplierSearchTerm('');
    setSelectedSupplierId('');
    setResults([]); // Clear results
    setShowDropdown(true);
  };

  const handleSearch = async () => {
    if (!selectedSupplierId) {
      toast({ title: 'Validation Error', description: 'Please select a supplier first.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('supplier_purchase_order_receipts')
        .select('*')
        .eq('supplier_id', selectedSupplierId);

      if (error) throw error;
      
      setResults(data || []);
      if (data?.length === 0) {
        toast({ title: 'No results found', description: 'No purchase orders found for this supplier.' });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({ title: 'Search Failed', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this Purchase Order Receipt? This action cannot be undone.')) return;

    setIsDeleting(true);
    try {
      // First delete associated items
      await supabase
        .from('supplier_purchase_order_receipt_items')
        .delete()
        .eq('receipt_id', id);

      // Then delete the receipt
      const { error } = await supabase
        .from('supplier_purchase_order_receipts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Purchase order receipt deleted successfully.' });
      setResults(results.filter(r => r.id !== id));
    } catch (error) {
      console.error('Delete error:', error);
      toast({ title: 'Delete Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <Card className="max-w-5xl mx-auto border-none shadow-none md:border-solid md:shadow-sm">
        <CardHeader>
          <CardTitle>Delete Purchase Order Receipt to Supplier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-lg border space-y-4">
            <div className="space-y-2 relative max-w-md" ref={dropdownRef}>
              <Label>Supplier Name</Label>
              <div className="relative">
                <Input 
                  value={supplierSearchTerm} 
                  onChange={(e) => {
                    setSupplierSearchTerm(e.target.value);
                    if (selectedSupplierId) {
                      setSelectedSupplierId('');
                      setResults([]);
                    }
                    setShowDropdown(true);
                  }} 
                  onFocus={() => {
                    if (!selectedSupplierId) setShowDropdown(true);
                  }}
                  placeholder="Search and select supplier..." 
                  className={cn("bg-white pr-8", selectedSupplierId && "border-blue-500 ring-1 ring-blue-500")} 
                />
                {supplierSearchTerm && (
                  <button 
                    type="button"
                    onClick={handleClearSupplier} 
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors bg-white rounded-full p-0.5"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              <AnimatePresence>
                {showDropdown && !selectedSupplierId && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.15 }}
                    className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
                  >
                    {filteredSuppliers.length > 0 ? (
                      filteredSuppliers.map(s => (
                        <div 
                          key={s.id} 
                          onClick={() => handleSupplierSelect(s)}
                          className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer transition-colors text-sm border-b border-gray-50 last:border-0"
                        >
                          <div className="font-medium text-gray-900">{s.supplier_name}</div>
                          {s.contact_person && <div className="text-xs text-gray-500">{s.contact_person}</div>}
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-center text-sm text-gray-500">
                        No suppliers found matching "{supplierSearchTerm}"
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex justify-start pt-2">
              <Button 
                onClick={handleSearch} 
                disabled={loading || !selectedSupplierId} 
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2 min-w-[120px]"
              >
                <Search className="h-4 w-4" /> {loading ? 'Searching...' : 'Show'}
              </Button>
            </div>
          </div>

          {results.length > 0 && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="border rounded-md overflow-hidden"
            >
              <Table>
                <TableHeader className="bg-gray-100">
                  <TableRow>
                    <TableHead>PO No</TableHead>
                    <TableHead>Grand Total</TableHead>
                    <TableHead>Advance Paid</TableHead>
                    <TableHead>Advance Paid Date</TableHead>
                    <TableHead>PO Date</TableHead>
                    <TableHead className="text-center">Delete</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.po_from_supplier_no || 'N/A'}</TableCell>
                      <TableCell>₹{(r.grand_total || 0).toFixed(2)}</TableCell>
                      <TableCell>₹{(r.advance_amount_paid || 0).toFixed(2)}</TableCell>
                      <TableCell>{r.advance_paid_date ? format(new Date(r.advance_paid_date), 'dd-MM-yyyy') : 'N/A'}</TableCell>
                      <TableCell>{r.purchase_order_date ? format(new Date(r.purchase_order_date), 'dd-MM-yyyy') : 'N/A'}</TableCell>
                      <TableCell className="text-center">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(r.id)} 
                          disabled={isDeleting}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Delete PO Receipt"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </motion.div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]">
            Close
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default DeletePOSupplierForm;