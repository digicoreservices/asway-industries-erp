import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Search, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import useClientManagement from '@/hooks/useClientManagement';
import useQuotationManagement from '@/hooks/useQuotationManagement';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
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

const DeleteQuotationForm = ({ onClose }) => {
  const { clients } = useClientManagement();
  const { quotations, deleteQuotation } = useQuotationManagement();
  const { toast } = useToast();

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [showTable, setShowTable] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Search State
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const customerQuotations = useMemo(() => {
    if (!selectedCustomerId) return [];
    return quotations.filter(q => q.customer_id === selectedCustomerId);
  }, [selectedCustomerId, quotations]);

  // Filter clients based on search term
  const filteredClients = useMemo(() => {
    if (!customerSearchTerm) return clients;
    const lowerTerm = customerSearchTerm.toLowerCase();
    return clients.filter(client => 
      client.customer_name?.toLowerCase().includes(lowerTerm) ||
      client.customer_id?.toLowerCase().includes(lowerTerm)
    );
  }, [clients, customerSearchTerm]);

  const handleCustomerSearchChange = (e) => {
    const value = e.target.value;
    setCustomerSearchTerm(value);
    setIsSearching(true);
    setShowCustomerSuggestions(true);
    
    // Reset selection if user changes the input manually
    if (selectedCustomerId) {
      setSelectedCustomerId('');
      setShowTable(false);
    }
    
    // Simulate brief network delay or processing time
    setTimeout(() => setIsSearching(false), 300);
  };

  const handleCustomerSelect = (client) => {
    setCustomerSearchTerm(client.customer_name);
    setSelectedCustomerId(client.id);
    setShowCustomerSuggestions(false);
    setShowTable(false);
  };

  const handleShow = () => {
    setShowTable(true);
  };

  const openConfirmationDialog = (quotationId) => {
    setItemToDelete(quotationId);
    setIsAlertOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteQuotation(itemToDelete);
      // Success toast is handled by the hook
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete quotation.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setIsAlertOpen(false);
      setItemToDelete(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="max-w-4xl mx-auto border-0 shadow-none">
        <CardHeader>
          <CardTitle>Delete Quotation</CardTitle>
          <CardDescription>Select a customer to view and delete their quotations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            
            {/* Customer Searchable Input */}
            <div className="space-y-2 max-w-xl">
                <Label htmlFor="customer_search">Customer Name</Label>
                <div className="relative">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            id="customer_search"
                            placeholder="Search Customer..." 
                            value={customerSearchTerm} 
                            onChange={handleCustomerSearchChange}
                            onFocus={() => setShowCustomerSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 200)}
                            className={`pl-8 ${!selectedCustomerId && customerSearchTerm ? "border-amber-400 focus-visible:ring-amber-400" : ""}`}
                            autoComplete="off"
                        />
                        {isSearching && (
                            <div className="absolute right-3 top-2.5">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        )}
                    </div>
                    {showCustomerSuggestions && (
                    <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto mt-1">
                        {filteredClients.length > 0 ? (
                            filteredClients.map(client => (
                                <div
                                    key={client.id}
                                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                    onMouseDown={(e) => { e.preventDefault(); handleCustomerSelect(client); }}
                                >
                                    <div className="font-medium">{client.customer_name}</div>
                                    <div className="text-xs text-gray-500">{client.customer_id}</div>
                                </div>
                            ))
                        ) : (
                            <div className="px-4 py-2 text-gray-500 text-sm">No customers found</div>
                        )}
                    </div>
                    )}
                </div>
            </div>
          </div>

          <div className="flex justify-end max-w-xl">
            <Button 
                onClick={handleShow} 
                disabled={!selectedCustomerId} 
                className="bg-blue-600 hover:bg-blue-700 text-white"
            >
                Show
            </Button>
          </div>
        </CardContent>

        {showTable && selectedCustomerId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 border-t">
            <div className="overflow-x-auto rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50">
                            <TableHead>Quotation ID</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Grand Total</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {customerQuotations.map(q => (
                            <TableRow key={q.id}>
                                <TableCell className="font-medium">{q.quotation_id}</TableCell>
                                <TableCell>{q.quotation_date ? format(new Date(q.quotation_date), 'dd-MM-yyyy') : 'N/A'}</TableCell>
                                <TableCell>{q.type}</TableCell>
                                <TableCell>{q.department || 'N/A'}</TableCell>
                                <TableCell>₹{parseFloat(q.grand_total || 0).toFixed(2)}</TableCell>
                                <TableCell className="text-right">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => openConfirmationDialog(q.id)} 
                                        title="Delete Quotation"
                                        disabled={isDeleting}
                                    >
                                        <Trash2 size={16} className="text-red-500 hover:text-red-700" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {customerQuotations.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                                    No quotations found for this customer.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
          </motion.div>
        )}

        <CardFooter className="flex justify-start pt-2 pb-6 px-6">
          <Button 
            type="button" 
            onClick={onClose} 
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Close
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the quotation and all of its associated items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
                onClick={handleDelete} 
                className="bg-red-600 hover:bg-red-700"
                disabled={isDeleting}
            >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Yes, delete it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default DeleteQuotationForm;