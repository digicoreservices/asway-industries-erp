
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Edit2, Loader2, Trash2, Search, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import useSupplierManagement from '@/hooks/useSupplierManagement';
import useItemManagement from '@/hooks/useItemManagement';
import useCategories from '@/hooks/useCategories';
import useItemsMaster from '@/hooks/useItemsMaster';
import useUnits from '@/hooks/useUnits';
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
import AddSupplierForm from '@/components/suppliers/AddSupplierForm';
import EditSupplierForm from '@/components/suppliers/EditSupplierForm';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/customSupabaseClient';
import { numberToWords } from '@/lib/numberToWords';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { cn } from '@/lib/utils';

const AddPIForm = ({ onClose }) => {
  const { toast } = useToast();
  const { suppliers, fetchSuppliers } = useSupplierManagement();
  const { addItems } = useItemManagement();
  
  // Centralized data hooks
  const { categories, loading: categoriesLoading, error: categoriesError, addCategory, deleteCategory } = useCategories();
  const { items: itemsMaster, loading: itemsLoading, error: itemsError, addItem: addItemMaster, deleteItem: deleteItemMaster, refreshItems } = useItemsMaster();
  const { units, loading: unitsLoading, error: unitsError, addUnit, deleteUnit } = useUnits();
  
  const [formData, setFormData] = useState({
    supplier_id: '',
    supplier_name: '',
    supplier_invoice_number: '',
    invoice_date: '',
    category: '',
    item_name: '',
    unit: '',
    quantity: '',
    price: '',
    discount: '',
    department: '',
    user_name: ''
  });

  const [totalPrice, setTotalPrice] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  
  const [availableItems, setAvailableItems] = useState([]);
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [deptUserMap, setDeptUserMap] = useState({});
  
  // Track selected category ID for filtering items
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  // Supplier Invoice Number Duplicate Validation State
  const [invoiceNumberError, setInvoiceNumberError] = useState('');
  const [isCheckingInvoiceNumber, setIsCheckingInvoiceNumber] = useState(false);

  // Modals & Forms State
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isEditSupplierOpen, setIsEditSupplierOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  
  // Delete Modals State
  const [isDeleteCategoryOpen, setIsDeleteCategoryOpen] = useState(false);
  const [isDeleteItemOpen, setIsDeleteItemOpen] = useState(false);
  const [isDeleteUnitOpen, setIsDeleteUnitOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Back Date Warning State
  const [isBackdatedWarningOpen, setIsBackdatedWarningOpen] = useState(false);
  const [pendingBackdatedDate, setPendingBackdatedDate] = useState(null);
  
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitSymbol, setNewUnitSymbol] = useState("");
  const [addingNewItem, setAddingNewItem] = useState(false);
  const [addingNewUnit, setAddingNewUnit] = useState(false);
  const [addingNewCategory, setAddingNewCategory] = useState(false);

  // Supplier Autocomplete State
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false);

  // Searchable Dropdown States
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const categoryAutocompleteRef = useRef(null);

  const [itemNameSearchTerm, setItemNameSearchTerm] = useState('');
  const [showItemNameSuggestions, setShowItemNameSuggestions] = useState(false);
  const itemNameAutocompleteRef = useRef(null);

  const [unitSearchTerm, setUnitSearchTerm] = useState('');
  const [showUnitSuggestions, setShowUnitSuggestions] = useState(false);
  const unitAutocompleteRef = useRef(null);

  // Other Charges State
  const [otherChargesList, setOtherChargesList] = useState([]);
  const [chargeDescription, setChargeDescription] = useState('');
  const [chargePrice, setChargePrice] = useState('');

  // Local state for accumulated items
  const [itemsList, setItemsList] = useState([]);

  // Edit Item State
  const [editingItemId, setEditingItemId] = useState(null);

  // Phase 3: Tax Calculation State with Default Rates
  const [sgstChecked, setSgstChecked] = useState(false);
  const [sgstRate, setSgstRate] = useState('9');
  const [cgstChecked, setCgstChecked] = useState(false);
  const [cgstRate, setCgstRate] = useState('9');
  const [igstChecked, setIgstChecked] = useState(false);
  const [igstRate, setIgstRate] = useState('18');
  
  // Phase 3: Calculated Tax Amounts
  const [sgstAmount, setSgstAmount] = useState(0);
  const [cgstAmount, setCgstAmount] = useState(0);
  const [igstAmount, setIgstAmount] = useState(0);
  const [totalTaxAmount, setTotalTaxAmount] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [grandTotalInWords, setGrandTotalInWords] = useState('');
  
  // Phase 3: Details/Notes Field
  const [detailsNotes, setDetailsNotes] = useState('');

  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Derive category list and unit list from hooks
  const categoryList = React.useMemo(() => {
    return categories.map(c => c.name).sort();
  }, [categories]);

  const unitList = React.useMemo(() => {
    return units.map(u => u.name).sort();
  }, [units]);

  // Click outside handler for autocomplete dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
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

  // Real-time Supplier Invoice Number Validation (Duplicate Check)
  useEffect(() => {
    const checkDuplicateInvoiceNumber = async () => {
      const value = formData.supplier_invoice_number.trim();
      if (!value) {
        setInvoiceNumberError('');
        setIsCheckingInvoiceNumber(false);
        return;
      }
      
      setIsCheckingInvoiceNumber(true);
      const { data, error } = await supabase
        .from('items')
        .select('id')
        .eq('supplier_invoice_number', value)
        .limit(1);

      if (data && data.length > 0) {
        setInvoiceNumberError('Supplier Invoice Number already exists. Please enter a different number.');
      } else {
        setInvoiceNumberError('');
      }
      setIsCheckingInvoiceNumber(false);
    };

    const timer = setTimeout(() => {
      checkDuplicateInvoiceNumber();
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.supplier_invoice_number]);

  // Filter available items based on selected category - FIXED with proper dependency array
  useEffect(() => {
    console.log('🔍 Items Filter Effect Triggered');
    console.log('Selected Category ID:', selectedCategoryId);
    console.log('Items Master Length:', itemsMaster.length);
    console.log('Items Master:', itemsMaster);
    
    if (selectedCategoryId && itemsMaster.length > 0) {
      const filteredItems = itemsMaster
        .filter(item => {
          console.log(`Comparing item.category_id (${item.category_id}) === selectedCategoryId (${selectedCategoryId})`);
          return item.category_id === selectedCategoryId;
        })
        .map(item => item.name)
        .sort();
      
      console.log('✅ Filtered Items:', filteredItems);
      setAvailableItems(filteredItems);
      
      // Clear item name if it's not in the new filtered list
      if (formData.item_name && !filteredItems.includes(formData.item_name)) {
        setFormData(prev => ({ ...prev, item_name: '' }));
        setItemNameSearchTerm('');
      }
    } else {
      console.log('⚠️ No category selected or no items loaded');
      setAvailableItems([]);
    }
  }, [selectedCategoryId, itemsMaster]);

  // Total Price calculation - (Price × Quantity) - Discount
  useEffect(() => {
    const quantity = parseFloat(formData.quantity) || 0;
    const price = parseFloat(formData.price) || 0;
    const discount = parseFloat(formData.discount) || 0;
    
    // Calculate: (Price of One Unit × Quantity) - Discount
    const calculatedTotal = (price * quantity) - discount;
    
    setTotalPrice(calculatedTotal);
  }, [formData.quantity, formData.price, formData.discount]);

  const getDepartmentsArray = (supplier) => {
    let depts = [];
    let deptUserMap = {};

    if (supplier.departments && Array.isArray(supplier.departments) && supplier.departments.length > 0) {
      supplier.departments.forEach(d => {
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
      supplier.department1, supplier.department2, supplier.department3, 
      supplier.department4, supplier.department5, supplier.department6,
      supplier.department7, supplier.department8, supplier.department9, 
      supplier.department10
    ];
    
    const legacyUsers = [
      supplier.user1, supplier.user2, supplier.user3, supplier.user4, supplier.user5,
      supplier.user6, supplier.user7, supplier.user8, supplier.user9, supplier.user10
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

  useEffect(() => {
    if (formData.supplier_id) {
        const supplier = suppliers.find(s => s.id === formData.supplier_id);
        if (supplier) {
            if (supplier.supplier_name !== supplierSearchTerm) {
                setSupplierSearchTerm(supplier.supplier_name);
            }
            if (formData.supplier_name !== supplier.supplier_name) {
                setFormData(prev => ({ ...prev, supplier_name: supplier.supplier_name }));
            }

            const { uniqueDepts, deptUserMap } = getDepartmentsArray(supplier);
            
            setAvailableDepartments(uniqueDepts);
            setDeptUserMap(deptUserMap);
            
            const allUsers = Object.values(deptUserMap).flat();
            const uniqueUsers = [...new Set(allUsers)];
            setAvailableUsers(uniqueUsers);
            
            if (!formData.department && uniqueDepts.length === 1) {
              setFormData(prev => ({ ...prev, department: uniqueDepts[0] }));
            }
        }
    } else {
         setAvailableDepartments([]);
         setAvailableUsers([]);
         setDeptUserMap({});
    }
  }, [formData.supplier_id, suppliers, supplierSearchTerm, formData.supplier_name, formData.department]);

  const handleDepartmentChange = (deptName) => {
    if (!deptName || deptName === 'no-department') {
      const allUsers = Object.values(deptUserMap).flat();
      const uniqueUsers = [...new Set(allUsers)];
      setAvailableUsers(uniqueUsers);
      setFormData(prev => ({ ...prev, department: '', user_name: '' }));
      return;
    }

    let usersForDept = deptUserMap[deptName] || [];
    const uniqueUsers = [...new Set(usersForDept)];
    setAvailableUsers(uniqueUsers);
    
    setFormData(prev => ({ 
        ...prev, 
        department: deptName,
        user_name: uniqueUsers.length === 1 ? uniqueUsers[0] : '' 
    }));
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id, value) => {
     setFormData(prev => ({ ...prev, [id]: value }));
  };
  
  const handleSupplierSearchChange = (e) => {
    const value = e.target.value;
    setSupplierSearchTerm(value);
    setShowSupplierSuggestions(true);
    if (formData.supplier_id) {
        setFormData(prev => ({ 
            ...prev, 
            supplier_id: '', 
            supplier_name: '',
            department: '', 
            user_name: '' 
        }));
    }
  };

  const handleSupplierSelect = (supplier) => {
    setSupplierSearchTerm(supplier.supplier_name);
    setFormData(prev => ({
        ...prev,
        supplier_id: supplier.id,
        supplier_name: supplier.supplier_name
    }));
    setShowSupplierSuggestions(false);
  };

  const filteredSuppliers = supplierSearchTerm
    ? suppliers.filter(s => s.supplier_name.toLowerCase().includes(supplierSearchTerm.toLowerCase()))
    : suppliers;

  // Category Searchable Dropdown Handlers
  const handleCategorySearchChange = (e) => {
    const value = e.target.value;
    setCategorySearchTerm(value);
    setShowCategorySuggestions(true);
    setFormData(prev => ({ ...prev, category: '', item_name: '', unit: '' }));
    setSelectedCategoryId(null);
    setItemNameSearchTerm('');
    setUnitSearchTerm('');
  };

  const handleCategorySelect = (categoryName) => {
    console.log('📂 Category Selected:', categoryName);
    setCategorySearchTerm(categoryName);
    setShowCategorySuggestions(false);
    setFormData(prev => ({ ...prev, category: categoryName, item_name: '' }));
    setItemNameSearchTerm('');
    
    // Find and set the category ID
    const selectedCategory = categories.find(c => c.name === categoryName);
    if (selectedCategory) {
      console.log('✅ Found Category ID:', selectedCategory.id);
      setSelectedCategoryId(selectedCategory.id);
    } else {
      console.log('❌ Category not found in categories list');
    }
  };

  const filteredCategories = React.useMemo(() => {
    if (!categorySearchTerm) return categoryList;
    const lowercasedFilter = categorySearchTerm.toLowerCase();
    return categoryList.filter(c => c.toLowerCase().includes(lowercasedFilter));
  }, [categoryList, categorySearchTerm]);

  // Item Name Searchable Dropdown Handlers
  const handleItemNameSearchChange = (e) => {
    const value = e.target.value;
    setItemNameSearchTerm(value);
    setShowItemNameSuggestions(true);
    setFormData(prev => ({ ...prev, item_name: '' }));
  };

  const handleItemNameSelect = (itemName) => {
    console.log('✅ Item Selected:', itemName);
    setItemNameSearchTerm(itemName);
    setShowItemNameSuggestions(false);
    setFormData(prev => ({ ...prev, item_name: itemName }));
  };

  const filteredItemNames = React.useMemo(() => {
    if (!itemNameSearchTerm) return availableItems;
    const lowercasedFilter = itemNameSearchTerm.toLowerCase();
    return availableItems.filter(i => i.toLowerCase().includes(lowercasedFilter));
  }, [availableItems, itemNameSearchTerm]);

  // Unit Searchable Dropdown Handlers
  const handleUnitSearchChange = (e) => {
    const value = e.target.value;
    setUnitSearchTerm(value);
    setShowUnitSuggestions(true);
    setFormData(prev => ({ ...prev, unit: '' }));
  };

  const handleUnitSelect = (unit) => {
    setUnitSearchTerm(unit);
    setShowUnitSuggestions(false);
    setFormData(prev => ({ ...prev, unit: unit }));
  };

  const filteredUnits = React.useMemo(() => {
    if (!unitSearchTerm) return unitList;
    const lowercasedFilter = unitSearchTerm.toLowerCase();
    return unitList.filter(u => u.toLowerCase().includes(lowercasedFilter));
  }, [unitList, unitSearchTerm]);

  const handleDateChange = (e) => {
    const selectedDate = e.target.value;
    if (!selectedDate) {
      setFormData(prev => ({ ...prev, invoice_date: selectedDate }));
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const invoiceDate = new Date(selectedDate);
    invoiceDate.setHours(0, 0, 0, 0);

    if (invoiceDate < today) {
      setPendingBackdatedDate(selectedDate);
      setIsBackdatedWarningOpen(true);
    } else {
      setFormData(prev => ({ ...prev, invoice_date: selectedDate }));
    }
  };

  const handleBackdatedConfirm = () => {
    setFormData(prev => ({ ...prev, invoice_date: pendingBackdatedDate }));
    setIsBackdatedWarningOpen(false);
    setPendingBackdatedDate(null);
  };

  const handleBackdatedCancel = () => {
    setFormData(prev => ({ ...prev, invoice_date: '' }));
    setIsBackdatedWarningOpen(false);
    setPendingBackdatedDate(null);
  };

  // Phase 3: Tax Type Validation & Handlers with Default Rates
  const handleSgstChange = (checked) => {
    setSgstChecked(checked);
    if (checked) {
      if (igstChecked) {
        setIgstChecked(false);
      }
      if (!sgstRate) {
        setSgstRate('9');
      }
    } else {
      setSgstRate('9');
    }
  };

  const handleCgstChange = (checked) => {
    setCgstChecked(checked);
    if (checked) {
      if (igstChecked) {
        setIgstChecked(false);
      }
      if (!cgstRate) {
        setCgstRate('9');
      }
    } else {
      setCgstRate('9');
    }
  };

  const handleIgstChange = (checked) => {
    setIgstChecked(checked);
    if (checked) {
      setSgstChecked(false);
      setCgstChecked(false);
      if (!igstRate) {
        setIgstRate('18');
      }
    } else {
      setIgstRate('18');
    }
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
             setFormData(prev => ({ ...prev, category: trimmed }));
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
        setFormData(prev => ({ ...prev, category: trimmed }));
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

          console.log('➕ Adding new item:', trimmed, 'to category ID:', selectedCategoryId);

          const { data, error } = await addItemMaster({
              name: trimmed,
              category_id: selectedCategoryId,
              description: newItemDescription.trim() || null
          });
          
          if (error) throw error;

          console.log('✅ Item added successfully:', data);

          // Refresh items list to update dropdown immediately
          await refreshItems();

          setItemNameSearchTerm(trimmed);
          setFormData(prev => ({ ...prev, item_name: trimmed }));
          setIsAddItemOpen(false);
          setNewItemName("");
          setNewItemDescription("");
          toast({ title: "Item Added", description: "New item added successfully." });

      } catch (err) {
          console.error('❌ Error adding item:', err);
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
            setFormData(prev => ({ ...prev, unit: trimmed }));
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
          setFormData(prev => ({ ...prev, unit: trimmed }));
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
  
  const handleSupplierAdded = () => {
    fetchSuppliers();
    setIsAddSupplierOpen(false);
  };
  
  const handleSupplierUpdated = () => {
    fetchSuppliers();
    setIsEditSupplierOpen(false);
    toast({ title: "Supplier Updated", description: "Supplier details refreshed." });
  };

  const handleDeleteCategoryInit = () => {
    const category = formData.category;
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
      setFormData(prev => ({ ...prev, category: '', item_name: '' }));
      setSelectedCategoryId(null);
      setItemNameSearchTerm('');
      setIsDeleteCategoryOpen(false);
      
      // Refresh items list after category deletion
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
    const itemName = formData.item_name;
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
    const itemName = formData.item_name;
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
      console.log('🗑️ Deleting item:', itemToDelete);

      const { error } = await deleteItemMaster(itemToDelete.id);

      if (error) throw error;

      console.log('✅ Item deleted successfully');

      setItemNameSearchTerm('');
      setFormData(prev => ({ ...prev, item_name: '' }));
      setIsDeleteItemOpen(false);
      
      // Refresh items list to update the dropdown
      await refreshItems();
      
      toast({ title: "Item Deleted", description: `Item '${itemName}' has been deleted from ${formData.category}.` });
    } catch (err) {
      console.error('❌ Error deleting item:', err);
      toast({ title: "Error", description: `Failed to delete item: ${err.message}`, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteUnitInit = () => {
    const unit = formData.unit;
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
    const unitName = formData.unit;
    if (!unitName) return;

    const unitToDelete = units.find(u => u.name === unitName);
    if (!unitToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await deleteUnit(unitToDelete.id);

      if (error) throw error;

      setUnitSearchTerm('');
      setFormData(prev => ({ ...prev, unit: '' }));
      setIsDeleteUnitOpen(false);
      toast({ title: "Unit Deleted", description: `Unit '${unitName}' has been deleted.` });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: `Failed to delete unit: ${err.message}`, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditItem = (item) => {
    setEditingItemId(item.id);
    setCategorySearchTerm(item.category);
    setItemNameSearchTerm(item.item_name);
    setUnitSearchTerm(item.unit);
    
    // Find and set category ID for editing
    const category = categories.find(c => c.name === item.category);
    if (category) {
      setSelectedCategoryId(category.id);
    }
    
    setFormData(prev => ({
      ...prev,
      category: item.category,
      item_name: item.item_name,
      unit: item.unit,
      quantity: item.quantity.toString(),
      price: item.price.toString(),
      discount: (item.discount || 0).toString()
    }));

    toast({ 
      title: "Edit Mode", 
      description: "Item loaded for editing. Modify and click 'Add Item' to update." 
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddItemToList = (e) => {
    e.preventDefault();
    const { item_name, category, unit, quantity, price, supplier_id, invoice_date, supplier_invoice_number } = formData;

    if (!supplier_id || !supplier_invoice_number || !invoice_date) {
        toast({ title: 'Validation Error', description: 'Please fill in Supplier Name, Invoice Number and Date first.', variant: 'destructive' });
        return;
    }

    if (invoiceNumberError) {
        toast({ title: 'Validation Error', description: 'Please fix the Supplier Invoice Number error before adding items.', variant: 'destructive' });
        return;
    }

    if (!categoryList.includes(category)) {
      toast({ title: 'Invalid Category', description: 'Please select a valid category from the suggestions.', variant: 'destructive' });
      return;
    }

    if (!availableItems.includes(item_name)) {
      toast({ title: 'Invalid Item Name', description: 'Please select a valid item name from the suggestions.', variant: 'destructive' });
      return;
    }

    if (!unitList.includes(unit)) {
      toast({ title: 'Invalid Unit', description: 'Please select a valid unit from the suggestions.', variant: 'destructive' });
      return;
    }

    if (!item_name || !category || !unit || !quantity || !price) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all item fields (Category, Item Name, Unit, Quantity, Price).',
        variant: 'destructive',
      });
      return;
    }

    if (editingItemId) {
      setItemsList(prev => prev.map(item => {
        if (item.id === editingItemId) {
          return {
            ...formData,
            id: item.id,
            quantity: parseFloat(quantity),
            price: parseFloat(price),
            discount: parseFloat(formData.discount) || 0,
            total_price: totalPrice,
            invoice_date: formData.invoice_date || null
          };
        }
        return item;
      }));

      toast({ title: "Item Updated", description: "Item has been updated successfully." });
      setEditingItemId(null);
    } else {
      const newItem = {
        ...formData,
        id: generateUUID(), 
        quantity: parseFloat(quantity),
        price: parseFloat(price),
        discount: parseFloat(formData.discount) || 0,
        total_price: totalPrice,
        invoice_date: formData.invoice_date || null
      };

      setItemsList(prev => [...prev, newItem]);
      toast({ title: "Item Added", description: "Item added to the invoice list." });
    }

    setCategorySearchTerm('');
    setItemNameSearchTerm('');
    setUnitSearchTerm('');
    setSelectedCategoryId(null);
    setFormData(prev => ({
        ...prev,
        category: '',
        item_name: '',
        unit: '',
        quantity: '',
        price: '',
        discount: '',
    }));
    setTotalPrice(0);
  };

  const handleRemoveItemFromList = (idToRemove) => {
    setItemsList(prev => prev.filter(item => item.id !== idToRemove));
    
    if (editingItemId === idToRemove) {
      setEditingItemId(null);
      setCategorySearchTerm('');
      setItemNameSearchTerm('');
      setUnitSearchTerm('');
      setSelectedCategoryId(null);
      setFormData(prev => ({
        ...prev,
        category: '',
        item_name: '',
        unit: '',
        quantity: '',
        price: '',
        discount: '',
      }));
      setTotalPrice(0);
    }
    
    toast({ title: "Item Removed", description: "Item removed from list." });
  };

  const handleAddOtherCharge = () => {
    if (!chargeDescription.trim()) {
      toast({ title: 'Validation Error', description: 'Please enter a description for the charge.', variant: 'destructive' });
      return;
    }
    
    if (!chargePrice || parseFloat(chargePrice) <= 0) {
      toast({ title: 'Validation Error', description: 'Please enter a valid price for the charge.', variant: 'destructive' });
      return;
    }

    const newCharge = {
      id: generateUUID(),
      description: chargeDescription.trim(),
      price: parseFloat(chargePrice)
    };

    setOtherChargesList(prev => [...prev, newCharge]);
    setChargeDescription('');
    setChargePrice('');
    
    toast({ title: "Charge Added", description: "Other charge added successfully." });
  };

  const handleRemoveOtherCharge = (idToRemove) => {
    setOtherChargesList(prev => prev.filter(charge => charge.id !== idToRemove));
    toast({ title: "Charge Removed", description: "Other charge removed from list." });
  };

  // Calculate items total and other charges total
  const itemsTotal = itemsList.reduce((sum, item) => sum + (item.total_price || 0), 0);
  const otherChargesTotal = otherChargesList.reduce((sum, charge) => sum + (charge.price || 0), 0);
  const subtotal = itemsTotal + otherChargesTotal;

  // Phase 3: Calculate Tax Amounts and Grand Total
  useEffect(() => {
    const taxableAmount = itemsTotal + otherChargesTotal;
    
    const calculatedSgstAmount = sgstChecked && sgstRate 
      ? (taxableAmount * parseFloat(sgstRate)) / 100 
      : 0;
    setSgstAmount(calculatedSgstAmount);
    
    const calculatedCgstAmount = cgstChecked && cgstRate 
      ? (taxableAmount * parseFloat(cgstRate)) / 100 
      : 0;
    setCgstAmount(calculatedCgstAmount);
    
    const calculatedIgstAmount = igstChecked && igstRate 
      ? (taxableAmount * parseFloat(igstRate)) / 100 
      : 0;
    setIgstAmount(calculatedIgstAmount);
    
    const calculatedTotalTax = calculatedSgstAmount + calculatedCgstAmount + calculatedIgstAmount;
    setTotalTaxAmount(calculatedTotalTax);
    
    const calculatedGrandTotal = Math.round(taxableAmount + calculatedTotalTax);
    setGrandTotal(calculatedGrandTotal);
    
    const words = numberToWords(calculatedGrandTotal);
    setGrandTotalInWords(words);
    
  }, [itemsTotal, otherChargesTotal, sgstChecked, sgstRate, cgstChecked, cgstRate, igstChecked, igstRate]);

  const handleSaveInvoice = async () => {
    if (!formData.supplier_id || !formData.supplier_invoice_number || !formData.invoice_date) {
      toast({ 
        title: "Validation Error", 
        description: "Please ensure Supplier Name, Invoice Number, and Invoice Date are filled out correctly.", 
        variant: 'destructive' 
      });
      return;
    }

    if (invoiceNumberError) {
      toast({ 
        title: "Validation Error", 
        description: "Please fix the Supplier Invoice Number error before saving.", 
        variant: 'destructive' 
      });
      return;
    }

    if (itemsList.length === 0) {
        toast({ 
          title: "Empty Invoice", 
          description: "Please add at least one item to the invoice before saving.", 
          variant: 'destructive' 
        });
        return;
    }
    
    setIsSaving(true);

    try {
      console.log('\n💾 ========== STARTING INVOICE SAVE ==========');
      console.log('📋 Invoice Number:', formData.supplier_invoice_number);
      console.log('🏢 Supplier Name:', formData.supplier_name);
      console.log('📦 Regular Items to Save:', itemsList.length);
      console.log('💰 Other Charges to Save:', otherChargesList.length);
      console.log('📝 Notes to Save:', detailsNotes);

      console.log('\n📦 STEP 1: Preparing regular items...');
      const itemsToInsert = itemsList.map(item => {
        const itemTaxableAmount = item.total_price;
        const itemSgst = sgstChecked && sgstRate ? parseFloat(((itemTaxableAmount * parseFloat(sgstRate)) / 100).toFixed(2)) : 0;
        const itemCgst = cgstChecked && cgstRate ? parseFloat(((itemTaxableAmount * parseFloat(cgstRate)) / 100).toFixed(2)) : 0;
        const itemIgst = igstChecked && igstRate ? parseFloat(((itemTaxableAmount * parseFloat(igstRate)) / 100).toFixed(2)) : 0;
        const itemTotalWithGst = Math.round(item.total_price + itemSgst + itemCgst + itemIgst);

        return {
          id: item.id,
          supplier_id: item.supplier_id,
          supplier_invoice_number: item.supplier_invoice_number,
          invoice_date: item.invoice_date,
          category: item.category,
          item_name: item.item_name,
          unit: item.unit,
          quantity: item.quantity,
          price: item.price,
          total_price: item.total_price,
          supplier_name: item.supplier_name,
          used_quantity: 0,
          cgst: itemCgst,
          sgst: itemSgst,
          igst: itemIgst,
          total_price_with_gst: itemTotalWithGst,
          department: item.department,
          user_name: item.user_name,
          notes: detailsNotes || null
        };
      });

      console.log('📊 Regular items prepared:', itemsToInsert.length);

      console.log('\n💰 STEP 2: Preparing other charges as items...');
      const otherChargesItems = otherChargesList.map(charge => {
        const chargeTaxableAmount = charge.price;
        const chargeSgst = sgstChecked && sgstRate ? parseFloat(((chargeTaxableAmount * parseFloat(sgstRate)) / 100).toFixed(2)) : 0;
        const chargeCgst = cgstChecked && cgstRate ? parseFloat(((chargeTaxableAmount * parseFloat(cgstRate)) / 100).toFixed(2)) : 0;
        const chargeIgst = igstChecked && igstRate ? parseFloat(((chargeTaxableAmount * parseFloat(igstRate)) / 100).toFixed(2)) : 0;
        const chargeTotalWithGst = Math.round(charge.price + chargeSgst + chargeCgst + chargeIgst);

        return {
          id: generateUUID(),
          supplier_id: formData.supplier_id,
          supplier_invoice_number: formData.supplier_invoice_number,
          invoice_date: formData.invoice_date,
          category: 'OTHER_CHARGES',
          item_name: charge.description,
          unit: 'Charge',
          quantity: 1,
          price: charge.price,
          total_price: charge.price,
          supplier_name: formData.supplier_name,
          used_quantity: 0,
          cgst: chargeCgst,
          sgst: chargeSgst,
          igst: chargeIgst,
          total_price_with_gst: chargeTotalWithGst,
          department: formData.department,
          user_name: formData.user_name,
          notes: detailsNotes || null
        };
      });

      console.log('📊 Other charges prepared as items:', otherChargesItems.length);

      console.log('\n🔀 STEP 3: Combining all data for insert...');
      const allItemsToInsert = [...itemsToInsert, ...otherChargesItems];
      
      console.log('📊 Total items to insert:', allItemsToInsert.length);
      console.log('   - Regular items:', itemsToInsert.length);
      console.log('   - Other charges:', otherChargesItems.length);
      console.log('   - Notes field:', detailsNotes ? `"${detailsNotes}"` : '(blank)');

      console.log('\n💾 STEP 4: Inserting to database...');
      const { error } = await addItems(allItemsToInsert);

      if (error) {
         console.error('❌ Database Insert Error:', error);
         throw error;
      }

      console.log('\n✅ ========== INVOICE SAVE COMPLETE ==========');
      console.log(`📦 Saved ${itemsToInsert.length} regular items`);
      console.log(`💰 Saved ${otherChargesItems.length} other charges`);
      console.log(`💵 Total database entries: ${allItemsToInsert.length}`);
      console.log(`📝 Notes saved: "${detailsNotes || '(blank)'}"`);

      toast({ 
        title: "Success", 
        description: `Invoice saved successfully with ${itemsToInsert.length} items and ${otherChargesItems.length} other charges!`,
        variant: "default"
      });
      
      setItemsList([]);
      setOtherChargesList([]);
      setCategorySearchTerm('');
      setItemNameSearchTerm('');
      setUnitSearchTerm('');
      setSelectedCategoryId(null);
      setFormData({
          supplier_id: '',
          supplier_name: '',
          supplier_invoice_number: '',
          invoice_date: '',
          category: '',
          item_name: '',
          unit: '',
          quantity: '',
          price: '',
          discount: '',
          department: '',
          user_name: ''
      });
      setSupplierSearchTerm('');
      setTotalPrice(0);
      setSgstChecked(false);
      setSgstRate('9');
      setCgstChecked(false);
      setCgstRate('9');
      setIgstChecked(false);
      setIgstRate('18');
      setDetailsNotes('');
      setChargeDescription('');
      setChargePrice('');
      setInvoiceNumberError('');
      setEditingItemId(null);
      
      onClose(); 
      
    } catch (error) {
       console.error('\n❌ ========== SAVE INVOICE ERROR ==========');
       console.error('Error:', error);
       console.error('Error Message:', error.message);
       toast({ 
         title: "Database Error", 
         description: error.message || "An unexpected error occurred while saving to the database.", 
         variant: 'destructive' 
       });
    } finally {
       setIsSaving(false);
    }
  };

  const handleSaveAsPDF = () => {
    if (itemsList.length === 0) {
      toast({ title: "Empty Invoice", description: "Please add at least one item before saving as PDF.", variant: 'destructive' });
      return;
    }

    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.width;
    
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Supplier Invoice", pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    doc.text(`Supplier Name: ${formData.supplier_name || 'N/A'}`, 14, 35);
    doc.text(`Department: ${formData.department || 'N/A'}`, 14, 42);
    doc.text(`User: ${formData.user_name || 'N/A'}`, 14, 49);
    
    doc.text(`Invoice Number: ${formData.supplier_invoice_number || 'N/A'}`, pageWidth - 14, 35, { align: 'right' });
    doc.text(`Invoice Date: ${formData.invoice_date || 'N/A'}`, pageWidth - 14, 42, { align: 'right' });

    let currentY = 58;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Items Details", 14, currentY);
    currentY += 2;

    const tableData = itemsList.map(item => {
      const priceBeforeDiscount = item.price * item.quantity;
      return [
        item.category,
        item.item_name,
        item.unit,
        item.quantity.toString(),
        item.price.toFixed(2),
        priceBeforeDiscount.toFixed(2),
        (item.discount || 0).toFixed(2),
        item.total_price.toFixed(2)
      ];
    });

    doc.autoTable({
      startY: currentY,
      head: [['Category', 'Item Name', 'Unit', 'Qty', 'Price', 'Total Price', 'Discount', 'Total']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' }
      }
    });

    let finalY = doc.lastAutoTable.finalY + 15;
    
    const labelX = pageWidth - 90;
    const valueX = pageWidth - 14;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    doc.text(`Total of Items:`, labelX, finalY); 
    doc.text(itemsTotal.toFixed(2), valueX, finalY, { align: 'right' });
    finalY += 7;

    if (otherChargesList.length > 0) {
      otherChargesList.forEach(charge => {
        doc.text(`${charge.description}:`, labelX, finalY);
        doc.text(charge.price.toFixed(2), valueX, finalY, { align: 'right' });
        finalY += 7;
      });
      
      doc.text(`Total of Other Charges:`, labelX, finalY);
      doc.text(otherChargesTotal.toFixed(2), valueX, finalY, { align: 'right' });
      finalY += 7;
    }

    doc.setFont("helvetica", "bold");
    doc.text(`Subtotal:`, labelX, finalY);
    doc.text(subtotal.toFixed(2), valueX, finalY, { align: 'right' });
    finalY += 10;
    
    doc.setFont("helvetica", "normal");
    
    doc.text(`Taxable Amount:`, labelX, finalY); 
    doc.text((itemsTotal + otherChargesTotal).toFixed(2), valueX, finalY, { align: 'right' });
    finalY += 7;

    if (cgstChecked && cgstRate) { 
        doc.text(`CGST (${cgstRate}%):`, labelX, finalY); 
        doc.text(cgstAmount.toFixed(2), valueX, finalY, { align: 'right' }); 
        finalY += 7; 
    }
    if (sgstChecked && sgstRate) { 
        doc.text(`SGST (${sgstRate}%):`, labelX, finalY); 
        doc.text(sgstAmount.toFixed(2), valueX, finalY, { align: 'right' }); 
        finalY += 7; 
    }
    if (igstChecked && igstRate) { 
        doc.text(`IGST (${igstRate}%):`, labelX, finalY); 
        doc.text(igstAmount.toFixed(2), valueX, finalY, { align: 'right' }); 
        finalY += 7; 
    }
    
    doc.line(labelX, finalY - 4, valueX, finalY - 4);
    
    doc.setFont("helvetica", "bold");
    finalY += 2;
    doc.text(`Grand Total:`, labelX, finalY); 
    doc.text(grandTotal.toFixed(2), valueX, finalY, { align: 'right' });
    
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text(`Amount in Words: ${grandTotalInWords}`, 14, finalY);
    
    if (detailsNotes.trim()) {
      finalY += 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Notes: ${detailsNotes}`, 14, finalY);
    }

    const fileName = `Supplier_Invoice_${formData.supplier_invoice_number || 'draft'}.pdf`;
    doc.save(fileName);
    toast({ title: "PDF Downloaded", description: "Professional invoice has been saved as PDF." });
  };

  const validDepartments = availableDepartments.filter(dept => dept && dept.trim() !== '');
  const validUsers = availableUsers.filter(user => user && user.trim() !== '');

  // Display loading state while data is being fetched
  const isLoadingData = categoriesLoading || itemsLoading || unitsLoading;

  // Display error notifications for hook errors
  useEffect(() => {
    if (categoriesError) {
      toast({ 
        title: "Categories Load Error", 
        description: categoriesError.message || "Failed to load categories from database.", 
        variant: "destructive" 
      });
    }
  }, [categoriesError, toast]);

  useEffect(() => {
    if (itemsError) {
      toast({ 
        title: "Items Load Error", 
        description: itemsError.message || "Failed to load items from database.", 
        variant: "destructive" 
      });
    }
  }, [itemsError, toast]);

  useEffect(() => {
    if (unitsError) {
      toast({ 
        title: "Units Load Error", 
        description: unitsError.message || "Failed to load units from database.", 
        variant: "destructive" 
      });
    }
  }, [unitsError, toast]);

  // Debug logging for items and category filtering
  useEffect(() => {
    console.log('📊 Items Master Updated:', itemsMaster.length, 'items loaded');
    console.log('📦 Available Items for Dropdown:', availableItems.length, 'items');
  }, [itemsMaster, availableItems]);

  return (
    <>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
        <Card className="border-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Add Supplier Invoice and Items</CardTitle>
            <Button type="button" onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white">
              Go Back
            </Button>
          </CardHeader>
          
          {isLoadingData && (
            <div className="px-6 py-4 bg-blue-50 border-l-4 border-blue-500">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="text-sm text-blue-800 font-medium">Loading categories, items, and units from database...</span>
              </div>
            </div>
          )}
          
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-3">
             <div className="md:col-span-2 border-b pb-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Supplier Name <span className="text-red-500">*</span></Label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                          <div className="relative">
                              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input 
                                placeholder="Search Supplier..." 
                                value={supplierSearchTerm} 
                                onChange={handleSupplierSearchChange}
                                onFocus={() => setShowSupplierSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowSupplierSuggestions(false), 200)}
                                className={`pl-8 ${!formData.supplier_id && supplierSearchTerm ? "border-amber-400 focus-visible:ring-amber-400" : ""}`}
                              />
                          </div>
                          {showSupplierSuggestions && (
                            <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto mt-1">
                                {filteredSuppliers.length > 0 ? (
                                    filteredSuppliers.map(supplier => (
                                        <div
                                            key={supplier.id}
                                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                            onMouseDown={(e) => { e.preventDefault(); handleSupplierSelect(supplier); }}
                                        >
                                            <div className="font-medium">{supplier.supplier_name}</div>
                                            <div className="text-xs text-gray-500">{supplier.supplier_id}</div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="px-4 py-2 text-gray-500 text-sm">No suppliers found</div>
                                )}
                            </div>
                          )}
                      </div>
                      <Button type="button" variant="outline" size="icon" onClick={() => setIsAddSupplierOpen(true)} title="Add Supplier">
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon" 
                        onClick={() => setIsEditSupplierOpen(true)} 
                        disabled={!formData.supplier_id}
                        title="Edit Selected Supplier"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select 
                      onValueChange={handleDepartmentChange} 
                      value={formData.department} 
                      disabled={!formData.supplier_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={!formData.supplier_id ? "Select Supplier First" : (validDepartments.length === 0 ? "No Department Found" : "Select Department")} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        <SelectItem value="no-department">No Department (Show All Users)</SelectItem>
                        {validDepartments.map((dept, idx) => <SelectItem key={`${dept}-${idx}`} value={dept}>{dept}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>User Name</Label>
                    <Select 
                      onValueChange={(value) => handleSelectChange('user_name', value)} 
                      value={formData.user_name} 
                      disabled={!formData.supplier_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={!formData.supplier_id ? "Select Supplier First" : (validUsers.length === 0 ? "No User Found" : "Select User")} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {validUsers.length > 0 ? (
                          validUsers.map((user, idx) => <SelectItem key={`${user}-${idx}`} value={user}>{user}</SelectItem>)
                        ) : (
                          <SelectItem value="no-users-placeholder" disabled>No Users Available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supplier_invoice_number">Supplier Invoice Number <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Input 
                        id="supplier_invoice_number" 
                        value={formData.supplier_invoice_number} 
                        onChange={handleInputChange} 
                        placeholder="Enter invoice number"
                        className={cn(
                          invoiceNumberError ? "border-red-500 pr-10" : "pr-10",
                          "bg-white text-gray-900"
                        )}
                      />
                      {isCheckingInvoiceNumber && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                        </div>
                      )}
                    </div>
                    {invoiceNumberError && (
                      <p className="text-red-500 text-xs mt-1">{invoiceNumberError}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="invoice_date">Invoice Date <span className="text-red-500">*</span></Label>
                    <Input 
                      id="invoice_date" 
                      type="date" 
                      value={formData.invoice_date} 
                      onChange={handleDateChange} 
                      className="w-full"
                    />
                  </div>
             </div>

              <div className="md:col-span-2 mt-6 mb-2">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Add Items</h3>
              </div>

              <div className="space-y-2">
                <Label>Category <span className="text-red-500">*</span></Label>
                <div className="flex items-center gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      title="Add New Category"
                      onClick={() => setIsAddCategoryOpen(true)}
                      disabled={categoriesLoading}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      onClick={handleDeleteCategoryInit} 
                      disabled={!formData.category} 
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      title="Delete Selected Category"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="space-y-2 relative flex-1" ref={categoryAutocompleteRef}>
                      <Input
                        value={categorySearchTerm}
                        onChange={handleCategorySearchChange}
                        onFocus={() => setShowCategorySuggestions(true)}
                        placeholder={categoriesLoading ? "Loading categories..." : "Search category..."}
                        disabled={categoriesLoading}
                        className="bg-white text-gray-900"
                      />
                      {showCategorySuggestions && filteredCategories.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {filteredCategories.map(c => (
                            <div
                              key={c}
                              className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                              onClick={() => handleCategorySelect(c)}
                            >
                              {c}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Item Name <span className="text-red-500">*</span></Label>
                <div className="flex items-center gap-2">
                    <div className="space-y-2 relative flex-1" ref={itemNameAutocompleteRef}>
                      <Input
                        value={itemNameSearchTerm}
                        onChange={handleItemNameSearchChange}
                        onFocus={() => setShowItemNameSuggestions(true)}
                        placeholder={!formData.category ? "Select Category First" : (itemsLoading ? "Loading items..." : `Search items (${availableItems.length} available)...`)}
                        disabled={!formData.category || itemsLoading}
                        className="bg-white text-gray-900"
                      />
                      {showItemNameSuggestions && filteredItemNames.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {filteredItemNames.map((c, index) => (
                            <div
                              key={`${c}-${index}`}
                              className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                              onClick={() => handleItemNameSelect(c)}
                            >
                              {c}
                            </div>
                          ))}
                        </div>
                      )}
                      {showItemNameSuggestions && !itemsLoading && formData.category && filteredItemNames.length === 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-3">
                          <p className="text-sm text-gray-500">No items found for this category. Click the + button to add a new item.</p>
                        </div>
                      )}
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      disabled={!formData.category || itemsLoading} 
                      title="Add New Item"
                      onClick={() => setIsAddItemOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      onClick={handleDeleteItemInit} 
                      disabled={!formData.item_name} 
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      title="Delete Selected Item"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Unit <span className="text-red-500">*</span></Label>
                <div className="flex items-center gap-2">
                    <div className="space-y-2 relative flex-1" ref={unitAutocompleteRef}>
                      <Input
                        value={unitSearchTerm}
                        onChange={handleUnitSearchChange}
                        onFocus={() => setShowUnitSuggestions(true)}
                        placeholder={unitsLoading ? "Loading units..." : "Search unit..."}
                        disabled={unitsLoading}
                        className="bg-white text-gray-900"
                      />
                      {showUnitSuggestions && filteredUnits.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {filteredUnits.map(u => (
                            <div
                              key={u}
                              className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                              onClick={() => handleUnitSelect(u)}
                            >
                              {u}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={() => setIsAddUnitOpen(true)}
                      disabled={unitsLoading}
                      className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                      title="Add New Unit"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      onClick={handleDeleteUnitInit} 
                      disabled={!formData.unit} 
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      title="Delete Selected Unit"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity <span className="text-red-500">*</span></Label>
                <Input id="quantity" type="number" placeholder="Enter quantity" value={formData.quantity} onChange={handleInputChange} className="bg-white text-gray-900" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="price">Price of One Unit <span className="text-red-500">*</span></Label>
                <Input id="price" type="number" step="0.01" placeholder="Enter price" value={formData.price} onChange={handleInputChange} className="bg-white text-gray-900" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="discount">Discount (Flat Amount)</Label>
                <Input id="discount" type="number" step="0.01" placeholder="Enter flat discount amount" value={formData.discount} onChange={handleInputChange} className="bg-white text-gray-900" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="total_price">Total Price</Label>
                <Input id="total_price" type="number" value={totalPrice.toFixed(2)} readOnly className="bg-gray-100" />
              </div>

              <div className="md:col-span-2 pt-2">
                <Button 
                    type="button" 
                    onClick={handleAddItemToList}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={!!invoiceNumberError || isLoadingData}
                >
                    <Plus className="mr-2 h-4 w-4" /> {editingItemId ? 'Update Item' : 'Add Item'}
                </Button>
              </div>

              <div className="md:col-span-2 mt-6">
                <h3 className="text-lg font-semibold mb-2">Items in Current Invoice</h3>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Category</TableHead>
                                <TableHead>Item Name</TableHead>
                                <TableHead>Unit</TableHead>
                                <TableHead>Qty</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Total Price</TableHead>
                                <TableHead>Discount</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="w-24 text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {itemsList.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center text-gray-500 py-4">
                                        No items added yet. Add items using the form above.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                <>
                                    {itemsList.map((item) => {
                                      const priceBeforeDiscount = item.price * item.quantity;
                                      return (
                                        <TableRow key={item.id}>
                                            <TableCell>{item.category}</TableCell>
                                            <TableCell className="font-medium">{item.item_name}</TableCell>
                                            <TableCell>{item.unit}</TableCell>
                                            <TableCell>{item.quantity}</TableCell>
                                            <TableCell>₹ {item.price.toFixed(2)}</TableCell>
                                            <TableCell>₹ {priceBeforeDiscount.toFixed(2)}</TableCell>
                                            <TableCell>₹ {(item.discount || 0).toFixed(2)}</TableCell>
                                            <TableCell className="text-right">₹ {item.total_price.toFixed(2)}</TableCell>
                                            <TableCell>
                                              <div className="flex items-center justify-center gap-2">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => handleEditItem(item)}
                                                    className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50 cursor-pointer"
                                                    title="Edit Item"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => handleRemoveItemFromList(item.id)}
                                                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                                                    title="Delete Item"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                    <TableRow className="bg-gray-100 border-t-2 border-gray-300">
                                        <TableCell colSpan={2} className="font-bold text-gray-800">Total of Items</TableCell>
                                        <TableCell></TableCell>
                                        <TableCell></TableCell>
                                        <TableCell></TableCell>
                                        <TableCell></TableCell>
                                        <TableCell></TableCell>
                                        <TableCell className="text-right font-bold text-gray-800">₹ {itemsTotal.toFixed(2)}</TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                </>
                            )}
                        </TableBody>
                    </Table>
                </div>
              </div>

              <div className="md:col-span-2 mt-6">
                <h3 className="text-lg font-semibold mb-2 border-b pb-2">Other Charges</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-md">
                  <div className="md:col-span-1">
                    <Label>Description</Label>
                    <Input
                      value={chargeDescription}
                      onChange={(e) => setChargeDescription(e.target.value)}
                      placeholder="e.g., Shipping, Packaging"
                      className="bg-white text-gray-900"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Label>Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={chargePrice}
                      onChange={(e) => setChargePrice(e.target.value)}
                      placeholder="0.00"
                      className="bg-white text-gray-900"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      onClick={handleAddOtherCharge}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add Charge
                    </Button>
                  </div>
                </div>
                
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {otherChargesList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-gray-500 py-4">
                            No other charges added.
                          </TableCell>
                        </TableRow>
                      ) : (
                        otherChargesList.map((charge) => (
                          <TableRow key={charge.id}>
                            <TableCell>{charge.description}</TableCell>
                            <TableCell className="text-right">₹ {charge.price.toFixed(2)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveOtherCharge(charge.id)}
                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {(itemsList.length > 0 || otherChargesList.length > 0) && (
                <div className="md:col-span-2 mt-4">
                  <div className="flex flex-col items-end">
                    <div className="w-full max-w-lg space-y-2 border-t pt-4">
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-600">Total of Items:</span>
                        <span className="font-bold">₹ {itemsTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-600">Total of Other Charges:</span>
                        <span className="font-bold">₹ {otherChargesTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 mt-2">
                        <span className="font-bold text-gray-800">Subtotal:</span>
                        <span className="font-bold text-blue-600">₹ {subtotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {itemsList.length > 0 && (
                  <div className="md:col-span-2 mt-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Tax Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex justify-between border-b pb-3">
                            <span className="font-semibold text-gray-600">Taxable Amount:</span>
                            <span className="font-bold text-lg">₹ {(itemsTotal + otherChargesTotal).toFixed(2)}</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                  id="sgst" 
                                  checked={sgstChecked} 
                                  onCheckedChange={handleSgstChange}
                                />
                                <Label htmlFor="sgst" className="text-sm font-medium">SGST (9%)</Label>
                              </div>
                              {sgstChecked && (
                                <div className="space-y-1">
                                  <Label className="text-xs text-gray-500">Rate (%)</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={sgstRate}
                                    onChange={(e) => setSgstRate(e.target.value)}
                                    placeholder="9.00"
                                    className="bg-white text-gray-900"
                                  />
                                  <div className="text-xs text-gray-600 mt-1">
                                    Amount: ₹ {sgstAmount.toFixed(2)}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                  id="cgst" 
                                  checked={cgstChecked} 
                                  onCheckedChange={handleCgstChange}
                                />
                                <Label htmlFor="cgst" className="text-sm font-medium">CGST (9%)</Label>
                              </div>
                              {cgstChecked && (
                                <div className="space-y-1">
                                  <Label className="text-xs text-gray-500">Rate (%)</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={cgstRate}
                                    onChange={(e) => setCgstRate(e.target.value)}
                                    placeholder="9.00"
                                    className="bg-white text-gray-900"
                                  />
                                  <div className="text-xs text-gray-600 mt-1">
                                    Amount: ₹ {cgstAmount.toFixed(2)}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                  id="igst" 
                                  checked={igstChecked} 
                                  onCheckedChange={handleIgstChange}
                                />
                                <Label htmlFor="igst" className="text-sm font-medium">IGST (18%)</Label>
                              </div>
                              {igstChecked && (
                                <div className="space-y-1">
                                  <Label className="text-xs text-gray-500">Rate (%)</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={igstRate}
                                    onChange={(e) => setIgstRate(e.target.value)}
                                    placeholder="18.00"
                                    className="bg-white text-gray-900"
                                  />
                                  <div className="text-xs text-gray-600 mt-1">
                                    Amount: ₹ {igstAmount.toFixed(2)}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {totalTaxAmount > 0 && (
                            <div className="flex justify-between border-t pt-3 mt-3">
                              <span className="font-semibold text-gray-700">Total Tax Amount:</span>
                              <span className="font-bold text-lg text-blue-600">₹ {totalTaxAmount.toFixed(2)}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                  </div>
              )}

              {itemsList.length > 0 && (
                <div className="md:col-span-2 mt-6">
                  <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex justify-between items-center border-b border-blue-300 pb-3">
                        <span className="text-2xl font-bold text-gray-800">Grand Total:</span>
                        <span className="text-3xl font-bold text-blue-600">₹ {grandTotal.toFixed(2)}</span>
                      </div>
                      
                      <div className="bg-white rounded-md p-3 border border-blue-200">
                        <p className="text-sm text-gray-600 font-medium mb-1">Grand Total in Words:</p>
                        <p className="text-base font-semibold text-gray-800 capitalize italic">
                          {grandTotalInWords}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <div className="md:col-span-2 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Details / Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={detailsNotes}
                      onChange={(e) => setDetailsNotes(e.target.value)}
                      placeholder="Enter any additional details or notes (saved to database)..."
                      className="min-h-[100px] bg-white text-gray-900"
                      rows={4}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      These notes will be saved to the database and can be retrieved when editing this invoice.
                    </p>
                  </CardContent>
                </Card>
              </div>

            </CardContent>
            <CardFooter className="flex justify-between gap-2 border-t pt-4">
              <Button type="button" onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isSaving}>Close</Button>
              <div className="flex gap-2">
                  <Button 
                    type="button" 
                    onClick={handleSaveAsPDF}
                    className="bg-blue-600 hover:bg-blue-700 text-white min-w-[150px]"
                    disabled={itemsList.length === 0 || isSaving}
                  >
                    Save as PDF
                  </Button>
                  <Button 
                    type="button" 
                    onClick={handleSaveInvoice}
                    className="bg-blue-600 hover:bg-blue-700 text-white min-w-[150px]"
                    disabled={itemsList.length === 0 || isSaving || !!invoiceNumberError || isCheckingInvoiceNumber || isLoadingData}
                  >
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
              </div>
            </CardFooter>
        </Card>
      </motion.div>
      
      <Dialog open={isAddSupplierOpen} onOpenChange={setIsAddSupplierOpen}>
        <AddSupplierForm onSupplierAdded={handleSupplierAdded} isOpen={isAddSupplierOpen} />
      </Dialog>
      
      <Dialog open={isEditSupplierOpen} onOpenChange={setIsEditSupplierOpen}>
        {formData.supplier_id && (
             <EditSupplierForm 
                supplierId={formData.supplier_id} 
                suppliers={suppliers} 
                onSupplierUpdated={handleSupplierUpdated} 
             />
        )}
      </Dialog>

      <AlertDialog open={isDeleteCategoryOpen} onOpenChange={setIsDeleteCategoryOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the category <strong>{formData.category}</strong>?
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
              Are you sure you want to delete the item <strong>{formData.item_name}</strong> from category <strong>{formData.category}</strong>?
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
              Are you sure you want to delete the unit <strong>{formData.unit}</strong>?
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
              <Button onClick={handleAddNewCategory} disabled={addingNewCategory}>
                {addingNewCategory && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Add Category
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <DialogContent className="sm:max-w-[400px]">
            <DialogHeader><DialogTitle>Add New Item to {formData.category}</DialogTitle></DialogHeader>
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
                <Button onClick={handleAddNewItem} disabled={addingNewItem}>
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
              <Button onClick={handleAddNewUnit} disabled={addingNewUnit}>
                  {addingNewUnit && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                  Add Unit
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isBackdatedWarningOpen} onOpenChange={setIsBackdatedWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Back-dated Entry Warning</AlertDialogTitle>
            <AlertDialogDescription>
              You have selected a back date. Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleBackdatedCancel}>No</AlertDialogCancel>
            <AlertDialogAction onClick={handleBackdatedConfirm} className="bg-blue-600 hover:bg-blue-700">
              Yes, Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AddPIForm;
