
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, PlusCircle, Trash2, Plus, Search, Loader2, Trash, ArrowLeft, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import useQuotationManagement from '@/hooks/useQuotationManagement';
import useClientManagement from '@/hooks/useClientManagement';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
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
import AddClientForm from '@/components/clients/AddClientForm';
import EditClientForm from '@/components/clients/EditClientForm';
import { supabase } from '@/lib/customSupabaseClient';
import { numberToWords } from '@/lib/numberToWords';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const AddQuotationForm = ({ onClose }) => {
  const navigate = useNavigate();
  const { addQuotationWithItems } = useQuotationManagement();
  const { clients, fetchClients } = useClientManagement();
  const { toast } = useToast();

  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  
  // Autocomplete State
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Departments & Users State
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);

  // Product & Unit Management State
  const [dbProducts, setDbProducts] = useState([]);
  const [units, setUnits] = useState(['Nos', 'Kg', 'Mtr', 'Ltr', 'Set', 'Pcs', 'Job']);
  
  // Dialog States
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isDeleteProductOpen, setIsDeleteProductOpen] = useState(false);
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [isBackdatedWarningOpen, setIsBackdatedWarningOpen] = useState(false);
  const [pendingBackdatedDate, setPendingBackdatedDate] = useState(null);
  
  const [newProductName, setNewProductName] = useState('');
  const [newUnitName, setNewUnitName] = useState('');

  // Quotation Number Validation State
  const [quotationNumberError, setQuotationNumberError] = useState('');
  const [isCheckingQuotationNumber, setIsCheckingQuotationNumber] = useState(false);

  // Searchable Dropdowns State
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [unitSearchTerm, setUnitSearchTerm] = useState('');
  const [showUnitSuggestions, setShowUnitSuggestions] = useState(false);

  const productAutocompleteRef = useRef(null);
  const unitAutocompleteRef = useRef(null);

  const initialProductState = {
    type: 'Sale',
    product_name: '',
    unit: '',
    quantity: '',
    price_for_one: '',
    total_price: 0,
  };

  const [quotationData, setQuotationData] = useState({
    quotation_id: '',
    quotation_date: null,
    customer_id: '',
    customer_name: '',
    department: '',
    user_name: '',
    details: '',
    type: 'Sale',
  });
  
  const [currentProduct, setCurrentProduct] = useState(initialProductState);
  const [addedItems, setAddedItems] = useState([]);
  
  // Quotation Level Tax and Additional Charges
  const [quotationGst, setQuotationGst] = useState({ cgst: false, sgst: false, igst: false });
  const [otherCharges, setOtherCharges] = useState({ description: '', amount: '' });
  
  const [summary, setSummary] = useState({
    totalItemPrice: 0,
    otherChargesAmount: 0,
    taxableBase: 0,
    taxAmount: 0,
    grandTotal: 0
  });

  const defaultServiceProductNames = ["Civil work coupled with aluminium /glass window / door repair/ modification.", "Dismantling & Transport for relocation", "Inspection & Maintenance", "Installation, Commissioning & Erection.", "Laser Cutting", "Loading Unloading Activities", "Machining", "Packaging services", "Planting", "Powder Coating", "Reair & modification.", "Undertake AMC (Annual Maint Contract) - Manpower, with -without implied resourse supply", "Water pneumatic pipe le installation -with control panel automation / loto arragement."];
  const defaultSaleProductNames = ["Barrigation", "Bench", "Blower", "Boom Lifter", "Brackets", "Cage Bin", "Cage Box", "Car lift", "Cupboard", "Duct", "Fencing", "Foldable Pallet", "Foldable Skids", "Forklift", "Grating", "Ladder -Fix", "Ladder -Movable", "Metal Box", "Mechanical Fixtures", "Pallets", "PEB Structure", "Pressjob", "Railing", "Sale BRM - As It Is", "Scaffolding", "Sizzer lift", "Skids", "Storage Rack", "Table", "Tool Lifting Tackle", "Tray", "Trolley", "Trolley Hydraulic Lifting"];

  const fetchDbProducts = async () => {
    try {
      const { data, error } = await supabase.from('product_list').select('*');
      if (error) throw error;
      setDbProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({ title: 'Error', description: 'Failed to load products.', variant: 'destructive' });
    }
  };

  useEffect(() => {
    fetchDbProducts();
  }, []);

  // Real-time Quotation Number Validation
  useEffect(() => {
    const checkDuplicateQuotationNumber = async () => {
      const value = quotationData.quotation_id.trim();
      if (!value) {
        setQuotationNumberError('');
        setIsCheckingQuotationNumber(false);
        return;
      }
      
      setIsCheckingQuotationNumber(true);
      const { data, error } = await supabase
        .from('quotations')
        .select('id')
        .eq('quotation_id', value)
        .limit(1);

      if (data && data.length > 0) {
        setQuotationNumberError('This Quotation Number already exists');
      } else {
        setQuotationNumberError('');
      }
      setIsCheckingQuotationNumber(false);
    };

    const timer = setTimeout(() => {
      checkDuplicateQuotationNumber();
    }, 400);

    return () => clearTimeout(timer);
  }, [quotationData.quotation_id]);

  // Click outside handler for searchable dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (productAutocompleteRef.current && !productAutocompleteRef.current.contains(event.target)) {
        setShowProductSuggestions(false);
      }
      if (unitAutocompleteRef.current && !unitAutocompleteRef.current.contains(event.target)) {
        setShowUnitSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getProductOptions = () => {
    const defaultList = currentProduct.type === 'Sale' ? defaultSaleProductNames : defaultServiceProductNames;
    const dbList = dbProducts
      .filter(p => p.type === currentProduct.type && p.product_name && p.product_name.trim() !== '')
      .map(p => p.product_name);
    
    // Filter out any empty or invalid values and deduplicate
    const allProducts = [...new Set([...defaultList, ...dbList])].filter(name => name && name.trim() !== '');
    return allProducts.sort();
  };

  const productNames = getProductOptions();

  const filteredProductNames = productSearchTerm
    ? productNames.filter(name => name && name.toLowerCase().includes(productSearchTerm.toLowerCase()))
    : productNames;

  // Filter units to ensure no empty values
  const validUnits = units.filter(unit => unit && unit.trim() !== '');
  
  const filteredUnits = unitSearchTerm
    ? validUnits.filter(unit => unit && unit.toLowerCase().includes(unitSearchTerm.toLowerCase()))
    : validUnits;

  useEffect(() => {
    const quantity = parseFloat(currentProduct.quantity) || 0;
    const price_for_one = parseFloat(currentProduct.price_for_one) || 0;
    setCurrentProduct(prev => ({ ...prev, total_price: quantity * price_for_one }));
  }, [currentProduct.quantity, currentProduct.price_for_one]);

  useEffect(() => {
    const totalItemPrice = addedItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
    const otherChargesAmount = parseFloat(otherCharges.amount) || 0;
    
    // Tax is calculated on (Item Total + Other Charges)
    const taxableBase = totalItemPrice + otherChargesAmount;
    
    let taxAmount = 0;
    if (quotationGst.cgst) taxAmount += taxableBase * 0.09;
    if (quotationGst.sgst) taxAmount += taxableBase * 0.09;
    if (quotationGst.igst) taxAmount += taxableBase * 0.18;

    const grandTotal = totalItemPrice + otherChargesAmount + taxAmount;

    setSummary({
      totalItemPrice,
      otherChargesAmount,
      taxableBase,
      taxAmount,
      grandTotal
    });
  }, [addedItems, quotationGst, otherCharges.amount]);

  const handleAddProduct = async () => {
    if (!newProductName.trim()) return;
    try {
      const { error } = await supabase.from('product_list').insert({ product_name: newProductName, type: currentProduct.type });
      if (error) throw error;
      toast({ title: 'Success', description: 'Product added successfully.' });
      await fetchDbProducts();
      setNewProductName('');
      setIsAddProductOpen(false);
    } catch (error) {
      console.error('Error adding product:', error);
      toast({ title: 'Error', description: 'Failed to add product.', variant: 'destructive' });
    }
  };

  const handleDeleteProduct = async () => {
    if (!currentProduct.product_name) return;
    const isDbProduct = dbProducts.some(p => p.product_name === currentProduct.product_name && p.type === currentProduct.type);
    if (!isDbProduct) {
      toast({ title: 'Cannot Delete', description: 'This is a default system product and cannot be deleted.', variant: 'destructive' });
      setIsDeleteProductOpen(false);
      return;
    }
    try {
      const { error } = await supabase.from('product_list').delete().eq('product_name', currentProduct.product_name).eq('type', currentProduct.type);
      if (error) throw error;
      toast({ title: 'Success', description: 'Product deleted successfully.' });
      await fetchDbProducts();
      setCurrentProduct(prev => ({ ...prev, product_name: '' }));
      setProductSearchTerm('');
      setIsDeleteProductOpen(false);
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({ title: 'Error', description: 'Failed to delete product.', variant: 'destructive' });
    }
  };

  const handleAddUnit = () => {
    if (!newUnitName.trim()) return;
    if (units.includes(newUnitName)) {
      toast({ title: 'Info', description: 'Unit already exists.' });
      return;
    }
    setUnits(prev => [...prev, newUnitName]);
    setNewUnitName('');
    setIsAddUnitOpen(false);
    toast({ title: 'Success', description: 'Unit added successfully.' });
  };

  const handleDeleteUnit = () => {
    if (!currentProduct.unit) {
      toast({ title: 'Error', description: 'Please select a unit to delete.', variant: 'destructive' });
      return;
    }
    setUnits(prev => prev.filter(u => u !== currentProduct.unit));
    setCurrentProduct(prev => ({ ...prev, unit: '' }));
    setUnitSearchTerm('');
    toast({ title: 'Success', description: 'Unit removed from the list.' });
  };

  const handleCustomerSearchChange = (e) => {
    const value = e.target.value;
    setCustomerSearchTerm(value);
    setIsSearching(true);
    setShowCustomerSuggestions(true);
    if (quotationData.customer_id) {
        setQuotationData(prev => ({ ...prev, customer_id: '', customer_name: '', department: '', user_name: '' }));
        setAvailableDepartments([]);
        setAvailableUsers([]);
    }
    setTimeout(() => setIsSearching(false), 300);
  };

  const filteredClients = customerSearchTerm
    ? clients.filter(client => 
        client.customer_name?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
        client.customer_id?.toLowerCase().includes(customerSearchTerm.toLowerCase())
      )
    : clients;

  /**
   * FIXED: Extract departments from client (checking both JSONB and individual columns)
   */
  const getDepartmentsArray = (client) => {
    let depts = [];

    // First check JSONB departments field
    if (client.departments && Array.isArray(client.departments) && client.departments.length > 0) {
      client.departments.forEach(d => {
        const dName = d.department_name || d.name || d.department;
        if (dName) {
          depts.push(dName);
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
    
    legacyDepts.forEach((d) => {
      if (d) {
        depts.push(d);
      }
    });

    // Get unique departments
    const uniqueDepts = [...new Set(depts.filter(Boolean))];
    
    return uniqueDepts;
  };

  /**
   * FIXED: Extract ALL user names from client REGARDLESS of departments
   * This is the key fix - users are now independent of departments
   */
  const getAllUsersArray = (client) => {
    let allUsers = [];

    // Extract users from JSONB contact_persons field
    if (client.contact_persons && Array.isArray(client.contact_persons) && client.contact_persons.length > 0) {
      client.contact_persons.forEach(cp => {
        const userName = cp.user_name || cp.user || cp.name;
        if (userName) {
          allUsers.push(userName);
        }
      });
    }

    // Extract users from JSONB departments field
    if (client.departments && Array.isArray(client.departments) && client.departments.length > 0) {
      client.departments.forEach(d => {
        const userName = d.user_name || d.user;
        if (userName) {
          allUsers.push(userName);
        }
      });
    }

    // Extract users from individual user columns (user1, user2, user3, user4, user5, etc.)
    const legacyUsers = [
      client.user1, 
      client.user2, 
      client.user3, 
      client.user4, 
      client.user5,
      client.user6, 
      client.user7, 
      client.user8, 
      client.user9, 
      client.user10
    ];

    legacyUsers.forEach((user) => {
      if (user) {
        allUsers.push(user);
      }
    });

    // Get unique users and filter out empty values
    const uniqueUsers = [...new Set(allUsers.filter(Boolean))];
    
    return uniqueUsers;
  };

  const handleCustomerSelect = (client) => {
    setCustomerSearchTerm(client.customer_name);
    setShowCustomerSuggestions(false);
    
    // FIXED: Extract departments and users INDEPENDENTLY
    const uniqueDepts = getDepartmentsArray(client);
    const uniqueUsers = getAllUsersArray(client);
    
    setAvailableDepartments(uniqueDepts);
    setAvailableUsers(uniqueUsers);
    
    // Set initial department (if any exist)
    const initialDept = uniqueDepts.length > 0 ? uniqueDepts[0] : '';
    
    // Set initial user (if any exist) - INDEPENDENT of department
    const initialUser = uniqueUsers.length > 0 ? uniqueUsers[0] : '';

    setQuotationData(prev => ({
        ...prev,
        customer_id: client.id,
        customer_name: client.customer_name,
        department: initialDept,
        user_name: initialUser
    }));
  };

  const handleDepartmentChange = (deptName) => {
    // Department change no longer affects user list
    // Users remain available regardless of department selection
    setQuotationData(prev => ({ 
        ...prev, 
        department: deptName === 'no-department' ? '' : deptName
    }));
  };

  const handleDateChange = (date) => {
    if (!date) {
      setQuotationData(prev => ({ ...prev, quotation_date: date }));
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      // Show back-dated warning
      setPendingBackdatedDate(date);
      setIsBackdatedWarningOpen(true);
    } else {
      setQuotationData(prev => ({ ...prev, quotation_date: date }));
    }
  };

  const handleBackdatedConfirm = () => {
    setQuotationData(prev => ({ ...prev, quotation_date: pendingBackdatedDate }));
    setIsBackdatedWarningOpen(false);
    setPendingBackdatedDate(null);
  };

  const handleBackdatedCancel = () => {
    const today = new Date();
    setQuotationData(prev => ({ ...prev, quotation_date: today }));
    setIsBackdatedWarningOpen(false);
    setPendingBackdatedDate(null);
  };

  const handleClientUpdated = async () => {
    await fetchClients();
    setIsEditClientOpen(false);
    if (quotationData.customer_id) {
       const updatedClient = clients.find(c => c.id === quotationData.customer_id);
       if (updatedClient) {
           handleCustomerSelect(updatedClient);
       }
    }
  };

  const handleProductSearchChange = (e) => {
    const value = e.target.value;
    setProductSearchTerm(value);
    setShowProductSuggestions(true);
    setCurrentProduct(prev => ({ ...prev, product_name: '' }));
  };

  const handleProductSelect = (productName) => {
    setProductSearchTerm(productName);
    setCurrentProduct(prev => ({ ...prev, product_name: productName }));
    setShowProductSuggestions(false);
  };

  const handleUnitSearchChange = (e) => {
    const value = e.target.value;
    setUnitSearchTerm(value);
    setShowUnitSuggestions(true);
    setCurrentProduct(prev => ({ ...prev, unit: '' }));
  };

  const handleUnitSelect = (unitName) => {
    setUnitSearchTerm(unitName);
    setCurrentProduct(prev => ({ ...prev, unit: unitName }));
    setShowUnitSuggestions(false);
  };

  const handleAddItem = () => {
    const { product_name, unit, quantity, price_for_one } = currentProduct;
    if (!product_name || !unit || !quantity || !price_for_one) {
      toast({ title: 'Product Incomplete', description: 'Please fill all product fields before adding.', variant: 'destructive' });
      return;
    }

    // Validate that product_name is from the list
    if (!productNames.includes(product_name)) {
      toast({ title: 'Invalid Product', description: 'Please select a valid product from the suggestions.', variant: 'destructive' });
      return;
    }

    // Validate that unit is from the list
    if (!validUnits.includes(unit)) {
      toast({ title: 'Invalid Unit', description: 'Please select a valid unit from the suggestions.', variant: 'destructive' });
      return;
    }

    const newItem = { ...currentProduct, id: Date.now() };
    setAddedItems(prev => [...prev, newItem]);
    setCurrentProduct(initialProductState);
    setProductSearchTerm('');
    setUnitSearchTerm('');
  };

  const handleRemoveItem = (id) => {
    setAddedItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { quotation_id, customer_id, quotation_date } = quotationData;
    
    if (quotationNumberError) {
      toast({ title: 'Validation Error', description: 'Please fix the Quotation Number error before saving.', variant: 'destructive' });
      return;
    }

    if (!quotation_id || !customer_id || !quotation_date || addedItems.length === 0) {
      toast({ title: 'Validation Error', description: 'Please fill quotation details and add at least one item.', variant: 'destructive' });
      return;
    }

    let extendedDetails = quotationData.details || '';
    if (otherCharges.amount > 0 || summary.taxAmount > 0) {
      extendedDetails += `\n\n--- Financial Notes ---`;
      if (otherCharges.amount > 0) extendedDetails += `\nOther Charges (${otherCharges.description || 'N/A'}): ₹${parseFloat(otherCharges.amount).toFixed(2)}`;
      if (summary.taxAmount > 0) extendedDetails += `\nTax Applied: ₹${summary.taxAmount.toFixed(2)}`;
    }

    const quotationPayload = {
      quotation_id: quotationData.quotation_id,
      quotation_date: format(quotationData.quotation_date, 'yyyy-MM-dd'),
      customer_id: quotationData.customer_id,
      type: quotationData.type,
      details: extendedDetails.trim(),
      grand_total: summary.grandTotal,
      department: quotationData.department,
      user_name: quotationData.user_name,
    };

    const itemsPayload = addedItems.map(item => {
      const cgstAmt = quotationGst.cgst ? item.total_price * 0.09 : 0;
      const sgstAmt = quotationGst.sgst ? item.total_price * 0.09 : 0;
      const igstAmt = quotationGst.igst ? item.total_price * 0.18 : 0;
      const totalWithGst = item.total_price + cgstAmt + sgstAmt + igstAmt;

      return {
        type: item.type,
        product_name: item.product_name,
        unit: item.unit,
        quantity: parseFloat(item.quantity),
        price_for_one: parseFloat(item.price_for_one),
        total_price: item.total_price,
        cgst: cgstAmt,
        sgst: sgstAmt,
        igst: igstAmt,
        total_price_with_gst: totalWithGst,
      };
    });

    const success = await addQuotationWithItems(quotationPayload, itemsPayload);
    if (success) {
      toast({ title: 'Success', description: 'Quotation saved successfully.' });
      onClose();
    }
  };

  const handleQuotationInputChange = (e) => {
    const { id, value } = e.target;
    setQuotationData(prev => ({ ...prev, [id]: value }));
  };

  const handleProductInputChange = (e) => {
    const { id, value } = e.target;
    setCurrentProduct(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id, value, target) => {
    const stateSetter = target === 'quotation' ? setQuotationData : setCurrentProduct;
    if (id === 'type') {
      stateSetter(prev => ({ ...prev, [id]: value, product_name: '' }));
      setProductSearchTerm('');
    } else {
      stateSetter(prev => ({ ...prev, [id]: value }));
    }
  };

  const handleGstChange = (name, checked) => {
    setQuotationGst(prev => {
      const newState = { ...prev, [name]: checked };
      if (name === 'igst' && checked) {
        newState.cgst = false;
        newState.sgst = false;
      } else if ((name === 'cgst' || name === 'sgst') && checked) {
        newState.igst = false;
      }
      return newState;
    });
  };

  const handleClientAdded = () => {
    fetchClients();
    setIsAddClientOpen(false);
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('QUOTATION', 105, 15, null, null, 'center');
    
    doc.setFontSize(12);
    doc.text(`Quotation No: ${quotationData.quotation_id}`, 14, 30);
    doc.text(`Date: ${quotationData.quotation_date ? format(quotationData.quotation_date, 'dd-MM-yyyy') : ''}`, 140, 30);
    
    doc.text(`Customer: ${quotationData.customer_name}`, 14, 40);
    doc.text(`Department: ${quotationData.department || 'N/A'}`, 14, 48);
    doc.text(`User: ${quotationData.user_name || 'N/A'}`, 140, 48);
    
    const tableColumn = ["Product Name", "Unit", "Qty", "Price", "Total"];
    const tableRows = addedItems.map(item => [
      item.product_name,
      item.unit,
      item.quantity,
      parseFloat(item.price_for_one).toFixed(2),
      item.total_price.toFixed(2)
    ]);
    
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 55,
      theme: 'grid'
    });

    let finalY = doc.lastAutoTable.finalY + 10;

    doc.setFontSize(11);
    doc.text(`Total Item Price: Rs. ${summary.totalItemPrice.toFixed(2)}`, 130, finalY);
    finalY += 8;
    
    if (summary.otherChargesAmount > 0) {
      doc.text(`Other Charges: Rs. ${summary.otherChargesAmount.toFixed(2)}`, 130, finalY);
      finalY += 8;
    }

    let taxStr = [];
    if(quotationGst.cgst) taxStr.push('CGST');
    if(quotationGst.sgst) taxStr.push('SGST');
    if(quotationGst.igst) taxStr.push('IGST');
    doc.text(`Tax (${taxStr.join(', ')}): Rs. ${summary.taxAmount.toFixed(2)}`, 130, finalY);
    finalY += 8;

    doc.setFont("helvetica", "bold");
    doc.text(`Grand Total: Rs. ${summary.grandTotal.toFixed(2)}`, 130, finalY);
    finalY += 12;

    doc.setFont("helvetica", "italic");
    doc.text(`Amount in Words: ${numberToWords(summary.grandTotal)}`, 14, finalY);
    finalY += 15;

    doc.setFont("helvetica", "normal");
    if(quotationData.details) {
      doc.text("Details / Notes:", 14, finalY);
      doc.setFontSize(10);
      doc.text(quotationData.details, 14, finalY + 6, { maxWidth: 180 });
    }

    doc.save(`Quotation_${quotationData.quotation_id || 'Draft'}.pdf`);
  };

  // Filter valid departments (non-empty names)
  const validDepartments = availableDepartments.filter(dept => dept && dept.trim() !== '');
  
  // Filter valid users (non-empty names)
  const validUsers = availableUsers.filter(user => user && user.trim() !== '');

  return (
    <>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
        <Card className="max-w-5xl mx-auto border-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between border-b mb-6 pb-4">
            <CardTitle className="text-2xl font-bold">Add New Quotation</CardTitle>
            <Button 
              type="button" 
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 transition-colors duration-200 shadow-sm"
              onClick={onClose}
            >
              <ArrowLeft size={16} /> Go Back
            </Button>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6 max-h-[75vh] overflow-y-auto p-6">
              <div className="space-y-4 border-b pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quotation_id">Quotation Number</Label>
                    <div className="relative">
                      <Input 
                        id="quotation_id" 
                        value={quotationData.quotation_id} 
                        onChange={handleQuotationInputChange} 
                        required 
                        className={cn(quotationNumberError ? "border-red-500 pr-10" : "pr-10")}
                      />
                      {isCheckingQuotationNumber && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                        </div>
                      )}
                    </div>
                    {quotationNumberError && <p className="text-red-500 text-xs mt-1">{quotationNumberError}</p>}
                  </div>
                  <div>
                    <Label>Quotation Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant={"outline"} 
                          className={cn("w-full justify-start text-left font-normal", !quotationData.quotation_date && "text-muted-foreground")}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {quotationData.quotation_date ? format(quotationData.quotation_date, "dd-MM-yyyy") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar 
                          mode="single" 
                          selected={quotationData.quotation_date} 
                          onSelect={handleDateChange} 
                          initialFocus 
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Customer Autocomplete Section */}
                <div className="space-y-2">
                  <Label htmlFor="customer_search">Customer Name</Label>
                  <div className="flex items-center gap-2 relative z-20">
                    <div className="relative flex-1">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                id="customer_search"
                                placeholder="Search Customer..." 
                                value={customerSearchTerm} 
                                onChange={handleCustomerSearchChange}
                                onFocus={() => setShowCustomerSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 200)}
                                className={`pl-8 ${!quotationData.customer_id && customerSearchTerm ? "border-amber-400 focus-visible:ring-amber-400" : ""}`}
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
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsAddClientOpen(true);
                      }} 
                      title="Add New Client"
                      className="relative z-20 cursor-pointer pointer-events-auto h-10 w-10 hover:bg-gray-100 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (quotationData.customer_id) {
                          setIsEditClientOpen(true);
                        } else {
                          toast({
                            title: "No Customer Selected",
                            description: "Please select a customer first before editing.",
                            variant: "destructive"
                          });
                        }
                      }} 
                      title="Edit Selected Client" 
                      className={cn(
                        "transition-all duration-200 relative z-20 cursor-pointer pointer-events-auto h-10 w-10",
                        quotationData.customer_id 
                          ? "hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200" 
                          : "opacity-50"
                      )}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* FIXED: Department and User Name fields are now INDEPENDENT */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 bg-gray-50 p-4 rounded-md relative z-0">
                    <div>
                        <Label htmlFor="department">Department (Optional)</Label>
                        <Select 
                            value={quotationData.department} 
                            onValueChange={handleDepartmentChange}
                            disabled={!quotationData.customer_id}
                        >
                            <SelectTrigger className="bg-white">
                                <SelectValue placeholder={!quotationData.customer_id ? "Select Customer First" : (validDepartments.length === 0 ? "No Department" : "Select Department")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="no-department">No Department</SelectItem>
                                {validDepartments.map((dept, idx) => (
                                    <SelectItem key={`${dept}-${idx}`} value={dept}>{dept}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="user_name">User Name</Label>
                        <Select 
                            value={quotationData.user_name} 
                            onValueChange={(val) => setQuotationData(prev => ({ ...prev, user_name: val }))}
                            disabled={!quotationData.customer_id}
                        >
                            <SelectTrigger className="bg-white">
                                <SelectValue placeholder={!quotationData.customer_id ? "Select Customer First" : (validUsers.length === 0 ? "No User Found" : "Select User")} />
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
              </div>

              <div className="space-y-4 border-b pb-6">
                <h3 className="text-lg font-medium">Add Product</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <RadioGroup 
                      value={currentProduct.type} 
                      onValueChange={(value) => {
                        handleSelectChange('type', value, 'product');
                        setQuotationData(prev => ({ ...prev, type: value }));
                      }} 
                      className="flex items-center gap-4 pt-2"
                    >
                      <div className="flex items-center space-x-2"><RadioGroupItem value="Sale" id="typeSale" /><Label htmlFor="typeSale">Sale</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="Service" id="typeService" /><Label htmlFor="typeService">Service</Label></div>
                    </RadioGroup>
                  </div>
                  <div>
                    <Label htmlFor="product_name">Product Name</Label>
                    <div className="flex gap-2">
                        <div className="relative flex-1" ref={productAutocompleteRef}>
                            <Input
                                id="product_name"
                                value={productSearchTerm}
                                onChange={handleProductSearchChange}
                                onFocus={() => setShowProductSuggestions(true)}
                                placeholder="Search product..."
                                className="bg-white text-gray-900"
                            />
                            {showProductSuggestions && filteredProductNames.length > 0 && (
                                <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto mt-1">
                                    {filteredProductNames.map((name, idx) => (
                                        <div
                                            key={`${name}-${idx}`}
                                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                handleProductSelect(name);
                                            }}
                                        >
                                            {name}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {showProductSuggestions && filteredProductNames.length === 0 && (
                                <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1">
                                    <div className="px-4 py-2 text-gray-500 text-sm">No products found</div>
                                </div>
                            )}
                        </div>
                        <Button type="button" variant="outline" size="icon" onClick={() => setIsAddProductOpen(true)} title="Add New Product"><Plus className="h-4 w-4" /></Button>
                        <Button type="button" variant="outline" size="icon" onClick={() => {
                                if (!currentProduct.product_name) { toast({ title: 'Error', description: 'Select a product to delete', variant: 'destructive' }); return; }
                                setIsDeleteProductOpen(true);
                            }} title="Delete Selected Product" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                            <Trash className="h-4 w-4" />
                        </Button>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="unit">Unit</Label>
                    <div className="flex gap-2">
                        <div className="relative flex-1" ref={unitAutocompleteRef}>
                            <Input
                                id="unit"
                                value={unitSearchTerm}
                                onChange={handleUnitSearchChange}
                                onFocus={() => setShowUnitSuggestions(true)}
                                placeholder="Search unit..."
                                className="bg-white text-gray-900"
                            />
                            {showUnitSuggestions && filteredUnits.length > 0 && (
                                <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto mt-1">
                                    {filteredUnits.map((unit, idx) => (
                                        <div
                                            key={`${unit}-${idx}`}
                                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                handleUnitSelect(unit);
                                            }}
                                        >
                                            {unit}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {showUnitSuggestions && filteredUnits.length === 0 && (
                                <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1">
                                    <div className="px-4 py-2 text-gray-500 text-sm">No units found</div>
                                </div>
                            )}
                        </div>
                        <Button type="button" variant="outline" size="icon" onClick={() => setIsAddUnitOpen(true)} title="Add New Unit"><Plus className="h-4 w-4" /></Button>
                        <Button type="button" variant="outline" size="icon" onClick={handleDeleteUnit} title="Delete Selected Unit" className="text-red-500 hover:text-red-600 hover:bg-red-50"><Trash className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div><Label htmlFor="quantity">Quantity</Label><Input id="quantity" type="number" className="bg-white text-gray-900" value={currentProduct.quantity} onChange={handleProductInputChange} /></div>
                  <div><Label htmlFor="price_for_one">Price for one</Label><Input id="price_for_one" type="number" className="bg-white text-gray-900" value={currentProduct.price_for_one} onChange={handleProductInputChange} /></div>
                </div>
                
                <div><Label htmlFor="total_price">Total Price</Label><Input id="total_price" type="number" value={currentProduct.total_price.toFixed(2)} readOnly className="bg-gray-100" /></div>
                
                <div className="flex justify-end">
                  <Button type="button" onClick={handleAddItem} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 transition-all duration-200"><PlusCircle size={16} /> Add Product</Button>
                </div>
              </div>

              {addedItems.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Added Products</h3>
                  <div className="overflow-x-auto border rounded-md">
                    <Table>
                      <TableHeader><TableRow className="bg-gray-50"><TableHead>Type</TableHead><TableHead>Product</TableHead><TableHead>Unit</TableHead><TableHead>Qty</TableHead><TableHead>Price/One</TableHead><TableHead>Total</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {addedItems.map(item => (
                          <TableRow key={item.id}>
                            <TableCell>{item.type}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{item.product_name}</TableCell>
                            <TableCell>{item.unit}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>₹{parseFloat(item.price_for_one).toFixed(2)}</TableCell>
                            <TableCell>₹{(item.total_price || 0).toFixed(2)}</TableCell>
                            <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Other Charges Section - MOVED BEFORE TAXES */}
              <div className="space-y-4 border-b pb-6">
                <Label className="text-base font-semibold">Other Charges</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="other_desc" className="text-sm">Description</Label>
                        <Input id="other_desc" value={otherCharges.description} onChange={(e) => setOtherCharges(p => ({...p, description: e.target.value}))} placeholder="e.g. Shipping, Handling..." className="bg-white text-gray-900" />
                    </div>
                    <div>
                        <Label htmlFor="other_amt" className="text-sm">Amount</Label>
                        <Input id="other_amt" type="number" value={otherCharges.amount} onChange={(e) => setOtherCharges(p => ({...p, amount: e.target.value}))} placeholder="0.00" className="bg-white text-gray-900" />
                    </div>
                </div>
              </div>

              {/* Taxation Section - NOW AFTER OTHER CHARGES */}
              <div className="space-y-4 border-b pb-6">
                <Label className="text-base font-semibold">Taxes (Applied on Item Total + Other Charges)</Label>
                <div className="flex flex-col gap-3">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="q-sgst" checked={quotationGst.sgst} onCheckedChange={(c) => handleGstChange('sgst', c)} />
                        <Label htmlFor="q-sgst">SGST (9%)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="q-cgst" checked={quotationGst.cgst} onCheckedChange={(c) => handleGstChange('cgst', c)} />
                        <Label htmlFor="q-cgst">CGST (9%)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="q-igst" checked={quotationGst.igst} onCheckedChange={(c) => handleGstChange('igst', c)} />
                        <Label htmlFor="q-igst">IGST (18%)</Label>
                    </div>
                </div>
              </div>

              {/* Updated Calculation Summary - NEW ORDER */}
              <div className="mt-6 bg-blue-50/50 border border-blue-100 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between items-center text-sm font-medium text-gray-700">
                      <span>Total Item Price</span>
                      <span>₹{summary.totalItemPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-medium text-gray-700">
                      <span>Other Charges</span>
                      <span>₹{summary.otherChargesAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-medium text-gray-700 bg-white/50 p-2 rounded">
                      <span>Taxable Base (Item Total + Other Charges)</span>
                      <span>₹{summary.taxableBase.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-medium text-gray-700">
                      <span>Tax Amount</span>
                      <span>₹{summary.taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-blue-200">
                      <div className="flex justify-between items-center text-lg font-bold text-gray-900">
                          <span>Grand Total</span>
                          <span>₹{summary.grandTotal.toFixed(2)}</span>
                      </div>
                      <div className="mt-1 text-sm text-gray-500 italic">
                          {summary.grandTotal > 0 ? `Rupees ${numberToWords(summary.grandTotal)}` : ''}
                      </div>
                  </div>
              </div>

              <div>
                <Label htmlFor="details">Details / Notes</Label>
                <Textarea id="details" className="bg-white text-gray-900" placeholder="Enter any additional details..." value={quotationData.details} onChange={handleQuotationInputChange} rows={3} />
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-between border-t p-6 bg-gray-50/50">
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>Close</Button>
                <Button type="button" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={generatePDF}>Save as PDF</Button>
              </div>
              <Button 
                type="submit" 
                disabled={!!quotationNumberError || isCheckingQuotationNumber}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Quotation
              </Button>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
      
      <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
        <AddClientForm onClientAdded={handleClientAdded} isOpen={isAddClientOpen} />
      </Dialog>

      {/* Edit Client Dialog Wrapper */}
      <Dialog open={isEditClientOpen} onOpenChange={setIsEditClientOpen}>
         {quotationData.customer_id && (
             <EditClientForm 
                 onClientUpdated={handleClientUpdated} 
                 clientId={quotationData.customer_id} 
                 clients={clients} 
                 isOpen={isEditClientOpen}
                 onClose={() => setIsEditClientOpen(false)}
             />
         )}
      </Dialog>

      {/* Add Product Dialog */}
      <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
                <DialogDescription>Add a new {currentProduct.type} product to the list.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="new-product-name">Product Name</Label>
                    <Input id="new-product-name" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} placeholder="Enter product name..." className="text-gray-900" />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddProductOpen(false)}>Cancel</Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleAddProduct}>Add Product</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Product Confirmation */}
      <AlertDialog open={isDeleteProductOpen} onOpenChange={setIsDeleteProductOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete "{currentProduct.product_name}" from the product list database. This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteProduct} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Unit Dialog */}
      <Dialog open={isAddUnitOpen} onOpenChange={setIsAddUnitOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Add New Unit</DialogTitle>
                <DialogDescription>Add a new unit measurement to the list.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="new-unit-name">Unit Name</Label>
                    <Input id="new-unit-name" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} placeholder="e.g. Dozen, Pair, Gallon" className="text-gray-900" />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddUnitOpen(false)}>Cancel</Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleAddUnit}>Add Unit</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Back-dated Warning Dialog */}
      <AlertDialog open={isBackdatedWarningOpen} onOpenChange={setIsBackdatedWarningOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Back-dated Entry Warning</AlertDialogTitle>
                <AlertDialogDescription>
                  This is a back-dated entry. The selected date ({pendingBackdatedDate ? format(pendingBackdatedDate, 'dd-MM-yyyy') : ''}) is before today's date. Do you want to proceed?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={handleBackdatedCancel}>No</AlertDialogCancel>
                <AlertDialogAction onClick={handleBackdatedConfirm} className="bg-blue-600 hover:bg-blue-700">Yes, Proceed</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AddQuotationForm;
