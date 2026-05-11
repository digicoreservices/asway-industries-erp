import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Search, Eye, Edit, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { fetchWithRetry } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import CreateInvoiceForm from '@/components/invoices/CreateInvoiceForm';
import { format } from 'date-fns';

const SearchInvoice = ({ onClose }) => {
  const { toast } = useToast();
  const [searchBy, setSearchBy] = useState('invoice_number');
  const [searchValue, setSearchValue] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const PAGE_SIZE = 20;
  
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [customerOptions, setCustomerOptions] = useState([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    const fetchCustomerNames = async () => {
      const { data, error } = await fetchWithRetry(
        (signal) => supabase.from('invoices').select('buyer_name').order('buyer_name').abortSignal(signal),
        { operationName: 'Fetch Invoice Customers' }
      );
      
      if (!error && data && isMounted.current) {
        const uniqueNames = [...new Set(data.map(item => item.buyer_name).filter(Boolean))];
        setCustomerOptions(uniqueNames);
      }
    };

    fetchCustomerNames();
  }, []);

  const filteredCustomers = useMemo(() => {
    if (!searchValue) return customerOptions;
    return customerOptions.filter(c => c.toLowerCase().includes(searchValue.toLowerCase()));
  }, [customerOptions, searchValue]);

  const executeSearch = useCallback(async (isLoadMore = false) => {
    if (!searchBy) {
      toast({ title: "Validation Error", description: "Please select a search criteria.", variant: "destructive" });
      return;
    }

    if (searchBy === 'date_range' && (!dateFrom || !dateTo)) {
      toast({ title: "Validation Error", description: "Please select both from and to dates.", variant: "destructive" });
      return;
    }

    if ((searchBy === 'invoice_number' || searchBy === 'customer_name' || searchBy === 'po_number') && !searchValue) {
      toast({ title: "Validation Error", description: "Please enter or select a search value.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setHasSearched(true);
    
    try {
      const currentOffset = isLoadMore ? (page + 1) * PAGE_SIZE : 0;
      let query = supabase.from('invoices')
        .select('id, invoice_number, invoice_date, buyer_name, buyer_contact_person, buyer_contact_number, buyer_department, buyer_user, consignee_name, consignee_contact_person, consignee_contact_number, consignee_department, consignee_user, po_number, other_charges_percentage, other_charges_description, total_amount')
        .order('created_at', { ascending: false });

      if (searchBy === 'invoice_number' && searchValue) {
        query = query.ilike('invoice_number', `%${searchValue}%`);
      } else if (searchBy === 'date_range' && dateFrom && dateTo) {
        query = query.gte('invoice_date', dateFrom).lte('invoice_date', dateTo);
      } else if (searchBy === 'customer_name' && searchValue) {
        query = query.ilike('buyer_name', `%${searchValue}%`);
      } else if (searchBy === 'po_number' && searchValue) {
        query = query.ilike('po_number', `%${searchValue}%`);
      }

      // Pagination
      query = query.range(currentOffset, currentOffset + PAGE_SIZE - 1);

      const { data, error } = await fetchWithRetry(
        (signal) => query.abortSignal(signal),
        { operationName: 'Search Invoices', timeoutMs: 15000 }
      );

      if (error) throw error;

      if (isMounted.current) {
          if (isLoadMore) {
              setSearchResults(prev => [...(prev || []), ...data]);
              setPage(page + 1);
          } else {
              setSearchResults(data);
              setPage(0);
          }
          setHasMore(data.length === PAGE_SIZE);

          if (!isLoadMore) {
            if (data.length === 0) toast({ title: "No Results", description: "No invoices found matching your criteria." });
            else toast({ title: "Search Complete", description: `Found invoices.` });
          }
      }
    } catch (error) {
      if (isMounted.current) toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [searchBy, searchValue, dateFrom, dateTo, page, toast]);

  const handleViewDetails = (invoice) => {
    setSelectedInvoice(invoice);
    setIsDetailsOpen(true);
  };

  const handleDetailsClose = () => {
    setIsDetailsOpen(false);
    setSelectedInvoice(null);
  };

  const handleUpdateSuccess = () => {
      executeSearch(false); 
      handleDetailsClose();
  };

  const confirmDelete = (invoice) => {
    setInvoiceToDelete(invoice);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!invoiceToDelete) return;

    try {
      setLoading(true);
      
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', invoiceToDelete.id);

      if (itemsError) throw itemsError;

      const { error: invoiceError } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceToDelete.id);

      if (invoiceError) throw invoiceError;

      toast({ title: "Deleted", description: "Invoice deleted successfully." });
      
      setSearchResults(prev => prev.filter(inv => inv.id !== invoiceToDelete.id));

    } catch (error) {
      toast({ title: "Error", description: "Failed to delete invoice: " + error.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setIsDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    }
  };

  const formatDisplayDate = (dateStr) => {
      if (!dateStr) return '-';
      try {
          return format(new Date(dateStr), 'dd-MM-yyyy');
      } catch (e) {
          return dateStr;
      }
  };

  return (
    <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl mx-auto flex flex-col max-h-[90vh]">
      <div className="flex justify-between items-center p-4 border-b bg-gray-50 rounded-t-lg">
        <h2 className="text-xl font-bold text-gray-800">Search, Edit and Delete Invoice</h2>
        {onClose && (
          <Button 
            onClick={onClose} 
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm px-6"
          >
            Close
          </Button>
        )}
      </div>

      <div className="p-6 space-y-6 overflow-y-auto flex-1">
        <div className="flex flex-wrap gap-4 items-end">
            <div className="w-full md:w-auto">
                <Label className="mb-2 block">Search Invoice By</Label>
                <Select value={searchBy} onValueChange={(val) => { setSearchBy(val); setSearchValue(''); setHasSearched(false); }}>
                    <SelectTrigger className="w-full md:w-48">
                        <SelectValue placeholder="Select Criteria" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="invoice_number">Invoice Number</SelectItem>
                        <SelectItem value="date_range">Invoice Between Two Dates</SelectItem>
                        <SelectItem value="customer_name">Customer Name</SelectItem>
                        <SelectItem value="po_number">PO Number</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex-1 min-w-[200px] max-w-sm">
                {searchBy === 'date_range' ? (
                    <div className="flex gap-2">
                        <div className="flex-1">
                             <Label className="mb-2 block text-xs">From Date</Label>
                             <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setHasSearched(false); }} className="w-full" />
                        </div>
                        <div className="flex-1">
                             <Label className="mb-2 block text-xs">To Date</Label>
                             <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setHasSearched(false); }} className="w-full" />
                        </div>
                    </div>
                ) : searchBy === 'customer_name' ? (
                    <div className="relative">
                        <Label className="mb-2 block">Search Customer Name</Label>
                        <Input 
                            type="text" 
                            className="w-full md:w-56"
                            placeholder="Type to search..."
                            value={searchValue} 
                            onChange={(e) => { 
                                setSearchValue(e.target.value); 
                                setShowCustomerSuggestions(true);
                                setHasSearched(false); 
                            }} 
                            onFocus={() => setShowCustomerSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 200)}
                        />
                        {showCustomerSuggestions && (
                            <div className="absolute z-10 w-full md:w-56 bg-white border rounded-md shadow-lg max-h-[250px] overflow-auto mt-1">
                                {filteredCustomers.length > 0 ? (
                                    filteredCustomers.map((name, idx) => (
                                        <div 
                                            key={idx} 
                                            className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                                            onMouseDown={(e) => { 
                                                e.preventDefault(); 
                                                setSearchValue(name);
                                                setShowCustomerSuggestions(false);
                                            }}
                                        >
                                            {name}
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-2 text-sm text-gray-500">No customers found</div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                        <Label className="mb-2 block">
                            {searchBy === 'invoice_number' && 'Enter Invoice Number'}
                            {searchBy === 'po_number' && 'Enter PO Number'}
                        </Label>
                        <Input 
                            type="text" 
                            className="w-full md:w-56"
                            placeholder={
                                searchBy === 'invoice_number' ? 'e.g. INV-001' : 'e.g. PO-2023-001'
                            }
                            value={searchValue} 
                            onChange={(e) => { setSearchValue(e.target.value); setHasSearched(false); }} 
                        />
                    </div>
                )}
            </div>

            <div className="w-full md:w-auto">
                <Button onClick={() => executeSearch(false)} disabled={loading} className="w-full md:w-32 bg-blue-600 hover:bg-blue-700 text-white">
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                    Search
                </Button>
            </div>
        </div>

        {hasSearched && (
          <div className="mt-8 border rounded-md overflow-hidden min-h-[200px]">
              <div className="bg-gray-100 p-3 border-b font-semibold text-gray-700">Search Results</div>
              <div className="overflow-x-auto">
                   <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-700 font-medium border-b">
                          <tr>
                              <th className="p-3">Invoice No</th>
                              <th className="p-3">Date</th>
                              <th className="p-3">Customer (Buyer)</th>
                              <th className="p-3">Buyer Details (Contact/Dept/User)</th>
                              <th className="p-3">Consignee</th>
                              <th className="p-3">Consignee Details (Contact/Dept/User)</th>
                              <th className="p-3">PO Number</th>
                              <th className="p-3">Other Charges</th>
                              <th className="p-3 text-right">Amount</th>
                              <th className="p-3 text-center w-32">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y">
                          {searchResults === null || searchResults.length === 0 ? (
                              <tr>
                                  <td colSpan="10" className="p-8 text-center text-gray-500">
                                      No records found matching your search criteria.
                                  </td>
                              </tr>
                          ) : (
                              searchResults.map((inv) => (
                                  <tr key={inv.id} className="hover:bg-gray-50">
                                      <td className="p-3 font-medium whitespace-nowrap">{inv.invoice_number}</td>
                                      <td className="p-3 whitespace-nowrap">{formatDisplayDate(inv.invoice_date)}</td>
                                      <td className="p-3">{inv.buyer_name}</td>
                                      <td className="p-3 text-xs text-gray-600">
                                          <div>{inv.buyer_contact_person || '-'}</div>
                                          <div>{inv.buyer_contact_number || '-'}</div>
                                          <div className="italic">{inv.buyer_department} / {inv.buyer_user}</div>
                                      </td>
                                      <td className="p-3">{inv.consignee_name || '-'}</td>
                                      <td className="p-3 text-xs text-gray-600">
                                          <div>{inv.consignee_contact_person || '-'}</div>
                                          <div>{inv.consignee_contact_number || '-'}</div>
                                          <div className="italic">{inv.consignee_department} / {inv.consignee_user}</div>
                                      </td>
                                      <td className="p-3 whitespace-nowrap">{inv.po_number || '-'}</td>
                                      <td className="p-3 text-xs">
                                          {inv.other_charges_percentage > 0 
                                              ? `${inv.other_charges_description || 'Charges'}: ${inv.other_charges_percentage}%` 
                                              : '-'
                                          }
                                      </td>
                                      <td className="p-3 text-right whitespace-nowrap">₹{inv.total_amount?.toFixed(2)}</td>
                                      <td className="p-3 text-center">
                                          <div className="flex items-center justify-center gap-2">
                                              <Button 
                                                  variant="ghost" 
                                                  size="sm" 
                                                  className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-8"
                                                  onClick={() => handleViewDetails(inv)}
                                              >
                                                  <Eye className="w-4 h-4" />
                                              </Button>
                                              
                                              <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                                                  onClick={() => confirmDelete(inv)}
                                                  title="Delete Invoice"
                                              >
                                                  <Trash2 className="w-4 h-4" />
                                              </Button>
                                          </div>
                                      </td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                   </table>
                   
                   {hasMore && (
                       <div className="p-4 text-center">
                           <Button variant="outline" onClick={() => executeSearch(true)} disabled={loading}>
                               {loading ? 'Loading...' : 'Load More'}
                           </Button>
                       </div>
                   )}
              </div>
          </div>
        )}
      </div>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-[95vh] p-0 bg-transparent border-none shadow-none [&>button]:hidden">
            {selectedInvoice && (
                <CreateInvoiceForm 
                    onClose={handleDetailsClose} 
                    onSuccess={handleUpdateSuccess}
                    invoiceData={selectedInvoice} 
                />
            )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> 
                Delete Invoice?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete invoice <span className="font-bold text-gray-800">{invoiceToDelete?.invoice_number}</span> and remove all associated data from the server.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SearchInvoice;