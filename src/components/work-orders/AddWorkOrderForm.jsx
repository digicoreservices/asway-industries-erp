
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Save, X, Trash2, FileText, Loader2, Plus, CheckCircle2, XCircle, ChevronsUpDown, Check, Upload, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import useWorkOrderManagement from '@/hooks/useWorkOrderManagement';
import useClientManagement from '@/hooks/useClientManagement';
import useItemManagement from '@/hooks/useItemManagement';
import { supabase } from '@/lib/customSupabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
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
import AddPIForm from '@/components/items/AddPIForm';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { numberToWords } from '@/lib/numberToWords';
import useCategories from '@/hooks/useCategories';
import useItemsMaster from '@/hooks/useItemsMaster';
import useUnits from '@/hooks/useUnits';

const ALL_DEPARTMENTS_VALUE = 'all-departments';

const initialFormState = {
  work_order_number: '',
  work_order_date: null,
  estimated_time_days: '',
  start_date: null,
  end_date: null,
  customer_id: '',
  department: '',
  user_name: '',
  purchase_order_receipt_id: '',
  labour_expenses: {
    fitter: { checked: false, manHours: '', cost: '', totalCost: '' },
    welder: { checked: false, manHours: '', cost: '', totalCost: '' },
    helper: { checked: false, manHours: '', cost: '', totalCost: '' },
    hydraulic: { checked: false, manHours: '', cost: '', totalCost: '' },
    laserCutting: { checked: false, manHours: '', cost: '', totalCost: '' },
  },
  total_man_hours: '',
  total_cost_of_man_hours: '',
  total_work_order_cost: '',
  customer_delivery_date: null,
  actual_delivery_date: null,
  format_no: '',
  prepared_by: '',
  quality_check_by: '',
  approved_by: '',
};

const initialItemState = {
  item_id: '',
  item_category: '',
  item_name: '',
  unit: '',
  available_quantity: '',
  quantity: '',
  rate: '',
  amount: '',
};

const initialScheduleState = {
  quantity: '',
  delivery_date: null,
};

