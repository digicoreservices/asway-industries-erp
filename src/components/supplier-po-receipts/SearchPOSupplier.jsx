
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Search, Trash2, X, Edit2, ArrowLeft, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/customSupabaseClient';
import useSupplierManagement from '@/hooks/useSupplierManagement';
import EditPOSupplierForm from './EditPOSupplierForm';

const SearchPOSupplier = ({ onClose }) => {
  const { toast } = useToast();
  const { suppliers } = useSupplierManagement();
  
  const [searchOption, setSearchOption] = useState('All');
  const [poNumberSearch, setPoNumberSearch] = useState('');
  const [selectedPoNumber, setSelectedPoNumber] = useState('');
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  
  const [openPoNumberCombobox, setOpenPoNumberCombobox] = useState(false);
  const [openSupplierCombobox, setOpenSupplierCombobox] = useState(false);
  
  const [availablePoNumbers, setAvailablePoNumbers] = useState([]);
  const [loadingPoNumbers, setLoadingPoNumbers] = useState(false);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  
  const [editingReceiptId, setEditingReceiptId] = useState(null);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Fetch available PO numbers when search option changes to PO Receipt Number
  useEffect(() => {
    const fetchPoNumbers = async () => {
      if (searchOption !== 'PO to Supplier Receipt Number') return;
      
      setLoadingPoNumbers(true);
      try {
        const { data, error } = await supabase
          .from('supplier_purchase_order_receipts')
          .select('po_from_supplier_no')
          .order('po_from_supplier_no', { ascending: true });

        if (error) throw error;

        // Extract unique PO numbers
        const uniquePoNumbers = [...new Set(data.map(item => item.po_from_supplier_no).filter(Boolean))];
        setAvailablePoNumbers(uniquePoNumbers);
      } catch (error) {
        console.error('Error fetching PO numbers:', error);
        toast({ 
          title: 'Error', 
          description: 'Failed to load PO numbers.', 
          variant: 'destructive' 
        });
      } finally {
        setLoadingPoNumbers(false);
      }
    };

    fetchPoNumbers();
  }, [searchOption, toast]);

  const handlePoNumberSelect = (poNumber) => {
    setPoNumberSearch(poNumber);
    setSelectedPoNumber(poNumber);
    setOpenPoNumberCombobox(false);
  };

  const handleSupplierSelect = (supplier) => {
    setSupplierSearchTerm(supplier.supplier_name);
    setSelectedSupplierId(supplier.id);
    setOpenSupplierCombobox(false);
  };

  const handleSearch = async () => {
    if (searchOption === 'PO to Supplier Receipt Number' && !selectedPoNumber) {
      toast({ title: 'Validation Error', description: 'Please select a PO Receipt Number.', variant: 'destructive' });
      return;
    }

    if (searchOption === 'Supplier Name' && !selectedSupplierId) {
      toast({ title: 'Validation Error', description: 'Please select a supplier.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      let query = supabase.from('supplier_purchase_order_receipts').select('*');

      if (searchOption === 'All') {
        // For "All", no filters applied - fetch all records
      } else if (searchOption === 'PO to Supplier Receipt Number') {
        query = query.eq('po_from_supplier_no', selectedPoNumber);
      } else if (searchOption === 'Supplier Name') {
        query = query.eq('supplier_id', selectedSupplierId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      setResults(data || []);
      if (data?.length === 0) {
        toast({ title: 'No results found', description: 'No purchase orders found matching your criteria.' });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({ title: 'Search Failed', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (receipt) => {
    setRecordToDelete(receipt);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return;

    setIsDeleting(true);
    try {
      // First delete related items
      await supabase
        .from('supplier_purchase_order_receipt_items')
        .delete()
        .eq('receipt_id', recordToDelete.id);

      // Then delete the main receipt
      const { error } = await supabase
        .from('supplier_purchase_order_receipts')
        .delete()
        .eq('id', recordToDelete.id);

      if (error) throw error;

      toast({ 
        title: 'Success', 
        description: `PO Receipt ${recordToDelete.po_from_supplier_no} deleted successfully.` 
      });
      
      // Remove from results and refresh
      setResults(results.filter(r => r.id !== recordToDelete.id));
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
      
    } catch (error) {
      console.error('Delete error:', error);
      toast({ 
        title: 'Delete Failed', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = async (receipt) => {
    setSelectedReceipt(receipt);
    setEditingReceiptId(receipt.id);
    setIsEditFormOpen(true);
  };

  const handleEditSuccess = async () => {
    setIsEditFormOpen(false);
    setEditingReceiptId(null);
    setSelectedReceipt(null);
    await handleSearch();
    toast({ title: 'Success', description: 'Receipt updated successfully.' });
  };

  const formatCurrency = (amount) => {
    return amount != null ? `₹${parseFloat(amount).toFixed(2)}` : 'N/A';
  };

  const getSupplierName = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.supplier_name || 'Unknown';
  };

  const handleSearchOptionChange = (value) => {
    setSearchOption(value);
    setResults([]);
    setPoNumberSearch('');
    setSelectedPoNumber('');
    setSupplierSearchTerm('');
    setSelectedSupplierId('');
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
        <Card className="max-w-6xl mx-auto border-none shadow-none md:border-solid md:shadow-sm">
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>Search Purchase Order Receipt for Supplier</CardTitle>
            <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <ArrowLeft className="h-4 w-4" /> Go Back
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-lg border space-y-4">
              <div className="space-y-2 max-w-md">
                <Label>Select Option to Search</Label>
                <Select value={searchOption} onValueChange={handleSearchOptionChange}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select search option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="PO to Supplier Receipt Number">PO to Supplier Receipt Number</SelectItem>
                    <SelectItem value="Supplier Name">Supplier Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <AnimatePresence mode="wait">
                {searchOption === 'PO to Supplier Receipt Number' && (
                  <motion.div 
                    key="po-number-search"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-2 max-w-md overflow-hidden"
                  >
                    <Label>PO to Supplier Receipt Number</Label>
                    <Popover open={openPoNumberCombobox} onOpenChange={setOpenPoNumberCombobox}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openPoNumberCombobox}
                          className="w-full justify-between bg-white"
                          disabled={loadingPoNumbers}
                        >
                          {selectedPoNumber || (loadingPoNumbers ? "Loading..." : "Select PO Receipt Number")}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput 
                            placeholder="Search PO number..." 
                            className="text-gray-900"
                            value={poNumberSearch}
                            onValueChange={setPoNumberSearch}
                          />
                          <CommandList>
                            <CommandEmpty>No PO number found.</CommandEmpty>
                            <CommandGroup>
                              {availablePoNumbers
                                .filter(po => po.toLowerCase().includes(poNumberSearch.toLowerCase()))
                                .map((poNumber) => (
                                  <CommandItem
                                    key={poNumber}
                                    value={poNumber}
                                    onSelect={() => handlePoNumberSelect(poNumber)}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedPoNumber === poNumber ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {poNumber}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </motion.div>
                )}

                {searchOption === 'Supplier Name' && (
                  <motion.div 
                    key="supplier-search"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-2 max-w-md overflow-hidden"
                  >
                    <Label>Supplier Name</Label>
                    <Popover open={openSupplierCombobox} onOpenChange={setOpenSupplierCombobox}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openSupplierCombobox}
                          className="w-full justify-between bg-white"
                        >
                          {supplierSearchTerm || "Select a supplier"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput 
                            placeholder="Search supplier..." 
                            className="text-gray-900"
                            value={supplierSearchTerm}
                            onValueChange={setSupplierSearchTerm}
                          />
                          <CommandList>
                            <CommandEmpty>No supplier found.</CommandEmpty>
                            <CommandGroup>
                              {suppliers
                                .filter(s => (s.supplier_name || '').toLowerCase().includes((supplierSearchTerm || '').toLowerCase()))
                                .map((supplier) => (
                                  <CommandItem
                                    key={supplier.id}
                                    value={supplier.supplier_name}
                                    onSelect={() => handleSupplierSelect(supplier)}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedSupplierId === supplier.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {supplier.supplier_name}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex justify-start pt-2">
                <Button 
                  onClick={handleSearch} 
                  disabled={loading} 
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
                <div className="max-h-[500px] overflow-y-auto overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-100 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="bg-gray-100">Receipt Number</TableHead>
                        <TableHead className="bg-gray-100">Supplier Name</TableHead>
                        <TableHead className="bg-gray-100">Date</TableHead>
                        <TableHead className="text-right bg-gray-100">Grand Total</TableHead>
                        <TableHead className="text-center bg-gray-100">Edit</TableHead>
                        <TableHead className="text-center bg-gray-100">Delete</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((r) => (
                        <TableRow key={r.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{r.po_from_supplier_no || 'N/A'}</TableCell>
                          <TableCell>{getSupplierName(r.supplier_id)}</TableCell>
                          <TableCell>{r.purchase_order_date ? format(new Date(r.purchase_order_date), 'dd-MM-yyyy') : 'N/A'}</TableCell>
                          <TableCell className="text-right font-bold text-blue-600">{formatCurrency(r.grand_total)}</TableCell>
                          <TableCell className="text-center">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleEdit(r)}
                              className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                              title="Edit Receipt"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteClick(r)} 
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
                </div>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purchase Order Receipt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete PO Receipt <strong>{recordToDelete?.po_from_supplier_no}</strong>?
              <br />
              This will permanently delete the receipt and all associated items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setRecordToDelete(null);
            }} disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm} 
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Form Dialog */}
      <Dialog open={isEditFormOpen} onOpenChange={setIsEditFormOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0">
          {selectedReceipt && (
            <EditPOSupplierForm 
              receipt={selectedReceipt}
              onClose={() => {
                setIsEditFormOpen(false);
                setEditingReceiptId(null);
                setSelectedReceipt(null);
              }}
              onSuccess={handleEditSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SearchPOSupplier;
