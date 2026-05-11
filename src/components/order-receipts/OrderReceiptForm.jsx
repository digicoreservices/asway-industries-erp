
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, PlusCircle, Trash2, Upload, X, Edit, FileText, Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
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
import usePurchaseOrderReceiptManagement from '@/hooks/usePurchaseOrderReceiptManagement';
import useClientManagement from '@/hooks/useClientManagement';
import useQuotationManagement from '@/hooks/useQuotationManagement';
import useProductManagement from '@/hooks/useProductManagement';
import useProductUnits from '@/hooks/useProductUnits';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import AddClientForm from '@/components/clients/AddClientForm';
import EditClientForm from '@/components/clients/EditClientForm';
import { AddUnitDialog, DeleteUnitDialog } from '@/components/order-receipts/UnitManagementDialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/customSupabaseClient';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { numberToWords } from '@/lib/numberToWords';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

// CRITICAL: Feature flag to show/hide "Add Order Delivery Schedule" section
// Set to true to show the delivery schedule feature, false to hide it
const SHOW_DELIVERY_SCHEDULE = false;

const OrderReceiptForm = ({ onClose }) => {
  const { toast } = useToast();
  const { addReceiptWithItems } = usePurchaseOrderReceiptManagement();
  const { clients, fetchClients } = useClientManagement();
  const { quotations, fetchQuotations } = useQuotationManagement();
  
  // CRITICAL: Use centralized product management hook
  // Products are fetched from centralized "products" table in Supabase
  const {
    saleProducts,
    serviceProducts,
    loading: productsLoading,
    error: productsError,
    useFallback,
    addProduct,
    deleteProduct
  } = useProductManagement();

  // Use product units hook for unit management
  const {
    units,
    loading: unitsLoading,
    error: unitsError,
    fetchUnits
  } = useProductUnits();
  
  const printableRef = useRef(null);
  const autocompleteRef = useRef(null);

  // ===== ALL useState DECLARATIONS FIRST (BEFORE ANY useEffect) =====
  
  // Dialog states
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isDeleteProductOpen, setIsDeleteProductOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [productToDelete, setProductToDelete] = useState('');

  // Unit management dialog states
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [isDeleteUnitOpen, setIsDeleteUnitOpen] = useState(false);

  // Customer search states
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState([]);

  // Duplicate validation states
  const [isDuplicateReceiptNumber, setIsDuplicateReceiptNumber] = useState(false);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  // Back date warning states
  const [isBackDateDialogOpen, setIsBackDateDialogOpen] = useState(false);
  const [backDateField, setBackDateField] = useState(null);
  const [pendingBackDate, setPendingBackDate] = useState(null);
  const [previousDate, setPreviousDate] = useState(null);

  // Searchable dropdown states
  const [isDepartmentOpen, setIsDepartmentOpen] = useState(false);
  const [isUserOpen, setIsUserOpen] = useState(false);
  const [isQuotationOpen, setIsQuotationOpen] = useState(false);
  const [isProductNameOpen, setIsProductNameOpen] = useState(false);
  const [isUnitOpen, setIsUnitOpen] = useState(false);

  // Search states for custom dropdowns
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [quotationSearch, setQuotationSearch] = useState('');
  const [productNameSearch, setProductNameSearch] = useState('');
  const [unitSearch, setUnitSearch] = useState('');

  // Initial states for product and schedule
  const initialProductState = {
    type: 'Sale',
    product_name: '',
    description: '',
    unit: '',
    quantity: '', 
    price_for_one: '',
    files: [], 
    delivery_schedules: [],
  };

  const initialScheduleState = {
    quantity: '',
    delivery_date: null,
  };

  // Main receipt data state
  const [receiptData, setReceiptData] = useState({
    order_receipt_id: '',
    purchase_order_date: null,
    customer_id: '',
    department: '',
    user: '',
    quotation_id: '',
    quotation_date: null,
  });

  // Product and items states
  const [currentProduct, setCurrentProduct] = useState(initialProductState);
  const [currentSchedule, setCurrentSchedule] = useState(initialScheduleState);
  const [addedItems, setAddedItems] = useState([]);
  
  // Tax & Other Charges State
  const [taxDetails, setTaxDetails] = useState({
    cgst: false, cgst_rate: 9,
    sgst: false, sgst_rate: 9,
    igst: false, igst_rate: 18,
  });
  
  // Other Charges management - stores array of charges
  const [otherCharges, setOtherCharges] = useState([]);
  const [currentCharge, setCurrentCharge] = useState({ description: '', amount: '' });

  // Upload state
  const [isUploading, setIsUploading] = useState(false);

  // ===== NOW ALL useEffect HOOKS (AFTER useState DECLARATIONS) =====

  // Handle click outside autocomplete
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setShowCustomerSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter customers based on search
  useEffect(() => {
    if (customerSearch) {
      const filtered = clients.filter(c => 
        c.customer_name.toLowerCase().includes(customerSearch.toLowerCase())
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers([]);
    }
  }, [customerSearch, clients]);

  // Debounced duplicate check for PO Receipt Number
  useEffect(() => {
    const checkDuplicate = async () => {
      if (!receiptData.order_receipt_id || receiptData.order_receipt_id.trim() === '') {
        setIsDuplicateReceiptNumber(false);
        return;
      }

      setIsCheckingDuplicate(true);
      try {
        const { data, error } = await supabase
          .from('purchase_order_receipts')
          .select('order_receipt_id')
          .eq('order_receipt_id', receiptData.order_receipt_id.trim())
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          setIsDuplicateReceiptNumber(true);
          toast({
            title: 'Duplicate PO Receipt Number',
            description: 'This PO Receipt Number already exists. Please enter a different number.',
            variant: 'destructive'
          });
        } else {
          setIsDuplicateReceiptNumber(false);
        }
      } catch (err) {
        console.error('Error checking duplicate:', err);
      } finally {
        setIsCheckingDuplicate(false);
      }
    };

    const timer = setTimeout(checkDuplicate, 500);
    return () => clearTimeout(timer);
  }, [receiptData.order_receipt_id, toast]);

  // Fetch quotations on mount
  useEffect(() => {
    console.log('[Data] Fetching quotations...');
    fetchQuotations();
  }, [fetchQuotations]);

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

  useEffect(() => {
    if (!isProductNameOpen) setProductNameSearch('');
  }, [isProductNameOpen]);

  useEffect(() => {
    if (!isUnitOpen) setUnitSearch('');
  }, [isUnitOpen]);

  // ===== COMPUTED VALUES (useMemo) =====

  const customerQuotations = useMemo(() => {
    if (!receiptData.customer_id) {
      console.log('[Data] No customer selected, customerQuotations = []');
      return [];
    }
    const filtered = quotations.filter(q => q.customer_id === receiptData.customer_id);
    console.log('[Data] customerQuotations computed:', {
      customerId: receiptData.customer_id,
      totalQuotations: quotations.length,
      filteredCount: filtered.length,
      quotations: filtered
    });
    return filtered;
  }, [receiptData.customer_id, quotations]);

  const customerDepartments = useMemo(() => {
    console.log('[Data] Computing customerDepartments...');
    if (!receiptData.customer_id) {
      console.log('[Data] No customer selected, customerDepartments = []');
      return [];
    }
    const customer = clients.find(c => c.id === receiptData.customer_id);
    if (!customer) {
      console.log('[Data] Customer not found in clients array');
      return [];
    }
    
    const depts = new Set();
    
    // Check legacy department fields first
    for (let i = 1; i <= 5; i++) {
      if (customer[`department_name_${i}`]) {
        depts.add(customer[`department_name_${i}`]);
        console.log(`[Data] Added legacy department_name_${i}:`, customer[`department_name_${i}`]);
      }
    }
    
    // Also check departments JSONB array if it exists
    if (customer.departments && Array.isArray(customer.departments)) {
      customer.departments.forEach(dept => {
        if (dept && dept.department_name) {
          depts.add(dept.department_name);
          console.log('[Data] Added JSONB department:', dept.department_name);
        }
      });
    }
    
    const result = [...depts];
    console.log('[Data] customerDepartments final result:', {
      customerId: receiptData.customer_id,
      customerName: customer.customer_name,
      departmentCount: result.length,
      departments: result
    });
    return result;
  }, [receiptData.customer_id, clients]);

  const customerUsers = useMemo(() => {
    console.log('[Data] Computing customerUsers...');
    if (!receiptData.customer_id) {
      console.log('[Data] No customer selected, customerUsers = []');
      return [];
    }
    const customer = clients.find(c => c.id === receiptData.customer_id);
    if (!customer) {
      console.log('[Data] Customer not found in clients array');
      return [];
    }
    
    // If department is selected, filter users for that department
    if (receiptData.department) {
      console.log('[Data] Filtering users for department:', receiptData.department);
      const users = [];
      
      // Check legacy user fields with department matching
      for (let i = 1; i <= 5; i++) {
        if (customer[`department_name_${i}`] === receiptData.department && customer[`user${i}`]) {
          users.push(customer[`user${i}`]);
          console.log(`[Data] Added legacy user${i}:`, customer[`user${i}`]);
        }
      }
      
      // Also check departments JSONB array
      if (customer.departments && Array.isArray(customer.departments)) {
        customer.departments.forEach(dept => {
          if (dept.department_name === receiptData.department && dept.user_name) {
            users.push(dept.user_name);
            console.log('[Data] Added JSONB user:', dept.user_name);
          }
        });
      }
      
      const result = [...new Set(users)]; // Remove duplicates
      console.log('[Data] customerUsers (filtered by department) result:', {
        department: receiptData.department,
        userCount: result.length,
        users: result
      });
      return result;
    }
    
    // If no department selected, return all users
    console.log('[Data] No department selected, returning all users');
    const allUsers = [];
    
    // Legacy user fields
    for (let i = 1; i <= 5; i++) {
      if (customer[`user${i}`]) {
        allUsers.push(customer[`user${i}`]);
        console.log(`[Data] Added legacy user${i}:`, customer[`user${i}`]);
      }
    }
    
    // JSONB departments array
    if (customer.departments && Array.isArray(customer.departments)) {
      customer.departments.forEach(dept => {
        if (dept.user_name) {
          allUsers.push(dept.user_name);
          console.log('[Data] Added JSONB user:', dept.user_name);
        }
      });
    }
    
    const result = [...new Set(allUsers)]; // Remove duplicates
    console.log('[Data] customerUsers (all users) result:', {
      userCount: result.length,
      users: result
    });
    return result;
  }, [receiptData.customer_id, receiptData.department, clients]);

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

  const filteredQuotations = useMemo(() => {
    if (!quotationSearch) return customerQuotations;
    return customerQuotations.filter(q => 
      q.quotation_id.toLowerCase().includes(quotationSearch.toLowerCase())
    );
  }, [customerQuotations, quotationSearch]);

  // Product names based on type (using centralized products table via hook)
  const productNames = useMemo(() => {
    return currentProduct.type === 'Sale' ? saleProducts : serviceProducts;
  }, [currentProduct.type, saleProducts, serviceProducts]);

  // Filtered product names based on search
  const filteredProductNames = useMemo(() => {
    if (!productNameSearch) return productNames;
    return productNames.filter(name => 
      name.toLowerCase().includes(productNameSearch.toLowerCase())
    );
  }, [productNames, productNameSearch]);

  // Filtered units based on search
  const filteredUnits = useMemo(() => {
    if (!unitSearch) return units;
    return units.filter(unit => 
      unit.toLowerCase().includes(unitSearch.toLowerCase())
    );
  }, [units, unitSearch]);

  // Calculations - UPDATED to calculate tax on (Products + Other Charges)
  const currentProductTotal = (parseFloat(currentProduct.quantity) || 0) * (parseFloat(currentProduct.price_for_one) || 0);
  const currentScheduleTotal = (parseFloat(currentSchedule.quantity) || 0) * (parseFloat(currentProduct.price_for_one) || 0);

  // Total Required Products Amount
  const totalProductsAmount = addedItems.reduce((sum, item) => sum + (parseFloat(item.quantity) * parseFloat(item.price_for_one)), 0);
  
  // Total Other Charges
  const otherChargesAmount = otherCharges.reduce((sum, charge) => sum + (parseFloat(charge.amount) || 0), 0);
  
  // UPDATED: Taxable Amount = Products + Other Charges
  const taxableAmount = totalProductsAmount + otherChargesAmount;
  
  // Tax calculations on the new taxable amount
  const cgstAmount = taxDetails.cgst ? (taxableAmount * (taxDetails.cgst_rate / 100)) : 0;
  const sgstAmount = taxDetails.sgst ? (taxableAmount * (taxDetails.sgst_rate / 100)) : 0;
  const igstAmount = taxDetails.igst ? (taxableAmount * (taxDetails.igst_rate / 100)) : 0;
  const totalTaxAmount = cgstAmount + sgstAmount + igstAmount;
  
  // UPDATED: Grand Total = Taxable Amount + Tax Amount
  const grandTotal = taxableAmount + totalTaxAmount;

  // ===== EVENT HANDLERS =====

  const handleSelectCustomer = (customer) => {
    setCustomerSearch(customer.customer_name);
    setShowCustomerSuggestions(false);
    setReceiptData(prev => ({ 
      ...prev, 
      customer_id: customer.id,
      quotation_id: '', 
      quotation_date: null, 
      user: '', 
      department: '' 
    }));
  };

  const handleAddNewProduct = async () => {
    if (!newProductName.trim()) {
      toast({ title: 'Validation Error', description: 'Product name cannot be empty.', variant: 'destructive' });
      return;
    }
    
    const result = await addProduct(newProductName.trim(), currentProduct.type);
    
    if (result) {
      setCurrentProduct(prev => ({ ...prev, product_name: newProductName.trim() }));
      setNewProductName('');
      setIsAddProductOpen(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) {
      toast({ title: 'Selection Error', description: 'Please select a product to delete.', variant: 'destructive' });
      return;
    }

    const success = await deleteProduct(productToDelete, currentProduct.type);

    if (success) {
      if (currentProduct.product_name === productToDelete) {
        setCurrentProduct(prev => ({ ...prev, product_name: '' }));
      }
      setProductToDelete('');
      setIsDeleteProductOpen(false);
    }
  };

  // Auto-populate unit when product is selected
  const handleProductNameSelect = async (productName) => {
    console.log('[Unit Auto-fill] Product selected:', productName);
    
    setCurrentProduct(prev => ({ ...prev, product_name: productName }));
    setIsProductNameOpen(false);
    setProductNameSearch('');

    // Fetch the unit for this product from the products table
    try {
      const { data, error } = await supabase
        .from('products')
        .select('unit')
        .eq('product_name', productName)
        .eq('product_type', currentProduct.type)
        .single();

      if (error) {
        console.error('[Unit Auto-fill] Error fetching product unit:', error);
        return;
      }

      if (data && data.unit) {
        console.log('[Unit Auto-fill] Auto-filling unit:', data.unit);
        setCurrentProduct(prev => ({ ...prev, unit: data.unit }));
        
        toast({
          title: 'Unit Auto-filled',
          description: `Unit "${data.unit}" has been automatically selected for this product.`
        });
      } else {
        console.log('[Unit Auto-fill] No unit found for product');
      }
    } catch (err) {
      console.error('[Unit Auto-fill] Error:', err);
    }
  };

  const handleAddSchedule = () => {
    const { quantity, delivery_date } = currentSchedule;
    if (!quantity || !delivery_date) {
      toast({ title: 'Schedule Incomplete', description: 'Please provide quantity and delivery date for the schedule.', variant: 'destructive' });
      return;
    }

    const totalScheduledQty = currentProduct.delivery_schedules.reduce((sum, s) => sum + parseFloat(s.quantity), 0);
    const newScheduleQty = parseFloat(quantity);
    const totalOrderQty = parseFloat(currentProduct.quantity) || 0;

    if (totalScheduledQty + newScheduleQty > totalOrderQty) {
      toast({ title: 'Quantity Exceeded', description: `Total scheduled quantity cannot exceed the total order quantity of ${totalOrderQty}.`, variant: 'destructive' });
      return;
    }

    const newSchedule = {
      ...currentSchedule,
      delivery_date: format(delivery_date, 'yyyy-MM-dd'),
      total_price: currentScheduleTotal,
      total_price_with_gst: currentScheduleTotal,
      id: Date.now(),
    };

    setCurrentProduct(prev => ({
      ...prev,
      delivery_schedules: [...prev.delivery_schedules, newSchedule],
    }));
    setCurrentSchedule(initialScheduleState);
  };

  const handleRemoveSchedule = (scheduleId) => {
    setCurrentProduct(prev => ({
      ...prev,
      delivery_schedules: prev.delivery_schedules.filter(s => s.id !== scheduleId),
    }));
  };
  
  const handleAddItem = async () => {
    const { product_name, unit, quantity, price_for_one, files, delivery_schedules } = currentProduct;
    if (!product_name || !unit || !quantity || !price_for_one) {
      toast({ title: 'Product Incomplete', description: 'Please fill all main product fields before adding.', variant: 'destructive' });
      return;
    }
    
    // Only validate delivery schedules if the feature is enabled
    if (SHOW_DELIVERY_SCHEDULE) {
      const totalScheduledQty = delivery_schedules.reduce((sum, s) => sum + parseFloat(s.quantity), 0);
      if (totalScheduledQty !== parseFloat(quantity)) {
        toast({ title: 'Schedule Mismatch', description: 'The sum of scheduled quantities must equal the total order quantity.', variant: 'destructive' });
        return;
      }
    }

    setIsUploading(true);
    const uploadedFiles = [];
    
    for (const fileObj of files) {
      if (fileObj.file) {
        const fileName = `${Date.now()}_${fileObj.name}`;
        const { data, error } = await supabase.storage
          .from('product_images')
          .upload(fileName, fileObj.file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          toast({ title: 'Upload Error', description: `Failed to upload ${fileObj.name}: ${error.message}`, variant: 'destructive' });
          continue;
        }
        const { data: { publicUrl } } = supabase.storage.from('product_images').getPublicUrl(data.path);
        uploadedFiles.push({
          name: fileObj.name,
          type: fileObj.type,
          url: publicUrl
        });
      }
    }
    setIsUploading(false);

    const newItem = {
      ...currentProduct,
      uploaded_files: uploadedFiles,
      total_price: currentProductTotal,
      id: Date.now(),
    };
    setAddedItems(prev => [...prev, newItem]);
    setCurrentProduct(initialProductState);
    setCurrentSchedule(initialScheduleState);
  };

  const handleRemoveItem = (id) => {
    setAddedItems(prev => prev.filter(item => item.id !== id));
  };

  // Handle adding other charge
  const handleAddCharge = () => {
    if (!currentCharge.description.trim() || !currentCharge.amount) {
      toast({ 
        title: 'Incomplete Charge', 
        description: 'Please enter both description and amount for the charge.', 
        variant: 'destructive' 
      });
      return;
    }

    const newCharge = {
      id: Date.now(),
      description: currentCharge.description.trim(),
      amount: parseFloat(currentCharge.amount)
    };

    setOtherCharges(prev => [...prev, newCharge]);
    setCurrentCharge({ description: '', amount: '' });
    
    toast({
      title: 'Charge Added',
      description: 'Other charge has been added successfully.'
    });
  };

  // Handle removing other charge
  const handleRemoveCharge = (chargeId) => {
    setOtherCharges(prev => prev.filter(charge => charge.id !== chargeId));
    toast({
      title: 'Charge Removed',
      description: 'Other charge has been removed successfully.'
    });
  };

  const handleFormSubmit = async () => {
    if (isDuplicateReceiptNumber) {
      toast({ 
        title: 'Duplicate PO Receipt Number', 
        description: 'This PO Receipt Number already exists. Please enter a different number.', 
        variant: 'destructive' 
      });
      return;
    }

    if (!receiptData.order_receipt_id || !receiptData.customer_id || addedItems.length === 0) {
      toast({ title: 'Validation Error', description: 'Receipt Number, Customer Name, and at least one product are required.', variant: 'destructive' });
      return;
    }

    const selectedQuotation = quotations.find(q => q.id === receiptData.quotation_id);

    const receiptPayload = {
      ...receiptData,
      purchase_order_date: receiptData.purchase_order_date ? format(receiptData.purchase_order_date, 'yyyy-MM-dd') : null,
      quotation_number: selectedQuotation ? selectedQuotation.quotation_id : null,
      quotation_date: receiptData.quotation_date ? format(receiptData.quotation_date, 'yyyy-MM-dd') : null,
      grand_total: grandTotal,
      user: receiptData.user === 'all_users' ? null : receiptData.user,
      taxable_amount: taxableAmount,
      cgst_rate: taxDetails.cgst_rate,
      cgst_amount: cgstAmount,
      sgst_rate: taxDetails.sgst_rate,
      sgst_amount: sgstAmount,
      igst_rate: taxDetails.igst_rate,
      igst_amount: igstAmount,
      total_tax_amount: totalTaxAmount,
      other_charges_description: otherCharges.length > 0 ? JSON.stringify(otherCharges) : null,
      other_charges_amount: otherChargesAmount,
    };
    delete receiptPayload.quotation_id;
    
    const itemsPayload = addedItems.map(item => {
      const dbItem = {
        type: item.type,
        product_name: item.product_name,
        description: item.description,
        image_url: JSON.stringify(item.uploaded_files), 
        unit: item.unit,
        quantity: parseFloat(item.quantity),
        price_for_one: parseFloat(item.price_for_one),
        total_price: item.total_price,
        cgst: 0,
        sgst: 0,
        igst: 0,
        total_price_with_gst: item.total_price,
        delivery_schedules: item.delivery_schedules.map(s => ({
          quantity: parseFloat(s.quantity),
          delivery_date: s.delivery_date,
          total_price: s.total_price,
          total_price_with_gst: s.total_price,
        })),
      };
      return dbItem;
    });

    const success = await addReceiptWithItems(receiptPayload, itemsPayload);
    if (success) {
      onClose();
    }
  };

  const handleReceiptInputChange = (e) => {
    const { id, value } = e.target;
    setReceiptData(prev => ({ ...prev, [id]: value }));
  };

  const handleProductInputChange = (e) => {
    const { id, value } = e.target;
    setCurrentProduct(prev => ({ ...prev, [id]: value }));
  };
  
  const handleScheduleInputChange = (e) => {
    const { id, value } = e.target;
    if (id === 'schedule_quantity') {
      setCurrentSchedule(prev => ({ ...prev, quantity: value }));
    } else {
      setCurrentSchedule(prev => ({ ...prev, [id]: value }));
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    const maxSize = 5 * 1024 * 1024; 

    const validFiles = [];

    selectedFiles.forEach(file => {
      if (!allowedTypes.includes(file.type)) {
        toast({ title: 'Invalid File Type', description: `File ${file.name} is not supported. Please upload .jpeg, .png, or .pdf.`, variant: 'destructive' });
        return;
      }
      if (file.size > maxSize) {
        toast({ title: 'File Too Large', description: `File ${file.name} exceeds 5MB.`, variant: 'destructive' });
        return;
      }
      
      validFiles.push({
        file: file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        type: file.type,
        name: file.name
      });
    });
    
    setCurrentProduct(prev => ({
      ...prev,
      files: [...prev.files, ...validFiles]
    }));
  };

  const removeFile = (index) => {
    const newFiles = [...currentProduct.files];
    const removed = newFiles.splice(index, 1)[0];
    if (removed.preview) {
      URL.revokeObjectURL(removed.preview);
    }
    setCurrentProduct(prev => ({ ...prev, files: newFiles }));
  };

  const handleSelectChange = (id, value, target) => {
    if (target === 'receipt') {
      setReceiptData(prev => ({ ...prev, [id]: value }));
      if (id === 'department') {
        setReceiptData(prev => ({ ...prev, user: '' }));
      }
      if (id === 'quotation_id') {
        const selectedQuotation = quotations.find(q => q.id === value);
        if (selectedQuotation) {
          setReceiptData(prev => ({ ...prev, quotation_date: new Date(selectedQuotation.quotation_date) }));
        }
      }
    } else { 
      if (id === 'type') {
        setCurrentProduct(prev => ({ ...prev, [id]: value, product_name: '' }));
      } else {
        setCurrentProduct(prev => ({ ...prev, [id]: value }));
      }
    }
  };

  const handleDateChange = (id, date, target) => {
    if (target === 'receipt') {
      // Check for back date on Purchase Order Date
      if (id === 'purchase_order_date') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(date);
        selectedDate.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
          setPreviousDate(receiptData.purchase_order_date);
          setPendingBackDate(date);
          setBackDateField('purchase_order_date');
          setIsBackDateDialogOpen(true);
          return;
        }
      }
      setReceiptData((prev) => ({ ...prev, [id]: date }));
    } else if (target === 'schedule') {
      // Check for back date on Delivery Date
      if (id === 'delivery_date') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(date);
        selectedDate.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
          setPreviousDate(currentSchedule.delivery_date);
          setPendingBackDate(date);
          setBackDateField('delivery_date');
          setIsBackDateDialogOpen(true);
          return;
        }
      }
      setCurrentSchedule((prev) => ({...prev, [id]: date}));
    }
  };

  const handleBackDateConfirm = () => {
    if (backDateField === 'purchase_order_date') {
      setReceiptData(prev => ({ ...prev, purchase_order_date: pendingBackDate }));
    } else if (backDateField === 'delivery_date') {
      setCurrentSchedule(prev => ({ ...prev, delivery_date: pendingBackDate }));
    }
    setIsBackDateDialogOpen(false);
    setBackDateField(null);
    setPendingBackDate(null);
    setPreviousDate(null);
  };

  const handleBackDateCancel = () => {
    // Revert to previous date (do nothing, the state wasn't updated)
    setIsBackDateDialogOpen(false);
    setBackDateField(null);
    setPendingBackDate(null);
    setPreviousDate(null);
  };

  const handleClientAdded = useCallback(async (newClient) => {
    if (newClient) {
      await fetchClients();
      setCustomerSearch(newClient.customer_name);
      setReceiptData(prev => ({ ...prev, customer_id: newClient.id }));
      setIsAddClientOpen(false);
    }
  }, [fetchClients]);

  const handleClientUpdated = useCallback(async () => {
    await fetchClients();
    setIsEditClientOpen(false);
  }, [fetchClients]);

  const handleSaveAsPDF = () => {
    const input = printableRef.current;
    if (!input) {
      toast({ title: 'Error', description: 'Could not generate PDF.', variant: 'destructive' });
      return;
    }
    html2canvas(input, { scale: 2 }).then((canvas) => {
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
      const y = 10;
      pdf.addImage(imgData, 'PNG', x, y, width, height);
      pdf.save(`Order_Receipt_${receiptData.order_receipt_id || 'Draft'}.pdf`);
      toast({ title: 'Success', description: 'Saved as PDF successfully.' });
    }).catch(err => {
      toast({ title: 'Error', description: 'Failed to generate PDF.', variant: 'destructive' });
    });
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
        <Card className="max-w-6xl mx-auto">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Purchase Order Receipt from Customer</CardTitle>
            <Button variant="ghost" onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white">Back</Button>
          </CardHeader>
          <CardContent className="space-y-6 max-h-[75vh] overflow-y-auto overflow-x-visible p-6" ref={printableRef}>
            
            {/* Products Loading State */}
            {productsLoading && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertTitle className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  Loading Products
                </AlertTitle>
                <AlertDescription>
                  Fetching products from centralized database...
                </AlertDescription>
              </Alert>
            )}

            {/* Products Error State (with fallback indicator) */}
            {productsError && (
              <Alert variant={useFallback ? "default" : "destructive"} className={useFallback ? "bg-yellow-50 border-yellow-200" : ""}>
                <AlertTitle>{useFallback ? "⚠️ Using Fallback Data" : "❌ Database Error"}</AlertTitle>
                <AlertDescription>
                  {useFallback 
                    ? "Could not connect to database. Using cached product list. Database products will sync when connection is restored."
                    : `Error: ${productsError}`
                  }
                </AlertDescription>
              </Alert>
            )}

            {/* Success State - Database Products Loaded */}
            {!productsLoading && !productsError && !useFallback && saleProducts.length > 0 && (
              <Alert className="bg-green-50 border-green-200">
                <AlertTitle className="text-green-800">✅ Database Connected</AlertTitle>
                <AlertDescription className="text-green-700">
                  Successfully loaded {saleProducts.length + serviceProducts.length} products from centralized database.
                </AlertDescription>
              </Alert>
            )}

            {/* Row 1: PO Receipt Number | Purchase Order Date | Customer Name | Quotation Number */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order_receipt_id">PO Receipt Number</Label>
                <Input 
                  id="order_receipt_id" 
                  value={receiptData.order_receipt_id} 
                  onChange={handleReceiptInputChange} 
                  placeholder="Enter Receipt Number" 
                  required 
                  className={cn(
                    "text-gray-900",
                    isDuplicateReceiptNumber && "border-red-500 focus-visible:ring-red-500"
                  )}
                />
                {isCheckingDuplicate && (
                  <p className="text-xs text-gray-500">Checking...</p>
                )}
                {isDuplicateReceiptNumber && (
                  <p className="text-xs text-red-500">This PO Receipt Number already exists. Please enter a different number.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Purchase Order Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !receiptData.purchase_order_date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {receiptData.purchase_order_date ? format(receiptData.purchase_order_date, "dd-MM-yyyy") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50" side="bottom" align="start" sideOffset={4}>
                    <Calendar mode="single" selected={receiptData.purchase_order_date} onSelect={(date) => handleDateChange('purchase_order_date', date, 'receipt')} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2 relative" ref={autocompleteRef}>
                <Label htmlFor="customer_search">Customer Name</Label>
                <div className="flex gap-2">
                  <div className="relative flex-grow">
                    <Input 
                      id="customer_search"
                      placeholder="Search customer..." 
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setShowCustomerSuggestions(true);
                        setReceiptData(prev => ({ ...prev, customer_id: '', department: '', user: '' }));
                      }}
                      onFocus={() => setShowCustomerSuggestions(true)}
                      className="text-gray-900"
                    />
                    {showCustomerSuggestions && customerSearch && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map((c) => (
                            <div 
                              key={c.id} 
                              className="px-4 py-2 hover:bg-slate-100 cursor-pointer text-sm"
                              onClick={() => handleSelectCustomer(c)}
                            >
                              {c.customer_name}
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-sm text-gray-500">No customers found</div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline"><PlusCircle className="h-4 w-4" /></Button>
                      </DialogTrigger>
                      <AddClientForm onClientAdded={handleClientAdded} isOpen={isAddClientOpen} />
                    </Dialog>
                    <Dialog open={isEditClientOpen} onOpenChange={setIsEditClientOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" disabled={!receiptData.customer_id}><Edit className="h-4 w-4" /></Button>
                      </DialogTrigger>
                      {receiptData.customer_id && <EditClientForm clientId={receiptData.customer_id} clients={clients} onClientUpdated={handleClientUpdated} />}
                    </Dialog>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Quotation Number</Label>
                <Popover open={isQuotationOpen} onOpenChange={setIsQuotationOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isQuotationOpen}
                      className="w-full justify-between text-gray-900"
                      disabled={!receiptData.customer_id}
                    >
                      {receiptData.quotation_id 
                        ? customerQuotations.find(q => q.id === receiptData.quotation_id)?.quotation_id 
                        : "Select Quotation"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 z-50 bg-white" side="bottom" align="start" sideOffset={4}>
                    <div className="border-b">
                      <input
                        type="text"
                        placeholder="Search quotations..."
                        value={quotationSearch}
                        onChange={(e) => setQuotationSearch(e.target.value)}
                        className="w-full px-3 py-2 border-0 focus:outline-none text-gray-900"
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {filteredQuotations.length > 0 ? (
                        filteredQuotations.map((q) => (
                          <div
                            key={q.id}
                            onClick={() => {
                              console.log('[Quotation] Item clicked:', q.quotation_id);
                              setReceiptData(prev => ({ 
                                ...prev, 
                                quotation_id: q.id,
                                quotation_date: new Date(q.quotation_date)
                              }));
                              setIsQuotationOpen(false);
                              setQuotationSearch('');
                            }}
                            className="px-3 py-2 cursor-pointer hover:bg-blue-100 text-gray-900 flex items-center"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                receiptData.quotation_id === q.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {q.quotation_id}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-gray-500 text-sm">No quotations found</div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Row 2: Department | User Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <Popover open={isDepartmentOpen} onOpenChange={setIsDepartmentOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isDepartmentOpen}
                      className="w-full justify-between text-gray-900"
                      disabled={!receiptData.customer_id || customerDepartments.length === 0}
                    >
                      {receiptData.department || (customerDepartments.length > 0 ? "Select department..." : "No departments found")}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 z-50 bg-white" side="bottom" align="start" sideOffset={4}>
                    <div className="border-b">
                      <input
                        type="text"
                        placeholder="Search departments..."
                        value={departmentSearch}
                        onChange={(e) => setDepartmentSearch(e.target.value)}
                        className="w-full px-3 py-2 border-0 focus:outline-none text-gray-900"
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {filteredDepartments.length > 0 ? (
                        filteredDepartments.map((dept) => (
                          <div
                            key={dept}
                            onClick={() => {
                              console.log('[Department] Item clicked:', dept);
                              setReceiptData(prev => ({ ...prev, department: dept, user: '' }));
                              setIsDepartmentOpen(false);
                              setDepartmentSearch('');
                            }}
                            className="px-3 py-2 cursor-pointer hover:bg-blue-100 text-gray-900 flex items-center"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                receiptData.department === dept ? "opacity-100" : "opacity-0"
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

              <div className="space-y-2">
                <Label>User Name</Label>
                <Popover open={isUserOpen} onOpenChange={setIsUserOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isUserOpen}
                      className="w-full justify-between text-gray-900"
                      disabled={!receiptData.customer_id || customerUsers.length === 0}
                    >
                      {receiptData.user === 'all_users' ? 'All Users' : (receiptData.user || (customerUsers.length > 0 ? "Select user..." : "No users found"))}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 z-50 bg-white" side="bottom" align="start" sideOffset={4}>
                    <div className="border-b">
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="w-full px-3 py-2 border-0 focus:outline-none text-gray-900"
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      <div
                        onClick={() => {
                          console.log('[User] Item clicked: All Users');
                          setReceiptData(prev => ({ ...prev, user: 'all_users' }));
                          setIsUserOpen(false);
                          setUserSearch('');
                        }}
                        className="px-3 py-2 cursor-pointer hover:bg-blue-100 text-gray-900 flex items-center"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            receiptData.user === 'all_users' ? "opacity-100" : "opacity-0"
                          )}
                        />
                        All Users
                      </div>
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map((user) => (
                          <div
                            key={user}
                            onClick={() => {
                              console.log('[User] Item clicked:', user);
                              setReceiptData(prev => ({ ...prev, user: user }));
                              setIsUserOpen(false);
                              setUserSearch('');
                            }}
                            className="px-3 py-2 cursor-pointer hover:bg-blue-100 text-gray-900 flex items-center"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                receiptData.user === user ? "opacity-100" : "opacity-0"
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

              {/* Row 3: Quotation Date (in same grid as Row 2 for layout consistency) */}
              <div className="space-y-2">
                <Label>Quotation Date</Label>
                <Input value={receiptData.quotation_date ? format(new Date(receiptData.quotation_date), 'dd-MM-yyyy') : ''} readOnly placeholder="Select a quotation first" className="bg-gray-100" />
              </div>
            </div>

            {/* Border separator before Add Product section */}
            <div className="border-b pb-6"></div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold">Add Product</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Type</Label><RadioGroup value={currentProduct.type} onValueChange={(value) => handleSelectChange('type', value, 'product')} className="flex items-center gap-4 pt-2"><div className="flex items-center space-x-2"><RadioGroupItem value="Sale" id="typeSale" /><Label htmlFor="typeSale">Sale</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="Service" id="typeService" /><Label htmlFor="typeService">Service</Label></div></RadioGroup></div>
                <div>
                  <Label htmlFor="product_name">Product Name</Label>
                  <div className="flex gap-2">
                    {productsLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Popover open={isProductNameOpen} onOpenChange={setIsProductNameOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={isProductNameOpen}
                            className="w-full justify-between text-gray-900"
                          >
                            {currentProduct.product_name || "Select Product..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0 z-50 bg-white" side="bottom" align="start" sideOffset={4}>
                          <div className="border-b">
                            <input
                              type="text"
                              placeholder="Search Product..."
                              value={productNameSearch}
                              onChange={(e) => setProductNameSearch(e.target.value)}
                              className="w-full px-3 py-2 border-0 focus:outline-none text-gray-900"
                            />
                          </div>
                          <div className="max-h-60 overflow-y-auto">
                            {filteredProductNames.length > 0 ? (
                              filteredProductNames.map((name) => (
                                <div
                                  key={name}
                                  onClick={() => handleProductNameSelect(name)}
                                  className="px-3 py-2 cursor-pointer hover:bg-blue-100 text-gray-900 flex items-center"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      currentProduct.product_name === name ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {name}
                                </div>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-gray-500 text-sm">No products found</div>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                    <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}><DialogTrigger asChild><Button type="button" variant="outline" disabled={productsLoading}><PlusCircle className="h-4 w-4" /></Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Add New {currentProduct.type} Product</DialogTitle></DialogHeader><div className="py-4"><Input placeholder="Enter new product name" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} className="text-gray-900" /></div><DialogFooter><Button variant="outline" onClick={() => setIsAddProductOpen(false)}>Cancel</Button><Button onClick={handleAddNewProduct}>Add Product</Button></DialogFooter></DialogContent></Dialog>
                    <Dialog open={isDeleteProductOpen} onOpenChange={setIsDeleteProductOpen}><DialogTrigger asChild><Button type="button" variant="outline" className="text-destructive hover:text-destructive" disabled={productsLoading}><Trash2 className="h-4 w-4" /></Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Delete {currentProduct.type} Product</DialogTitle></DialogHeader><div className="py-4 space-y-4"><p>Select a product to permanently delete it. This action cannot be undone.</p><Select onValueChange={setProductToDelete}><SelectTrigger><SelectValue placeholder="Select Product to Delete" /></SelectTrigger><SelectContent>{productNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent></Select></div><DialogFooter><Button variant="outline" onClick={() => setIsDeleteProductOpen(false)}>Cancel</Button><Button variant="destructive" onClick={handleDeleteProduct}>Delete</Button></DialogFooter></DialogContent></Dialog>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label htmlFor="description">Description</Label><Textarea id="description" value={currentProduct.description} onChange={handleProductInputChange} placeholder="Enter product description" className="text-gray-900" /></div>
                <div>
                  <Label>Upload Product Images / PDFs</Label>
                  <div className="mt-2">
                    <Label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-gray-500" />
                        <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span></p>
                        <p className="text-xs text-gray-500">PNG, JPG, PDF (MAX. 5MB)</p>
                      </div>
                      <Input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/png, image/jpeg, application/pdf" multiple />
                    </Label>
                    {currentProduct.files.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {currentProduct.files.map((fileObj, index) => (
                          <div key={index} className="relative w-20 h-20 border rounded-md overflow-hidden flex items-center justify-center bg-gray-50">
                            {fileObj.type === 'application/pdf' ? <FileText className="text-red-500 w-10 h-10" /> : <img src={fileObj.preview} alt="preview" className="w-full h-full object-cover" />}
                            <button onClick={() => removeFile(index)} className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"><X size={12} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <div className="flex gap-2">
                    {unitsLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Popover open={isUnitOpen} onOpenChange={setIsUnitOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={isUnitOpen}
                            className="w-full justify-between text-gray-900"
                          >
                            {currentProduct.unit || "Select Unit..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0 z-50 bg-white" side="bottom" align="start" sideOffset={4}>
                          <div className="border-b">
                            <input
                              type="text"
                              placeholder="Search Unit..."
                              value={unitSearch}
                              onChange={(e) => setUnitSearch(e.target.value)}
                              className="w-full px-3 py-2 border-0 focus:outline-none text-gray-900"
                            />
                          </div>
                          <div className="max-h-60 overflow-y-auto">
                            {filteredUnits.length > 0 ? (
                              filteredUnits.map((unit) => (
                                <div
                                  key={unit}
                                  onClick={() => {
                                    setCurrentProduct(prev => ({ ...prev, unit: unit }));
                                    setIsUnitOpen(false);
                                    setUnitSearch('');
                                  }}
                                  className="px-3 py-2 cursor-pointer hover:bg-blue-100 text-gray-900 flex items-center"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      currentProduct.unit === unit ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {unit}
                                </div>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-gray-500 text-sm">No units found</div>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                    <AddUnitDialog isOpen={isAddUnitOpen} onOpenChange={setIsAddUnitOpen} />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsAddUnitOpen(true)}
                      disabled={unitsLoading}
                    >
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                    <DeleteUnitDialog isOpen={isDeleteUnitOpen} onOpenChange={setIsDeleteUnitOpen} />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDeleteUnitOpen(true)}
                      className="text-destructive hover:text-destructive"
                      disabled={unitsLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div><Label htmlFor="quantity">Total Order Quantity</Label><Input id="quantity" type="number" value={currentProduct.quantity} onChange={handleProductInputChange} className="text-gray-900" /></div>
                <div><Label htmlFor="price_for_one">Price for one</Label><Input id="price_for_one" type="number" value={currentProduct.price_for_one} onChange={handleProductInputChange} className="text-gray-900" /></div>
              </div>
              <div><Label htmlFor="total_price">Total Price</Label><Input id="total_price" type="number" value={currentProductTotal.toFixed(2)} readOnly className="bg-gray-100" /></div>
              
              {/* CONDITIONALLY HIDDEN: Add Order Delivery Schedule Section */}
              {SHOW_DELIVERY_SCHEDULE && (
                <div className="space-y-4 border-t pt-6 mt-6">
                  <h3 className="text-lg font-medium">Add Order Delivery Schedule</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2">
                      <Label htmlFor="display_total_quantity">Total Quantity</Label>
                      <Input id="display_total_quantity" type="number" value={currentProduct.quantity} readOnly className="bg-gray-100" placeholder="Total Order Qty" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="schedule_quantity">Quantity</Label>
                      <Input id="schedule_quantity" type="number" value={currentSchedule.quantity} onChange={handleScheduleInputChange} placeholder="Schedule Quantity" className="text-gray-900" />
                    </div>
                    <div className="space-y-2">
                      <Label>Delivery Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !currentSchedule.delivery_date && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {currentSchedule.delivery_date ? format(currentSchedule.delivery_date, "dd-MM-yyyy") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-50" side="bottom" align="start" sideOffset={4}>
                          <Calendar mode="single" selected={currentSchedule.delivery_date} onSelect={(date) => handleDateChange('delivery_date', date, 'schedule')} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Button type="button" onClick={handleAddSchedule} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"><PlusCircle size={16} /> Add Schedule</Button>
                  </div>
                  {currentProduct.delivery_schedules.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-md font-medium">Scheduled Deliveries</h4>
                      <Table>
                        <TableHeader><TableRow><TableHead>Qty</TableHead><TableHead>Delivery Date</TableHead><TableHead>Total Price</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {currentProduct.delivery_schedules.map(s => (
                            <TableRow key={s.id}>
                              <TableCell>{s.quantity}</TableCell>
                              <TableCell>{format(new Date(s.delivery_date), 'dd-MM-yyyy')}</TableCell>
                              <TableCell>₹{s.total_price.toFixed(2)}</TableCell>
                              <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveSchedule(s.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end"><Button type="button" onClick={handleAddItem} disabled={isUploading} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"><PlusCircle size={16} /> {isUploading ? 'Uploading...' : 'Add Product to Order'}</Button></div>
            </div>

            {addedItems.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Added Products</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Images/PDFs</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Total Qty</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Price/One</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {addedItems.map(item => (
                      <React.Fragment key={item.id}>
                        <TableRow>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 w-32">
                              {item.uploaded_files && item.uploaded_files.map((file, idx) => (
                                <div key={idx} className="w-8 h-8 border rounded bg-gray-50 flex items-center justify-center">
                                  {file.type.includes('pdf') ? 
                                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-red-500"><FileText size={16} /></a> : 
                                  <a href={file.url} target="_blank" rel="noopener noreferrer"><img src={file.url} alt="img" className="w-full h-full object-cover" /></a>}
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{item.type}</TableCell>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell className="max-w-[200px] whitespace-normal break-words">{item.description}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell>₹{parseFloat(item.price_for_one).toFixed(2)}</TableCell>
                          <TableCell>₹{item.total_price.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        {/* CONDITIONALLY HIDDEN: Order Delivery Schedule Display in Added Items */}
                        {SHOW_DELIVERY_SCHEDULE && item.delivery_schedules.length > 0 && (
                          <TableRow>
                            <TableCell colSpan={9} className="p-0">
                              <div className="p-4 bg-gray-50">
                                <h4 className="text-md font-semibold mb-2">Order Delivery Schedule</h4>
                                <Table>
                                  <TableHeader><TableRow><TableHead>Qty</TableHead><TableHead>Delivery Date</TableHead><TableHead>Total Price</TableHead></TableRow></TableHeader>
                                  <TableBody>
                                    {item.delivery_schedules.map(schedule => (
                                      <TableRow key={schedule.id}>
                                        <TableCell>{schedule.quantity}</TableCell>
                                        <TableCell>{format(new Date(schedule.delivery_date), 'dd-MM-yyyy')}</TableCell>
                                        <TableCell>₹{schedule.total_price.toFixed(2)}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Other Charges Section */}
            <div className="border-t pt-6 pb-6 space-y-4">
              <h3 className="text-lg font-bold">Other Charges</h3>
              
              {/* Input fields for adding new charge */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="charge_description">Description</Label>
                  <Input 
                    id="charge_description"
                    value={currentCharge.description} 
                    onChange={(e) => setCurrentCharge(p => ({...p, description: e.target.value}))} 
                    placeholder="e.g. Shipping, Packaging, Handling" 
                    className="text-gray-900" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="charge_amount">Price</Label>
                  <Input 
                    id="charge_amount"
                    type="number" 
                    value={currentCharge.amount} 
                    onChange={(e) => setCurrentCharge(p => ({...p, amount: e.target.value}))} 
                    placeholder="0.00" 
                    className="text-gray-900" 
                  />
                </div>
                <Button 
                  type="button" 
                  onClick={handleAddCharge} 
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                >
                  <Plus size={16} /> Add Charge
                </Button>
              </div>

              {/* Charges Table */}
              {otherCharges.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="font-semibold">Description</TableHead>
                        <TableHead className="font-semibold text-right">Price</TableHead>
                        <TableHead className="font-semibold text-center w-20">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {otherCharges.map((charge) => (
                        <TableRow key={charge.id}>
                          <TableCell>{charge.description}</TableCell>
                          <TableCell className="text-right">₹{charge.amount.toFixed(2)}</TableCell>
                          <TableCell className="text-center">
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleRemoveCharge(charge.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Total row */}
                      <TableRow className="bg-blue-50 font-semibold border-t-2">
                        <TableCell className="text-right">Total Of Other Charges</TableCell>
                        <TableCell className="text-right">₹{otherChargesAmount.toFixed(2)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 border rounded-lg bg-gray-50">
                  No other charges added.
                </div>
              )}
            </div>

            {/* Tax Details Section - NOW AFTER OTHER CHARGES */}
            <div className="border-t pt-6 pb-6 space-y-6">
              <h3 className="text-lg font-bold">Tax Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
                  <Label>Taxable Amount (Products + Other Charges)</Label>
                  <Input readOnly value={taxableAmount.toFixed(2)} className="bg-gray-100" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <Checkbox id="global_cgst" checked={taxDetails.cgst} onCheckedChange={(c) => setTaxDetails(p => ({...p, cgst: c, igst: c ? false : p.igst}))} />
                    <Label htmlFor="global_cgst">CGST (%)</Label>
                  </div>
                  <div className="flex gap-2">
                    <Input type="number" value={taxDetails.cgst_rate} onChange={(e) => setTaxDetails(p => ({...p, cgst_rate: e.target.value}))} disabled={!taxDetails.cgst} className="w-20 text-gray-900" />
                    <Input readOnly value={cgstAmount.toFixed(2)} className="bg-gray-100 flex-1" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <Checkbox id="global_sgst" checked={taxDetails.sgst} onCheckedChange={(c) => setTaxDetails(p => ({...p, sgst: c, igst: c ? false : p.igst}))} />
                    <Label htmlFor="global_sgst">SGST (%)</Label>
                  </div>
                  <div className="flex gap-2">
                    <Input type="number" value={taxDetails.sgst_rate} onChange={(e) => setTaxDetails(p => ({...p, sgst_rate: e.target.value}))} disabled={!taxDetails.sgst} className="w-20 text-gray-900" />
                    <Input readOnly value={sgstAmount.toFixed(2)} className="bg-gray-100 flex-1" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <Checkbox id="global_igst" checked={taxDetails.igst} onCheckedChange={(c) => setTaxDetails(p => ({...p, igst: c, cgst: c ? false : p.cgst, sgst: c ? false : p.sgst}))} />
                    <Label htmlFor="global_igst">IGST (%)</Label>
                  </div>
                  <div className="flex gap-2">
                    <Input type="number" value={taxDetails.igst_rate} onChange={(e) => setTaxDetails(p => ({...p, igst_rate: e.target.value}))} disabled={!taxDetails.igst} className="w-20 text-gray-900" />
                    <Input readOnly value={igstAmount.toFixed(2)} className="bg-gray-100 flex-1" />
                  </div>
                </div>
              </div>
            </div>

            {/* UPDATED Summary Section with new order and calculations */}
            <div className="pt-4 border-t bg-slate-50 p-4 rounded-lg">
              <h3 className="text-lg font-bold mb-4">Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Total Required Products Amount:</span> <span>₹{totalProductsAmount.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Other Charges:</span> <span>₹{otherChargesAmount.toFixed(2)}</span></div>
                <div className="flex justify-between font-semibold bg-blue-50 p-2 rounded"><span>Taxable Amount (Products + Other Charges):</span> <span>₹{taxableAmount.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Tax Amount:</span> <span>₹{totalTaxAmount.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
                  <span>Total Purchase Order Cost:</span> 
                  <span>₹{grandTotal.toFixed(2)}</span>
                </div>
                <div className="text-right text-muted-foreground italic">
                  {numberToWords(grandTotal)}
                </div>
              </div>
            </div>

          </CardContent>
          <CardFooter className="flex flex-wrap justify-between gap-2 border-t pt-4">
            <Button type="button" variant="ghost" onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white">Close</Button>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={handleSaveAsPDF} className="bg-blue-600 hover:bg-blue-700 text-white border-0"><FileText className="mr-2 h-4 w-4" /> Save as PDF</Button>
              <Button type="button" onClick={handleFormSubmit} disabled={isDuplicateReceiptNumber} className="bg-blue-600 hover:bg-blue-700 text-white">Save</Button>
            </div>
          </CardFooter>
        </Card>
      </motion.div>

      {/* Back Date Warning Dialog */}
      <AlertDialog open={isBackDateDialogOpen} onOpenChange={setIsBackDateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Back Date Selected</AlertDialogTitle>
            <AlertDialogDescription>
              You have selected a back date. Do you want to continue with this date?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleBackDateCancel}>No</AlertDialogCancel>
            <AlertDialogAction onClick={handleBackDateConfirm}>Yes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default OrderReceiptForm;