const AddWorkOrderForm = ({ onClose }) => {
  const { toast } = useToast();
  const { addWorkOrder } = useWorkOrderManagement();
  const { clients } = useClientManagement();
  const { items, checkItemStock } = useItemManagement();
  
  // Centralized data hooks
  const { categories, loading: categoriesLoading, addCategory, deleteCategory } = useCategories();
  const { items: itemsMaster, loading: itemsLoading, addItem: addItemMaster, deleteItem: deleteItemMaster, refreshItems } = useItemsMaster();
  const { units, loading: unitsLoading, addUnit, deleteUnit } = useUnits();
  
  const [formData, setFormData] = useState(initialFormState);
  const [currentItem, setCurrentItem] = useState(initialItemState);
  const [addedItems, setAddedItems] = useState([]);
  const [customerPOs, setCustomerPOs] = useState([]);
  const [poProducts, setPoProducts] = useState([]);
  const [poGrandTotal, setPoGrandTotal] = useState(0);
  const [loadingPoProducts, setLoadingPoProducts] = useState(false);
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [allCustomerUsers, setAllCustomerUsers] = useState([]);
  const [workOrderNumberStatus, setWorkOrderNumberStatus] = useState('idle');
  const [workOrderNumberMessage, setWorkOrderNumberMessage] = useState('');

  const [previousWorkOrderNumber, setPreviousWorkOrderNumber] = useState(null);
  const [isPreviousWOLoading, setIsPreviousWOLoading] = useState(true);
  const [previousWOError, setPreviousWOError] = useState(null);

  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const customerAutocompleteRef = useRef(null);

  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const categoryAutocompleteRef = useRef(null);

  const [itemNameSearchTerm, setItemNameSearchTerm] = useState('');
  const [showItemNameSuggestions, setShowItemNameSuggestions] = useState(false);
  const itemNameAutocompleteRef = useRef(null);
  
  const [unitSearchTerm, setUnitSearchTerm] = useState('');
  const [showUnitSuggestions, setShowUnitSuggestions] = useState(false);
  const unitAutocompleteRef = useRef(null);

  // PO dropdown states
  const [poSearch, setPoSearch] = useState('');
  const [isPoOpen, setIsPoOpen] = useState(false);

  const [isAddPIModalOpen, setIsAddPIModalOpen] = useState(false);

  const [selectedTaxes, setSelectedTaxes] = useState({
    cgst: false,
    sgst: false,
    igst: false
  });

  const [backDateDialog, setBackDateDialog] = useState({
    isOpen: false,
    dateField: '',
    selectedDate: null,
    message: ''
  });
  
  // Track selected category ID for filtering items
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [availableItems, setAvailableItems] = useState([]);
  
  // Delete Modals State
  const [isDeleteCategoryOpen, setIsDeleteCategoryOpen] = useState(false);
  const [isDeleteItemOpen, setIsDeleteItemOpen] = useState(false);
  const [isDeleteUnitOpen, setIsDeleteUnitOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Add New Item/Category/Unit Modals
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitSymbol, setNewUnitSymbol] = useState("");
  const [addingNewItem, setAddingNewItem] = useState(false);
  const [addingNewUnit, setAddingNewUnit] = useState(false);
  const [addingNewCategory, setAddingNewCategory] = useState(false);

  // Product Order by Customer states
  const [uploadedProductFiles, setUploadedProductFiles] = useState([]);
  const [currentSchedule, setCurrentSchedule] = useState(initialScheduleState);
  const [deliverySchedules, setDeliverySchedules] = useState([]);

  // Other Charges management - stores array of charges
  const [otherCharges, setOtherCharges] = useState([]);
  const [currentCharge, setCurrentCharge] = useState({ description: '', amount: '' });

  // Derive lists from hooks
  const categoryList = useMemo(() => {
    return categories.map(c => c.name).sort();
  }, [categories]);

  const unitList = useMemo(() => {
    return units.map(u => u.name).sort();
  }, [units]);

  // Fetch previous work order number on component mount
  useEffect(() => {
    const fetchPreviousWorkOrder = async () => {
      setIsPreviousWOLoading(true);
      setPreviousWOError(null);
      
      try {
        const { data, error } = await supabase
          .from('work_orders')
          .select('id, work_order_number, created_at')
          .order('created_at', { ascending: false })
          .limit(2);

        if (error) {
          throw error;
        }

        if (data && data.length >= 2) {
          setPreviousWorkOrderNumber(data[1].work_order_number);
        } else {
          setPreviousWorkOrderNumber('None');
        }
      } catch (err) {
        console.error('Error fetching previous work order:', err);
        setPreviousWOError('Failed to load previous work order number');
        setPreviousWorkOrderNumber('Error');
      } finally {
        setIsPreviousWOLoading(false);
      }
    };

    fetchPreviousWorkOrder();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerAutocompleteRef.current && !customerAutocompleteRef.current.contains(event.target)) {
        setShowCustomerSuggestions(false);
      }
      if (categoryAutocompleteRef.current && !categoryAutocompleteRef.current.contains(event.target)) {
        setShowCategorySuggestions(false);
      }
      if (itemNameAutocompleteRef.current && !itemNameAutocompleteRef.current.contains(event.target)) {
        setShowItemNameSuggestions(false);
      }
      if (unitAutocompleteRef.current && !unitAutocompleteRef.current.contains(event.target)) {
        setShowUnitSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const labourCategories = [
    { id: 'fitter', label: 'Fitter' },
    { id: 'welder', label: 'Welder' },
    { id: 'helper', label: 'Helper (Cutting, Grinding)' },
    { id: 'hydraulic', label: 'Hydraulic / Mechanical Press Labour' },
    { id: 'laserCutting', label: 'Laser Cutting' },
  ];

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleWoNumberChange = (e) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, work_order_number: value }));
  };

  // Work Order Number validation with debounce
  useEffect(() => {
    const checkDuplicate = async () => {
      const value = formData.work_order_number.trim();
      
      if (!value) {
        setWorkOrderNumberStatus('idle');
        setWorkOrderNumberMessage('');
        return;
      }
      
      setWorkOrderNumberStatus('checking');
      setWorkOrderNumberMessage('');
      
      try {
        const { data, error } = await supabase
          .from('work_orders')
          .select('id')
          .eq('work_order_number', value)
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          setWorkOrderNumberStatus('duplicate');
          setWorkOrderNumberMessage('This Work Order Number already exists');
        } else {
          setWorkOrderNumberStatus('available');
          setWorkOrderNumberMessage('Work Order Number is available');
        }
      } catch (error) {
        console.error('Error checking work order number:', error);
        setWorkOrderNumberStatus('idle');
        setWorkOrderNumberMessage('');
      }
    };

    const timer = setTimeout(() => {
      checkDuplicate();
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.work_order_number]);

  const handleItemInputChange = (e) => {
    const { id, value } = e.target;
    setCurrentItem((prev) => ({ ...prev, [id]: value }));
  };

  const handleDateSelection = (dateField, selectedDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);

    if (selected < today) {
      setBackDateDialog({
        isOpen: true,
        dateField: dateField,
        selectedDate: selectedDate,
        message: 'You have selected a back date. Do you want to continue?'
      });
    } else {
      if (dateField === 'delivery_date') {
        setCurrentSchedule((prev) => ({ ...prev, delivery_date: selectedDate }));
      } else {
        setFormData((prev) => ({ ...prev, [dateField]: selectedDate }));
      }
    }
  };

  const handleBackDateConfirm = () => {
    if (backDateDialog.dateField === 'delivery_date') {
      setCurrentSchedule((prev) => ({ ...prev, delivery_date: backDateDialog.selectedDate }));
    } else {
      setFormData((prev) => ({ 
        ...prev, 
        [backDateDialog.dateField]: backDateDialog.selectedDate 
      }));
    }
    setBackDateDialog({ isOpen: false, dateField: '', selectedDate: null, message: '' });
  };

  const handleBackDateCancel = () => {
    if (backDateDialog.dateField === 'delivery_date') {
      setCurrentSchedule((prev) => ({ ...prev, delivery_date: null }));
    } else {
      setFormData((prev) => ({ ...prev, [backDateDialog.dateField]: null }));
    }
    setBackDateDialog({ isOpen: false, dateField: '', selectedDate: null, message: '' });
  };

  const handleCustomerSearchChange = (e) => {
    const value = e.target.value;
    setCustomerSearchTerm(value);
    setShowCustomerSuggestions(true);
    if (formData.customer_id) {
      setFormData(prev => ({ ...prev, customer_id: '', department: '', user_name: '', purchase_order_receipt_id: '' }));
      setAvailableDepartments([]);
      setAvailableUsers([]);
      setAllCustomerUsers([]);
      setCustomerPOs([]);
      setPoProducts([]);
      setPoGrandTotal(0);
      setUploadedProductFiles([]);
      setDeliverySchedules([]);
    }
  };

  const filteredCustomers = useMemo(() => {
    if (!customerSearchTerm) return [];
    const lowercasedFilter = customerSearchTerm.toLowerCase();
    return clients.filter(c => c.customer_name.toLowerCase().includes(lowercasedFilter));
  }, [clients, customerSearchTerm]);

  const getDepartmentsArray = (client) => {
    let depts = [];
    let deptUserMap = {};

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

    const legacyDepts = [
      client.department_name_1 || client.department1,
      client.department_name_2 || client.department2,
      client.department_name_3 || client.department3,
      client.department_name_4 || client.department4,
      client.department_name_5 || client.department5
    ];
    const legacyUsers = [
      client.user1, client.user2, client.user3, client.user4, client.user5
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

    const uniqueDepts = [...new Set(depts.filter(Boolean))];
    
    return { uniqueDepts, deptUserMap };
  };

  const getAllUsersFromClient = (client) => {
    let allUsers = [];

    if (client.departments && Array.isArray(client.departments)) {
      client.departments.forEach(d => {
        const uName = d.user_name || d.user;
        if (uName) allUsers.push(uName);
      });
    }

    const legacyUsers = [
      client.user1, client.user2, client.user3, client.user4, client.user5
    ].filter(Boolean);

    allUsers = [...allUsers, ...legacyUsers];

    return [...new Set(allUsers)];
  };

  const handleSelectChange = async (id, value) => {
    if (id === 'department') {
      const selectedClient = clients.find(c => c.id === formData.customer_id);
      let usersForDept = [];
      
      if (selectedClient && value && value !== ALL_DEPARTMENTS_VALUE) {
        const { deptUserMap } = getDepartmentsArray(selectedClient);
        if (deptUserMap[value]) {
          usersForDept = deptUserMap[value];
        }
        const uniqueUsers = [...new Set(usersForDept)];
        setAvailableUsers(uniqueUsers);
      } else if (selectedClient && (value === ALL_DEPARTMENTS_VALUE || !value)) {
        setAvailableUsers(allCustomerUsers);
      } else {
        setAvailableUsers([]);
      }
      
      setFormData((prev) => ({ 
        ...prev, 
        department: value === ALL_DEPARTMENTS_VALUE ? '' : value,
        user_name: ''
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [id]: value }));
    
    if (id === 'customer_id') {
      const selectedClient = clients.find(c => c.id === value);
      if (selectedClient) {
        setCustomerSearchTerm(selectedClient.customer_name);
        
        const { uniqueDepts } = getDepartmentsArray(selectedClient);
        setAvailableDepartments(uniqueDepts);
        
        const allUsers = getAllUsersFromClient(selectedClient);
        setAllCustomerUsers(allUsers);
        setAvailableUsers(allUsers);

        setFormData(prev => ({
          ...prev,
          department: '',
          user_name: '',
          purchase_order_receipt_id: '',
        }));

        setPoProducts([]);
        setPoGrandTotal(0);
        setUploadedProductFiles([]);
        setDeliverySchedules([]);
        
        const { data, error } = await supabase
          .from('purchase_order_receipts')
          .select('id, order_receipt_id')
          .eq('customer_id', value);

        if (error) {
          toast({ title: 'Error fetching POs', description: error.message, variant: 'destructive' });
          setCustomerPOs([]);
        } else {
          setCustomerPOs(data || []);
        }
      }
    }
    
    if (id === 'purchase_order_receipt_id') {
      if (value) {
        setLoadingPoProducts(true);
        
        try {
          const { data: poData, error: poError } = await supabase
            .from('purchase_order_receipts')
            .select('grand_total')
            .eq('id', value)
            .single();

          const { data, error } = await supabase
            .from('purchase_order_receipt_items')
            .select('*')
            .eq('receipt_id', value);

          if (error || poError) {
            toast({ title: 'Error fetching PO details', description: error?.message || poError?.message, variant: 'destructive' });
            setPoProducts([]);
            setPoGrandTotal(0);
          } else {
            setPoProducts(data || []);
            setPoGrandTotal(poData?.grand_total || 0);
          }
        } catch (err) {
          console.error('Error fetching PO products:', err);
          toast({ title: 'Error', description: 'Failed to load PO products', variant: 'destructive' });
          setPoProducts([]);
          setPoGrandTotal(0);
        } finally {
          setLoadingPoProducts(false);
        }
        
        setUploadedProductFiles([]);
        setDeliverySchedules([]);
      } else {
        setPoProducts([]);
        setPoGrandTotal(0);
        setUploadedProductFiles([]);
        setDeliverySchedules([]);
      }
    }
  };

  useEffect(() => {
    if (!isPoOpen) setPoSearch('');
  }, [isPoOpen]);

  useEffect(() => {
    if (!formData.customer_id) return;

    const selectedClient = clients.find(c => c.id === formData.customer_id);
    if (!selectedClient) return;

    if (formData.department && formData.department !== ALL_DEPARTMENTS_VALUE) {
      const { deptUserMap } = getDepartmentsArray(selectedClient);
      const usersForDept = deptUserMap[formData.department] || [];
      const uniqueUsers = [...new Set(usersForDept)];
      setAvailableUsers(uniqueUsers);
    } else {
      setAvailableUsers(allCustomerUsers);
    }
  }, [formData.department, formData.customer_id, clients, allCustomerUsers]);

  const filteredPOs = useMemo(() => {
    if (!poSearch) return customerPOs;
    const lowercasedSearch = poSearch.toLowerCase();
    return customerPOs.filter(po => 
      po.order_receipt_id.toLowerCase().includes(lowercasedSearch)
    );
  }, [customerPOs, poSearch]);

  const handleCategorySearchChange = (e) => {
    const value = e.target.value;
    setCategorySearchTerm(value);
    setShowCategorySuggestions(true);
    setCurrentItem(prev => ({ ...prev, item_category: '', item_name: '', unit: '', rate: '', available_quantity: '' }));
    setSelectedCategoryId(null);
    setItemNameSearchTerm('');
  };

  const handleCategorySelect = (categoryName) => {
    setCategorySearchTerm(categoryName);
    setShowCategorySuggestions(false);
    setCurrentItem(prev => ({ ...prev, item_category: categoryName, item_name: '' }));
    setItemNameSearchTerm('');
    
    const selectedCategory = categories.find(c => c.name === categoryName);
    if (selectedCategory) {
      setSelectedCategoryId(selectedCategory.id);
    }
  };

  const filteredCategories = useMemo(() => {
    if (!categorySearchTerm) return categoryList;
    const lowercasedFilter = categorySearchTerm.toLowerCase();
    return categoryList.filter(c => c.toLowerCase().includes(lowercasedFilter));
  }, [categoryList, categorySearchTerm]);

  const handleItemNameSearchChange = (e) => {
    const value = e.target.value;
    setItemNameSearchTerm(value);
    setShowItemNameSuggestions(true);
    setCurrentItem(prev => ({ ...prev, item_name: '', unit: '', rate: '', available_quantity: '' }));
  };

  const handleItemNameSelect = async (itemName) => {
    setItemNameSearchTerm(itemName);
    setShowItemNameSuggestions(false);
    setCurrentItem(prev => ({ ...prev, item_name: itemName }));
    
    const selectedItem = items.find(i => i.item_name === itemName);
    if(selectedItem) {
      const stock = await checkItemStock(itemName, selectedItem.unit);
      setCurrentItem(prev => ({
        ...prev, 
        item_id: selectedItem.id, 
        unit: selectedItem.unit || '',
        rate: stock?.latestPrice || selectedItem.price || '',
        available_quantity: stock?.totalQuantity || 0
      }));
      setUnitSearchTerm(selectedItem.unit || '');
    }
  };

  const filteredItemNames = useMemo(() => {
    if (!itemNameSearchTerm) return availableItems;
    const lowercasedFilter = itemNameSearchTerm.toLowerCase();
    return availableItems.filter(i => i.toLowerCase().includes(lowercasedFilter));
  }, [availableItems, itemNameSearchTerm]);

  const handleUnitSearchChange = (e) => {
    const value = e.target.value;
    setUnitSearchTerm(value);
    setShowUnitSuggestions(true);
    setCurrentItem(prev => ({ ...prev, unit: '' }));
  };

  const handleUnitSelect = (unit) => {
    setUnitSearchTerm(unit);
    setShowUnitSuggestions(false);
    setCurrentItem(prev => ({ ...prev, unit: unit }));
  };

  const filteredUnits = useMemo(() => {
    if (!unitSearchTerm) return unitList;
    const lowercasedFilter = unitSearchTerm.toLowerCase();
    return unitList.filter(u => u.toLowerCase().includes(lowercasedFilter));
  }, [unitList, unitSearchTerm]);

  useEffect(() => {
    if (selectedCategoryId && itemsMaster.length > 0) {
      const filteredItems = itemsMaster
        .filter(item => item.category_id === selectedCategoryId)
        .map(item => item.name)
        .sort();
      
      setAvailableItems(filteredItems);
      
      if (currentItem.item_name && !filteredItems.includes(currentItem.item_name)) {
        setCurrentItem(prev => ({ ...prev, item_name: '', unit: '', rate: '', available_quantity: '' }));
        setItemNameSearchTerm('');
      }
    } else {
      setAvailableItems([]);
    }
  }, [selectedCategoryId, itemsMaster, currentItem.item_name]);

  const handleLabourCheckboxChange = (id, checked) => {
    setFormData(prev => ({
      ...prev,
      labour_expenses: {
        ...prev.labour_expenses,
        [id]: { ...prev.labour_expenses[id], checked }
      }
    }));
  };

  const handleLabourInputChange = (id, field, value) => {
    setFormData(prev => {
      const newLabourExpenses = { ...prev.labour_expenses };
      newLabourExpenses[id][field] = value;
      
      const manHours = parseFloat(newLabourExpenses[id].manHours) || 0;
      const cost = parseFloat(newLabourExpenses[id].cost) || 0;
      newLabourExpenses[id].totalCost = (manHours * cost).toFixed(2);

      return {
        ...prev,
        labour_expenses: newLabourExpenses
      };
    });
  };

  const handleTaxCheckboxChange = (taxType, checked) => {
    setSelectedTaxes(prev => ({ ...prev, [taxType]: checked }));
  };

  const handleAddNewCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({ title: "Validation Error", description: "Category name is required.", variant: "destructive" });
      return;
    }
    const trimmed = newCategoryName.trim();
    setAddingNewCategory(true);
    
    try {
      if (categoryList.includes(trimmed)) {
        setCategorySearchTerm(trimmed);
        setCurrentItem(prev => ({ ...prev, item_category: trimmed }));
        const existingCategory = categories.find(c => c.name === trimmed);
        if (existingCategory) {
          setSelectedCategoryId(existingCategory.id);
        }
        setIsAddCategoryOpen(false);
        setNewCategoryName("");
        setNewCategoryDescription("");
        setAddingNewCategory(false);
        toast({ title: "Category Selected", description: `${trimmed} already exists and has been selected.` });
        return;
      }

      const { data, error } = await addCategory({
        name: trimmed,
        description: newCategoryDescription.trim() || null
      });

      if (error) throw error;

      setCategorySearchTerm(trimmed);
      setCurrentItem(prev => ({ ...prev, item_category: trimmed }));
      if (data) {
        setSelectedCategoryId(data.id);
      }
      setIsAddCategoryOpen(false);
      setNewCategoryName("");
      setNewCategoryDescription("");
      toast({ title: "Category Added", description: `${trimmed} added successfully.` });

    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: `Failed to add category: ${err.message}`, variant: "destructive" });
    } finally {
      setAddingNewCategory(false);
    }
  };

  const handleAddNewItem = async () => {
    if (!newItemName.trim() || !selectedCategoryId) {
      toast({ title: "Error", description: "Item name and Category are required.", variant: "destructive" });
      return;
    }
    setAddingNewItem(true);
    try {
      const trimmed = newItemName.trim();

      const { data, error } = await addItemMaster({
        name: trimmed,
        category_id: selectedCategoryId,
        description: newItemDescription.trim() || null
      });
      
      if (error) throw error;

      await refreshItems();

      setItemNameSearchTerm(trimmed);
      setCurrentItem(prev => ({ ...prev, item_name: trimmed }));
      setIsAddItemOpen(false);
      setNewItemName("");
      setNewItemDescription("");
      toast({ title: "Item Added", description: "New item added successfully." });

    } catch (err) {
      console.error('Error adding item:', err);
      toast({ title: "Error", description: `Failed to add new item: ${err.message}`, variant: "destructive" });
    } finally {
      setAddingNewItem(false);
    }
  };

  const handleAddNewUnit = async () => {
    if (!newUnitName.trim()) {
      toast({ title: "Error", description: "Unit name is required.", variant: "destructive" });
      return;
    }
    setAddingNewUnit(true);
    try {
      const trimmed = newUnitName.trim();

      if (unitList.includes(trimmed)) {
        setUnitSearchTerm(trimmed);
        setCurrentItem(prev => ({ ...prev, unit: trimmed }));
        setIsAddUnitOpen(false);
        setNewUnitName("");
        setNewUnitSymbol("");
        setAddingNewUnit(false);
        toast({ title: "Unit Selected", description: `${trimmed} already exists and has been selected.` });
        return;
      }

      const { data, error } = await addUnit({
        name: trimmed,
        symbol: newUnitSymbol.trim() || trimmed
      });
      
      if (error) throw error;

      setUnitSearchTerm(trimmed);
      setCurrentItem(prev => ({ ...prev, unit: trimmed }));
      setIsAddUnitOpen(false);
      setNewUnitName("");
      setNewUnitSymbol("");
      toast({ title: "Unit Added", description: "New unit added successfully." });

    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: `Failed to add new unit: ${err.message}`, variant: "destructive" });
    } finally {
      setAddingNewUnit(false);
    }
  };

  const handleDeleteCategoryInit = () => {
    const category = currentItem.item_category;
    if (!category) {
      toast({ 
        title: "No Category Selected", 
        description: "Please select a category to delete.", 
        variant: "destructive" 
      });
      return;
    }
    
    setIsDeleteCategoryOpen(true);
  };

  const handleDeleteCategoryConfirm = async () => {
    if (!selectedCategoryId) return;

    setIsDeleting(true);
    try {
      const { error } = await deleteCategory(selectedCategoryId);

      if (error) throw error;

      setCategorySearchTerm('');
      setCurrentItem(prev => ({ ...prev, item_category: '', item_name: '', unit: '', rate: '', available_quantity: '' }));
      setSelectedCategoryId(null);
      setItemNameSearchTerm('');
      setIsDeleteCategoryOpen(false);
      
      await refreshItems();
      
      toast({ title: "Category Deleted", description: `Category and all its items have been deleted.` });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: `Failed to delete category: ${err.message}`, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteItemInit = () => {
    const itemName = currentItem.item_name;
    if (!itemName) {
      toast({ 
        title: "No Item Selected", 
        description: "Please select an item to delete.", 
        variant: "destructive" 
      });
      return;
    }

    setIsDeleteItemOpen(true);
  };

  const handleDeleteItemConfirm = async () => {
    const itemName = currentItem.item_name;
    if (!itemName || !selectedCategoryId) return;

    const itemToDelete = itemsMaster.find(item => 
      item.name === itemName && item.category_id === selectedCategoryId
    );
    
    if (!itemToDelete) {
      toast({ 
        title: "Error", 
        description: "Item not found in database.", 
        variant: "destructive" 
      });
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await deleteItemMaster(itemToDelete.id);

      if (error) throw error;

      setItemNameSearchTerm('');
      setCurrentItem(prev => ({ ...prev, item_name: '', unit: '', rate: '', available_quantity: '' }));
      setIsDeleteItemOpen(false);
      
      await refreshItems();
      
      toast({ title: "Item Deleted", description: `Item '${itemName}' has been deleted from ${currentItem.item_category}.` });
    } catch (err) {
      console.error('Error deleting item:', err);
      toast({ title: "Error", description: `Failed to delete item: ${err.message}`, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteUnitInit = () => {
    const unit = currentItem.unit;
    if (!unit) {
      toast({ 
        title: "No Unit Selected", 
        description: "Please select a unit to delete.", 
        variant: "destructive" 
      });
      return;
    }

    setIsDeleteUnitOpen(true);
  };

  const handleDeleteUnitConfirm = async () => {
    const unitName = currentItem.unit;
    if (!unitName) return;

    const unitToDelete = units.find(u => u.name === unitName);
    if (!unitToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await deleteUnit(unitToDelete.id);

      if (error) throw error;

      setUnitSearchTerm('');
      setCurrentItem(prev => ({ ...prev, unit: '' }));
      setIsDeleteUnitOpen(false);
      toast({ title: "Unit Deleted", description: `Unit '${unitName}' has been deleted.` });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: `Failed to delete unit: ${err.message}`, variant: "destructive" });
    } finally {
      setIsDeleting(false);
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
    
    setUploadedProductFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    const newFiles = [...uploadedProductFiles];
    const removed = newFiles.splice(index, 1)[0];
    if (removed.preview) {
      URL.revokeObjectURL(removed.preview);
    }
    setUploadedProductFiles(newFiles);
  };

  const handleScheduleInputChange = (e) => {
    const { id, value } = e.target;
    if (id === 'schedule_quantity') {
      setCurrentSchedule(prev => ({ ...prev, quantity: value }));
    }
  };

  const handleAddSchedule = () => {
    const { quantity, delivery_date } = currentSchedule;
    if (!quantity || !delivery_date) {
      toast({ title: 'Schedule Incomplete', description: 'Please provide quantity and delivery date for the schedule.', variant: 'destructive' });
      return;
    }

    const newSchedule = {
      ...currentSchedule,
      delivery_date: format(delivery_date, 'yyyy-MM-dd'),
      id: Date.now(),
    };

    setDeliverySchedules(prev => [...prev, newSchedule]);
    setCurrentSchedule(initialScheduleState);
  };

  const handleRemoveSchedule = (scheduleId) => {
    setDeliverySchedules(prev => prev.filter(s => s.id !== scheduleId));
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

    const amount = parseFloat(currentCharge.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({ 
        title: 'Invalid Amount', 
        description: 'Please enter a valid positive number for the amount.', 
        variant: 'destructive' 
      });
      return;
    }

    const newCharge = {
      id: Date.now(),
      description: currentCharge.description.trim(),
      amount: amount
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

  useEffect(() => {
    const { quantity, rate } = currentItem;
    const newAmount = (parseFloat(quantity) || 0) * (parseFloat(rate) || 0);
    setCurrentItem(prev => ({ ...prev, amount: Math.round(newAmount).toString() }));
  }, [currentItem.quantity, currentItem.rate]);

  const totalItemsAmount = useMemo(() => {
    return addedItems.reduce((acc, item) => acc + parseFloat(item.amount || 0), 0);
  }, [addedItems]);

  const totalLabourHours = useMemo(() => {
    return Object.values(formData.labour_expenses).reduce((acc, exp) => exp.checked ? acc + (parseFloat(exp.manHours) || 0) : acc, 0);
  }, [formData.labour_expenses]);

  const totalLabourCost = useMemo(() => {
    return Object.values(formData.labour_expenses).reduce((acc, exp) => exp.checked ? acc + (parseFloat(exp.totalCost) || 0) : acc, 0);
  }, [formData.labour_expenses]);

  const otherChargesAmount = useMemo(() => {
    return otherCharges.reduce((sum, charge) => sum + (parseFloat(charge.amount) || 0), 0);
  }, [otherCharges]);

  const taxableBase = useMemo(() => {
    return totalItemsAmount + otherChargesAmount;
  }, [totalItemsAmount, otherChargesAmount]);

  const taxAmount = useMemo(() => {
    let totalTax = 0;
    if (selectedTaxes.cgst) totalTax += taxableBase * 0.09;
    if (selectedTaxes.sgst) totalTax += taxableBase * 0.09;
    if (selectedTaxes.igst) totalTax += taxableBase * 0.18;
    return totalTax;
  }, [taxableBase, selectedTaxes]);

  const grandTotal = useMemo(() => {
    return Math.round(totalItemsAmount + totalLabourCost + otherChargesAmount + taxAmount);
  }, [totalItemsAmount, totalLabourCost, otherChargesAmount, taxAmount]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      total_man_hours: totalLabourHours.toFixed(2),
      total_cost_of_man_hours: totalLabourCost.toFixed(2),
      total_work_order_cost: grandTotal.toFixed(2),
    }));
  }, [totalLabourHours, totalLabourCost, grandTotal]);

  const handleAddItem = () => {
    if (!categoryList.includes(categorySearchTerm)) {
      toast({ title: 'Invalid Category', description: 'Please select a valid category from the suggestions.', variant: 'destructive' });
      return;
    }
    
    if (!availableItems.includes(itemNameSearchTerm)) {
      toast({ title: 'Invalid Item Name', description: 'Please select a valid item name from the suggestions.', variant: 'destructive' });
      return;
    }

    if (!unitList.includes(unitSearchTerm)) {
      toast({ title: 'Invalid Unit', description: 'Please select a valid unit from the suggestions.', variant: 'destructive' });
      return;
    }

    if (!currentItem.item_category || !currentItem.item_name || !currentItem.quantity || !currentItem.rate) {
      toast({ title: 'Incomplete Item', description: 'Please fill all item details before adding.', variant: 'destructive' });
      return;
    }
    
    setAddedItems(prev => [...prev, currentItem]);
    setCurrentItem(initialItemState);
    setCategorySearchTerm('');
    setItemNameSearchTerm('');
    setUnitSearchTerm('');
    setSelectedCategoryId(null);
  };

  const handleRemoveItem = (index) => {
    setAddedItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddPIModalClose = () => {
    setIsAddPIModalOpen(false);
  };

  const handleSaveAsPDF = () => {
    const doc = new jsPDF('p', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text("Work Order", pageWidth / 2, 40, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const client = clients.find(c => c.id === formData.customer_id);
    
    doc.text(`Work Order No: ${formData.work_order_number}`, 40, 70);
    doc.text(`Date: ${formData.work_order_date ? format(formData.work_order_date, 'dd-MM-yyyy') : ''}`, pageWidth - 40, 70, { align: 'right' });
    
    doc.text(`Customer Name: ${client?.customer_name || 'N/A'}`, 40, 90);
    doc.text(`Department: ${formData.department || 'N/A'}`, 40, 110);
    doc.text(`User Name: ${formData.user_name || 'N/A'}`, 40, 130);

    const poStr = customerPOs.find(p => p.id === formData.purchase_order_receipt_id)?.order_receipt_id || 'N/A';
    doc.text(`PO No: ${poStr}`, pageWidth - 40, 90, { align: 'right' });
    doc.text(`Start Date: ${formData.start_date ? format(formData.start_date, 'dd-MM-yyyy') : ''}`, pageWidth - 40, 110, { align: 'right' });
    doc.text(`End Date: ${formData.end_date ? format(formData.end_date, 'dd-MM-yyyy') : ''}`, pageWidth - 40, 130, { align: 'right' });
    
    let currentY = 160;

    if (addedItems.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text("Required Items:", 40, currentY);
      currentY += 10;
      
      const itemTableData = addedItems.map((item, i) => [
        i + 1,
        item.item_category,
        item.item_name,
        item.quantity,
        item.rate,
        item.amount
      ]);

      doc.autoTable({
        startY: currentY,
        head: [['S.No', 'Category', 'Item Name', 'Qty', 'Rate', 'Amount']],
        body: itemTableData,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235], textColor: 255 },
        styles: { fontSize: 9 }
      });
      currentY = doc.lastAutoTable.finalY + 20;
    }

    const activeLabours = Object.entries(formData.labour_expenses)
        .filter(([_, data]) => data.checked)
        .map(([id, data]) => [
          labourCategories.find(c => c.id === id)?.label,
          data.manHours,
          data.cost,
          data.totalCost
        ]);

    if (activeLabours.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text("Labour Expenses:", 40, currentY);
      currentY += 10;
      
      doc.autoTable({
        startY: currentY,
        head: [['Labour Type', 'Man Hours', 'Cost/Hr', 'Total Cost']],
        body: activeLabours,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235], textColor: 255 },
        styles: { fontSize: 9 }
      });
      currentY = doc.lastAutoTable.finalY + 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.text("Cost Summary:", 40, currentY);
    currentY += 15;
    
    doc.setFont('helvetica', 'normal');
    const summaryData = [
      ['Total Items Amount', `Rs. ${totalItemsAmount.toFixed(2)}`],
      ['Total Labour Cost', `Rs. ${totalLabourCost.toFixed(2)}`]
    ];

    if (otherChargesAmount > 0) {
      summaryData.push(['Other Charges', `Rs. ${otherChargesAmount.toFixed(2)}`]);
    }

    if (selectedTaxes.cgst) summaryData.push([`CGST (9%)`, `Rs. ${(taxableBase * 0.09).toFixed(2)}`]);
    if (selectedTaxes.sgst) summaryData.push([`SGST (9%)`, `Rs. ${(taxableBase * 0.09).toFixed(2)}`]);
    if (selectedTaxes.igst) summaryData.push([`IGST (18%)`, `Rs. ${(taxableBase * 0.18).toFixed(2)}`]);

    summaryData.push(['Grand Total Work Order Cost', `Rs. ${grandTotal.toFixed(2)}`]);

    doc.autoTable({
      startY: currentY,
      body: summaryData,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' } },
      margin: { left: pageWidth / 2 }
    });

    currentY = doc.lastAutoTable.finalY + 20;
    
    doc.setFont('helvetica', 'italic');
    doc.text(`Amount in Words: ${numberToWords(grandTotal)}`, 40, currentY);

    doc.save(`WorkOrder_${formData.work_order_number || 'draft'}.pdf`);
  };

  const handleSave = async () => {
    if (!formData.work_order_number || !formData.customer_id) {
      toast({
        title: 'Validation Error',
        description: 'Work Order Number and Customer Name are required.',
        variant: 'destructive',
      });
      return;
    }

    if (workOrderNumberStatus === 'duplicate') {
      toast({
        title: 'Validation Error',
        description: 'Please use a unique Work Order Number.',
        variant: 'destructive',
      });
      return;
    }

    const cgstRate = selectedTaxes.cgst ? 9 : 0;
    const sgstRate = selectedTaxes.sgst ? 9 : 0;
    const igstRate = selectedTaxes.igst ? 18 : 0;

    const submissionData = {
        ...formData,
        work_order_date: formData.work_order_date ? format(formData.work_order_date, 'yyyy-MM-dd') : null,
        start_date: formData.start_date ? format(formData.start_date, 'yyyy-MM-dd') : null,
        end_date: formData.end_date ? format(formData.end_date, 'yyyy-MM-dd') : null,
        customer_delivery_date: formData.customer_delivery_date ? format(formData.customer_delivery_date, 'yyyy-MM-dd') : null,
        actual_delivery_date: formData.actual_delivery_date ? format(formData.actual_delivery_date, 'yyyy-MM-dd') : null,
        estimated_time_days: parseInt(formData.estimated_time_days) || null,
        total_amount: parseFloat(totalItemsAmount) || null,
        total_man_hours: parseFloat(formData.total_man_hours) || null,
        total_cost_of_man_hours: parseFloat(formData.total_cost_of_man_hours) || null,
        total_work_order_cost: parseFloat(formData.total_work_order_cost) || null,
        labour_expenses: JSON.stringify(formData.labour_expenses),
        items: JSON.stringify(addedItems),
        po_no: formData.purchase_order_receipt_id,
        cgst_rate: cgstRate,
        sgst_rate: sgstRate,
        igst_rate: igstRate,
        other_charges_description: otherCharges.length > 0 ? JSON.stringify(otherCharges) : null,
        other_charges_amount: parseFloat(otherChargesAmount) || 0,
    };
    
    const newWorkOrder = await addWorkOrder(submissionData);
    if (newWorkOrder) {
      onClose();
    }
  };

  const isLoadingData = categoriesLoading || itemsLoading || unitsLoading;

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
        <Card className="border-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <div className="flex flex-col gap-2 flex-1">
              <CardTitle>Add New Work Order</CardTitle>
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-600">Previous Work Order Number:</span>
                {isPreviousWOLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="text-sm text-gray-500">Loading...</span>
                  </div>
                ) : previousWOError ? (
                  <Badge variant="destructive" className="text-xs">
                    Error
                  </Badge>
                ) : (
                  <Badge 
                    variant={previousWorkOrderNumber === 'None' ? 'secondary' : 'default'} 
                    className={cn(
                      "text-sm font-semibold",
                      previousWorkOrderNumber === 'None' 
                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
                        : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                    )}
                  >
                    {previousWorkOrderNumber}
                  </Badge>
                )}
              </div>
            </div>
            <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white">Go Back</Button>
          </CardHeader>
          <CardContent className="p-6 space-y-6 overflow-visible">
            {isLoadingData && (
              <div className="px-6 py-4 bg-blue-50 border-l-4 border-blue-500">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  <span className="text-sm text-blue-800 font-medium">Loading categories, items, and units from database...</span>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="work_order_number">Work Order Number</Label>
                <div className="relative">
                  <Input 
                    id="work_order_number" 
                    value={formData.work_order_number} 
                    onChange={handleWoNumberChange} 
                    className={cn(
                      "pr-10 text-gray-900",
                      workOrderNumberStatus === 'duplicate' && "border-red-500",
                      workOrderNumberStatus === 'available' && "border-green-500"
                    )}
                  />
                  {workOrderNumberStatus === 'checking' && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                    </div>
                  )}
                  {workOrderNumberStatus === 'available' && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                  )}
                  {workOrderNumberStatus === 'duplicate' && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <XCircle className="h-4 w-4 text-red-500" />
                    </div>
                  )}
                </div>
                {workOrderNumberStatus === 'checking' && (
                  <p className="text-blue-500 text-xs mt-1">Checking availability...</p>
                )}
                {workOrderNumberStatus === 'duplicate' && (
                  <p className="text-red-500 text-xs mt-1">{workOrderNumberMessage}</p>
                )}
                {workOrderNumberStatus === 'available' && (
                  <p className="text-green-500 text-xs mt-1">{workOrderNumberMessage}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Work Order Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-gray-900', !formData.work_order_date && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.work_order_date ? format(formData.work_order_date, 'dd-MM-yyyy') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar 
                      mode="single" 
                      selected={formData.work_order_date} 
                      onSelect={(d) => handleDateSelection('work_order_date', d)} 
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2"><Label htmlFor="estimated_time_days">Est. Time (Days)</Label><Input id="estimated_time_days" type="number" value={formData.estimated_time_days} onChange={handleInputChange} className="text-gray-900" /></div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-gray-900', !formData.start_date && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.start_date ? format(formData.start_date, 'dd-MM-yyyy') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar 
                      mode="single" 
                      selected={formData.start_date} 
                      onSelect={(d) => handleDateSelection('start_date', d)} 
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-gray-900', !formData.end_date && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.end_date ? format(formData.end_date, 'dd-MM-yyyy') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar 
                      mode="single" 
                      selected={formData.end_date} 
                      onSelect={(d) => handleDateSelection('end_date', d)} 
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2 relative" ref={customerAutocompleteRef}>
                  <Label>Customer Name</Label>
                  <Input
                    value={customerSearchTerm}
                    onChange={handleCustomerSearchChange}
                    placeholder="Search customer..."
                    className="text-gray-900"
                  />
                  {showCustomerSuggestions && filteredCustomers.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredCustomers.map(c => (
                        <div 
                          key={c.id} 
                          className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm text-gray-900"
                          onClick={() => {
                            handleSelectChange('customer_id', c.id);
                            setShowCustomerSuggestions(false);
                          }}
                        >
                          {c.customer_name}
                        </div>
                      ))}
                    </div>
                  )}
              </div>

              <div className="space-y-2 relative z-50">
                  <Label htmlFor="department">Department (Optional)</Label>
                  <Select 
                    onValueChange={(value) => handleSelectChange('department', value)} 
                    value={formData.department || ALL_DEPARTMENTS_VALUE} 
                    disabled={!formData.customer_id}
                  >
                      <SelectTrigger className="text-gray-900"><SelectValue placeholder="Select Department (Optional)" /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value={ALL_DEPARTMENTS_VALUE}>All Departments</SelectItem>
                          {availableDepartments.map((dept, i) => (
                              <SelectItem key={i} value={dept}>{dept}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>

              <div className="space-y-2">
                  <Label htmlFor="user_name">User Name</Label>
                  <Select onValueChange={(value) => handleSelectChange('user_name', value)} value={formData.user_name} disabled={!formData.customer_id || availableUsers.length === 0}>
                      <SelectTrigger className="text-gray-900"><SelectValue placeholder={availableUsers.length === 0 ? "Select Customer First" : "Select User Name"} /></SelectTrigger>
                      <SelectContent>
                          {availableUsers.map((user, i) => (
                              <SelectItem key={i} value={user}>{user}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>

              <div className="space-y-2">
                <Label>PO from Customer No</Label>
                <Popover open={isPoOpen} onOpenChange={setIsPoOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isPoOpen}
                      className="w-full justify-between text-gray-900"
                      disabled={!formData.customer_id || customerPOs.length === 0}
                    >
                      {formData.purchase_order_receipt_id
                        ? customerPOs.find(po => po.id === formData.purchase_order_receipt_id)?.order_receipt_id
                        : (customerPOs.length === 0 ? "No PO available" : "Select a PO")}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 z-50 bg-white" side="bottom" align="start" sideOffset={4}>
                    <div className="border-b">
                      <input
                        type="text"
                        placeholder="Search PO..."
                        value={poSearch}
                        onChange={(e) => setPoSearch(e.target.value)}
                        className="w-full px-3 py-2 border-0 focus:outline-none text-gray-900"
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {filteredPOs.length > 0 ? (
                        filteredPOs.map((po) => (
                          <div
                            key={po.id}
                            onClick={() => {
                              handleSelectChange('purchase_order_receipt_id', po.id);
                              setIsPoOpen(false);
                              setPoSearch('');
                            }}
                            className="px-3 py-2 cursor-pointer hover:bg-blue-100 text-gray-900 border-b border-gray-200 last:border-b-0 flex items-center"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.purchase_order_receipt_id === po.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {po.order_receipt_id}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-gray-500 text-sm">
                          {poSearch ? "No PO found" : "No PO available"}
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Product Order by Customer as per PO Section */}
            {formData.purchase_order_receipt_id && (
              <div className="border-t pt-6 space-y-6">
                <h3 className="text-lg font-bold">Product Order by Customer as per PO</h3>
                
                {loadingPoProducts ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-3 text-gray-600">Loading products...</span>
                  </div>
                ) : poProducts.length > 0 ? (
                  <>
                    {/* Products Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Product Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Product Images/PDFs</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead className="text-right">Total Order Quantity</TableHead>
                            <TableHead className="text-right">Price for One</TableHead>
                            <TableHead className="text-right">Total Price</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {poProducts.map((product, index) => {
                            let uploadedFiles = [];
                            try {
                              if(product.image_url) {
                                if (product.image_url.startsWith('[')) {
                                  uploadedFiles = JSON.parse(product.image_url);
                                } else {
                                  uploadedFiles = [{ url: product.image_url, type: 'image/jpeg', name: 'Existing Image' }];
                                }
                              }
                            } catch(e) {
                              if(product.image_url) uploadedFiles = [{ url: product.image_url, type: 'image/jpeg', name: 'Existing Image' }];
                            }
                            
                            return (
                              <TableRow key={index}>
                                <TableCell>{product.type}</TableCell>
                                <TableCell>{product.product_name}</TableCell>
                                <TableCell className="max-w-[200px] whitespace-normal break-words">{product.description || 'N/A'}</TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1 w-32">
                                    {uploadedFiles.map((file, idx) => (
                                      <div key={idx} className="w-8 h-8 border rounded bg-gray-50 flex items-center justify-center">
                                        {(file.type?.includes('pdf') || file.url?.endsWith('.pdf')) ? 
                                          <a href={file.url} target="_blank" rel="noreferrer" className="text-red-500"><FileText size={16} /></a> : 
                                          <a href={file.url} target="_blank" rel="noreferrer"><img src={file.url} alt="img" className="w-full h-full object-cover" /></a>
                                        }
                                      </div>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell>{product.unit}</TableCell>
                                <TableCell className="text-right">{product.quantity}</TableCell>
                                <TableCell className="text-right">₹{Math.round(product.price_for_one)}</TableCell>
                                <TableCell className="text-right">₹{Math.round(product.total_price)}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                        <TableFooter>
                          <TableRow>
                            <TableCell colSpan={7} className="text-right font-bold">Grand Total</TableCell>
                            <TableCell className="text-right font-bold">₹{Math.round(poGrandTotal)}</TableCell>
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>

                    {/* Upload More Product Images/PDFs */}
                    <div className="space-y-2">
                      <Label>Upload More Product Images / PDFs</Label>
                      <div className="mt-2">
                        <Label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-100">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-2 text-gray-500" />
                            <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span></p>
                            <p className="text-xs text-gray-500">PNG, JPG, PDF (MAX. 5MB)</p>
                          </div>
                          <Input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/png, image/jpeg, application/pdf" multiple />
                        </Label>
                        {uploadedProductFiles.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {uploadedProductFiles.map((fileObj, index) => (
                              <div key={index} className="relative w-20 h-20 border rounded-md overflow-hidden flex items-center justify-center bg-gray-50">
                                {fileObj.type === 'application/pdf' ? <FileText className="text-red-500 w-10 h-10" /> : <img src={fileObj.preview} alt="preview" className="w-full h-full object-cover" />}
                                <button onClick={() => removeFile(index)} className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"><X size={12} /></button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Add Order Delivery Schedule */}
                    <div className="space-y-4 border-t pt-6">
                      <h4 className="text-md font-semibold">Add Order Delivery Schedule</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="space-y-2">
                          <Label htmlFor="schedule_quantity">Quantity</Label>
                          <Input 
                            id="schedule_quantity" 
                            type="number" 
                            value={currentSchedule.quantity} 
                            onChange={handleScheduleInputChange} 
                            placeholder="Schedule Quantity" 
                            className="text-gray-900" 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Delivery Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal text-gray-900", !currentSchedule.delivery_date && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {currentSchedule.delivery_date ? format(currentSchedule.delivery_date, "dd-MM-yyyy") : <span>Pick a date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 z-50" side="bottom" align="start" sideOffset={4}>
                              <Calendar 
                                mode="single" 
                                selected={currentSchedule.delivery_date} 
                                onSelect={(date) => handleDateSelection('delivery_date', date)} 
                                initialFocus 
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <Button type="button" onClick={handleAddSchedule} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                          <PlusCircle size={16} /> Add Schedule
                        </Button>
                      </div>
                      
                      {deliverySchedules.length > 0 && (
                        <div className="space-y-2 mt-4">
                          <h5 className="text-sm font-medium">Scheduled Deliveries</h5>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Qty</TableHead>
                                <TableHead>Delivery Date</TableHead>
                                <TableHead>Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {deliverySchedules.map(s => (
                                <TableRow key={s.id}>
                                  <TableCell>{s.quantity}</TableCell>
                                  <TableCell>{format(new Date(s.delivery_date), 'dd-MM-yyyy')}</TableCell>
                                  <TableCell>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveSchedule(s.id)}>
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>

                    {/* Summary Table */}
                    <div className="space-y-2 border-t pt-6">
                      <h4 className="text-md font-semibold">Summary</h4>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>PO from Customer No</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Product Name</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Product Images/PDFs</TableHead>
                              <TableHead>Unit</TableHead>
                              <TableHead className="text-right">Total Order Quantity</TableHead>
                              <TableHead className="text-right">Price for One</TableHead>
                              <TableHead className="text-right">Total Price</TableHead>
                              <TableHead>Newly Added Images/PDFs</TableHead>
                              <TableHead>Order Delivery Schedule</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {poProducts.map((product, index) => {
                              let uploadedFiles = [];
                              try {
                                if(product.image_url) {
                                  if (product.image_url.startsWith('[')) {
                                    uploadedFiles = JSON.parse(product.image_url);
                                  } else {
                                    uploadedFiles = [{ url: product.image_url, type: 'image/jpeg', name: 'Existing Image' }];
                                  }
                                }
                              } catch(e) {
                                if(product.image_url) uploadedFiles = [{ url: product.image_url, type: 'image/jpeg', name: 'Existing Image' }];
                              }
                              
                              return (
                                <TableRow key={index}>
                                  <TableCell>{customerPOs.find(p => p.id === formData.purchase_order_receipt_id)?.order_receipt_id || 'N/A'}</TableCell>
                                  <TableCell>{product.type}</TableCell>
                                  <TableCell>{product.product_name}</TableCell>
                                  <TableCell className="max-w-[200px] whitespace-normal break-words">{product.description || 'N/A'}</TableCell>
                                  <TableCell>
                                    <div className="flex flex-wrap gap-1 w-24">
                                      {uploadedFiles.map((file, idx) => (
                                        <div key={idx} className="w-6 h-6 border rounded bg-gray-50 flex items-center justify-center">
                                          {(file.type?.includes('pdf') || file.url?.endsWith('.pdf')) ? 
                                            <FileText size={12} className="text-red-500" /> : 
                                            <img src={file.url} alt="img" className="w-full h-full object-cover" />
                                          }
                                        </div>
                                      ))}
                                    </div>
                                  </TableCell>
                                  <TableCell>{product.unit}</TableCell>
                                  <TableCell className="text-right">{product.quantity}</TableCell>
                                  <TableCell className="text-right">₹{Math.round(product.price_for_one)}</TableCell>
                                  <TableCell className="text-right">₹{Math.round(product.total_price)}</TableCell>
                                  <TableCell>
                                    <div className="flex flex-wrap gap-1 w-24">
                                      {uploadedProductFiles.slice(0, 3).map((file, idx) => (
                                        <div key={idx} className="w-6 h-6 border rounded bg-gray-50 flex items-center justify-center">
                                          {file.type === 'application/pdf' ? 
                                            <FileText size={12} className="text-red-500" /> : 
                                            <img src={file.preview} alt="preview" className="w-full h-full object-cover" />
                                          }
                                        </div>
                                      ))}
                                      {uploadedProductFiles.length > 3 && (
                                        <div className="w-6 h-6 border rounded bg-gray-100 flex items-center justify-center text-xs">
                                          +{uploadedProductFiles.length - 3}
                                        </div>
                                      )}
                                      {uploadedProductFiles.length === 0 && (
                                        <span className="text-gray-500 text-xs">None</span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {deliverySchedules.length > 0 ? (
                                      <div className="text-xs space-y-1">
                                        {deliverySchedules.map((s) => (
                                          <div key={s.id}>
                                            {s.quantity} qty - {format(new Date(s.delivery_date), 'dd-MM-yyyy')}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-gray-500 text-xs">No schedules</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500 border rounded-lg bg-gray-50">
                    No products found for this PO.
                  </div>
                )}
              </div>
            )}

            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4">Required Item Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 items-end">
                <div className="space-y-2 relative" ref={categoryAutocompleteRef}>
                  <Label>Category</Label>
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      size="icon" 
                      variant="outline"
                      onClick={() => setIsAddCategoryOpen(true)}
                      title="Add Category"
                      disabled={categoriesLoading}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button 
                      type="button" 
                      size="icon" 
                      variant="outline"
                      onClick={handleDeleteCategoryInit}
                      disabled={!currentItem.item_category}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      title="Delete Selected Category"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Input
                      value={categorySearchTerm}
                      onChange={handleCategorySearchChange}
                      onFocus={() => setShowCategorySuggestions(true)}
                      placeholder={categoriesLoading ? "Loading..." : "Search category..."}
                      disabled={categoriesLoading}
                      className="flex-1 bg-white text-gray-900"
                    />
                  </div>
                  {showCategorySuggestions && filteredCategories.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredCategories.map(c => (
                        <div
                          key={c}
                          className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm text-gray-900"
                          onClick={() => handleCategorySelect(c)}
                        >
                          {c}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2 relative" ref={itemNameAutocompleteRef}>
                  <Label>Item Name</Label>
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      size="icon" 
                      variant="outline"
                      onClick={() => setIsAddItemOpen(true)}
                      disabled={!currentItem.item_category || itemsLoading}
                      title="Add Item"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button 
                      type="button" 
                      size="icon" 
                      variant="outline"
                      onClick={handleDeleteItemInit}
                      disabled={!currentItem.item_name}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      title="Delete Selected Item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Input
                      value={itemNameSearchTerm}
                      onChange={handleItemNameSearchChange}
                      onFocus={() => setShowItemNameSuggestions(true)}
                      placeholder={!currentItem.item_category ? "Select Category First" : (itemsLoading ? "Loading..." : "Search item...")}
                      disabled={!currentItem.item_category || itemsLoading}
                      className="flex-1 bg-white text-gray-900"
                    />
                  </div>
                  {showItemNameSuggestions && filteredItemNames.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredItemNames.map((c, index) => (
                        <div
                          key={`${c}-${index}`}
                          className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm text-gray-900"
                          onClick={() => handleItemNameSelect(c)}
                        >
                          {c}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2 relative" ref={unitAutocompleteRef}>
                  <Label htmlFor="unit">Unit</Label>
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      size="icon" 
                      variant="outline"
                      onClick={() => setIsAddUnitOpen(true)}
                      title="Add Unit"
                      disabled={unitsLoading}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button 
                      type="button" 
                      size="icon" 
                      variant="outline"
                      onClick={handleDeleteUnitInit}
                      disabled={!currentItem.unit}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      title="Delete Selected Unit"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Input
                      value={unitSearchTerm}
                      onChange={handleUnitSearchChange}
                      onFocus={() => setShowUnitSuggestions(true)}
                      placeholder={unitsLoading ? "Loading..." : "Search unit..."}
                      disabled={unitsLoading}
                      className="flex-1 bg-white text-gray-900"
                    />
                  </div>
                  {showUnitSuggestions && filteredUnits.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredUnits.map(u => (
                        <div
                          key={u}
                          className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm text-gray-900"
                          onClick={() => handleUnitSelect(u)}
                        >
                          {u}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="available_quantity">Available Quantity</Label>
                  <Input 
                    id="available_quantity" 
                    type="number"
                    value={currentItem.available_quantity} 
                    onChange={handleItemInputChange}
                    className="text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Required Quantity</Label>
                  <Input 
                    id="quantity" 
                    type="number" 
                    value={currentItem.quantity} 
                    onChange={handleItemInputChange} 
                    className="text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rate">Price of one Item</Label>
                  <Input 
                    id="rate" 
                    type="number" 
                    value={currentItem.rate} 
                    onChange={handleItemInputChange}
                    className="text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Total Price</Label>
                  <Input 
                    id="amount" 
                    type="number" 
                    value={currentItem.amount} 
                    onChange={handleItemInputChange}
                    className="text-gray-900"
                  />
                </div>
                
                <Button onClick={handleAddItem} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoadingData}>Add Item</Button>
              </div>
              {addedItems.length > 0 && (
                <Table className="mt-4">
                  <TableHeader>
                      <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead>Item Name</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Price of one Item</TableHead>
                          <TableHead>Total Price</TableHead>
                          <TableHead>Action</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                    {addedItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.item_category}</TableCell>
                        <TableCell>{item.item_name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.rate}</TableCell>
                        <TableCell>{item.amount}</TableCell>
                        <TableCell><Button variant="destructive" size="icon" onClick={() => handleRemoveItem(index)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter><TableRow><TableCell colSpan={4} className="text-right font-bold">Total Required Items Amount</TableCell><TableCell className="font-bold">{Math.round(totalItemsAmount)}</TableCell><TableCell></TableCell></TableRow></TableFooter>
                </Table>
              )}
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4">Labour Expenses</h3>
              <div className="space-y-4">
                {labourCategories.map(({ id, label }) => (
                  <div key={id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                    <div className="flex items-center space-x-2"><Checkbox id={id} checked={formData.labour_expenses[id].checked} onCheckedChange={(c) => handleLabourCheckboxChange(id, c)} /><Label htmlFor={id} className="font-medium">{label}</Label></div>
                    <div className="space-y-2"><Label htmlFor={`${id}-manHours`}>Man Hours</Label><Input id={`${id}-manHours`} type="number" value={formData.labour_expenses[id].manHours} onChange={(e) => handleLabourInputChange(id, 'manHours', e.target.value)} disabled={!formData.labour_expenses[id].checked} className="text-gray-900" /></div>
                    <div className="space-y-2"><Label htmlFor={`${id}-cost`}>Cost of One Hour</Label><Input id={`${id}-cost`} type="number" value={formData.labour_expenses[id].cost} onChange={(e) => handleLabourInputChange(id, 'cost', e.target.value)} disabled={!formData.labour_expenses[id].checked} className="text-gray-900" /></div>
                    <div className="space-y-2"><Label htmlFor={`${id}-totalCost`}>Total Cost of Man Hours</Label><Input id={`${id}-totalCost`} type="number" value={formData.labour_expenses[id].totalCost} readOnly className="bg-gray-100" /></div>
                  </div>
                ))}
              </div>
            </div>

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
                        <TableCell className="text-right">Total of Other Charges</TableCell>
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

            <div className="border-t pt-4">
               <h3 className="text-lg font-semibold mb-4">Tax Details</h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="cgst" 
                        checked={selectedTaxes.cgst} 
                        onCheckedChange={(checked) => handleTaxCheckboxChange('cgst', checked)} 
                      />
                      <Label htmlFor="cgst" className="font-medium">CGST (9%)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="sgst" 
                        checked={selectedTaxes.sgst} 
                        onCheckedChange={(checked) => handleTaxCheckboxChange('sgst', checked)} 
                      />
                      <Label htmlFor="sgst" className="font-medium">SGST (9%)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="igst" 
                        checked={selectedTaxes.igst} 
                        onCheckedChange={(checked) => handleTaxCheckboxChange('igst', checked)} 
                      />
                      <Label htmlFor="igst" className="font-medium">IGST (18%)</Label>
                  </div>
               </div>
            </div>

            <div className="border-t pt-4 bg-gray-50 p-4 rounded-lg">
               <h3 className="text-lg font-semibold mb-4">Cost Summary</h3>
               <div className="space-y-2 max-w-md">
                   <div className="flex justify-between border-b pb-1">
                      <span className="text-gray-600">Total Required Items Amount:</span>
                      <span className="font-semibold">Rs. {totalItemsAmount.toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between border-b pb-1">
                      <span className="text-gray-600">Total Labour Expenses:</span>
                      <span className="font-semibold">Rs. {totalLabourCost.toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between border-b pb-1">
                      <span className="text-gray-600">Other Charges:</span>
                      <span className="font-semibold">Rs. {otherChargesAmount.toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between border-b pb-1">
                      <span className="text-gray-600">Tax Amount:</span>
                      <span className="font-semibold">Rs. {taxAmount.toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between pt-2">
                      <span className="font-bold text-lg text-blue-800">Total Work Order Cost:</span>
                      <span className="font-bold text-lg text-blue-800">Rs. {grandTotal.toFixed(2)}</span>
                   </div>
                   <div className="text-sm text-gray-500 italic text-right mt-1">
                       {numberToWords(grandTotal)}
                   </div>
               </div>
            </div>

            <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2"><Label>Customer's Delivery Date</Label><Popover><PopoverTrigger asChild><Button variant="outline" className={cn('w-full justify-start text-gray-900', !formData.customer_delivery_date && 'text-muted-foreground')}><CalendarIcon className="mr-2 h-4 w-4" />{formData.customer_delivery_date ? format(formData.customer_delivery_date, 'dd-MM-yyyy') : 'Pick a date'}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.customer_delivery_date} onSelect={(d) => handleDateSelection('customer_delivery_date', d)} /></PopoverContent></Popover></div>
              <div className="space-y-2"><Label>Actual Delivery Date</Label><Popover><PopoverTrigger asChild><Button variant="outline" className={cn('w-full justify-start text-gray-900', !formData.actual_delivery_date && 'text-muted-foreground')}><CalendarIcon className="mr-2 h-4 w-4" />{formData.actual_delivery_date ? format(new Date(formData.actual_delivery_date), 'dd-MM-yyyy') : 'Pick a date'}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.actual_delivery_date} onSelect={(d) => handleDateSelection('actual_delivery_date', d)} /></PopoverContent></Popover></div>
              <div className="space-y-2"><Label htmlFor="format_no">Format No</Label><Input id="format_no" value={formData.format_no} onChange={handleInputChange} className="text-gray-900" /></div>
              <div className="space-y-2"><Label htmlFor="prepared_by">Prepared By</Label><Input id="prepared_by" value={formData.prepared_by} onChange={handleInputChange} className="text-gray-900" /></div>
              <div className="space-y-2"><Label htmlFor="quality_check_by">Quality Check By</Label><Input id="quality_check_by" value={formData.quality_check_by} onChange={handleInputChange} className="text-gray-900" /></div>
              <div className="space-y-2"><Label htmlFor="approved_by">Approved By</Label><Input id="approved_by" value={formData.approved_by} onChange={handleInputChange} className="text-gray-900" /></div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap justify-end gap-2 border-t pt-4">
            <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white"><X className="mr-2 h-4 w-4" />Close</Button>
            <Button onClick={handleSaveAsPDF} className="bg-blue-600 hover:bg-blue-700 text-white"><FileText className="mr-2 h-4 w-4" />Save as PDF</Button>
            <Button 
              onClick={handleSave} 
              disabled={workOrderNumberStatus === 'duplicate' || workOrderNumberStatus === 'checking' || isLoadingData} 
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              <Save className="mr-2 h-4 w-4" />Save Work Order
            </Button>
          </CardFooter>
        </Card>
      </motion.div>

      <Dialog open={isAddPIModalOpen} onOpenChange={setIsAddPIModalOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-auto">
          <AddPIForm onClose={handleAddPIModalClose} />
        </DialogContent>
      </Dialog>

      <Dialog open={backDateDialog.isOpen} onOpenChange={(open) => !open && handleBackDateCancel()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Back Date Warning</DialogTitle>
            <DialogDescription>
              {backDateDialog.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handleBackDateCancel}>
              No
            </Button>
            <Button onClick={handleBackDateConfirm} className="bg-blue-600 hover:bg-blue-700 text-white">
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteCategoryOpen} onOpenChange={setIsDeleteCategoryOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the category <strong>{currentItem.item_category}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
             <p className="text-sm text-gray-500">
               This action will delete the category and <strong>ALL associated items</strong> inside it. This action cannot be undone.
             </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteCategoryOpen(false)} disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategoryConfirm} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Delete Category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteItemOpen} onOpenChange={setIsDeleteItemOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the item <strong>{currentItem.item_name}</strong> from category <strong>{currentItem.item_category}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
             <p className="text-sm text-gray-500">
               This action will permanently delete this item from the centralized items database. This action cannot be undone.
             </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteItemOpen(false)} disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItemConfirm} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Delete Item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteUnitOpen} onOpenChange={setIsDeleteUnitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Unit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the unit <strong>{currentItem.unit}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
             <p className="text-sm text-gray-500">
               This action cannot be undone.
             </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteUnitOpen(false)} disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUnitConfirm} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Delete Unit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
        <DialogContent className="sm:max-w-[400px]">
            <DialogHeader><DialogTitle>Add New Category</DialogTitle></DialogHeader>
            <div className="py-4 space-y-4">
                <div>
                  <Label>Category Name <span className="text-red-500">*</span></Label>
                  <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="e.g., ELECTRONICS" className="bg-white text-gray-900" />
                </div>
                <div>
                  <Label>Description (Optional)</Label>
                  <Input value={newCategoryDescription} onChange={(e) => setNewCategoryDescription(e.target.value)} placeholder="Optional description" className="bg-white text-gray-900" />
                </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddNewCategory} disabled={addingNewCategory} className="bg-blue-600 hover:bg-blue-700 text-white">
                {addingNewCategory && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Add Category
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <DialogContent className="sm:max-w-[400px]">
            <DialogHeader><DialogTitle>Add New Item to {currentItem.item_category}</DialogTitle></DialogHeader>
            <div className="py-4 space-y-4">
                <div>
                  <Label>Item Name <span className="text-red-500">*</span></Label>
                  <Input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="Enter full item description" className="bg-white text-gray-900" />
                </div>
                <div>
                  <Label>Description (Optional)</Label>
                  <Input value={newItemDescription} onChange={(e) => setNewItemDescription(e.target.value)} placeholder="Optional description" className="bg-white text-gray-900" />
                </div>
            </div>
            <DialogFooter>
                <Button onClick={handleAddNewItem} disabled={addingNewItem} className="bg-blue-600 hover:bg-blue-700 text-white">
                    {addingNewItem && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Add Item
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddUnitOpen} onOpenChange={setIsAddUnitOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Add New Unit</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
              <div>
                <Label>Unit Name <span className="text-red-500">*</span></Label>
                <Input value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} placeholder="e.g., Dozen, Pair" className="bg-white text-gray-900" />
              </div>
              <div>
                <Label>Symbol (Optional)</Label>
                <Input value={newUnitSymbol} onChange={(e) => setNewUnitSymbol(e.target.value)} placeholder="e.g., dz, pr" className="bg-white text-gray-900" />
              </div>
          </div>
          <DialogFooter>
              <Button onClick={handleAddNewUnit} disabled={addingNewUnit} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {addingNewUnit && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                  Add Unit
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AddWorkOrderForm;
