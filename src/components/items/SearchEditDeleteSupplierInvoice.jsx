
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
import { format } from 'date-fns';
import EditSupplierInvoiceForm from './EditSupplierInvoiceForm';

const SearchEditDeleteSupplierInvoice = ({ onClose }) => {
  const { toast } = useToast();
  
  // Search state
  const [searchOption, setSearchOption] = useState('all');
  const [searchValue, setSearchValue] = useState('');
  
  // Supplier auto-suggestions
  const [supplierSuggestions, setSupplierSuggestions] = useState([]);
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false);
  const [isLoadingSupplierSuggestions, setIsLoadingSupplierSuggestions] = useState(false);
  const supplierSuggestionsRef = useRef(null);
  
  // Invoice number auto-suggestions
  const [invoiceSuggestions, setInvoiceSuggestions] = useState([]);
  const [showInvoiceSuggestions, setShowInvoiceSuggestions] = useState(false);
  const [isLoadingInvoiceSuggestions, setIsLoadingInvoiceSuggestions] = useState(false);
  const invoiceSuggestionsRef = useRef(null);
  
  // Invoices state
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  
  // Delete confirmation state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Click outside handler for suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (supplierSuggestionsRef.current && !supplierSuggestionsRef.current.contains(event.target)) {
        setShowSupplierSuggestions(false);
      }
      if (invoiceSuggestionsRef.current && !invoiceSuggestionsRef.current.contains(event.target)) {
        setShowInvoiceSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced supplier search
  useEffect(() => {
    if (searchOption === 'supplier_name' && searchValue.trim()) {
      setIsLoadingSupplierSuggestions(true);
      const timer = setTimeout(async () => {
        try {
          const { data, error } = await supabase
            .from('suppliers')
            .select('supplier_name')
            .ilike('supplier_name', `%${searchValue.trim()}%`)
            .limit(10);
          
          if (error) throw error;
          
          const uniqueNames = [...new Set(data.map(s => s.supplier_name))];
          setSupplierSuggestions(uniqueNames);
          setShowSupplierSuggestions(true);
        } catch (err) {
          console.error('Error fetching supplier suggestions:', err);
        } finally {
          setIsLoadingSupplierSuggestions(false);
        }
      }, 300);
      
      return () => clearTimeout(timer);
    } else {
      setSupplierSuggestions([]);
      setShowSupplierSuggestions(false);
    }
  }, [searchValue, searchOption]);

  // Debounced invoice number search
  useEffect(() => {
    if (searchOption === 'invoice_number' && searchValue.trim()) {
      setIsLoadingInvoiceSuggestions(true);
      const timer = setTimeout(async () => {
        try {
          const { data, error } = await supabase
            .from('items')
            .select('supplier_invoice_number')
            .ilike('supplier_invoice_number', `%${searchValue.trim()}%`)
            .limit(10);
          
          if (error) throw error;
          
          const uniqueInvoiceNumbers = [...new Set(data.map(i => i.supplier_invoice_number).filter(Boolean))];
          setInvoiceSuggestions(uniqueInvoiceNumbers);
          setShowInvoiceSuggestions(true);
        } catch (err) {
          console.error('Error fetching invoice suggestions:', err);
        } finally {
          setIsLoadingInvoiceSuggestions(false);
        }
      }, 300);
      
      return () => clearTimeout(timer);
    } else {
      setInvoiceSuggestions([]);
      setShowInvoiceSuggestions(false);
    }
  }, [searchValue, searchOption]);

  const handleSearchOptionChange = (value) => {
    setSearchOption(value);
    setSearchValue('');
    setInvoices([]);
    setSupplierSuggestions([]);
    setShowSupplierSuggestions(false);
    setInvoiceSuggestions([]);
    setShowInvoiceSuggestions(false);
  };

  const handleSearchValueChange = (e) => {
    setSearchValue(e.target.value);
  };

  const handleSupplierSuggestionClick = (suggestion) => {
    setSearchValue(suggestion);
    setShowSupplierSuggestions(false);
  };

  const handleInvoiceSuggestionClick = (suggestion) => {
    setSearchValue(suggestion);
    setShowInvoiceSuggestions(false);
  };

  const fetchInvoices = async () => {
    setIsLoading(true);
    
    try {
      let query = supabase.from('items').select('*');

      // Apply filters based on search option
      if (searchOption === 'invoice_number') {
        if (!searchValue.trim()) {
          toast({ 
            title: 'Validation Error', 
            description: 'Please enter a Supplier Invoice Number.', 
            variant: 'destructive' 
          });
          setIsLoading(false);
          return;
        }
        query = query.eq('supplier_invoice_number', searchValue.trim());
      } else if (searchOption === 'supplier_name') {
        if (!searchValue.trim()) {
          toast({ 
            title: 'Validation Error', 
            description: 'Please enter a Supplier Name.', 
            variant: 'destructive' 
          });
          setIsLoading(false);
          return;
        }
        query = query.ilike('supplier_name', `%${searchValue.trim()}%`);
      }
      // For 'all' option, no additional filter is needed

      const { data, error } = await query;
      
      if (error) throw error;

      if (!data || data.length === 0) {
        let message = 'No invoices found.';
        if (searchOption === 'invoice_number') {
          message = `No invoice found with Invoice Number: ${searchValue}`;
        } else if (searchOption === 'supplier_name') {
          message = `No invoices found for Supplier Name: ${searchValue}`;
        }
        
        toast({ 
          title: 'No Results', 
          description: message 
        });
        setInvoices([]);
        setIsLoading(false);
        return;
      }

      // Group items by supplier_invoice_number to create invoice objects
      const groupedInvoices = data.reduce((acc, item) => {
        const invNum = item.supplier_invoice_number;
        if (!invNum) return acc;
        
        if (!acc[invNum]) {
          acc[invNum] = {
            id: invNum,
            supplier_invoice_number: invNum,
            invoice_date: item.invoice_date,
            supplier_name: item.supplier_name,
            department: item.department || '',
            user_name: item.user_name || '',
            items: [],
            grand_total: 0
          };
        }
        
        acc[invNum].items.push(item);
        acc[invNum].grand_total += Number(item.total_price_with_gst) || 0;
        
        return acc;
      }, {});

      const processedInvoices = Object.values(groupedInvoices);
      
      setInvoices(processedInvoices);
      
      toast({ 
        title: 'Success', 
        description: `Found ${processedInvoices.length} invoice${processedInvoices.length !== 1 ? 's' : ''}.` 
      });
    } catch (err) {
      console.error("Fetch Error:", err);
      toast({ 
        title: 'Error', 
        description: `Failed to fetch invoices: ${err.message}`, 
        variant: 'destructive' 
      });
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (invoice) => {
    setEditingInvoice(invoice);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    fetchInvoices(); // Refresh the invoice list
    toast({ 
      title: 'Success', 
      description: 'Invoice updated successfully. Results refreshed.' 
    });
  };

  const openDeleteDialog = (invoice) => {
    setInvoiceToDelete(invoice);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!invoiceToDelete) return;
    
    setIsDeleting(true);
    
    try {
      // Delete all items with this supplier_invoice_number
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('supplier_invoice_number', invoiceToDelete.supplier_invoice_number)
        .eq('supplier_name', invoiceToDelete.supplier_name);
      
      if (error) throw error;
      
      toast({ 
        title: 'Success', 
        description: 'Invoice deleted successfully.' 
      });
      
      setIsDeleteDialogOpen(false);
      setInvoiceToDelete(null);
      
      // Refresh the invoice list
      fetchInvoices();
    } catch (err) {
      console.error("Delete Error:", err);
      toast({ 
        title: 'Error', 
        description: `Failed to delete invoice: ${err.message}`, 
        variant: 'destructive' 
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd-MM-yyyy');
    } catch (err) {
      return dateString;
    }
  };

  const formatCurrency = (amount) => {
    const numAmount = parseFloat(amount) || 0;
    return `₹${numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        transition={{ duration: 0.3 }}
      >
        <Card className="border-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <CardTitle>Search, Edit and Delete Supplier Invoice</CardTitle>
            <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white">
              Go Back
            </Button>
          </CardHeader>
          
          <CardContent className="pt-6">
            {/* Search Section */}
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Select Option to Search</Label>
                  <Select value={searchOption} onValueChange={handleSearchOptionChange}>
                    <SelectTrigger className="bg-white text-gray-900">
                      <SelectValue placeholder="Select search option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="invoice_number">Invoice Number</SelectItem>
                      <SelectItem value="supplier_name">Supplier Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {searchOption === 'invoice_number' && (
                  <div className="space-y-2 relative" ref={invoiceSuggestionsRef}>
                    <Label>Supplier Invoice Number</Label>
                    <div className="relative">
                      <Input 
                        placeholder="Type to search invoice number..." 
                        value={searchValue} 
                        onChange={handleSearchValueChange}
                        onFocus={() => {
                          if (invoiceSuggestions.length > 0) {
                            setShowInvoiceSuggestions(true);
                          }
                        }}
                        className="bg-white text-gray-900"
                      />
                      {isLoadingInvoiceSuggestions && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    {showInvoiceSuggestions && invoiceSuggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
                      >
                        {invoiceSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            onClick={() => handleInvoiceSuggestionClick(suggestion)}
                            className="px-4 py-3 cursor-pointer text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 border-b last:border-b-0 border-gray-100"
                          >
                            <div className="font-medium">{suggestion}</div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </div>
                )}

                {searchOption === 'supplier_name' && (
                  <div className="space-y-2 relative" ref={supplierSuggestionsRef}>
                    <Label>Supplier Name</Label>
                    <div className="relative">
                      <Input 
                        placeholder="Type to search supplier..." 
                        value={searchValue} 
                        onChange={handleSearchValueChange}
                        onFocus={() => {
                          if (supplierSuggestions.length > 0) {
                            setShowSupplierSuggestions(true);
                          }
                        }}
                        className="bg-white text-gray-900"
                      />
                      {isLoadingSupplierSuggestions && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    {showSupplierSuggestions && supplierSuggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
                      >
                        {supplierSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            onClick={() => handleSupplierSuggestionClick(suggestion)}
                            className="px-4 py-3 cursor-pointer text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 border-b last:border-b-0 border-gray-100"
                          >
                            <div className="font-medium">{suggestion}</div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-start">
                <Button 
                  onClick={fetchInvoices} 
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Show
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Results Table with Scrollbar and Sticky Header */}
            {invoices.length > 0 && (
              <div className="rounded-md border mt-6 bg-white">
                {/* Scrollable container with fixed max-height */}
                <div className="overflow-y-auto max-h-[500px] relative">
                  <Table>
                    {/* Sticky header */}
                    <TableHeader className="sticky top-0 z-10 bg-gray-50 shadow-sm">
                      <TableRow className="border-b border-gray-200">
                        <TableHead className="bg-gray-50">Invoice Number</TableHead>
                        <TableHead className="bg-gray-50">Supplier Name</TableHead>
                        <TableHead className="bg-gray-50">Invoice Date</TableHead>
                        <TableHead className="bg-gray-50">Department</TableHead>
                        <TableHead className="bg-gray-50">User Name</TableHead>
                        <TableHead className="text-right bg-gray-50">Grand Total</TableHead>
                        <TableHead className="text-center w-[120px] bg-gray-50">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((inv) => (
                        <TableRow key={inv.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{inv.supplier_invoice_number}</TableCell>
                          <TableCell>{inv.supplier_name}</TableCell>
                          <TableCell>{formatDate(inv.invoice_date)}</TableCell>
                          <TableCell>{inv.department || 'N/A'}</TableCell>
                          <TableCell>{inv.user_name || 'N/A'}</TableCell>
                          <TableCell className="text-right font-semibold text-blue-600">
                            {formatCurrency(inv.grand_total)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => openEditModal(inv)} 
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title="Edit Invoice"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => openDeleteDialog(inv)} 
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Delete Invoice"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Footer outside scrollable area */}
                <div className="bg-gray-50 px-4 py-3 border-t sticky bottom-0">
                  <p className="text-sm text-gray-600">
                    Total Invoices: <span className="font-semibold">{invoices.length}</span>
                  </p>
                </div>
              </div>
            )}

            {!isLoading && invoices.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">No invoices to display</p>
                <p className="text-sm mt-2">Select a search option and click "Show" to view invoices.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Edit Modal with Full Form */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-7xl max-h-[95vh] p-0 overflow-y-auto">
          {editingInvoice && (
            <EditSupplierInvoiceForm 
              invoice={editingInvoice}
              onClose={() => setIsEditModalOpen(false)}
              onSuccess={handleEditSuccess}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this invoice? This action cannot be undone.
              {invoiceToDelete && (
                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm font-medium text-gray-700">Invoice Number: {invoiceToDelete.supplier_invoice_number}</p>
                  <p className="text-sm text-gray-600">Supplier: {invoiceToDelete.supplier_name}</p>
                  <p className="text-sm text-gray-600">Grand Total: {formatCurrency(invoiceToDelete.grand_total)}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SearchEditDeleteSupplierInvoice;
