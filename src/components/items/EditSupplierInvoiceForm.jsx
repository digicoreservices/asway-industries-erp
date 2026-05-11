
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Edit2, Loader2, Trash2, Search, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import useSupplierManagement from '@/hooks/useSupplierManagement';
import useCategories from '@/hooks/useCategories';
import useUnits from '@/hooks/useUnits';
import useItemsMaster from '@/hooks/useItemsMaster';
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

const EditSupplierInvoiceForm = ({ invoice, onClose, onSuccess }) => {
  const { toast } = useToast();
  const { suppliers, fetchSuppliers } = useSupplierManagement();
  
  // Database hooks for centralized data management
  const { categories, loading: categoriesLoading, addCategory, deleteCategory, refreshCategories } = useCategories();
  const { units, loading: unitsLoading, addUnit, deleteUnit, refreshUnits } = useUnits();
  const { items: allItems, loading: itemsLoading, addItem, deleteItem, refreshItems } = useItemsMaster();
  
  const [formData, setFormData] = useState({
    supplier_id: '',
    supplier_name: '',
    supplier_invoice_number: '',
    invoice_date: '',
    category: '',
    category_id: '',
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
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [unitToDelete, setUnitToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [newItemName, setNewItemName] = useState("");
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

  // Tax Calculation State with Default Rates
  const [sgstChecked, setSgstChecked] = useState(false);
  const [sgstRate, setSgstRate] = useState('9');
  const [cgstChecked, setCgstChecked] = useState(false);
  const [cgstRate, setCgstRate] = useState('9');
  const [igstChecked, setIgstChecked] = useState(false);
  const [igstRate, setIgstRate] = useState('18');
  
  // Calculated Tax Amounts
  const [sgstAmount, setSgstAmount] = useState(0);
  const [cgstAmount, setCgstAmount] = useState(0);
  const [igstAmount, setIgstAmount] = useState(0);
  const [totalTaxAmount, setTotalTaxAmount] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [grandTotalInWords, setGrandTotalInWords] = useState('');
  
  // Details/Notes Field - connected to database notes column
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

  // FIXED: Improved Other Charges Detection - Check for category='OTHER_CHARGES'
  const isOtherChargeItem = (item) => {
    // Primary detection: Check if category is exactly 'OTHER_CHARGES'
    if (item.category === 'OTHER_CHARGES') {
      return true;
    }
    
    // Fallback detection for legacy data
    const categoryLower = (item.category || '').toLowerCase().trim();
    const itemNameLower = (item.item_name || '').toLowerCase().trim();
    
    const chargeKeywords = [
      'other_charges', 'other charges', 'othercharges',
      'charge', 'charges',
      'shipping', 'transport', 'freight', 'delivery',
      'packaging', 'packing', 'handling', 'forwarding',
      'insurance', 'customs', 'duty',
      'loading', 'unloading', 'cartage',
      'tax', 'fee', 'fees'
    ];
    
    const categoryIsCharge = chargeKeywords.some(keyword => categoryLower.includes(keyword));
    const itemNameIsCharge = chargeKeywords.some(keyword => itemNameLower.includes(keyword));
    
    const hasChargePattern = 
      (item.unit === 'N/A' || item.unit === 'NA' || !item.unit || item.unit.toLowerCase() === 'n/a' || item.unit === 'Charge') && 
      parseFloat(item.quantity) === 1;
    
    return categoryIsCharge || (itemNameIsCharge && hasChargePattern);
  };

  // Filter items by selected category
  useEffect(() => {
    if (formData.category_id) {
      const filteredItems = allItems.filter(item => item.category_id === formData.category_id);
      setAvailableItems(filteredItems);
      
      // Clear item name if it no longer belongs to the selected category
      const currentItemValid = filteredItems.some(item => item.name === formData.item_name);
      if (!currentItemValid && formData.item_name) {
        setFormData(prev => ({ ...prev, item_name: '' }));
        setItemNameSearchTerm('');
      }
    } else {
      setAvailableItems([]);
    }
  }, [formData.category_id, allItems, formData.item_name]);

  // COMPREHENSIVE LOGGING & DATA LOADING
  useEffect(() => {
    const loadInvoiceData = async () => {
      if (!invoice || !invoice.supplier_invoice_number) {
        toast({ 
          title: 'Error', 
          description: 'Invalid invoice data provided.', 
          variant: 'destructive' 
        });
        return;
      }

      try {
        console.log('\n🔍 ========== LOADING INVOICE DATA ==========');
        console.log('📋 Invoice Number:', invoice.supplier_invoice_number);
        console.log('🏢 Supplier Name:', invoice.supplier_name);

        // Fetch all items for this invoice from items table
        const { data: itemsData, error: itemsError } = await supabase
          .from('items')
          .select('*')
          .eq('supplier_invoice_number', invoice.supplier_invoice_number)
          .eq('supplier_name', invoice.supplier_name);

        if (itemsError) throw itemsError;

        if (!itemsData || itemsData.length === 0) {
          toast({ 
            title: 'Warning', 
            description: 'No items found for this invoice.', 
            variant: 'destructive' 
          });
          return;
        }

        console.log('\n📦 ========== RAW DATABASE RESPONSE ==========');
        console.log(`✅ Total Items Fetched: ${itemsData.length}`);
        console.log('📊 Raw Data:', itemsData);
        
        // Display all items in table format for easy analysis
        console.log('\n📊 ========== ALL ITEMS TABLE VIEW ==========');
        console.table(itemsData.map((item, index) => ({
          '#': index + 1,
          ID: item.id?.substring(0, 8) + '...',
          Category: item.category || 'NULL',
          ItemName: item.item_name || 'NULL',
          Unit: item.unit || 'NULL',
          Qty: item.quantity || 'NULL',
          Price: item.price || 'NULL',
          Total: item.total_price || 'NULL',
          CGST: item.cgst || 0,
          SGST: item.sgst || 0,
          IGST: item.igst || 0,
          Notes: item.notes ? 'Yes' : 'No'
        })));

        // Use first item to get header data
        const firstItem = itemsData[0];

        // Pre-fill form header data
        setFormData(prev => ({
          ...prev,
          supplier_id: firstItem.supplier_id || '',
          supplier_name: firstItem.supplier_name || '',
          supplier_invoice_number: firstItem.supplier_invoice_number || '',
          invoice_date: firstItem.invoice_date || '',
          department: firstItem.department || '',
          user_name: firstItem.user_name || ''
        }));

        setSupplierSearchTerm(firstItem.supplier_name || '');

        // Load notes from the first item
        const invoiceNotes = firstItem.notes || '';
        setDetailsNotes(invoiceNotes);
        console.log('📝 Invoice Notes Loaded:', invoiceNotes);

        // CRITICAL: Separate regular items from other charges
        console.log('\n🔄 ========== SEPARATING ITEMS ==========');
        const regularItems = [];
        const otherCharges = [];

        itemsData.forEach((item, index) => {
          const isCharge = isOtherChargeItem(item);
          console.log(`Item ${index + 1} - ${item.item_name}: ${isCharge ? 'OTHER CHARGE' : 'REGULAR ITEM'}`);

          if (isCharge) {
            let description = item.item_name || item.category || 'Charge';
            if (description.toLowerCase().startsWith('charge:')) {
              description = description.substring(7).trim();
            }
            
            const chargePrice = parseFloat(item.total_price) || parseFloat(item.price) || 0;
            
            otherCharges.push({
              id: item.id,
              description: description,
              price: chargePrice,
              cgst: parseFloat(item.cgst) || 0,
              sgst: parseFloat(item.sgst) || 0,
              igst: parseFloat(item.igst) || 0
            });
          } else {
            regularItems.push({
              id: item.id,
              category: item.category || '',
              item_name: item.item_name || '',
              unit: item.unit || '',
              quantity: parseFloat(item.quantity) || 0,
              price: parseFloat(item.price) || 0,
              discount: 0,
              total_price: parseFloat(item.total_price) || 0,
              cgst: parseFloat(item.cgst) || 0,
              sgst: parseFloat(item.sgst) || 0,
              igst: parseFloat(item.igst) || 0,
              total_price_with_gst: parseFloat(item.total_price_with_gst) || 0
            });
          }
        });

        console.log(`\n✅ Loaded ${regularItems.length} regular items and ${otherCharges.length} charges`);

        setItemsList(regularItems);
        setOtherChargesList(otherCharges);

        // Determine tax rates from first item with tax
        const itemWithCgst = itemsData.find(i => parseFloat(i.cgst) > 0);
        const itemWithSgst = itemsData.find(i => parseFloat(i.sgst) > 0);
        const itemWithIgst = itemsData.find(i => parseFloat(i.igst) > 0);

        if (itemWithCgst) {
          setCgstChecked(true);
          const cgstVal = parseFloat(itemWithCgst.cgst) || 0;
          const taxableAmt = parseFloat(itemWithCgst.total_price) || 1;
          const rate = taxableAmt > 0 ? ((cgstVal / taxableAmt) * 100).toFixed(2) : '9';
          setCgstRate(rate);
        }

        if (itemWithSgst) {
          setSgstChecked(true);
          const sgstVal = parseFloat(itemWithSgst.sgst) || 0;
          const taxableAmt = parseFloat(itemWithSgst.total_price) || 1;
          const rate = taxableAmt > 0 ? ((sgstVal / taxableAmt) * 100).toFixed(2) : '9';
          setSgstRate(rate);
        }

        if (itemWithIgst) {
          setIgstChecked(true);
          const igstVal = parseFloat(itemWithIgst.igst) || 0;
          const taxableAmt = parseFloat(itemWithIgst.total_price) || 1;
          const rate = taxableAmt > 0 ? ((igstVal / taxableAmt) * 100).toFixed(2) : '18';
          setIgstRate(rate);
        }

        toast({ 
          title: 'Invoice Loaded Successfully', 
          description: `Loaded ${regularItems.length} regular items and ${otherCharges.length} other charges.` 
        });

        console.log('\n🎉 ========== LOADING COMPLETE ==========\n');

      } catch (err) {
        console.error('\n❌ ========== ERROR LOADING INVOICE ==========');
        console.error('Error:', err);
        toast({ 
          title: 'Error', 
          description: `Failed to load invoice: ${err.message}`, 
          variant: 'destructive' 
        });
      }
    };

    loadInvoiceData();
  }, [invoice, toast]);

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

  // Total Price calculation - (Price × Quantity) - Discount
  useEffect(() => {
    const quantity = parseFloat(formData.quantity) || 0;
    const price = parseFloat(formData.price) || 0;
    const discount = parseFloat(formData.discount) || 0;
    
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
        }
    } else {
         setAvailableDepartments([]);
         setAvailableUsers([]);
         setDeptUserMap({});
    }
  }, [formData.supplier_id, suppliers, supplierSearchTerm]);

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
    setFormData(prev => ({ ...prev, category: '', category_id: '', item_name: '', unit: '' }));
    setItemNameSearchTerm('');
    setUnitSearchTerm('');
  };

  const handleCategorySelect = (category) => {
    setCategorySearchTerm(category.name);
    setShowCategorySuggestions(false);
    setFormData(prev => ({ ...prev, category: category.name, category_id: category.id, item_name: '' }));
    setItemNameSearchTerm('');
  };

  const filteredCategories = useMemo(() => {
    if (!categorySearchTerm) return categories;
    const lowercasedFilter = categorySearchTerm.toLowerCase();
    return categories.filter(c => c.name.toLowerCase().includes(lowercasedFilter));
  }, [categories, categorySearchTerm]);

  // Item Name Searchable Dropdown Handlers
  const handleItemNameSearchChange = (e) => {
    const value = e.target.value;
    setItemNameSearchTerm(value);
    setShowItemNameSuggestions(true);
    setFormData(prev => ({ ...prev, item_name: '' }));
  };

  const handleItemNameSelect = (itemName) => {
    setItemNameSearchTerm(itemName);
    setShowItemNameSuggestions(false);
    setFormData(prev => ({ ...prev, item_name: itemName }));
  };

  const handleClearItemName = () => {
    setItemNameSearchTerm('');
    setFormData(prev => ({ ...prev, item_name: '' }));
    toast({ title: "Item Name Cleared", description: "Item name field has been reset." });
  };

  const filteredItemNames = useMemo(() => {
    if (!itemNameSearchTerm) return availableItems;
    const lowercasedFilter = itemNameSearchTerm.toLowerCase();
    return availableItems.filter(i => i.name.toLowerCase().includes(lowercasedFilter));
  }, [availableItems, itemNameSearchTerm]);

  // Unit Searchable Dropdown Handlers
  const handleUnitSearchChange = (e) => {
    const value = e.target.value;
    setUnitSearchTerm(value);
    setShowUnitSuggestions(true);
    setFormData(prev => ({ ...prev, unit: '' }));
  };

  const handleUnitSelect = (unit) => {
    setUnitSearchTerm(unit.name);
    setShowUnitSuggestions(false);
    setFormData(prev => ({ ...prev, unit: unit.name }));
  };

  const filteredUnits = useMemo(() => {
    if (!unitSearchTerm) return units;
    const lowercasedFilter = unitSearchTerm.toLowerCase();
    return units.filter(u => u.name.toLowerCase().includes(lowercasedFilter));
  }, [units, unitSearchTerm]);

  // Tax Type Validation & Handlers with Default Rates
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
      // Check if category already exists
      const existingCategory = categories.find(c => c.name.toLowerCase() === trimmed.toLowerCase());
      if (existingCategory) {
        setCategorySearchTerm(existingCategory.name);
        setFormData(prev => ({ ...prev, category: existingCategory.name, category_id: existingCategory.id }));
        setIsAddCategoryOpen(false);
        setNewCategoryName("");
        setNewCategoryDescription("");
        toast({ title: "Category Selected", description: `${trimmed} already exists and has been selected.` });
        return;
      }

      const { data, error } = await addCategory({
        name: trimmed,
        description: newCategoryDescription.trim() || null
      });

      if (error) throw error;

      setCategorySearchTerm(data.name);
      setFormData(prev => ({ ...prev, category: data.name, category_id: data.id }));
      setIsAddCategoryOpen(false);
      setNewCategoryName("");
      setNewCategoryDescription("");

    } catch (err) {
      console.error('Error adding category:', err);
    } finally {
      setAddingNewCategory(false);
    }
  };

  const handleAddNewItem = async () => {
    if (!newItemName.trim() || !formData.category_id) {
      toast({ title: "Error", description: "Item name and Category are required.", variant: "destructive" });
      return;
    }
    
    setAddingNewItem(true);
    
    try {
      const trimmed = newItemName.trim();

      const { data, error } = await addItem({
        name: trimmed,
        category_id: formData.category_id,
        description: null
      });
      
      if (error) throw error;

      setItemNameSearchTerm(data.name);
      setFormData(prev => ({ ...prev, item_name: data.name }));
      setIsAddItemOpen(false);
      setNewItemName("");

    } catch (err) {
      console.error('Error adding item:', err);
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
      const symbolTrimmed = newUnitSymbol.trim() || trimmed;

      // Check if unit already exists
      const existingUnit = units.find(u => u.name.toLowerCase() === trimmed.toLowerCase());
      if (existingUnit) {
        setUnitSearchTerm(existingUnit.name);
        setFormData(prev => ({ ...prev, unit: existingUnit.name }));
        setIsAddUnitOpen(false);
        setNewUnitName("");
        setNewUnitSymbol("");
        toast({ title: "Unit Selected", description: `${trimmed} already exists and has been selected.` });
        return;
      }

      const { data, error } = await addUnit({
        name: trimmed,
        symbol: symbolTrimmed
      });
      
      if (error) throw error;

      setUnitSearchTerm(data.name);
      setFormData(prev => ({ ...prev, unit: data.name }));
      setIsAddUnitOpen(false);
      setNewUnitName("");
      setNewUnitSymbol("");

    } catch (err) {
      console.error('Error adding unit:', err);
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
    const category = categories.find(c => c.id === formData.category_id);
    if (!category) {
      toast({ title: "No Category Selected", description: "Please select a category to delete.", variant: "destructive" });
      return;
    }
    
    setCategoryToDelete(category);
    setIsDeleteCategoryOpen(true);
  };

  const handleDeleteCategoryConfirm = async () => {
    if (!categoryToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await deleteCategory(categoryToDelete.id);
      if (error) throw error;

      setCategorySearchTerm('');
      setFormData(prev => ({ ...prev, category: '', category_id: '', item_name: '' }));
      setIsDeleteCategoryOpen(false);
      setCategoryToDelete(null);
      
    } catch (err) {
      console.error('Error deleting category:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteItemInit = () => {
    const item = availableItems.find(i => i.name === formData.item_name);
    if (!item) {
      toast({ title: "No Item Selected", description: "Please select an item to delete.", variant: "destructive" });
      return;
    }
    
    setItemToDelete(item);
    setIsDeleteItemOpen(true);
  };

  const handleDeleteItemConfirm = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await deleteItem(itemToDelete.id);
      if (error) throw error;

      setItemNameSearchTerm('');
      setFormData(prev => ({ ...prev, item_name: '' }));
      setIsDeleteItemOpen(false);
      setItemToDelete(null);
      
    } catch (err) {
      console.error('Error deleting item:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteUnitInit = () => {
    const unit = units.find(u => u.name === formData.unit);
    if (!unit) {
      toast({ title: "No Unit Selected", description: "Please select a unit to delete.", variant: "destructive" });
      return;
    }

    setUnitToDelete(unit);
    setIsDeleteUnitOpen(true);
  };

  const handleDeleteUnitConfirm = async () => {
    if (!unitToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await deleteUnit(unitToDelete.id);
      if (error) throw error;

      setUnitSearchTerm('');
      setFormData(prev => ({ ...prev, unit: '' }));
      setIsDeleteUnitOpen(false);
      setUnitToDelete(null);
      
    } catch (err) {
      console.error('Error deleting unit:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditItem = (item) => {
    setEditingItemId(item.id);
    
    // Find the matching category
    const matchingCategory = categories.find(c => c.name === item.category);
    
    setCategorySearchTerm(item.category);
    setItemNameSearchTerm(item.item_name);
    setUnitSearchTerm(item.unit);
    
    setFormData(prev => ({
      ...prev,
      category: item.category,
      category_id: matchingCategory?.id || '',
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
    const { item_name, category, unit, quantity, price } = formData;

    // Validate category exists in database
    const validCategory = categories.find(c => c.name === category);
    if (!validCategory) {
      toast({ title: 'Invalid Category', description: 'Please select a valid category from the suggestions.', variant: 'destructive' });
      return;
    }

    // Validate item exists in database
    const validItem = availableItems.find(i => i.name === item_name);
    if (!validItem) {
      toast({ title: 'Invalid Item Name', description: 'Please select a valid item name from the suggestions.', variant: 'destructive' });
      return;
    }

    // Validate unit exists in database
    const validUnit = units.find(u => u.name === unit);
    if (!validUnit) {
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
            total_price: totalPrice
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
        total_price: totalPrice
      };

      setItemsList(prev => [...prev, newItem]);
      toast({ title: "Item Added", description: "Item added to the invoice list." });
    }

    setCategorySearchTerm('');
    setItemNameSearchTerm('');
    setUnitSearchTerm('');
    setFormData(prev => ({
        ...prev,
        category: '',
        category_id: '',
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
      setFormData(prev => ({
        ...prev,
        category: '',
        category_id: '',
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

  // Calculate Tax Amounts and Grand Total
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

  const handleUpdateInvoice = async () => {
    if (!formData.supplier_id || !formData.supplier_invoice_number || !formData.invoice_date) {
      toast({ 
        title: "Validation Error", 
        description: "Please ensure Supplier Name, Invoice Number, and Invoice Date are filled out correctly.", 
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
      console.log('\n💾 ========== STARTING INVOICE UPDATE ==========');

      // Delete all existing items for this invoice
      const { error: deleteError } = await supabase
        .from('items')
        .delete()
        .eq('supplier_invoice_number', formData.supplier_invoice_number)
        .eq('supplier_name', formData.supplier_name);

      if (deleteError) throw deleteError;
      console.log('✅ Existing items deleted');

      // Insert updated regular items
      const itemsToInsert = itemsList.map(item => {
        const itemTaxableAmount = item.total_price;
        const itemSgst = sgstChecked && sgstRate ? parseFloat(((itemTaxableAmount * parseFloat(sgstRate)) / 100).toFixed(2)) : 0;
        const itemCgst = cgstChecked && cgstRate ? parseFloat(((itemTaxableAmount * parseFloat(cgstRate)) / 100).toFixed(2)) : 0;
        const itemIgst = igstChecked && igstRate ? parseFloat(((itemTaxableAmount * parseFloat(igstRate)) / 100).toFixed(2)) : 0;
        const itemTotalWithGst = Math.round(item.total_price + itemSgst + itemCgst + itemIgst);

        return {
          id: generateUUID(),
          supplier_id: formData.supplier_id,
          supplier_invoice_number: formData.supplier_invoice_number,
          invoice_date: formData.invoice_date,
          category: item.category,
          item_name: item.item_name,
          unit: item.unit,
          quantity: item.quantity,
          price: item.price,
          total_price: item.total_price,
          supplier_name: formData.supplier_name,
          used_quantity: 0,
          cgst: itemCgst,
          sgst: itemSgst,
          igst: itemIgst,
          total_price_with_gst: itemTotalWithGst,
          department: formData.department,
          user_name: formData.user_name,
          notes: detailsNotes || null
        };
      });

      if (itemsToInsert.length > 0) {
        const { error: insertItemsError } = await supabase
          .from('items')
          .insert(itemsToInsert);

        if (insertItemsError) throw insertItemsError;
        console.log('✅ Regular items inserted');
      }

      // Insert other charges
      if (otherChargesList.length > 0) {
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

        const { error: insertChargesError } = await supabase
          .from('items')
          .insert(otherChargesItems);

        if (insertChargesError) throw insertChargesError;
        console.log('✅ Other charges inserted');
      }

      console.log('\n✅ ========== INVOICE UPDATE COMPLETE ==========');

      toast({ 
        title: "Success", 
        description: `Invoice updated successfully with ${itemsList.length} items and ${otherChargesList.length} other charges!`,
        variant: "default"
      });
      
      if (onSuccess) onSuccess();
      onClose();
      
    } catch (error) {
       console.error('\n❌ ========== UPDATE INVOICE ERROR ==========');
       console.error('Error:', error);
       
       toast({ 
         title: "Database Error", 
         description: error.message || "An unexpected error occurred while updating the invoice.", 
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

    const fileName = `Supplier_Invoice_${formData.supplier_invoice_number || 'edit'}.pdf`;
    doc.save(fileName);
    toast({ title: "PDF Downloaded", description: "Invoice has been saved as PDF." });
  };

  const validDepartments = availableDepartments.filter(dept => dept && dept.trim() !== '');
  const validUsers = availableUsers.filter(user => user && user.trim() !== '');

  const isDataLoading = categoriesLoading || unitsLoading || itemsLoading;

  return (
    <>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
        <Card className="border-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Edit Supplier Invoice</CardTitle>
            <Button type="button" onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white">
              Go Back
            </Button>
          </CardHeader>
          
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-3">
             {isDataLoading && (
               <div className="md:col-span-2 flex items-center justify-center py-8">
                 <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                 <span className="ml-3 text-gray-600">Loading data from database...</span>
               </div>
             )}

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
                                className={`pl-8 bg-white text-gray-900 ${!formData.supplier_id && supplierSearchTerm ? "border-amber-400 focus-visible:ring-amber-400" : ""}`}
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
                    <Input 
                      id="supplier_invoice_number" 
                      value={formData.supplier_invoice_number} 
                      onChange={handleInputChange} 
                      placeholder="Enter invoice number"
                      className="bg-white text-gray-900"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="invoice_date">Invoice Date <span className="text-red-500">*</span></Label>
                    <Input 
                      id="invoice_date" 
                      type="date" 
                      value={formData.invoice_date} 
                      onChange={handleInputChange} 
                      className="w-full bg-white text-gray-900"
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
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      onClick={handleDeleteCategoryInit} 
                      disabled={!formData.category_id} 
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
                        placeholder="Search category..."
                        className="bg-white text-gray-900"
                      />
                      {showCategorySuggestions && filteredCategories.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {filteredCategories.map(c => (
                            <div
                              key={c.id}
                              className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                              onClick={() => handleCategorySelect(c)}
                            >
                              <div className="font-medium">{c.name}</div>
                              {c.description && <div className="text-xs text-gray-500">{c.description}</div>}
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
                        placeholder={!formData.category ? "Select Category First" : "Search item name..."}
                        disabled={!formData.category}
                        className="bg-white text-gray-900"
                      />
                      {showItemNameSuggestions && filteredItemNames.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {filteredItemNames.map((item) => (
                            <div
                              key={item.id}
                              className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                              onClick={() => handleItemNameSelect(item.name)}
                            >
                              {item.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleClearItemName}
                      disabled={!itemNameSearchTerm}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      title="Clear Item Name"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      disabled={!formData.category} 
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
                        placeholder="Search unit..."
                        className="bg-white text-gray-900"
                      />
                      {showUnitSuggestions && filteredUnits.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {filteredUnits.map(u => (
                            <div
                              key={u.id}
                              className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                              onClick={() => handleUnitSelect(u)}
                            >
                              <div className="font-medium">{u.name}</div>
                              {u.symbol && u.symbol !== u.name && <div className="text-xs text-gray-500">Symbol: {u.symbol}</div>}
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
                    onClick={handleUpdateInvoice}
                    className="bg-blue-600 hover:bg-blue-700 text-white min-w-[150px]"
                    disabled={itemsList.length === 0 || isSaving}
                  >
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {isSaving ? "Updating..." : "Update Invoice"}
                  </Button>
              </div>
            </CardFooter>
        </Card>
      </motion.div>
      
      {/* Add Supplier Dialog */}
      <Dialog open={isAddSupplierOpen} onOpenChange={setIsAddSupplierOpen}>
        <AddSupplierForm onSupplierAdded={handleSupplierAdded} isOpen={isAddSupplierOpen} />
      </Dialog>
      
      {/* Edit Supplier Dialog */}
      <Dialog open={isEditSupplierOpen} onOpenChange={setIsEditSupplierOpen}>
        {formData.supplier_id && (
             <EditSupplierForm 
                supplierId={formData.supplier_id} 
                suppliers={suppliers} 
                onSupplierUpdated={handleSupplierUpdated} 
             />
        )}
      </Dialog>

      {/* Delete Category Confirmation */}
      <AlertDialog open={isDeleteCategoryOpen} onOpenChange={setIsDeleteCategoryOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the category <strong>{categoryToDelete?.name}</strong>?
              <br /><br />
              This action will also delete <strong>ALL items</strong> associated with this category from the items_master table. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteCategoryConfirm} 
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Delete Category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Item Confirmation */}
      <AlertDialog open={isDeleteItemOpen} onOpenChange={setIsDeleteItemOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the item <strong>{itemToDelete?.name}</strong>?
              <br /><br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteItemConfirm} 
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Delete Item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Unit Confirmation */}
      <AlertDialog open={isDeleteUnitOpen} onOpenChange={setIsDeleteUnitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Unit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the unit <strong>{unitToDelete?.name}</strong>?
              <br /><br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUnitConfirm} 
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Delete Unit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Category Dialog */}
      <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
        <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
              <DialogDescription>
                Add a new category to the database. It will be immediately available in all forms.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div>
                  <Label>Category Name <span className="text-red-500">*</span></Label>
                  <Input 
                    value={newCategoryName} 
                    onChange={(e) => setNewCategoryName(e.target.value)} 
                    placeholder="e.g., ELECTRONICS, TOOLS" 
                    className="bg-white text-gray-900 mt-1" 
                  />
                </div>
                <div>
                  <Label>Description (Optional)</Label>
                  <Input 
                    value={newCategoryDescription} 
                    onChange={(e) => setNewCategoryDescription(e.target.value)} 
                    placeholder="Brief description of this category" 
                    className="bg-white text-gray-900 mt-1" 
                  />
                </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddCategoryOpen(false)}>Cancel</Button>
              <Button onClick={handleAddNewCategory} disabled={addingNewCategory}>
                {addingNewCategory && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Add Category
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Item to {formData.category}</DialogTitle>
              <DialogDescription>
                Add a new item to the items_master table. It will be immediately available in all forms.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Label>Item Name <span className="text-red-500">*</span></Label>
                <Input 
                  value={newItemName} 
                  onChange={(e) => setNewItemName(e.target.value)} 
                  placeholder="Enter full item description" 
                  className="bg-white text-gray-900 mt-1" 
                />
                <p className="text-xs text-gray-500 mt-2">
                  This item will be added to the category: <strong>{formData.category}</strong>
                </p>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddItemOpen(false)}>Cancel</Button>
                <Button onClick={handleAddNewItem} disabled={addingNewItem}>
                    {addingNewItem && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Add Item
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Unit Dialog */}
      <Dialog open={isAddUnitOpen} onOpenChange={setIsAddUnitOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Unit</DialogTitle>
            <DialogDescription>
              Add a new unit of measurement to the database. It will be immediately available in all forms.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
              <div>
                <Label>Unit Name <span className="text-red-500">*</span></Label>
                <Input 
                  value={newUnitName} 
                  onChange={(e) => setNewUnitName(e.target.value)} 
                  placeholder="e.g., Dozen, Pair, Box" 
                  className="bg-white text-gray-900 mt-1" 
                />
              </div>
              <div>
                <Label>Symbol (Optional)</Label>
                <Input 
                  value={newUnitSymbol} 
                  onChange={(e) => setNewUnitSymbol(e.target.value)} 
                  placeholder="e.g., dz, pr, bx" 
                  className="bg-white text-gray-900 mt-1" 
                />
                <p className="text-xs text-gray-500 mt-1">
                  If not provided, the unit name will be used as the symbol.
                </p>
              </div>
          </div>
          <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddUnitOpen(false)}>Cancel</Button>
              <Button onClick={handleAddNewUnit} disabled={addingNewUnit}>
                  {addingNewUnit && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                  Add Unit
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EditSupplierInvoiceForm;
