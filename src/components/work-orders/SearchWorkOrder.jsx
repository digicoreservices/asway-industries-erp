
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { 
  X, Search, Trash2, FileDown, Calendar as CalendarIcon, 
  Loader2, Eye, ArrowLeft, Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import useClientManagement from '@/hooks/useClientManagement';
import { supabase } from '@/lib/customSupabaseClient';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { cn } from '@/lib/utils';

const labourCategories = [
  { id: 'fitter', label: 'Fitter' },
  { id: 'welder', label: 'Welder' },
  { id: 'helper', label: 'Helper (Cutting, Grinding)' },
  { id: 'hydraulic', label: 'Hydraulic / Mechanical Press Labour' },
  { id: 'laserCutting', label: 'Laser Cutting' },
];

const SearchWorkOrder = ({ onClose }) => {
  const { toast } = useToast();
  const { clients } = useClientManagement();
  
  const [searchOption, setSearchOption] = useState('All');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSearchCustomer, setSelectedSearchCustomer] = useState(null);
  
  const [woNumberSearch, setWoNumberSearch] = useState('');
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWO, setSelectedWO] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [workOrderToDelete, setWorkOrderToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const autocompleteRef = useRef(null);
  const printRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchOption === 'Customer Name' && customerSearch.length > 0 && !selectedSearchCustomer) {
        const { data, error } = await supabase
          .from('customers')
          .select('id, customer_name')
          .ilike('customer_name', `%${customerSearch}%`)
          .limit(10);
        
        if (!error && data) {
          setCustomerSuggestions(data);
          setShowSuggestions(true);
        }
      } else {
        setShowSuggestions(false);
      }
    };
    
    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, searchOption, selectedSearchCustomer]);

  const handleSearch = async () => {
    setIsLoading(true);
    setSearchResults([]);
    
    try {
      let query = supabase
        .from('work_orders')
        .select(`
          *,
          customers (
            id,
            customer_name,
            contact_person,
            contact_number,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (searchOption === 'Customer Name') {
        if (!selectedSearchCustomer) {
          toast({ title: 'Please select a customer', variant: 'destructive' });
          setIsLoading(false);
          return;
        }
        query = query.eq('customer_id', selectedSearchCustomer.id);
      } else if (searchOption === 'Work Order Number') {
        if (!woNumberSearch) {
          toast({ title: 'Please enter a Work Order Number', variant: 'destructive' });
          setIsLoading(false);
          return;
        }
        query = query.ilike('work_order_number', `%${woNumberSearch}%`);
      } else if (searchOption === 'Work Order between two dates') {
        if (!dateRange.from || !dateRange.to) {
          toast({ title: 'Please select both dates', variant: 'destructive' });
          setIsLoading(false);
          return;
        }
        query = query
          .gte('work_order_date', format(dateRange.from, 'yyyy-MM-dd'))
          .lte('work_order_date', format(dateRange.to, 'yyyy-MM-dd'));
      }

      const { data, error } = await query;

      if (error) throw error;
      setSearchResults(data || []);
      
      if (data && data.length === 0) {
        toast({ title: 'No results found', description: 'Try adjusting your search criteria.' });
      }
    } catch (err) {
      console.error('Search error:', err);
      toast({ title: 'Error fetching work orders', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const openDetailsModal = (wo) => {
    setSelectedWO(wo);

    const defaultLabour = {
      fitter: { checked: false, manHours: '', cost: '', totalCost: '' },
      welder: { checked: false, manHours: '', cost: '', totalCost: '' },
      helper: { checked: false, manHours: '', cost: '', totalCost: '' },
      hydraulic: { checked: false, manHours: '', cost: '', totalCost: '' },
      laserCutting: { checked: false, manHours: '', cost: '', totalCost: '' },
    };

    let parsedLabour = JSON.parse(JSON.stringify(defaultLabour));
    if (wo.labour_expenses) {
      try {
        const parsed = typeof wo.labour_expenses === 'string' ? JSON.parse(wo.labour_expenses) : wo.labour_expenses;
        parsedLabour = { ...parsedLabour, ...parsed };
      } catch (e) {
        console.error('Error parsing labour expenses', e);
      }
    }

    setEditForm({
      ...wo,
      work_order_date: wo.work_order_date ? new Date(wo.work_order_date) : null,
      start_date: wo.start_date ? new Date(wo.start_date) : null,
      end_date: wo.end_date ? new Date(wo.end_date) : null,
      customer_delivery_date: wo.customer_delivery_date ? new Date(wo.customer_delivery_date) : null,
      actual_delivery_date: wo.actual_delivery_date ? new Date(wo.actual_delivery_date) : null,
      labour_expenses: parsedLabour,
    });
    setIsModalOpen(true);
  };

  const handleEditChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleLabourCheckboxChange = (id, checked) => {
    setEditForm(prev => ({
      ...prev,
      labour_expenses: {
        ...prev.labour_expenses,
        [id]: { ...(prev.labour_expenses[id] || {}), checked }
      }
    }));
  };

  const handleLabourInputChange = (id, field, value) => {
    setEditForm(prev => {
      const currentExp = prev.labour_expenses[id] || {};
      const updatedExp = { ...currentExp, [field]: value };
      
      const manHours = parseFloat(updatedExp.manHours) || 0;
      const cost = parseFloat(updatedExp.cost) || 0;
      updatedExp.totalCost = (manHours * cost).toFixed(2);

      return {
        ...prev,
        labour_expenses: {
          ...prev.labour_expenses,
          [id]: updatedExp
        }
      };
    });
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const updateData = {
        work_order_date: editForm.work_order_date ? format(editForm.work_order_date, 'yyyy-MM-dd') : null,
        start_date: editForm.start_date ? format(editForm.start_date, 'yyyy-MM-dd') : null,
        end_date: editForm.end_date ? format(editForm.end_date, 'yyyy-MM-dd') : null,
        customer_delivery_date: editForm.customer_delivery_date ? format(editForm.customer_delivery_date, 'yyyy-MM-dd') : null,
        actual_delivery_date: editForm.actual_delivery_date ? format(editForm.actual_delivery_date, 'yyyy-MM-dd') : null,
        customer_id: editForm.customer_id,
        job_type: editForm.job_type,
        job_description: editForm.job_description,
        po_no: editForm.po_no,
        total_amount: parseFloat(editForm.total_amount) || null,
        total_man_hours: parseFloat(editForm.total_man_hours) || null,
        total_cost_of_man_hours: parseFloat(editForm.total_cost_of_man_hours) || null,
        total_work_order_cost: parseFloat(editForm.total_work_order_cost) || null,
        department: editForm.department,
        user_name: editForm.user_name,
        labour_expenses: JSON.stringify(editForm.labour_expenses)
      };

      const { error } = await supabase
        .from('work_orders')
        .update(updateData)
        .eq('id', selectedWO.id);

      if (error) throw error;
      
      toast({ title: 'Success', description: 'Work Order updated successfully.' });
      handleSearch(); 
      setIsModalOpen(false);
    } catch (err) {
      console.error('Update error:', err);
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteClick = (wo) => {
    setWorkOrderToDelete(wo);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!workOrderToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('work_orders')
        .delete()
        .eq('id', workOrderToDelete.id);

      if (error) throw error;

      toast({ 
        title: 'Work Order Deleted', 
        description: `Work Order ${workOrderToDelete.work_order_number} has been successfully deleted.` 
      });

      // Remove from table immediately
      setSearchResults(prev => prev.filter(wo => wo.id !== workOrderToDelete.id));
      
      setIsDeleteDialogOpen(false);
      setWorkOrderToDelete(null);
    } catch (err) {
      console.error('Delete error:', err);
      toast({ 
        title: 'Delete failed', 
        description: err.message || 'Failed to delete work order. Please try again.', 
        variant: 'destructive' 
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    
    toast({ title: 'Generating PDF', description: 'Please wait...', duration: 2000 });
    
    html2canvas(printRef.current, { scale: 2, useCORS: true }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;
      let width = pdfWidth;
      let height = width / ratio;

      if (height > pdfHeight) {
        height = pdfHeight;
        width = height * ratio;
      }

      pdf.addImage(imgData, 'PNG', (pdfWidth - width) / 2, 0, width, height);
      pdf.save(`WorkOrder_${selectedWO.work_order_number}.pdf`);
    }).catch(err => {
      toast({ title: 'Error generating PDF', description: err.message, variant: 'destructive' });
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd-MM-yyyy');
    } catch (err) {
      return 'Invalid Date';
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
        <Card className="border-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <CardTitle>Search and Edit Work Order</CardTitle>
            <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white">
              <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
            </Button>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50 p-4 rounded-lg border">
              <div className="md:col-span-3 space-y-2">
                <Label>Select Option</Label>
                <Select value={searchOption} onValueChange={(val) => {
                  setSearchOption(val);
                  setCustomerSearch('');
                  setSelectedSearchCustomer(null);
                  setWoNumberSearch('');
                }}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select Option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="Customer Name">Customer Name</SelectItem>
                    <SelectItem value="Work Order Number">Work Order Number</SelectItem>
                    <SelectItem value="Work Order between two dates">Work Order between two dates</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-6 space-y-2 relative">
                {searchOption === 'Customer Name' && (
                  <div ref={autocompleteRef} className="relative">
                    <Label>Search Customer</Label>
                    <Input 
                      placeholder="Start typing customer name..." 
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setSelectedSearchCustomer(null);
                      }}
                      className="bg-white"
                    />
                    {showSuggestions && customerSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {customerSuggestions.map((cust) => (
                          <div
                            key={cust.id}
                            className="px-4 py-2 hover:bg-slate-100 cursor-pointer text-sm"
                            onClick={() => {
                              setCustomerSearch(cust.customer_name);
                              setSelectedSearchCustomer(cust);
                              setShowSuggestions(false);
                            }}
                          >
                            {cust.customer_name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {searchOption === 'Work Order Number' && (
                  <div>
                    <Label>Work Order Number</Label>
                    <Input 
                      placeholder="Enter Work Order Number" 
                      value={woNumberSearch}
                      onChange={(e) => setWoNumberSearch(e.target.value)}
                      className="bg-white"
                    />
                  </div>
                )}

                {searchOption === 'Work Order between two dates' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>From Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn('w-full justify-start text-left font-normal bg-white', !dateRange.from && 'text-muted-foreground')}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange.from ? format(dateRange.from, 'dd-MM-yyyy') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateRange.from} onSelect={(d) => setDateRange(prev => ({...prev, from: d}))} /></PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label>To Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn('w-full justify-start text-left font-normal bg-white', !dateRange.to && 'text-muted-foreground')}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange.to ? format(dateRange.to, 'dd-MM-yyyy') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateRange.to} onSelect={(d) => setDateRange(prev => ({...prev, to: d}))} /></PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}
              </div>

              <div className="md:col-span-3">
                <Button 
                  onClick={handleSearch} 
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  Show
                </Button>
              </div>
            </div>

            {searchResults.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-100">
                    <TableRow>
                      <TableHead>Work Order No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer Name</TableHead>
                      <TableHead className="text-right">Total Cost (₹)</TableHead>
                      <TableHead className="text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.map((wo) => (
                      <TableRow key={wo.id}>
                        <TableCell className="font-medium">{wo.work_order_number}</TableCell>
                        <TableCell>{formatDate(wo.work_order_date)}</TableCell>
                        <TableCell>{wo.customers?.customer_name || 'N/A'}</TableCell>
                        <TableCell className="text-right">{wo.total_work_order_cost ? Number(wo.total_work_order_cost).toFixed(2) : '0.00'}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                              onClick={() => openDetailsModal(wo)}
                            >
                              <Eye className="h-4 w-4 mr-1" /> View Details
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-600 hover:text-red-800 hover:bg-red-50"
                              onClick={() => handleDeleteClick(wo)}
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
            )}
          </CardContent>
        </Card>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Work Order Details & Edit</DialogTitle>
            </DialogHeader>
            
            {editForm && (
              <div className="space-y-6 py-4" ref={printRef}>
                 <div className="hidden text-center mb-6" style={{ display: 'none' }}>
                    <h2 className="text-2xl font-bold">Asway Industries Pvt Ltd</h2>
                    <h3 className="text-xl font-semibold">Work Order</h3>
                 </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Work Order Number (Read-only)</Label>
                    <Input value={editForm.work_order_number || ''} disabled className="bg-slate-50" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Work Order Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !editForm.work_order_date && 'text-muted-foreground')}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {editForm.work_order_date ? format(editForm.work_order_date, 'dd-MM-yyyy') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={editForm.work_order_date} onSelect={(d) => handleEditChange('work_order_date', d)} /></PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Customer</Label>
                    <Select value={editForm.customer_id || ''} onValueChange={(v) => handleEditChange('customer_id', v)}>
                      <SelectTrigger><SelectValue placeholder="Select Customer" /></SelectTrigger>
                      <SelectContent>
                        {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.customer_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Input value={editForm.department || ''} onChange={(e) => handleEditChange('department', e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>User Name</Label>
                    <Input value={editForm.user_name || ''} onChange={(e) => handleEditChange('user_name', e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>PO Number (UUID/Text)</Label>
                    <Input value={editForm.po_no || ''} onChange={(e) => handleEditChange('po_no', e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Job Type</Label>
                    <Input value={editForm.job_type || ''} onChange={(e) => handleEditChange('job_type', e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !editForm.start_date && 'text-muted-foreground')}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {editForm.start_date ? format(editForm.start_date, 'dd-MM-yyyy') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={editForm.start_date} onSelect={(d) => handleEditChange('start_date', d)} /></PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !editForm.end_date && 'text-muted-foreground')}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {editForm.end_date ? format(editForm.end_date, 'dd-MM-yyyy') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={editForm.end_date} onSelect={(d) => handleEditChange('end_date', d)} /></PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Job Description</Label>
                  <Textarea 
                    value={editForm.job_description || ''} 
                    onChange={(e) => handleEditChange('job_description', e.target.value)} 
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                  <div className="space-y-2">
                    <Label>Total Man Hours</Label>
                    <Input type="number" value={editForm.total_man_hours || ''} onChange={(e) => handleEditChange('total_man_hours', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Cost of Man Hours</Label>
                    <Input type="number" value={editForm.total_cost_of_man_hours || ''} onChange={(e) => handleEditChange('total_cost_of_man_hours', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Work Order Cost</Label>
                    <Input type="number" value={editForm.total_work_order_cost || ''} onChange={(e) => handleEditChange('total_work_order_cost', e.target.value)} />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-4">Labour Expenses</h3>
                  <div className="space-y-4">
                    {labourCategories.map(({ id, label }) => (
                      <div key={id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div className="flex items-center space-x-2">
                           <Checkbox 
                             id={`edit-${id}`} 
                             checked={editForm.labour_expenses?.[id]?.checked || false} 
                             onCheckedChange={(c) => handleLabourCheckboxChange(id, c)} 
                           />
                           <Label htmlFor={`edit-${id}`} className="font-medium">{label}</Label>
                        </div>
                        <div className="space-y-2">
                           <Label>Man Hours</Label>
                           <Input 
                             type="number" 
                             value={editForm.labour_expenses?.[id]?.manHours || ''} 
                             onChange={(e) => handleLabourInputChange(id, 'manHours', e.target.value)} 
                             disabled={!editForm.labour_expenses?.[id]?.checked} 
                           />
                        </div>
                        <div className="space-y-2">
                           <Label>Cost of One Hour</Label>
                           <Input 
                             type="number" 
                             value={editForm.labour_expenses?.[id]?.cost || ''} 
                             onChange={(e) => handleLabourInputChange(id, 'cost', e.target.value)} 
                             disabled={!editForm.labour_expenses?.[id]?.checked} 
                           />
                        </div>
                        <div className="space-y-2">
                           <Label>Total Cost of Man Hours</Label>
                           <Input 
                             type="number" 
                             value={editForm.labour_expenses?.[id]?.totalCost || ''} 
                             readOnly 
                             className="bg-gray-100" 
                           />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                  <div className="space-y-2">
                    <Label>Customer Delivery Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !editForm.customer_delivery_date && 'text-muted-foreground')}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {editForm.customer_delivery_date ? format(editForm.customer_delivery_date, 'dd-MM-yyyy') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={editForm.customer_delivery_date} onSelect={(d) => handleEditChange('customer_delivery_date', d)} /></PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Actual Delivery Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !editForm.actual_delivery_date && 'text-muted-foreground')}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {editForm.actual_delivery_date ? format(editForm.actual_delivery_date, 'dd-MM-yyyy') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={editForm.actual_delivery_date} onSelect={(d) => handleEditChange('actual_delivery_date', d)} /></PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end border-t pt-4 mt-4">
               <Button variant="outline" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto">
                <X className="mr-2 h-4 w-4" /> Close
              </Button>
              <Button onClick={handlePrint} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white">
                <FileDown className="mr-2 h-4 w-4" /> Save as PDF
              </Button>
              <Button onClick={handleUpdate} disabled={isUpdating} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white">
                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Update
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Work Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this Work Order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm} 
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SearchWorkOrder;
