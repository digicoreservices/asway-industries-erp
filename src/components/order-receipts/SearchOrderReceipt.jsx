
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, isValid } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as ShadcnTableFooter } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import useClientManagement from '@/hooks/useClientManagement';
import usePurchaseOrderReceiptManagement from '@/hooks/usePurchaseOrderReceiptManagement';
import useProductManagement from '@/hooks/useProductManagement';
import { FileDown, Trash2, Edit, Search, Calendar as CalendarIcon, File as FileIcon, FileText, Save, Eye, AlertCircle, ChevronsUpDown, Check } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import EditOrderReceiptForm from './EditOrderReceiptForm';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/customSupabaseClient';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { numberToWords } from '@/lib/numberToWords';

const SearchOrderReceipt = ({ onClose }) => {
  const { clients, fetchClients } = useClientManagement();
  const { receipts, fetchReceiptDetails, deleteReceipt, loading: hookLoading, fetchReceipts, allUsers, fetchWorkOrders } = usePurchaseOrderReceiptManagement();
  const { products: allProducts } = useProductManagement();
  const { toast } = useToast();

  const [searchOption, setSearchOption] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [receiptDetails, setReceiptDetails] = useState(null);
  
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [woNumber, setWoNumber] = useState('');
  const [userName, setUserName] = useState('');
  const [totalListOption, setTotalListOption] = useState('');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [productType, setProductType] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');

  const [isSearching, setIsSearching] = useState(false);
  const [globalError, setGlobalError] = useState(null);

  const [targetPlanData, setTargetPlanData] = useState([]);
  const [planName, setPlanName] = useState('');
  const [savedPlans, setSavedPlans] = useState([]);
  const [viewingPlan, setViewingPlan] = useState(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planModalMode, setPlanModalMode] = useState('view'); 

  const [selectedUser, setSelectedUser] = useState('');
  const [customerSearchOption, setCustomerSearchOption] = useState('');
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const printableAreaRef = useRef();
  
  const initializedRef = useRef(false);

  // Search states for custom dropdowns
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [quotationSearch, setQuotationSearch] = useState('');

  // Popover states
  const [isDepartmentOpen, setIsDepartmentOpen] = useState(false);
  const [isUserOpen, setIsUserOpen] = useState(false);
  const [isQuotationOpen, setIsQuotationOpen] = useState(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initData = async () => {
      try {
        await Promise.all([fetchClients(), fetchReceipts()]);
        setGlobalError(null);
      } catch (error) {
        setGlobalError(error.message || "Failed to load initial data. Please try again.");
        toast({ title: 'Error loading data', description: error.message, variant: 'destructive' });
      }
    };

    initData();
  }, [fetchClients, fetchReceipts, toast]);

  useEffect(() => {
    if (searchOption !== 'customer') {
      setSelectedCustomerId('');
      setSelectedDepartment('');
      setSelectedUser('');
      setCustomerSearchOption('');
    }
     if (searchOption !== 'wo') {
      setWoNumber('');
    }
    if (searchOption !== 'product') {
        setProductType('');
        setSelectedProduct('');
    }
  }, [searchOption]);

  // Clear search when popovers close
  useEffect(() => {
    if (!isDepartmentOpen) setDepartmentSearch('');
  }, [isDepartmentOpen]);

  useEffect(() => {
    if (!isUserOpen) setUserSearch('');
  }, [isUserOpen]);

  useEffect(() => {
    if (!isQuotationOpen) setQuotationSearch('');
  }, [isQuotationOpen]);

  const customerDepartments = useMemo(() => {
    if (!selectedCustomerId) return [];
    const client = clients.find(c => c.id === selectedCustomerId);
    if (!client) return [];
    const depts = new Set();
    for (let i = 1; i <= 5; i++) {
        if (client[`department_name_${i}`]) {
            depts.add(client[`department_name_${i}`]);
        }
    }
    return [...depts];
  }, [selectedCustomerId, clients]);

  const customerUsers = useMemo(() => {
    if (!selectedCustomerId || !selectedDepartment) return [];
    const client = clients.find(c => c.id === selectedCustomerId);
    if (!client) return [];
    const users = [];
    for (let i = 1; i <= 5; i++) {
        if (client[`department_name_${i}`] === selectedDepartment && client[`user${i}`]) {
            users.push(client[`user${i}`]);
        }
    }
    return users;
  }, [selectedCustomerId, selectedDepartment, clients]);

  // Filtered lists for custom dropdowns
  const filteredDepartments = useMemo(() => {
    if (!departmentSearch) return customerDepartments;
    return customerDepartments.filter(dept => 
      dept.toLowerCase().includes(departmentSearch.toLowerCase())
    );
  }, [customerDepartments, departmentSearch]);

  const filteredUsers = useMemo(() => {
    if (!userSearch) return customerUsers;
    return customerUsers.filter(user => 
      user.toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [customerUsers, userSearch]);

  const customerQuotations = useMemo(() => {
    if (!selectedCustomerId) return [];
    return receipts.filter(r => r.customer_id === selectedCustomerId && r.quotation_number);
  }, [selectedCustomerId, receipts]);

  const filteredQuotations = useMemo(() => {
    if (!quotationSearch) return customerQuotations;
    return customerQuotations.filter(q => 
      q.quotation_number.toLowerCase().includes(quotationSearch.toLowerCase())
    );
  }, [customerQuotations, quotationSearch]);

  const searchOptions = [
    { value: 'total', label: 'Total List' },
    { value: 'customer', label: 'Customer Name' },
    { value: 'po', label: 'PO Number' },
    { value: 'sales_orders', label: 'Sales Orders' },
    { value: 'service_orders', label: 'Service Orders' },
    { value: 'product', label: 'Product' },
    { value: 'delivery', label: 'Expected Delivery Period' },
    { value: 'target', label: 'Create Target Plan' },
    { value: 'view_plans', label: 'Search/View Saved Plans' },
    { value: 'user', label: 'User' },
  ];

  const totalListOptions = [
      { value: 'between_dates', label: 'PO between two selected dates' }
  ];

  const customerSearchOptions = [
    { value: 'between_dates', label: 'PO Between Two Selected Dates' },
    { value: 'total_list', label: 'Total PO List' },
  ];

  const filteredProducts = useMemo(() => {
    if (!productType) return [];
    return allProducts.filter(p => p.type === productType);
  }, [productType, allProducts]);

  const handleTargetPlanChange = (index, value, isViewingSaved) => {
    const data = isViewingSaved ? viewingPlan.items : targetPlanData;
    const setData = isViewingSaved ? (d) => setViewingPlan(p => ({...p, items: d})) : setTargetPlanData;
    
    const newData = [...data];
    const item = newData[index];
    const pendingBalance = item.pending_balance_quantity;
    const plannedQty = Math.min(Number(value) || 0, pendingBalance);
    
    item.planned_quantity = plannedQty;
    const basePrice = plannedQty * (item.price || 0);
    const gstAmount = basePrice * (item.gst_rate || 0);
    item.planned_quantity_price = basePrice + gstAmount;
    
    setData(newData);

    if (Number(value) > pendingBalance) {
        toast({
            title: "Validation Error",
            description: "Planned quantity cannot exceed pending balance.",
            variant: "destructive"
        });
    }
  };

  const exportTargetPlanPDF = (plan) => {
    try {
        const isSaved = !!plan;
        const allData = isSaved ? plan.items : targetPlanData;
        const data = allData.filter(item => item.planned_quantity > 0);

        if (data.length === 0) {
            toast({ title: "No data to export", description: "There are no items with a planned quantity to export.", variant: "destructive" });
            return;
        }

        const from = isSaved ? parseISO(plan.from_date) : fromDate;
        const to = isSaved ? parseISO(plan.to_date) : toDate;

        if (!from || !to) {
            toast({ title: "Please select a date range first.", variant: 'destructive' });
            return;
        }

        const doc = new jsPDF();
        doc.text(`Target Plan: ${isSaved ? plan.plan_name : (planName || 'Unsaved Plan')}`, 14, 10);
        doc.text(`Period: ${format(from, 'dd-MM-yyyy')} to ${format(to, 'dd-MM-yyyy')}`, 14, 15);
        
        const totalPrice = data.reduce((sum, item) => sum + (item.planned_quantity_price || 0), 0);
        
        doc.autoTable({
            startY: 20,
            head: [['Customer', 'Product', 'User', 'Pending Qty', 'Unit Price', 'GST', 'Planned Qty', 'Planned Price w/GST']],
            body: data.map(item => [
                item.customer_name,
                item.product_name,
                item.user_name,
                item.pending_balance_quantity,
                `₹${(item.price || 0).toFixed(2)}`,
                `${item.gst_type} (${(item.gst_rate * 100).toFixed(0)}%)`,
                item.planned_quantity,
                `₹${(item.planned_quantity_price || 0).toFixed(2)}`
            ]),
            foot: [['Total', '', '', '', '', '', '', `₹${totalPrice.toFixed(2)}`]],
            styles: { fontSize: 8 },
            headStyles: { fillColor: [41, 128, 185] },
            footStyles: { fillColor: [232, 232, 232], textColor: 0, fontStyle: 'bold' }
        });
        doc.save(`Target_Plan_${isSaved ? plan.plan_name : 'current'}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (err) {
        toast({ title: 'PDF Export Failed', description: err.message, variant: 'destructive' });
    }
  };

  const exportTargetPlanExcel = (plan) => {
    try {
        const isSaved = !!plan;
        const allData = isSaved ? plan.items : targetPlanData;
        const data = allData.filter(item => item.planned_quantity > 0);
        
        if (data.length === 0) {
            toast({ title: "No data to export", description: "There are no items with a planned quantity to export.", variant: "destructive" });
            return;
        }

        if (isSaved && (!plan.from_date || !plan.to_date)) {
            toast({ title: "Date range is missing for this plan.", variant: 'destructive' });
            return;
        }
        if (!isSaved && (!fromDate || !toDate)) {
            toast({ title: "Please select a date range first.", variant: 'destructive' });
            return;
        }

        const headers = ['Customer', 'Product', 'User', 'Description', 'Total Ordered Quantity', 'Pending Balance Quantity', 'Unit Price', 'GST Type', 'GST Rate', 'Planned Quantity', 'Price of Planned Qty w/GST'];
        const csvContent = "data:text/csv;charset=utf-8," 
          + headers.join(",") + "\n"
          + data.map(item => [
              `"${item.customer_name}"`,
              `"${item.product_name}"`,
              `"${item.user_name}"`,
              `"${(item.description || '').replace(/"/g, '""')}"`,
              item.total_ordered_quantity,
              item.pending_balance_quantity,
              item.price,
              item.gst_type,
              item.gst_rate,
              item.planned_quantity,
              item.planned_quantity_price || 0
          ].join(",")).join("\n");
          
        const totalPrice = data.reduce((sum, item) => sum + (item.planned_quantity_price || 0), 0);
        const totalRow = `\n,,,,,,,,,,Total Price,${totalPrice.toFixed(2)}`;

        const encodedUri = encodeURI(csvContent + totalRow);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Target_Plan_${isSaved ? plan.plan_name : 'current'}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (err) {
        toast({ title: 'Excel Export Failed', description: err.message, variant: 'destructive' });
    }
  };
  
  const handleSavePlan = async () => {
    try {
        if (!planName.trim()) { toast({ title: "Plan name is required.", variant: 'destructive' }); return; }
        if (!fromDate || !toDate) { toast({ title: "Production period date range is required.", variant: 'destructive' }); return; }
        if (targetPlanData.length === 0) { toast({ title: "No data to save.", variant: 'destructive' }); return; }

        const { data: plan, error: planError } = await supabase
            .from('target_plans')
            .insert({ plan_name: planName, from_date: format(fromDate, 'yyyy-MM-dd'), to_date: format(toDate, 'yyyy-MM-dd') })
            .select()
            .single();
        
        if (planError) throw planError;

        const itemsToInsert = targetPlanData.map(item => ({ ...item, target_plan_id: plan.id }));
        const { error: itemsError } = await supabase.from('target_plan_items').insert(itemsToInsert);

        if (itemsError) { await supabase.from('target_plans').delete().eq('id', plan.id); throw itemsError; }

        toast({ title: "Success", description: `Plan "${planName}" saved successfully.` });
        setPlanName('');
        setTargetPlanData([]);
    } catch (error) {
        toast({ title: "Error saving plan", description: error.message, variant: 'destructive' });
    }
  };
    
  const handleUpdatePlan = async () => {
    try {
        if (!viewingPlan) return;
        const { error: deleteError } = await supabase.from('target_plan_items').delete().eq('target_plan_id', viewingPlan.id);
        if (deleteError) throw deleteError;
        const itemsToInsert = viewingPlan.items.map(item => ({ ...item, target_plan_id: viewingPlan.id, id: undefined }));
        const { error: insertError } = await supabase.from('target_plan_items').insert(itemsToInsert);
        if (insertError) throw insertError;
        toast({ title: "Success", description: "Plan updated successfully." });
        setIsPlanModalOpen(false);
        setViewingPlan(null);
        handleSearch();
    } catch (error) {
        toast({ title: "Error updating plan", description: error.message, variant: "destructive" });
    }
  };

  const handleDeletePlan = async (planId) => {
    try {
        const { error: itemsError } = await supabase.from('target_plan_items').delete().eq('target_plan_id', planId);
        if (itemsError) throw itemsError;
        const { error: planError } = await supabase.from('target_plans').delete().eq('id', planId);
        if (planError) throw planError;
        toast({ title: "Success", description: "Plan deleted." });
        setSavedPlans(prev => prev.filter(p => p.id !== planId));
    } catch (error) {
        toast({ title: "Error deleting plan", description: error.message, variant: 'destructive' });
    }
  };
    
  const openPlanModal = async (plan, mode) => {
    try {
        const { data, error } = await supabase.from('target_plan_items').select('*').eq('target_plan_id', plan.id);
        if (error) throw error;
        setPlanModalMode(mode);
        setViewingPlan({ ...plan, items: data });
        setIsPlanModalOpen(true);
    } catch (error) {
        toast({ title: "Error fetching plan details", description: error.message, variant: 'destructive' });
    }
  };

  const handleViewPlansSearch = async () => {
    try {
        const { data: plans, error } = await supabase.from('target_plans').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        setSavedPlans(plans);
        if (plans.length === 0) toast({ title: 'No Saved Plans', description: 'No target plans have been saved yet.' });
    } catch (error) {
        toast({ title: 'Error fetching saved plans', description: error.message, variant: 'destructive' });
    }
  };

  const handleTargetPlanSearch = async () => {
    try {
        const { data: itemsWithSchedules, error: targetItemsError } = await supabase
          .from('purchase_order_receipt_items')
          .select(`*, purchase_order_receipts!inner (customer_id, user, customers (customer_name)), purchase_order_receipt_items_delivery_schedules (quantity)`);
        if (targetItemsError) throw targetItemsError;

        const pendingItems = itemsWithSchedules.map(item => {
          if (!item.purchase_order_receipts || !item.purchase_order_receipts.customers) return null;
          const totalOrdered = item.quantity || 0;
          const scheduledQty = (item.purchase_order_receipt_items_delivery_schedules || []).reduce((sum, s) => sum + (s.quantity || 0), 0);
          const pendingBalance = totalOrdered - scheduledQty;
          
          let gstRate = 0;
          let gstType = "None";
          if (item.igst > 0) { gstRate = 0.18; gstType = "IGST"; } 
          else if (item.cgst > 0 && item.sgst > 0) { gstRate = 0.18; gstType = "CGST+SGST"; } 
          else if (item.cgst > 0) { gstRate = 0.09; gstType = "CGST"; } 
          else if (item.sgst > 0) { gstRate = 0.09; gstType = "SGST"; }

          if (pendingBalance > 0) {
            return {
              customer_name: item.purchase_order_receipts.customers.customer_name,
              product_name: item.product_name,
              user_name: item.purchase_order_receipts.user || 'N/A',
              description: item.description || '',
              total_ordered_quantity: totalOrdered,
              pending_balance_quantity: pendingBalance,
              price: item.price_for_one || 0,
              gst_rate: gstRate,
              gst_type: gstType,
              planned_quantity: 0,
              planned_quantity_price: 0,
            };
          }
          return null;
        }).filter(Boolean);

        setTargetPlanData(pendingItems);
        if (pendingItems.length === 0) toast({ title: 'No Pending Items', description: 'No products with a pending balance were found.' });
    } catch (error) {
        toast({ title: 'Error fetching data for target plan', description: error.message, variant: 'destructive' });
    }
  };

  const handleTotalListSearch = () => {
    let results = [];
    if (totalListOption === 'between_dates') {
      if (!fromDate || !toDate) { toast({ title: 'Please select both "From" and "To" dates.', variant: 'destructive' }); return; }
      results = receipts.filter(r => {
        if (!r.purchase_order_date) return false;
        const poDate = parseISO(r.purchase_order_date);
        return isValid(poDate) && isWithinInterval(poDate, { start: startOfDay(fromDate), end: endOfDay(toDate) });
      });
    } else {
      toast({ title: 'Please select an option from the "Total List" dropdown.', variant: 'destructive' });
      return;
    }
    setSearchResults(results);
    if (results.length === 0) toast({ title: 'No Results', description: 'No receipts found for the selected criteria.' });
  };
  
  const handleCustomerSearch = () => {
    if (!selectedCustomerId) { toast({ title: 'Please select a customer.', variant: 'destructive' }); return; }
    let customerResults = receipts.filter(r => r.customer_id === selectedCustomerId);
    if (selectedDepartment) { customerResults = customerResults.filter(r => r.department === selectedDepartment); }
    if (selectedUser && selectedUser !== 'all_users') { customerResults = customerResults.filter(r => r.user === selectedUser); }
    let results = [];
    if (!customerSearchOption) { results = customerResults; } 
    else {
      switch (customerSearchOption) {
        case 'between_dates':
          if (!fromDate || !toDate) { toast({ title: 'Please select both "From" and "To" dates.', variant: 'destructive' }); return; }
          results = customerResults.filter(r => {
            if (!r.purchase_order_date) return false;
            const poDate = parseISO(r.purchase_order_date);
            return isValid(poDate) && isWithinInterval(poDate, { start: startOfDay(fromDate), end: endOfDay(toDate) });
          });
          break;
        case 'total_list': results = customerResults; break;
        default: results = [];
      }
    }
    setSearchResults(results);
    if (results.length === 0) toast({ title: 'No Results', description: 'No receipts found for the selected criteria.' });
  };
  
  const handleOrderTypeSearch = async (type) => {
    try {
        const { data, error } = await supabase.from('purchase_order_receipt_items').select('receipt_id').eq('type', type);
        if (error) throw error;
        const receiptIds = [...new Set(data.map(item => item.receipt_id).filter(Boolean))];
        const results = receiptIds.length > 0 ? receipts.filter(r => receiptIds.includes(r.id)) : [];
        setSearchResults(results);
        if (results.length === 0) toast({ title: 'No Results', description: 'No receipts found for the selected criteria.' });
    } catch (error) {
        toast({ title: `Error fetching ${type} order items`, description: error.message, variant: 'destructive' });
    }
  };

  const handleProductSearch = async () => {
    if (!selectedProduct) { toast({ title: 'Please select a product.', variant: 'destructive' }); return; }
    try {
        const { data: productItemsData, error: productItemsError } = await supabase.from('purchase_order_receipt_items').select('receipt_id').eq('product_name', selectedProduct);
        if (productItemsError) throw productItemsError;
        const productReceiptIds = [...new Set(productItemsData.map(item => item.receipt_id).filter(Boolean))];
        const results = productReceiptIds.length > 0 ? receipts.filter(r => productReceiptIds.includes(r.id)) : [];
        setSearchResults(results);
        if (results.length === 0) toast({ title: 'No Results', description: 'No receipts found for the selected criteria.' });
    } catch (error) {
        toast({ title: 'Error fetching product items', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeliverySearch = async () => {
    if (!fromDate || !toDate) { toast({ title: 'Please select both "From" and "To" dates.', variant: 'destructive' }); return; }
    try {
        const { data: schedulesData, error: schedulesError } = await supabase
            .from('purchase_order_receipt_items_delivery_schedules')
            .select(`*, purchase_order_receipt_items (product_name, receipt_id)`)
            .gte('delivery_date', format(startOfDay(fromDate), 'yyyy-MM-dd'))
            .lte('delivery_date', format(endOfDay(toDate), 'yyyy-MM-dd'));
        if (schedulesError) throw schedulesError;

        const groupedByReceipt = schedulesData.reduce((acc, schedule) => {
            const item = schedule.purchase_order_receipt_items;
            if (!item || !item.receipt_id) return acc;
            const receiptId = item.receipt_id;
            if (!acc[receiptId]) {
                const receipt = receipts.find(r => r.id === receiptId);
                if (receipt) acc[receiptId] = { receipt: receipt, schedules: [] };
            }
            if (acc[receiptId]) { acc[receiptId].schedules.push({ ...schedule, product_name: item.product_name }); }
            return acc;
        }, {});
        const results = Object.values(groupedByReceipt);
        setSearchResults(results);
        if (results.length === 0) toast({ title: 'No Results', description: 'No receipts found for the selected criteria.' });
    } catch (error) {
        toast({ title: 'Error fetching delivery schedules', description: error.message, variant: 'destructive' });
    }
  };

  const handleSearch = async () => {
    setIsSearching(true);
    try {
        setSearchResults([]); setTargetPlanData([]); setSavedPlans([]); setReceiptDetails(null);
        switch (searchOption) {
        case 'view_plans': await handleViewPlansSearch(); break;
        case 'target': await handleTargetPlanSearch(); break;
        case 'total': handleTotalListSearch(); break;
        case 'customer': handleCustomerSearch(); break;
        case 'po':
            if (!poNumber.trim()) { toast({ title: 'Please enter a PO Number.', variant: 'destructive' }); return; }
            const poResults = receipts.filter(r => r.order_receipt_id.toLowerCase().includes(poNumber.toLowerCase().trim()));
            setSearchResults(poResults);
            if (poResults.length === 0) toast({ title: 'No Results Found' });
            break;
        case 'sales_orders': await handleOrderTypeSearch('Sale'); break;
        case 'service_orders': await handleOrderTypeSearch('Service'); break;
        case 'product': await handleProductSearch(); break;
        case 'delivery': await handleDeliverySearch(); break;
        case 'user':
            if (!userName) { toast({ title: 'Please select a User.', variant: 'destructive' }); return; }
            const userResults = receipts.filter(r => r.user === userName);
            setSearchResults(userResults);
            if (userResults.length === 0) toast({ title: 'No Results Found' });
            break;
        default: toast({ title: 'Please select a search option.', variant: 'destructive' });
        }
    } catch (error) {
        toast({ title: "Search Error", description: error.message || "An unexpected error occurred.", variant: "destructive"});
    } finally {
        setIsSearching(false);
    }
  };
  
  const handleShowDetails = async (receiptId) => {
    try {
      const details = await fetchReceiptDetails(receiptId);
      if (details) { setReceiptDetails(details); } 
      else { toast({ title: 'Error Fetching Details', description: 'Could not load receipt data', variant: 'destructive' }); }
    } catch (error) {
      toast({ title: 'Error Fetching Details', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!receiptDetails) return;
    try {
        const success = await deleteReceipt(receiptDetails.id);
        if (success) {
            setReceiptDetails(null);
            setSearchResults(prev => prev.filter(r => r.id !== receiptDetails.id));
            onClose();
        }
    } catch (error) {
        toast({ title: 'Error Deleting', description: error.message, variant: 'destructive' });
    }
  };

  const handleReceiptUpdated = async () => {
    try {
        setIsEditDialogOpen(false);
        toast({ title: 'Success', description: 'Receipt updated successfully.' });
        await fetchReceipts(); 
        if (receiptDetails) {
            const updatedDetails = await fetchReceiptDetails(receiptDetails.id); 
            if (updatedDetails) setReceiptDetails(updatedDetails);
        }
    } catch (error) {
        toast({ title: 'Update Notice', description: 'Receipt updated, but failed to refresh details view.', variant: 'destructive' });
    }
  };

  const handlePrint = () => {
    const input = printableAreaRef.current;
    if (!input) { toast({ title: "No Receipt to Print", description: "Please select a receipt to view its details first.", variant: "destructive" }); return; }

    try {
        const images = input.querySelectorAll('img');
        const imageLoadPromises = Array.from(images).map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
        });

        Promise.all(imageLoadPromises).then(() => {
            html2canvas(input, { scale: 2, useCORS: true, allowTaint: true, }).then((canvas) => {
              const imgData = canvas.toDataURL('image/png');
              const pdf = new jsPDF('p', 'mm', 'a4');
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const pdfHeight = pdf.internal.pageSize.getHeight();
              const canvasWidth = canvas.width;
              const canvasHeight = canvas.height;
              const ratio = canvasWidth / canvasHeight;
              let width = pdfWidth;
              let height = width / ratio;
              if (height > pdfHeight) { height = pdfHeight; width = height * ratio; }
              const x = (pdfWidth - width) / 2;
              const y = 0;
              pdf.addImage(imgData, 'PNG', x, y, width, height);
              pdf.save(`PO_Receipt_${receiptDetails.order_receipt_id}.pdf`);
              toast({ title: 'Success', description: 'Purchase Order Receipt saved as PDF.' });
            }).catch(err => {
                toast({ title: 'Error generating PDF', description: err.message, variant: 'destructive' });
            });
        });
    } catch (error) {
        toast({ title: 'Print Failed', description: error.message, variant: 'destructive' });
    }
  };

  const renderSearchInputs = () => {
    switch(searchOption) {
      case 'total':
        return (
          <>
            <div className="flex-1 w-full min-w-[200px]">
              <Label htmlFor="total-list-select">Select</Label>
              <Select onValueChange={setTotalListOption} value={totalListOption}>
                <SelectTrigger id="total-list-select"><SelectValue placeholder="Select an option" /></SelectTrigger>
                <SelectContent>{totalListOptions.map(option => ( <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem> ))}</SelectContent>
              </Select>
            </div>
            {totalListOption === 'between_dates' && (
              <>
                <div className="flex-1 w-full min-w-[200px]">
                  <Label>From</Label>
                   <Popover>
                    <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !fromDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{fromDate ? format(fromDate, "dd-MM-yyyy") : <span>Pick a date</span>}</Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus /></PopoverContent>
                  </Popover>
                </div>
                <div className="flex-1 w-full min-w-[200px]">
                  <Label>To</Label>
                  <Popover>
                    <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !toDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{toDate ? format(toDate, "dd-MM-yyyy") : <span>Pick a date</span>}</Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus /></PopoverContent>
                  </Popover>
                </div>
              </>
            )}
          </>
        );
      case 'customer':
        return (
          <>
            <div className="flex-1 w-full min-w-[200px]">
              <Label htmlFor="customer-select">Customer Name</Label>
              <Select onValueChange={(val) => { setSelectedCustomerId(val); setSelectedDepartment(''); setSelectedUser(''); }} value={selectedCustomerId}>
                <SelectTrigger id="customer-select"><SelectValue placeholder="Select a customer" /></SelectTrigger>
                <SelectContent className="max-h-[200px] overflow-y-auto">{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.customer_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {selectedCustomerId && (
              <>
                <div className="flex-1 w-full min-w-[200px]">
                  <Label>Department Name</Label>
                  <Popover open={isDepartmentOpen} onOpenChange={setIsDepartmentOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isDepartmentOpen}
                        className="w-full justify-between text-gray-900"
                        disabled={!selectedCustomerId || customerDepartments.length === 0}
                      >
                        {selectedDepartment || (customerDepartments.length > 0 ? "Select department..." : "No departments found")}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 z-50 bg-white" side="bottom" align="start" sideOffset={4}>
                      <div className="p-2 border-b">
                        <Input
                          placeholder="Search department..."
                          value={departmentSearch}
                          onChange={(e) => setDepartmentSearch(e.target.value)}
                          className="text-gray-900"
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {filteredDepartments.length > 0 ? (
                          filteredDepartments.map((dept) => (
                            <div
                              key={dept}
                              className="px-3 py-2 cursor-pointer hover:bg-blue-100 text-gray-900 border-b border-gray-200 last:border-b-0 flex items-center"
                              onClick={() => {
                                console.log('[Department] Item clicked:', dept);
                                setSelectedDepartment(dept);
                                setSelectedUser('');
                                setIsDepartmentOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedDepartment === dept ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {dept}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-gray-500 text-sm">No departments found</div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex-1 w-full min-w-[200px]">
                  <Label>User</Label>
                  <Popover open={isUserOpen} onOpenChange={setIsUserOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isUserOpen}
                        className="w-full justify-between text-gray-900"
                        disabled={customerUsers.length === 0}
                      >
                        {selectedUser === 'all_users' ? 'All Users' : (selectedUser || (customerUsers.length > 0 ? "Select a user" : "Select Dept First"))}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 z-50 bg-white" side="bottom" align="start" sideOffset={4}>
                      <div className="p-2 border-b">
                        <Input
                          placeholder="Search user..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          className="text-gray-900"
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        <div
                          className="px-3 py-2 cursor-pointer hover:bg-blue-100 text-gray-900 border-b border-gray-200 flex items-center"
                          onClick={() => {
                            console.log('[User] Item clicked: All Users');
                            setSelectedUser('all_users');
                            setIsUserOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedUser === 'all_users' ? "opacity-100" : "opacity-0"
                            )}
                          />
                          All Users
                        </div>
                        {filteredUsers.length > 0 ? (
                          filteredUsers.map((user) => (
                            <div
                              key={user}
                              className="px-3 py-2 cursor-pointer hover:bg-blue-100 text-gray-900 border-b border-gray-200 last:border-b-0 flex items-center"
                              onClick={() => {
                                console.log('[User] Item clicked:', user);
                                setSelectedUser(user);
                                setIsUserOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedUser === user ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {user}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-gray-500 text-sm">No users found</div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex-1 w-full min-w-[200px]">
                  <Label htmlFor="customer-search-option">Search Criteria</Label>
                  <Select onValueChange={setCustomerSearchOption} value={customerSearchOption}>
                    <SelectTrigger id="customer-search-option"><SelectValue placeholder="Select criteria (optional)" /></SelectTrigger>
                    <SelectContent>
                      {customerSearchOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {customerSearchOption === 'between_dates' && (
              <>
                <div className="flex-1 w-full min-w-[200px]">
                  <Label>From</Label>
                   <Popover>
                    <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !fromDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{fromDate ? format(fromDate, "dd-MM-yyyy") : <span>Pick a date</span>}</Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus /></PopoverContent>
                  </Popover>
                </div>
                <div className="flex-1 w-full min-w-[200px]">
                  <Label>To</Label>
                  <Popover>
                    <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !toDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{toDate ? format(toDate, "dd-MM-yyyy") : <span>Pick a date</span>}</Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus /></PopoverContent>
                  </Popover>
                </div>
              </>
            )}
          </>
        );
      case 'po': return ( <div className="flex-1 w-full min-w-[200px]"><Label htmlFor="po-input">PO Number</Label><Input id="po-input" placeholder="Enter PO Number" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} /></div> );
      case 'sales_orders': case 'service_orders': return null;
      case 'delivery': case 'target':
        return (
            <>
                {searchOption === 'target' && (<div className="flex-1 w-full min-w-[200px]"><Label htmlFor="plan-name-input">Plan Name</Label><Input id="plan-name-input" placeholder="Enter Plan Name" value={planName} onChange={(e) => setPlanName(e.target.value)} /></div> )}
                <div className="flex-1 w-full min-w-[200px]">
                  <Label>Production Period From</Label>
                   <Popover>
                    <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !fromDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{fromDate ? format(fromDate, "dd-MM-yyyy") : <span>Pick a date</span>}</Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus /></PopoverContent>
                  </Popover>
                </div>
                <div className="flex-1 w-full min-w-[200px]">
                  <Label>Production Period To</Label>
                  <Popover>
                    <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !toDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{toDate ? format(toDate, "dd-MM-yyyy") : <span>Pick a date</span>}</Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus /></PopoverContent>
                  </Popover>
                </div>
            </>
        );
      case 'view_plans': return null;
      case 'product':
        return (
            <>
                <div className="flex-1 w-full min-w-[200px]">
                    <Label htmlFor="product-type-select">Product Type</Label>
                    <Select onValueChange={(value) => { setProductType(value); setSelectedProduct(''); }} value={productType}>
                        <SelectTrigger id="product-type-select"><SelectValue placeholder="Select a type" /></SelectTrigger>
                        <SelectContent><SelectItem value="Sale">Sale</SelectItem><SelectItem value="Service">Service</SelectItem></SelectContent>
                    </Select>
                </div>
                {productType && (<div className="flex-1 w-full min-w-[200px]"><Label htmlFor="product-name-select">Product Name</Label><Select onValueChange={setSelectedProduct} value={selectedProduct} disabled={filteredProducts.length === 0}><SelectTrigger id="product-name-select"><SelectValue placeholder="Select a product" /></SelectTrigger><SelectContent>{filteredProducts.map(p => (<SelectItem key={p.product_name} value={p.product_name}>{p.product_name}</SelectItem>))}</SelectContent></Select></div>)}
            </>
        );
      case 'user':
        return (<div className="flex-1 w-full min-w-[200px]"><Label htmlFor="user-name-select">User Name</Label><Select onValueChange={setUserName} value={userName}><SelectTrigger id="user-name-select"><SelectValue placeholder="Select a user" /></SelectTrigger><SelectContent>{allUsers.map(user => (<SelectItem key={user} value={user}>{user}</SelectItem>))}</SelectContent></Select></div>);
      default: return null;
    }
  };

  const renderResultsTable = () => {
    if (receiptDetails) return null;
    
    if (searchOption === 'target' && targetPlanData.length > 0) {
        const totalPlannedPrice = targetPlanData.reduce((sum, item) => sum + item.planned_quantity_price, 0);
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Target Plan for Production Period</h3>
                    <div className="flex gap-2">
                        <Button onClick={() => exportTargetPlanPDF(null)} variant="outline" size="sm"><FileText className="mr-2 h-4 w-4" />Export PDF</Button>
                        <Button onClick={() => exportTargetPlanExcel(null)} variant="outline" size="sm"><FileIcon className="mr-2 h-4 w-4" />Export Excel</Button>
                        <Button onClick={handleSavePlan} size="sm"><Save className="mr-2 h-4 w-4" />Save Plan</Button>
                    </div>
                </div>
                <div className="border rounded-md overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Customer</TableHead><TableHead>Product</TableHead><TableHead>User</TableHead><TableHead>Description</TableHead>
                                <TableHead>Pending Qty</TableHead><TableHead>Unit Price</TableHead><TableHead>GST</TableHead>
                                <TableHead>Planned Qty</TableHead><TableHead>Price of Planned Qty w/GST</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {targetPlanData.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell>{item.customer_name}</TableCell><TableCell>{item.product_name}</TableCell><TableCell>{item.user_name}</TableCell>
                                    <TableCell className="max-w-[200px] whitespace-normal break-words">{item.description}</TableCell>
                                    <TableCell>{item.pending_balance_quantity}</TableCell>
                                    <TableCell>₹{item.price.toFixed(2)}</TableCell>
                                    <TableCell>{item.gst_type} ({(item.gst_rate * 100).toFixed(0)}%)</TableCell>
                                    <TableCell><Input type="number" value={item.planned_quantity} onChange={(e) => handleTargetPlanChange(index, e.target.value, false)} className="w-24" max={item.pending_balance_quantity} min="0"/></TableCell>
                                    <TableCell>₹{item.planned_quantity_price.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <ShadcnTableFooter>
                            <TableRow>
                                <TableCell colSpan={8} className="text-right font-bold">Total Price for All Planned Products</TableCell>
                                <TableCell className="font-bold">₹{totalPlannedPrice.toFixed(2)}</TableCell>
                            </TableRow>
                        </ShadcnTableFooter>
                    </Table>
                </div>
            </div>
        );
    }

    if (searchOption === 'view_plans' && savedPlans.length > 0) {
        return (
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Saved Target Plans</h3>
                <div className="border rounded-md overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Plan Name</TableHead><TableHead>From Date</TableHead><TableHead>To Date</TableHead>
                                <TableHead>Created At</TableHead><TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {savedPlans.map(plan => (
                                <TableRow key={plan.id}>
                                    <TableCell>{plan.plan_name}</TableCell><TableCell>{format(parseISO(plan.from_date), 'dd-MM-yyyy')}</TableCell>
                                    <TableCell>{format(parseISO(plan.to_date), 'dd-MM-yyyy')}</TableCell><TableCell>{format(parseISO(plan.created_at), 'dd-MM-yyyy HH:mm')}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="outline" size="sm" onClick={() => openPlanModal(plan, 'view')}><Eye className="mr-2 h-4 w-4" />View</Button>
                                        <Button variant="outline" size="sm" onClick={() => openPlanModal(plan, 'edit')}><Edit className="mr-2 h-4 w-4" />Edit</Button>
                                        <AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" />Delete</Button></AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the target plan "{plan.plan_name}".</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeletePlan(plan.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        );
    }
    
    if (searchResults.length === 0) {
        if (!isSearching && searchOption && !globalError) {
             return (
                 <div className="text-center py-10 bg-gray-50 border rounded-lg mt-6">
                    <Search className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No results found.</p>
                    <p className="text-gray-400 text-sm">Try adjusting your search filters.</p>
                 </div>
             )
        }
        return null;
    }

    if (searchOption === 'delivery') {
      return (
        <div className="space-y-4">
          {searchResults.map(({ receipt, schedules }) => (
            <Card key={receipt.id}>
              <CardHeader className="pb-2"><CardTitle className="text-base flex justify-between items-center"><span>PO Number: {receipt.order_receipt_id}</span><Button variant="link" size="sm" onClick={() => handleShowDetails(receipt.id)}>View Details</Button></CardTitle></CardHeader>
              <CardContent><p className="font-semibold mb-2 text-sm">Order Delivery Schedules in selected range:</p><Table><TableHeader><TableRow><TableHead>Product Name</TableHead><TableHead>Quantity</TableHead><TableHead>Delivery Date</TableHead></TableRow></TableHeader><TableBody>{schedules.map((schedule) => (<TableRow key={schedule.id}><TableCell>{schedule.product_name}</TableCell><TableCell>{schedule.quantity}</TableCell><TableCell>{format(parseISO(schedule.delivery_date), 'dd-MM-yyyy')}</TableCell></TableRow>))}</TableBody></Table></CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Customer Name</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Taxable Amt</TableHead>
                <TableHead>Tax Amt</TableHead>
                <TableHead>Other Charges</TableHead>
                <TableHead>Total PO Cost</TableHead>
                <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {searchResults.map(receipt => {
                return (
                  <TableRow key={receipt.id}>
                    <TableCell>{receipt.order_receipt_id}</TableCell>
                    <TableCell>{clients.find(c => c.id === receipt.customer_id)?.customer_name}</TableCell>
                    <TableCell>{receipt.user || 'N/A'}</TableCell>
                    <TableCell>₹{(receipt.taxable_amount || 0).toFixed(2)}</TableCell>
                    <TableCell>₹{(receipt.total_tax_amount || 0).toFixed(2)}</TableCell>
                    <TableCell>
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-500">{receipt.other_charges_description || 'None'}</span>
                            <span>₹{(receipt.other_charges_amount || 0).toFixed(2)}</span>
                        </div>
                    </TableCell>
                    <TableCell className="font-bold">₹{(receipt.grand_total || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right"><Button variant="link" size="sm" onClick={() => handleShowDetails(receipt.id)}>View Details</Button></TableCell>
                  </TableRow>
                );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  const PlanViewModal = () => {
    if (!viewingPlan) return null;
    
    const isEditMode = planModalMode === 'edit';
    const itemsToDisplay = isEditMode 
        ? viewingPlan.items 
        : viewingPlan.items.filter(item => item.planned_quantity > 0);

    const totalPlannedPrice = itemsToDisplay.reduce((sum, item) => sum + (item.planned_quantity_price || 0), 0);

    return (
        <Dialog open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen}>
            <DialogContent className="max-w-6xl">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit' : 'View'} Target Plan: {viewingPlan?.plan_name}</DialogTitle>
                    <DialogDescription>Period: {viewingPlan ? `${format(parseISO(viewingPlan.from_date), 'dd-MM-yyyy')} to ${format(parseISO(viewingPlan.to_date), 'dd-MM-yyyy')}` : ''}</DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer</TableHead><TableHead>Product</TableHead><TableHead>Pending Qty</TableHead>
                                    <TableHead>Unit Price</TableHead><TableHead>GST</TableHead><TableHead>Planned Qty</TableHead><TableHead>Price of Planned Qty w/GST</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {itemsToDisplay.map((item, index) => {
                                    const originalIndex = viewingPlan.items.findIndex(originalItem => originalItem.id === item.id);
                                    return (
                                        <TableRow key={item.id || index}>
                                            <TableCell>{item.customer_name}</TableCell><TableCell>{item.product_name}</TableCell>
                                            <TableCell>{item.pending_balance_quantity}</TableCell><TableCell>₹{(item.price || 0).toFixed(2)}</TableCell>
                                            <TableCell>{item.gst_type} ({(item.gst_rate * 100).toFixed(0)}%)</TableCell>
                                            <TableCell>
                                                {isEditMode ? (
                                                    <Input type="number" value={item.planned_quantity} onChange={(e) => handleTargetPlanChange(originalIndex, e.target.value, true)} className="w-24" max={item.pending_balance_quantity} min="0"/>
                                                ) : (
                                                    item.planned_quantity
                                                )}
                                            </TableCell>
                                            <TableCell>₹{(item.planned_quantity_price || 0).toFixed(2)}</TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                            <ShadcnTableFooter>
                                <TableRow>
                                    <TableCell colSpan={6} className="text-right font-bold">Total Price for All Planned Products</TableCell>
                                    <TableCell className="font-bold">₹{totalPlannedPrice.toFixed(2)}</TableCell>
                                </TableRow>
                            </ShadcnTableFooter>
                        </Table>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={() => exportTargetPlanPDF(viewingPlan)} variant="outline"><FileText className="mr-2 h-4 w-4" />PDF</Button>
                    <Button onClick={() => exportTargetPlanExcel(viewingPlan)} variant="outline"><FileIcon className="mr-2 h-4 w-4" />Excel</Button>
                    {isEditMode && <Button onClick={handleUpdatePlan}><Save className="mr-2 h-4 w-4" />Update Plan</Button>}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
  };

  if (globalError) {
    return (
      <Card className="max-w-7xl mx-auto border-red-200">
        <CardContent className="pt-6 pb-6 flex flex-col items-center justify-center space-y-4">
          <div className="bg-red-100 p-4 rounded-full">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Unable to load data</h3>
          <p className="text-gray-600 text-center max-w-md">{globalError}</p>
          <div className="flex gap-4 pt-4">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button onClick={() => { setGlobalError(null); initializedRef.current = false; }}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <Card className="max-w-7xl mx-auto">
        <CardHeader><CardTitle>Search and Edit Purchase Order Receipt from Customer</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-end">
            <div className="flex-1 w-full min-w-[200px]">
              <Label htmlFor="search-option-select">Select Option to Search</Label>
              <Select onValueChange={(value) => { setSearchOption(value); setTotalListOption(''); setFromDate(null); setToDate(null); setUserName(''); setTargetPlanData([]); setSavedPlans([]); }} value={searchOption}>
                <SelectTrigger id="search-option-select"><SelectValue placeholder="Select an option" /></SelectTrigger>
                <SelectContent>{searchOptions.map(option => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            {renderSearchInputs()}
            <Button onClick={handleSearch} disabled={!searchOption || isSearching} className="bg-blue-600 hover:bg-blue-700 text-white"><Search className="mr-2 h-4 w-4" />{isSearching ? 'Searching...' : 'Search'}</Button>
          </div>
          {renderResultsTable()}
          {receiptDetails && (
            <div ref={printableAreaRef} className="printable-area space-y-4 p-4 bg-white rounded-lg text-xs">
              <div className="text-center"><h2 className="text-lg font-bold">Asway Industries Pvt Ltd</h2><p className="font-semibold">Purchase Order Receipt from Customer</p></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs border-t pt-2 mt-2">
                <div><strong>Customer Name:</strong> {receiptDetails.customer?.customer_name || 'N/A'}</div><div><strong>PO Receipt Number:</strong> {receiptDetails.order_receipt_id}</div><div><strong>PO Date:</strong> {receiptDetails.purchase_order_date ? format(parseISO(receiptDetails.purchase_order_date), 'dd-MM-yyyy') : 'N/A'}</div>
                <div><strong>Department:</strong> {receiptDetails.department || 'N/A'}</div><div><strong>User:</strong> {receiptDetails.user || 'N/A'}</div><div><strong>Quotation Number:</strong> {receiptDetails.quotation_number || 'N/A'}</div><div><strong>Quotation Date:</strong> {receiptDetails.quotation_date ? format(parseISO(receiptDetails.quotation_date), 'dd-MM-yyyy') : 'N/A'}</div>
              </div>
              <div className="mt-4"><h3 className="text-sm font-semibold mb-2">Product List</h3>
                {receiptDetails.items.map(item => {
                    let uploadedFiles = [];
                    try {
                         if(item.image_url) {
                             if (item.image_url.startsWith('[')) {
                                 uploadedFiles = JSON.parse(item.image_url);
                             } else {
                                 uploadedFiles = [{ url: item.image_url, type: 'image/jpeg', name: 'Existing Image' }];
                             }
                         }
                    } catch(e) {
                        if(item.image_url) uploadedFiles = [{ url: item.image_url, type: 'image/jpeg', name: 'Existing Image' }];
                    }
                  return (
                  <div key={item.id} className="border rounded-lg mb-4 overflow-hidden">
                    <Table><TableHeader><TableRow><TableHead className="p-1">Type</TableHead><TableHead className="p-1">Product</TableHead><TableHead className="p-1">Description</TableHead><TableHead className="p-1">Images/PDFs</TableHead><TableHead className="p-1">Total Qty</TableHead><TableHead className="p-1">Unit</TableHead><TableHead className="p-1">Price/One</TableHead><TableHead className="p-1">Total</TableHead></TableRow></TableHeader>
                      <TableBody><TableRow><TableCell className="p-1">{item.type}</TableCell><TableCell className="p-1 max-w-[150px] whitespace-normal break-words">{item.product_name}</TableCell><TableCell className="p-1 max-w-[200px] whitespace-normal break-words">{item.description}</TableCell><TableCell className="p-1">
                         <div className="flex flex-wrap gap-1 w-32">
                            {uploadedFiles.map((file, idx) => (
                                <div key={idx} className="w-8 h-8 border rounded bg-gray-50 flex items-center justify-center">
                                    {(file.type?.includes('pdf') || file.url?.endsWith('.pdf')) ? 
                                    <a href={file.url} target="_blank" rel="noreferrer" className="text-red-500"><FileText size={16} /></a> : 
                                    <a href={file.url} target="_blank" rel="noreferrer"><img src={file.url} alt="img" className="w-full h-full object-cover" /></a>}
                                </div>
                            ))}
                        </div>
                        </TableCell><TableCell className="p-1">{item.quantity}</TableCell><TableCell className="p-1">{item.unit}</TableCell><TableCell className="p-1">₹{item.price_for_one?.toFixed(2)}</TableCell><TableCell className="p-1">₹{item.total_price?.toFixed(2)}</TableCell></TableRow></TableBody>
                    </Table>
                    {item.delivery_schedules && item.delivery_schedules.length > 0 && (
                      <div className="p-2 bg-gray-50 border-t"><h4 className="text-xs font-semibold mt-2 mb-1">Order Delivery Schedule</h4><Table><TableHeader><TableRow><TableHead className="p-1">Qty</TableHead><TableHead className="p-1">Delivery Date</TableHead><TableHead className="p-1">Total Price</TableHead></TableRow></TableHeader><TableBody>{item.delivery_schedules.map((schedule, index) => (<TableRow key={index}><TableCell className="p-1">{schedule.quantity}</TableCell><TableCell className="p-1">{schedule.delivery_date ? format(parseISO(schedule.delivery_date), 'dd-MM-yyyy') : 'N/A'}</TableCell><TableCell className="p-1">₹{schedule.total_price?.toFixed(2)}</TableCell></TableRow>))}</TableBody></Table></div>
                    )}
                  </div>
                  );
                })}
              </div>

              <div className="mt-4 border-t pt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                 <div>
                    <h4 className="font-semibold mb-1">Tax Details</h4>
                    <div className="grid grid-cols-2 gap-1 bg-gray-50 p-2 rounded">
                        <span>Taxable Amount:</span> <span>₹{(receiptDetails.taxable_amount || 0).toFixed(2)}</span>
                        {(receiptDetails.cgst_amount > 0) && <><span className="pl-2">CGST ({receiptDetails.cgst_rate}%):</span> <span>₹{receiptDetails.cgst_amount.toFixed(2)}</span></>}
                        {(receiptDetails.sgst_amount > 0) && <><span className="pl-2">SGST ({receiptDetails.sgst_rate}%):</span> <span>₹{receiptDetails.sgst_amount.toFixed(2)}</span></>}
                        {(receiptDetails.igst_amount > 0) && <><span className="pl-2">IGST ({receiptDetails.igst_rate}%):</span> <span>₹{receiptDetails.igst_amount.toFixed(2)}</span></>}
                        <span className="font-semibold">Total Tax:</span> <span className="font-semibold">₹{(receiptDetails.total_tax_amount || 0).toFixed(2)}</span>
                    </div>
                 </div>
                 <div>
                    <h4 className="font-semibold mb-1">Other Charges</h4>
                    <div className="bg-gray-50 p-2 rounded min-h-[60px]">
                        {receiptDetails.other_charges_amount > 0 ? (
                            <div className="flex justify-between">
                                <span>{receiptDetails.other_charges_description || 'Charges'}:</span>
                                <span>₹{receiptDetails.other_charges_amount.toFixed(2)}</span>
                            </div>
                        ) : (
                            <span className="text-gray-500">None</span>
                        )}
                    </div>
                 </div>
              </div>

              <div className="mt-4 pt-2 border-t flex flex-col items-end text-sm">
                 <div className="w-full md:w-1/2 space-y-1">
                    <div className="flex justify-between"><span>Total Products Amount:</span> <span>₹{(receiptDetails.taxable_amount || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Total Tax Amount:</span> <span>₹{(receiptDetails.total_tax_amount || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Other Charges:</span> <span>₹{(receiptDetails.other_charges_amount || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold text-base pt-1 border-t mt-1"><span>Total Purchase Order Cost:</span> <span>₹{(receiptDetails.grand_total || 0).toFixed(2)}</span></div>
                 </div>
                 <div className="w-full text-right mt-2 italic text-xs text-gray-600">
                    {numberToWords(receiptDetails.grand_total || 0)}
                 </div>
              </div>

            </div>
          )}
          <PlanViewModal />
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white">Close</Button>
          {receiptDetails && (
            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="outline" onClick={() => { setReceiptDetails(null); }}>Back to List</Button>
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild><Button variant="outline"><Edit className="mr-2 h-4 w-4" />Edit</Button></DialogTrigger>
                <EditOrderReceiptForm receiptDetails={receiptDetails} onReceiptUpdated={handleReceiptUpdated} onClose={() => setIsEditDialogOpen(false)}/>
              </Dialog>
              <Button variant="outline" onClick={handlePrint}><FileDown className="mr-2 h-4 w-4" />Save as PDF</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={hookLoading}><Trash2 className="mr-2 h-4 w-4" />{hookLoading ? 'Deleting...' : 'Delete'}</Button>
            </div>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default SearchOrderReceipt;
