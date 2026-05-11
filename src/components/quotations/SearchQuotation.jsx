import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Search, Loader2, Edit, Plus, RefreshCw, AlertCircle, ArrowLeft, Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import useClientManagement from '@/hooks/useClientManagement';
import useQuotationManagement from '@/hooks/useQuotationManagement';
import { format } from 'date-fns';
import { supabase } from '@/lib/customSupabaseClient';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EditQuotationProductForm from './EditQuotationProductForm';
import AddQuotationProductForm from './AddQuotationProductForm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { numberToWords } from '@/lib/numberToWords';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const SearchQuotation = ({ onClose }) => {
  const { clients, fetchClients } = useClientManagement();
  const { quotations, fetchQuotations, deleteQuotation } = useQuotationManagement();
  const { toast } = useToast();

  const [searchOption, setSearchOption] = useState('All');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedQuotationId, setSelectedQuotationId] = useState('');
  const [selectedQuotationDetails, setSelectedQuotationDetails] = useState(null);
  const [showList, setShowList] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isFetchingResults, setIsFetchingResults] = useState(false);

  // Autocomplete State - Customer (for search filters)
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);

  // Autocomplete State - Quotation
  const [quotationSearchTerm, setQuotationSearchTerm] = useState('');
  const [showQuotationSuggestions, setShowQuotationSuggestions] = useState(false);
  const [isSearchingQuotation, setIsSearchingQuotation] = useState(false);

  // Edit State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  
  // Edit Modal - Customer Selection State
  const [editCustomerSearchTerm, setEditCustomerSearchTerm] = useState('');
  const [showEditCustomerSuggestions, setShowEditCustomerSuggestions] = useState(false);
  const [isSearchingEditCustomer, setIsSearchingEditCustomer] = useState(false);
  const [editSelectedCustomerId, setEditSelectedCustomerId] = useState('');
  
  // Edit Modal - Department and User State
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [deptUserMap, setDeptUserMap] = useState({});
  
  // Product Edit/Add State
  const [editingItem, setEditingItem] = useState(null); 
  const [isAddingProduct, setIsAddingProduct] = useState(false); 
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState(null);

  const editCustomerAutocompleteRef = useRef(null);

  useEffect(() => {
    fetchQuotations();
    fetchClients();
  }, [fetchQuotations, fetchClients]);

  // Click outside handler for edit customer autocomplete
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (editCustomerAutocompleteRef.current && !editCustomerAutocompleteRef.current.contains(event.target)) {
        setShowEditCustomerSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter clients for autocomplete (search filters)
  const filteredClients = useMemo(() => {
    if (!customerSearchTerm) return clients;
    const lowerTerm = customerSearchTerm.toLowerCase();
    return clients.filter(client => 
      client.customer_name?.toLowerCase().includes(lowerTerm) ||
      client.customer_id?.toLowerCase().includes(lowerTerm)
    );
  }, [clients, customerSearchTerm]);

  // Filter clients for edit modal customer selection
  const filteredEditCustomers = useMemo(() => {
    if (!editCustomerSearchTerm) return clients;
    const lowerTerm = editCustomerSearchTerm.toLowerCase();
    return clients.filter(client => 
      client.customer_name?.toLowerCase().includes(lowerTerm) ||
      client.customer_id?.toLowerCase().includes(lowerTerm)
    );
  }, [clients, editCustomerSearchTerm]);

  // Filter quotations for autocomplete
  const filteredQuotations = useMemo(() => {
    if (!quotationSearchTerm) return quotations;
    const lowerTerm = quotationSearchTerm.toLowerCase();
    return quotations.filter(q => 
      q.quotation_id?.toLowerCase().includes(lowerTerm)
    );
  }, [quotations, quotationSearchTerm]);

  const handleCustomerSearchChange = (e) => {
    const value = e.target.value;
    setCustomerSearchTerm(value);
    setIsSearchingCustomer(true);
    setShowCustomerSuggestions(true);
    
    if (selectedCustomerId) {
      setSelectedCustomerId('');
      setShowList(false);
    }
    
    setTimeout(() => setIsSearchingCustomer(false), 300);
  };

  const handleQuotationSearchChange = (e) => {
    const value = e.target.value;
    setQuotationSearchTerm(value);
    setIsSearchingQuotation(true);
    setShowQuotationSuggestions(true);
    
    if (selectedQuotationId) {
      setSelectedQuotationId('');
      setShowList(false);
    }
    
    setTimeout(() => setIsSearchingQuotation(false), 300);
  };

  const handleCustomerSelect = (client) => {
    setCustomerSearchTerm(client.customer_name);
    setSelectedCustomerId(client.id);
    setShowCustomerSuggestions(false);
    setShowList(false);
  };

  const handleQuotationSelect = (quotation) => {
    setQuotationSearchTerm(quotation.quotation_id);
    setSelectedQuotationId(quotation.id);
    setShowQuotationSuggestions(false);
    setShowList(false);
  };

  /**
   * EXACT same logic as AddQuotationForm.jsx
   * Extracts ALL departments from client (no limit) checking both JSONB and individual columns
   */
  const getDepartmentsArray = (client) => {
    let depts = [];
    let deptUserMap = {};

    // First check JSONB departments field
    if (client.departments && Array.isArray(client.departments) && client.departments.length > 0) {
      client.departments.forEach(d => {
        const dName = d.department_name || d.name || d.department;
        const uName = d.user_name || d.user;
        if (dName) {
          depts.push(dName);
          if (uName) {
            if (!deptUserMap[dName]) deptUserMap[dName] = [];
            deptUserMap[dName].push(uName);
          }
        }
      });
    }

    // Then check individual columns (with no limit - continue until no more data)
    const legacyDepts = [
      client.department_name_1 || client.department1,
      client.department_name_2 || client.department2,
      client.department_name_3 || client.department3,
      client.department_name_4 || client.department4,
      client.department_name_5 || client.department5,
      client.department_name_6 || client.department6,
      client.department_name_7 || client.department7,
      client.department_name_8 || client.department8,
      client.department_name_9 || client.department9,
      client.department_name_10 || client.department10
    ];
    
    const legacyUsers = [
      client.user1, client.user2, client.user3, client.user4, client.user5,
      client.user6, client.user7, client.user8, client.user9, client.user10
    ];

    legacyDepts.forEach((d, idx) => {
      if (d) {
        depts.push(d);
        if (legacyUsers[idx]) {
          if (!deptUserMap[d]) deptUserMap[d] = [];
          deptUserMap[d].push(legacyUsers[idx]);
        }
      }
    });

    // Get unique departments
    const uniqueDepts = [...new Set(depts.filter(Boolean))];
    
    return { uniqueDepts, deptUserMap };
  };

  const handleEditCustomerSearchChange = (e) => {
    const value = e.target.value;
    setEditCustomerSearchTerm(value);
    setIsSearchingEditCustomer(true);
    setShowEditCustomerSuggestions(true);
    
    if (editSelectedCustomerId) {
      setEditSelectedCustomerId('');
      setEditFormData(prev => ({ ...prev, customer_id: '', department: '', user_name: '' }));
      setAvailableDepartments([]);
      setAvailableUsers([]);
      setDeptUserMap({});
    }
    
    setTimeout(() => setIsSearchingEditCustomer(false), 300);
  };

  const handleEditCustomerSelect = (client) => {
    setEditCustomerSearchTerm(client.customer_name);
    setEditSelectedCustomerId(client.id);
    setShowEditCustomerSuggestions(false);
    
    // Extract departments and users using EXACT same logic as AddQuotationForm.jsx
    const { uniqueDepts, deptUserMap } = getDepartmentsArray(client);
    
    setAvailableDepartments(uniqueDepts);
    setDeptUserMap(deptUserMap);
    
    // Set initial department
    const initialDept = uniqueDepts.length > 0 ? uniqueDepts[0] : '';
    let initialUsers = initialDept && deptUserMap[initialDept] ? deptUserMap[initialDept] : [];
    const uniqueInitialUsers = [...new Set(initialUsers)];
    
    setAvailableUsers(uniqueInitialUsers);

    setEditFormData(prev => ({
      ...prev,
      customer_id: client.id,
      department: initialDept,
      user_name: uniqueInitialUsers.length > 0 ? uniqueInitialUsers[0] : ''
    }));
  };

  const handleDepartmentChange = (deptName) => {
    if (!deptName || deptName === 'no-department') {
      // No department selected - show all users from all departments
      const allUsers = Object.values(deptUserMap).flat();
      const uniqueUsers = [...new Set(allUsers)];
      setAvailableUsers(uniqueUsers);
      setEditFormData(prev => ({ ...prev, department: '', user_name: '' }));
      return;
    }

    // Department selected - show users for that department
    let usersForDept = deptUserMap[deptName] || [];
    const uniqueUsers = [...new Set(usersForDept)];
    setAvailableUsers(uniqueUsers);
    
    setEditFormData(prev => ({ 
      ...prev, 
      department: deptName,
      user_name: uniqueUsers.length === 1 ? uniqueUsers[0] : '' 
    }));
  };

  const handleShow = async () => {
    setIsFetchingResults(true);
    try {
      let query = supabase
        .from('quotations')
        .select('*, customers(customer_name)')
        .order('quotation_date', { ascending: false });

      if (searchOption === 'Customer Name') {
        if (!selectedCustomerId) {
          toast({ title: "Error", description: "Please select a customer.", variant: "destructive" });
          setIsFetchingResults(false);
          return;
        }
        query = query.eq('customer_id', selectedCustomerId);
      } else if (searchOption === 'Quotation Number') {
        if (!selectedQuotationId) {
          toast({ title: "Error", description: "Please select a quotation.", variant: "destructive" });
          setIsFetchingResults(false);
          return;
        }
        query = query.eq('id', selectedQuotationId);
      }

      const { data, error } = await query;
      if (error) throw error;

      setSearchResults(data || []);
      setShowList(true);
    } catch (err) {
      console.error("Error fetching quotations:", err);
      toast({ title: "Error", description: "Failed to fetch quotations.", variant: "destructive" });
    } finally {
      setIsFetchingResults(false);
    }
  };

  const fetchQuotationDetails = async (quotationId) => {
    setItemsLoading(true);
    setItemsError(null);
    
    try {
      const { data, error } = await supabase
        .from('quotation_items')
        .select(`
          id,
          quotation_id,
          type,
          product_name,
          unit,
          quantity,
          price_for_one,
          total_price,
          cgst,
          sgst,
          igst,
          total_price_with_gst,
          created_at
        `)
        .eq('quotation_id', quotationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Error fetching quotation items:", error);
        setItemsError("Failed to load items. Please try again.");
        toast({ title: "Error", description: "Could not fetch quotation items. Check console for details.", variant: "destructive" });
        return null;
      }

      const quotationInfo = searchResults.find(q => q.id === quotationId) || quotations.find(q => q.id === quotationId);
      if (!quotationInfo) {
         setItemsError("Quotation not found locally.");
         return null;
      }

      let customerName = quotationInfo.customer_name;
      if (!customerName && quotationInfo.customers) {
          customerName = quotationInfo.customers.customer_name;
      }

      return { 
          ...quotationInfo, 
          items: data || [],
          display_customer_name: customerName 
      };
    } catch (err) {
      console.error("Unexpected error in fetchQuotationDetails:", err);
      setItemsError("An unexpected error occurred while loading items.");
      return null;
    } finally {
      setItemsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this quotation? This action cannot be undone.")) {
      return;
    }
    await deleteQuotation(id);
    setSearchResults(prev => prev.filter(q => q.id !== id));
    fetchQuotations();
  };

  // --- Edit Functionality ---

  const handleOpenEdit = async (quotationId) => {
    const details = await fetchQuotationDetails(quotationId);
    if (details) {
      setSelectedQuotationDetails(details);
      
      // Find the customer to populate departments and users
      const customer = clients.find(c => c.id === details.customer_id);
      if (customer) {
        const { uniqueDepts, deptUserMap } = getDepartmentsArray(customer);
        setAvailableDepartments(uniqueDepts);
        setDeptUserMap(deptUserMap);
        
        // Set available users based on current department
        if (details.department && deptUserMap[details.department]) {
          const usersForDept = [...new Set(deptUserMap[details.department])];
          setAvailableUsers(usersForDept);
        } else {
          // Show all users if no department selected
          const allUsers = Object.values(deptUserMap).flat();
          const uniqueUsers = [...new Set(allUsers)];
          setAvailableUsers(uniqueUsers);
        }
        
        setEditCustomerSearchTerm(customer.customer_name);
        setEditSelectedCustomerId(customer.id);
      }
      
      setEditFormData({
        id: details.id,
        quotation_id: details.quotation_id,
        quotation_date: new Date(details.quotation_date),
        details: details.details || '',
        department: details.department || '',
        user_name: details.user_name || '',
        customer_id: details.customer_id,
        grand_total: details.grand_total,
        type: details.type || 'Sale'
      });
      setIsEditOpen(true);
      setEditingItem(null);
      setIsAddingProduct(false);
    }
  };

  const handleEditInputChange = (e) => {
    const { id, value } = e.target;
    setEditFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleDateChange = (date) => {
    setEditFormData(prev => ({ ...prev, quotation_date: date }));
  };

  const handleEditSave = async () => {
    if (!editSelectedCustomerId) {
      toast({ title: 'Validation Error', description: 'Please select a customer.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('quotations')
        .update({
          quotation_id: editFormData.quotation_id,
          quotation_date: format(editFormData.quotation_date, 'yyyy-MM-dd'),
          details: editFormData.details,
          department: editFormData.department,
          user_name: editFormData.user_name,
          customer_id: editSelectedCustomerId,
          type: editFormData.type
        })
        .eq('id', editFormData.id);

      if (error) throw error;

      toast({ title: "Success", description: "Quotation details updated." });
      
      // Refresh both states
      await fetchQuotations();
      await handleShow(); 
      
      // Update local view
      const updatedDetails = await fetchQuotationDetails(editFormData.id);
      setSelectedQuotationDetails(updatedDetails);
    } catch (error) {
      console.error("Error updating quotation:", error);
      toast({ title: "Error", description: "Failed to update quotation.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const generatePDF = () => {
    if (!selectedQuotationDetails) {
      toast({ title: 'Error', description: 'No quotation data to generate PDF.', variant: 'destructive' });
      return;
    }

    try {
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.text('QUOTATION', 105, 15, null, null, 'center');
      
      doc.setFontSize(12);
      doc.text(`Quotation No: ${editFormData.quotation_id}`, 14, 30);
      doc.text(`Date: ${editFormData.quotation_date ? format(editFormData.quotation_date, 'dd-MM-yyyy') : ''}`, 140, 30);
      
      const customerName = clients.find(c => c.id === editSelectedCustomerId)?.customer_name || 'N/A';
      doc.text(`Customer: ${customerName}`, 14, 40);
      doc.text(`Department: ${editFormData.department || 'N/A'}`, 14, 48);
      doc.text(`User: ${editFormData.user_name || 'N/A'}`, 140, 48);
      
      const tableColumn = ["Product Name", "Unit", "Qty", "Price", "Total", "GST", "Final"];
      const tableRows = selectedQuotationDetails.items.map(item => [
        item.product_name,
        item.unit,
        item.quantity,
        parseFloat(item.price_for_one).toFixed(2),
        item.total_price.toFixed(2),
        ((item.cgst || 0) + (item.sgst || 0) + (item.igst || 0)).toFixed(2),
        item.total_price_with_gst.toFixed(2)
      ]);
      
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 55,
        theme: 'grid'
      });

      let finalY = doc.lastAutoTable.finalY + 10;

      doc.setFont("helvetica", "bold");
      doc.text(`Grand Total: Rs. ${editFormData.grand_total.toFixed(2)}`, 130, finalY);
      finalY += 12;

      doc.setFont("helvetica", "italic");
      doc.text(`Amount in Words: ${numberToWords(editFormData.grand_total)}`, 14, finalY);
      finalY += 15;

      doc.setFont("helvetica", "normal");
      if(editFormData.details) {
        doc.text("Details / Notes:", 14, finalY);
        doc.setFontSize(10);
        doc.text(editFormData.details, 14, finalY + 6, { maxWidth: 180 });
      }

      doc.save(`Quotation_${editFormData.quotation_id || 'Edit'}.pdf`);
      toast({ title: 'Success', description: 'PDF generated successfully.' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ title: 'Error', description: 'Failed to generate PDF.', variant: 'destructive' });
    }
  };

  // --- Product Management inside Edit Dialog ---

  const updateGrandTotal = async (quotationId) => {
    const { data: items, error: fetchError } = await supabase
        .from('quotation_items')
        .select('total_price_with_gst')
        .eq('quotation_id', quotationId);
    
    if (fetchError) {
        console.error("Error fetching items for total:", fetchError);
        return;
    }

    const newGrandTotal = items.reduce((sum, item) => sum + (item.total_price_with_gst || 0), 0);

    const { error: updateError } = await supabase
        .from('quotations')
        .update({ grand_total: newGrandTotal })
        .eq('id', quotationId);

    if (updateError) {
        console.error("Error updating grand total:", updateError);
    } else {
        setEditFormData(prev => ({ ...prev, grand_total: newGrandTotal }));
    }
  };

  const handleRefreshItems = async () => {
    const details = await fetchQuotationDetails(editFormData.id);
    if (details) {
        setSelectedQuotationDetails(details);
        setEditFormData(prev => ({ ...prev, grand_total: details.grand_total }));
    }
  };

  const handleProductChangeSuccess = async () => {
    setEditingItem(null);
    setIsAddingProduct(false);
    await updateGrandTotal(editFormData.id);
    await handleRefreshItems();
    await fetchQuotations();
    await handleShow();
  };

  const handleDeleteProduct = async (itemId) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    const { error } = await supabase.from('quotation_items').delete().eq('id', itemId);
    if (error) {
        toast({ title: "Error", description: "Failed to delete product.", variant: "destructive" });
    } else {
        toast({ title: "Success", description: "Product deleted." });
        handleProductChangeSuccess();
    }
  };

  const handleCloseEditModal = () => {
    setIsEditOpen(false);
    setEditingItem(null);
    setIsAddingProduct(false);
    setEditCustomerSearchTerm('');
    setEditSelectedCustomerId('');
    setAvailableDepartments([]);
    setAvailableUsers([]);
    setDeptUserMap({});
  };

  // Filter valid departments and users (non-empty names)
  const validDepartments = availableDepartments.filter(dept => dept && dept.trim() !== '');
  const validUsers = availableUsers.filter(user => user && user.trim() !== '');

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="max-w-4xl mx-auto border-0 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div>
            <CardTitle>Search and Edit Quotation</CardTitle>
            <CardDescription>Search for quotations to view and manage them.</CardDescription>
          </div>
          <Button 
            type="button" 
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 transition-colors duration-200 shadow-sm"
            onClick={onClose}
          >
            <ArrowLeft size={16} /> Go Back
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            
            <div className="space-y-2 max-w-xl">
              <Label>Select option</Label>
              <Select value={searchOption} onValueChange={(val) => {
                  setSearchOption(val);
                  setShowList(false);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select search option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Customer Name">Customer Name</SelectItem>
                  <SelectItem value="Quotation Number">Quotation Number</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {searchOption === 'Customer Name' && (
              <div className="space-y-2 max-w-xl">
                  <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                          placeholder="Search Customer Name..." 
                          value={customerSearchTerm} 
                          onChange={handleCustomerSearchChange}
                          onFocus={() => setShowCustomerSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 200)}
                          className="pl-8 bg-white text-gray-900"
                          autoComplete="off"
                      />
                      {isSearchingCustomer && (
                          <div className="absolute right-3 top-2.5">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                      )}
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
            )}

            {searchOption === 'Quotation Number' && (
              <div className="space-y-2 max-w-xl">
                  <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                          placeholder="Search Quotation Number..." 
                          value={quotationSearchTerm} 
                          onChange={handleQuotationSearchChange}
                          onFocus={() => setShowQuotationSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowQuotationSuggestions(false), 200)}
                          className="pl-8 bg-white text-gray-900"
                          autoComplete="off"
                      />
                      {isSearchingQuotation && (
                          <div className="absolute right-3 top-2.5">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                      )}
                      {showQuotationSuggestions && (
                      <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto mt-1">
                          {filteredQuotations.length > 0 ? (
                              filteredQuotations.map(quotation => (
                                  <div
                                      key={quotation.id}
                                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                      onMouseDown={(e) => { e.preventDefault(); handleQuotationSelect(quotation); }}
                                  >
                                      <div className="font-medium">{quotation.quotation_id}</div>
                                  </div>
                              ))
                          ) : (
                              <div className="px-4 py-2 text-gray-500 text-sm">No quotations found</div>
                          )}
                      </div>
                      )}
                  </div>
              </div>
            )}
            
          </div>
          <div className="flex justify-end max-w-xl mt-4">
            <Button 
                onClick={handleShow} 
                disabled={isFetchingResults || (searchOption === 'Customer Name' && !selectedCustomerId) || (searchOption === 'Quotation Number' && !selectedQuotationId)} 
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]"
            >
                {isFetchingResults ? <Loader2 className="h-4 w-4 animate-spin" /> : "Show"}
            </Button>
          </div>
        </CardContent>
        
        {showList && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 border-t">
            <div className="overflow-x-auto rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50">
                            <TableHead>Quotation Number</TableHead>
                            <TableHead>Customer Name</TableHead>
                            <TableHead>Quotation Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {searchResults.map(q => (
                            <TableRow key={q.id}>
                                <TableCell className="font-medium">{q.quotation_id}</TableCell>
                                <TableCell>{q.customers?.customer_name || q.customer_name || 'N/A'}</TableCell>
                                <TableCell>{format(new Date(q.quotation_date), 'dd-MM-yyyy')}</TableCell>
                                <TableCell>₹{parseFloat(q.grand_total || 0).toFixed(2)}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(q.id)} title="Edit Quotation">
                                        <Edit size={16} className="text-blue-600" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id)} title="Delete Quotation">
                                        <Trash2 size={16} className="text-red-500" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {searchResults.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                                    No quotations found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
          </motion.div>
        )}
      </Card>

      {/* Main Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="flex flex-row items-center justify-between border-b pb-4">
                <div>
                    <DialogTitle>Edit Quotation</DialogTitle>
                    <DialogDescription>
                        Modify details and manage products for Quotation #{editFormData.quotation_id}
                    </DialogDescription>
                </div>
                <Button 
                    type="button" 
                    className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 transition-colors duration-200 shadow-sm"
                    onClick={handleCloseEditModal}
                >
                    <ArrowLeft size={16} /> Go Back
                </Button>
            </DialogHeader>
            
            {isAddingProduct ? (
                <div className="border p-4 rounded-md">
                     <h3 className="text-lg font-semibold mb-2">Add New Product</h3>
                     <AddQuotationProductForm 
                        quotationId={editFormData.id} 
                        type={editFormData.type}
                        onSave={handleProductChangeSuccess} 
                        onCancel={() => setIsAddingProduct(false)} 
                     />
                </div>
            ) : editingItem ? (
                <div className="border p-4 rounded-md">
                    <EditQuotationProductForm 
                        item={editingItem} 
                        onSave={handleProductChangeSuccess} 
                        onCancel={() => setEditingItem(null)} 
                    />
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid gap-4 py-4 border-b">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="quotation_id">Quotation ID</Label>
                                <Input id="quotation_id" value={editFormData.quotation_id} onChange={handleEditInputChange} className="bg-white text-gray-900" />
                            </div>
                            <div className="space-y-2">
                                <Label>Quotation Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !editFormData.quotation_date && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {editFormData.quotation_date ? format(editFormData.quotation_date, "dd-MM-yyyy") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={editFormData.quotation_date} onSelect={handleDateChange} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        {/* Customer Name Searchable Autocomplete */}
                        <div className="space-y-2">
                            <Label htmlFor="edit_customer_search">
                                Customer Name <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative" ref={editCustomerAutocompleteRef}>
                                <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input 
                                        id="edit_customer_search"
                                        placeholder="Search Customer..." 
                                        value={editCustomerSearchTerm} 
                                        onChange={handleEditCustomerSearchChange}
                                        onFocus={() => setShowEditCustomerSuggestions(true)}
                                        className={`pl-8 ${!editSelectedCustomerId && editCustomerSearchTerm ? "border-amber-400 focus-visible:ring-amber-400" : ""} bg-white text-gray-900`}
                                    />
                                    {isSearchingEditCustomer && (
                                        <div className="absolute right-3 top-2.5">
                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        </div>
                                    )}
                                </div>
                                {showEditCustomerSuggestions && (
                                    <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto mt-1">
                                        {filteredEditCustomers.length > 0 ? (
                                            filteredEditCustomers.map(client => (
                                                <div
                                                    key={client.id}
                                                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                                    onMouseDown={(e) => { 
                                                        e.preventDefault(); 
                                                        handleEditCustomerSelect(client); 
                                                    }}
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

                        {/* Department and User Name Dropdowns */}
                        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-md">
                            <div className="space-y-2">
                                <Label htmlFor="department">Department</Label>
                                <Select 
                                    value={editFormData.department} 
                                    onValueChange={handleDepartmentChange}
                                    disabled={!editSelectedCustomerId}
                                >
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder={!editSelectedCustomerId ? "Select Customer First" : (validDepartments.length === 0 ? "No Department Found" : "Select Department")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="no-department">No Department (Show All Users)</SelectItem>
                                        {validDepartments.map((dept, idx) => (
                                            <SelectItem key={`${dept}-${idx}`} value={dept}>{dept}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="user_name">User Name</Label>
                                <Select 
                                    value={editFormData.user_name} 
                                    onValueChange={(val) => setEditFormData(prev => ({ ...prev, user_name: val }))}
                                    disabled={!editSelectedCustomerId}
                                >
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder={!editSelectedCustomerId ? "Select Customer First" : (validUsers.length === 0 ? "No User Found" : "Select User")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {validUsers.length > 0 ? (
                                            validUsers.map((user, idx) => (
                                                <SelectItem key={`${user}-${idx}`} value={user}>{user}</SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="no-users-placeholder" disabled>No Users Available</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="details">Details</Label>
                            <Textarea id="details" value={editFormData.details} onChange={handleEditInputChange} rows={2} className="bg-white text-gray-900" />
                        </div>
                        
                         <div className="flex justify-end">
                            <Button onClick={handleEditSave} disabled={isSaving} size="sm">
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Details
                            </Button>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-semibold text-lg">Products</h3>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={handleRefreshItems} disabled={itemsLoading}>
                                    <RefreshCw className={`h-4 w-4 mr-2 ${itemsLoading ? 'animate-spin' : ''}`} />
                                    Refresh List
                                </Button>
                                <Button size="sm" onClick={() => setIsAddingProduct(true)} className="gap-2">
                                    <Plus size={16} /> Add New Product
                                </Button>
                            </div>
                        </div>

                        {itemsLoading ? (
                             <div className="flex flex-col items-center justify-center p-8 border rounded-md bg-gray-50 h-40">
                                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                                <p className="text-sm text-muted-foreground">Loading products...</p>
                             </div>
                        ) : itemsError ? (
                             <Alert variant="destructive" className="mb-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>
                                    {itemsError}
                                    <div className="mt-2">
                                        <Button variant="outline" size="sm" onClick={handleRefreshItems} className="bg-white hover:bg-gray-100 text-black border-gray-300">
                                            Retry
                                        </Button>
                                    </div>
                                </AlertDescription>
                             </Alert>
                        ) : (
                            <div className="border rounded-md overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50">
                                            <TableHead>Product Name</TableHead>
                                            <TableHead>Unit</TableHead>
                                            <TableHead>Qty</TableHead>
                                            <TableHead>Price</TableHead>
                                            <TableHead>Total (GST Incl.)</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedQuotationDetails?.items.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">{item.product_name}</TableCell>
                                                <TableCell>{item.unit}</TableCell>
                                                <TableCell>{item.quantity}</TableCell>
                                                <TableCell>₹{parseFloat(item.price_for_one).toFixed(2)}</TableCell>
                                                <TableCell>₹{parseFloat(item.total_price_with_gst).toFixed(2)}</TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingItem(item)}>
                                                        <Edit size={14} />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => handleDeleteProduct(item.id)}>
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {(!selectedQuotationDetails?.items || selectedQuotationDetails.items.length === 0) && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">No products found.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                         <div className="flex justify-end items-center gap-4 pt-4">
                            <span className="text-lg font-semibold">Grand Total:</span>
                            <span className="text-xl font-bold">₹{parseFloat(editFormData.grand_total || 0).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            )}

            <DialogFooter className="mt-4 border-t pt-4 flex justify-between">
                <Button variant="outline" onClick={handleCloseEditModal}>Close Dialog</Button>
                <div className="flex gap-2">
                    <Button 
                        type="button" 
                        className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2" 
                        onClick={generatePDF}
                    >
                        <Download size={16} /> Save as PDF
                    </Button>
                </div>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default SearchQuotation;