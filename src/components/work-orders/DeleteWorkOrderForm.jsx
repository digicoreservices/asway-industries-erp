import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, X, Search, Loader2 } from 'lucide-react';
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
import { format } from 'date-fns';

const DeleteWorkOrderForm = ({ onClose }) => {
  const { clients, loading: clientsLoading } = useClientManagement();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [filteredClients, setFilteredClients] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  
  const [workOrders, setWorkOrders] = useState([]);
  const [isLoadingWorkOrders, setIsLoadingWorkOrders] = useState(false);
  
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  useEffect(() => {
    if (searchTerm && !selectedCustomerId) {
      const filtered = clients.filter(client => 
        client.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredClients(filtered);
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  }, [searchTerm, clients, selectedCustomerId]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setSelectedCustomerId('');
    setWorkOrders([]);
  };

  const handleSelectCustomer = (client) => {
    setSearchTerm(client.customer_name);
    setSelectedCustomerId(client.id);
    setShowDropdown(false);
    setWorkOrders([]);
  };

  const fetchWorkOrders = async () => {
    if (!selectedCustomerId) return;
    
    setIsLoadingWorkOrders(true);
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select('*')
        .eq('customer_id', selectedCustomerId)
        .order('work_order_date', { ascending: false });

      if (error) throw error;
      setWorkOrders(data || []);
      
      if (data && data.length === 0) {
        toast({ title: "No Work Orders", description: "No work orders found for this customer." });
      }
    } catch (error) {
      console.error("Error fetching work orders:", error);
      toast({ title: 'Error', description: 'Failed to fetch work orders.', variant: 'destructive' });
    } finally {
      setIsLoadingWorkOrders(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('work_orders')
        .delete()
        .eq('id', deleteConfirmId);

      if (error) throw error;
      
      toast({ title: "Success", description: "Work Order has been successfully deleted." });
      await fetchWorkOrders(); // Refresh table
    } catch (error) {
      console.error("Error deleting work order:", error);
      toast({ title: 'Error', description: error.message || 'Failed to delete work order.', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="max-w-5xl mx-auto border-0 shadow-none">
        <CardHeader>
          <CardTitle>Delete Work Order</CardTitle>
          <CardDescription>Search for a customer to view and delete their work orders.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="relative flex-1 w-full" ref={wrapperRef}>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search Customer Name..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-9"
                  disabled={clientsLoading}
                />
              </div>
              
              {showDropdown && filteredClients.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredClients.map((client) => (
                    <div
                      key={client.id}
                      className="px-4 py-2 hover:bg-slate-100 cursor-pointer text-sm"
                      onClick={() => handleSelectCustomer(client)}
                    >
                      {client.customer_name}
                    </div>
                  ))}
                </div>
              )}
              {showDropdown && filteredClients.length === 0 && searchTerm && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg p-4 text-sm text-center text-muted-foreground">
                  No customers found.
                </div>
              )}
            </div>
            
            <Button 
              onClick={fetchWorkOrders} 
              disabled={!selectedCustomerId || isLoadingWorkOrders}
              className="bg-blue-500 hover:bg-blue-600 text-white w-full sm:w-auto min-w-[100px]"
            >
              {isLoadingWorkOrders ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Show
            </Button>
          </div>

          {workOrders.length > 0 && (
            <div className="border rounded-md mt-6 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Work Order No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Estimated Time</TableHead>
                    <TableHead className="text-right">Total Cost (Rs)</TableHead>
                    <TableHead className="text-center w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workOrders.map((wo) => (
                    <TableRow key={wo.id}>
                      <TableCell className="font-medium">{wo.work_order_number}</TableCell>
                      <TableCell>{wo.work_order_date ? format(new Date(wo.work_order_date), 'dd-MM-yyyy') : 'N/A'}</TableCell>
                      <TableCell>{wo.estimated_time_days ? `${wo.estimated_time_days} days` : 'N/A'}</TableCell>
                      <TableCell className="text-right">{wo.total_work_order_cost ? Number(wo.total_work_order_cost).toFixed(2) : '0.00'}</TableCell>
                      <TableCell className="text-center">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeleteConfirmId(wo.id)}
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
        </CardContent>
        <CardFooter className="flex justify-end gap-2 pt-6 border-t mt-4">
          <Button onClick={onClose} className="bg-blue-500 hover:bg-blue-600 text-white">
            <X className="mr-2 h-4 w-4" /> Close
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected work order 
              and all of its associated details from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
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

export default DeleteWorkOrderForm;