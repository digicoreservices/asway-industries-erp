import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import useClientManagement from '@/hooks/useClientManagement';
import { supabase } from '@/lib/customSupabaseClient';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Search, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const DeleteOrderReceiptForm = ({ onClose }) => {
  const { clients } = useClientManagement();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [receiptsList, setReceiptsList] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [receiptToDelete, setReceiptToDelete] = useState(null);

  // Handle clicking outside to close the autocomplete dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setSelectedCustomer(null);
    setReceiptsList([]); // Clear previous results when searching for a new customer
    
    if (value.trim()) {
      const filtered = clients.filter(c => 
        c.customer_name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredCustomers(filtered);
      setShowDropdown(true);
    } else {
      setFilteredCustomers([]);
      setShowDropdown(false);
    }
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setSearchTerm(customer.customer_name);
    setShowDropdown(false);
  };

  const handleShow = async () => {
    if (!selectedCustomer) {
      toast({ title: 'Please select a customer first.', variant: 'destructive' });
      return;
    }

    setIsFetching(true);
    try {
      const { data, error } = await supabase
        .from('purchase_order_receipts')
        .select('id, order_receipt_id, quotation_number, quotation_date, expected_delivery_date, grand_total')
        .eq('customer_id', selectedCustomer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setReceiptsList(data || []);
      if (!data || data.length === 0) {
        toast({ title: 'No Receipts Found', description: 'No purchase order receipts found for this customer.' });
      }
    } catch (error) {
      toast({ title: 'Error fetching receipts', description: error.message, variant: 'destructive' });
    } finally {
      setIsFetching(false);
    }
  };

  const executeDelete = async () => {
    if (!receiptToDelete) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('purchase_order_receipts')
        .delete()
        .eq('id', receiptToDelete.id);

      if (error) throw error;

      toast({ title: 'Success', description: `Receipt ${receiptToDelete.order_receipt_id} deleted successfully.` });
      // Refresh the table locally
      setReceiptsList(prev => prev.filter(r => r.id !== receiptToDelete.id));
    } catch (error) {
      toast({ title: 'Error deleting receipt', description: error.message, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
      setReceiptToDelete(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'dd-MM-yyyy');
    } catch (e) {
      return dateString;
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Delete Purchase Order Receipt from Customer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full relative" ref={dropdownRef}>
              <Label htmlFor="customer-search">Search Customer</Label>
              <Input 
                id="customer-search"
                type="text" 
                placeholder="Type customer name..." 
                value={searchTerm}
                onChange={handleSearchChange}
                autoComplete="off"
              />
              {showDropdown && filteredCustomers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm text-gray-800"
                      onClick={() => handleSelectCustomer(customer)}
                    >
                      {customer.customer_name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <Button 
                onClick={handleShow} 
                disabled={!selectedCustomer || isFetching} 
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Show
            </Button>
          </div>

          {receiptsList.length > 0 && (
            <div className="mt-6 border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Receipt ID</TableHead>
                    <TableHead>Quotation No</TableHead>
                    <TableHead>Quotation Date</TableHead>
                    <TableHead>Expected Delivery</TableHead>
                    <TableHead>Grand Total</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receiptsList.map((receipt) => (
                    <TableRow key={receipt.id}>
                      <TableCell className="font-medium">{receipt.order_receipt_id}</TableCell>
                      <TableCell>{receipt.quotation_number || 'N/A'}</TableCell>
                      <TableCell>{formatDate(receipt.quotation_date)}</TableCell>
                      <TableCell>{formatDate(receipt.expected_delivery_date)}</TableCell>
                      <TableCell>₹{(receipt.grand_total || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setReceiptToDelete(receipt)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <AlertDialog open={!!receiptToDelete} onOpenChange={(open) => !open && setReceiptToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the purchase order receipt
                  <span className="font-bold"> "{receiptToDelete?.order_receipt_id}" </span>
                   and all its associated records from the database.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={(e) => {
                    e.preventDefault();
                    executeDelete();
                  }}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                >
                  {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
        </CardContent>
        <CardFooter className="flex justify-start">
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Close
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default DeleteOrderReceiptForm;