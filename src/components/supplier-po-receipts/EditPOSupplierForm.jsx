
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, PlusCircle, Trash2, AlertCircle, Loader2, ArrowLeft, FileDown, ChevronsUpDown, Check, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
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
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/lib/customSupabaseClient';
import { format } from 'date-fns';
import AddSupplierForm from '@/components/suppliers/AddSupplierForm';
import useSupplierManagement from '@/hooks/useSupplierManagement';
import useCategories from '@/hooks/useCategories';
import useItemsMaster from '@/hooks/useItemsMaster';
import useUnits from '@/hooks/useUnits';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { numberToWords } from '@/lib/numberToWords';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Helper function to safely convert Decimal/Object/String discount values to numbers
 * Handles Supabase Decimal type objects that come back as { value: "100.50" } or similar structures
 */
const convertDiscountToNumber = (discount) => {
  // If already a valid number, return it
  if (typeof discount === 'number' && !isNaN(discount)) {
    return discount;
  }

  // If null or undefined, return 0
  if (discount === null || discount === undefined) {
    return 0;
  }

  // If it's an object (Decimal type from Supabase), try to extract the value
  if (typeof discount === 'object' && discount !== null) {
    // Check for common Decimal object structures
    if (discount.value !== undefined) {
      const parsed = parseFloat(discount.value);
      return isNaN(parsed) ? 0 : parsed;
    }
    
    // Try toString() method if object has it
    if (typeof discount.toString === 'function') {
      const parsed = parseFloat(discount.toString());
      return isNaN(parsed) ? 0 : parsed;
    }
    
    // Try valueOf() method
    if (typeof discount.valueOf === 'function') {
      const value = discount.valueOf();
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    
    // Last resort: try JSON.stringify and parse
    try {
      const stringified = JSON.stringify(discount);
      const parsed = parseFloat(stringified.replace(/[^0-9.-]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    } catch (e) {
      console.warn('⚠️ Failed to convert object discount to number:', discount, e);
      return 0;
    }
  }

  // If it's a string, parse it
  if (typeof discount === 'string') {
    const parsed = parseFloat(discount);
    return isNaN(parsed) ? 0 : parsed;
  }

  // Fallback to 0 if all else fails
  console.warn('⚠️ Unknown discount type, defaulting to 0:', typeof discount, discount);
  return 0;
};

const EditPOSupplierForm = ({ receipt, onClose, onSuccess }) => {
  const { toast } = useToast();
  const { suppliers, fetchSuppliers, addSupplier, loading: suppliersLoading } = useSupplierManagement();
  const { categories, loading: categoriesLoading, addCategory, deleteCategory } = useCategories();
  const { items: itemsMaster, loading: itemsLoading, addItem: addItemMaster, deleteItem: deleteItemMaster, refreshItems } = useItemsMaster();
  const { units, loading: unitsLoading, addUnit, deleteUnit } = useUnits();

  const dataLoadedRef = useRef(false);

  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [deptUserMap, setDeptUserMap] = useState({});
  
  const [openSupplierCombobox, setOpenSupplierCombobox] = useState(false);
  const [openDepartmentCombobox, setOpenDepartmentCombobox] = useState(false);
  const [openUserCombobox, setOpenUserCombobox] = useState(false);
  const [openCategoryCombobox, setOpenCategoryCombobox] = useState(false);
  const [openItemCombobox, setOpenItemCombobox] = useState(false);
  const [openUnitCombobox, setOpenUnitCombobox] = useState(false);

  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [availableItems, setAvailableItems] = useState([]);

  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [isDeleteCategoryOpen, setIsDeleteCategoryOpen] = useState(false);
  const [isDeleteItemOpen, setIsDeleteItemOpen] = useState(false);
  const [isDeleteUnitOpen, setIsDeleteUnitOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitSymbol, setNewUnitSymbol] = useState("");
  const [addingNewItem, setAddingNewItem] = useState(false);
  const [addingNewUnit, setAddingNewUnit] = useState(false);
  const [addingNewCategory, setAddingNewCategory] = useState(false);

  const [otherCharges, setOtherCharges] = useState([]);
  const [currentCharge, setCurrentCharge] = useState({
    description: '',
    price: ''
  });

  const [sgstChecked, setSgstChecked] = useState(false);
  const [cgstChecked, setCgstChecked] = useState(false);
  const [igstChecked, setIgstChecked] = useState(false);
  const [notes, setNotes] = useState('');

  const initialProductState = {
    category: '',
    item_name: '',
    unit: '',
    quantity: '',
    price_for_one: '',
    discount: '',
  };

  const [receiptData, setReceiptData] = useState({
    po_from_supplier_no: '',
    purchase_order_date: null,
    supplier_id: '',
    department: '',
    user_name: '',
  });

  const [currentProduct, setCurrentProduct] = useState(initialProductState);
  const [addedItems, setAddedItems] = useState([]);
  const [calculatedPrices, setCalculatedPrices] = useState({
    total_price: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const uniqueSuppliers = useMemo(() => {
    if (!suppliers || !Array.isArray(suppliers)) return [];
    return Array.from(new Map(suppliers.map(s => [s.id, s])).values());
  }, [suppliers]);

  const categoryList = useMemo(() => {
    return categories.map(c => c.name).sort();
  }, [categories]);

  const unitList = useMemo(() => {
    return units.map(u => u.name).sort();
  }, [units]);

  useEffect(() => {
    if (selectedCategoryId && itemsMaster.length > 0) {
      const filteredItems = itemsMaster
        .filter(item => item.category_id === selectedCategoryId)
        .map(item => item.name)
        .sort();
      
      setAvailableItems(filteredItems);
      
      if (currentProduct.item_name && !filteredItems.includes(currentProduct.item_name)) {
        setCurrentProduct(prev => ({ ...prev, item_name: '' }));
      }
    } else {
      setAvailableItems([]);
    }
  }, [selectedCategoryId, itemsMaster, currentProduct.item_name]);

  const getDepartmentsAndUsers = (supplier) => {
    const depts = [];
    const deptUserMapping = {};

    if (supplier.departments && Array.isArray(supplier.departments) && supplier.departments.length > 0) {
      supplier.departments.forEach(dept => {
        const deptName = dept.department_name || dept.name || dept.department;
        const userName = dept.user_name || dept.user;
        
        if (deptName) {
          depts.push(deptName);
          if (userName) {
            if (!deptUserMapping[deptName]) {
              deptUserMapping[deptName] = [];
            }
            deptUserMapping[deptName].push(userName);
          }
        }
      });
    }

    const legacyDepts = [
      supplier.department1, supplier.department2, supplier.department3,
      supplier.department4, supplier.department5
    ];
    
    const legacyUsers = [
      supplier.user1, supplier.user2, supplier.user3,
      supplier.user4, supplier.user5
    ];

    legacyDepts.forEach((deptName, index) => {
      if (deptName) {
        depts.push(deptName);
        const userName = legacyUsers[index];
        if (userName) {
          if (!deptUserMapping[deptName]) {
            deptUserMapping[deptName] = [];
          }
          deptUserMapping[deptName].push(userName);
        }
      }
    });

    const uniqueDepts = [...new Set(depts.filter(Boolean))];
    return { uniqueDepts, deptUserMapping };
  };

  useEffect(() => {
    if (dataLoadedRef.current) return;

    const loadReceiptData = async () => {
      if (!receipt || !receipt.id) {
        toast({ title: 'Error', description: 'Invalid receipt data provided.', variant: 'destructive' });
        return;
      }

      try {
        console.log('🔍 [EditPOSupplierForm] Fetching receipt items for receipt_id:', receipt.id);
        
        // Explicitly select all fields including discount
        const { data: itemsData, error: itemsError } = await supabase
          .from('supplier_purchase_order_receipt_items')
          .select('id, category, item_name, unit, quantity, price_for_one, discount, total_price, cgst, sgst, igst, total_price_with_gst, created_at')
          .eq('receipt_id', receipt.id);

        if (itemsError) {
          console.error('❌ [EditPOSupplierForm] Error fetching items:', itemsError);
          throw itemsError;
        }

        console.log('📊 [EditPOSupplierForm] Raw items from DB:', itemsData);
        
        // Log discount values specifically with type analysis
        if (itemsData && itemsData.length > 0) {
          itemsData.forEach((item, index) => {
            console.log(`  Item ${index + 1} - ${item.item_name} discount analysis:`, {
              raw_value: item.discount,
              type: typeof item.discount,
              is_object: typeof item.discount === 'object',
              is_null: item.discount === null,
              is_undefined: item.discount === undefined,
              object_keys: typeof item.discount === 'object' && item.discount !== null ? Object.keys(item.discount) : 'N/A',
              object_stringified: typeof item.discount === 'object' && item.discount !== null ? JSON.stringify(item.discount) : 'N/A'
            });
          });
        }

        setReceiptData({
          po_from_supplier_no: receipt.po_from_supplier_no || '',
          purchase_order_date: receipt.purchase_order_date ? new Date(receipt.purchase_order_date) : null,
          supplier_id: receipt.supplier_id || '',
          department: receipt.department || '',
          user_name: receipt.user_name || '',
        });

        setSelectedDepartment(receipt.department || '');
        setSelectedUserName(receipt.user_name || '');

        if (itemsData && itemsData.length > 0) {
          const loadedItems = itemsData.map((item, index) => {
            // Use the helper function to convert discount safely
            const convertedDiscount = convertDiscountToNumber(item.discount);
            
            console.log(`  ✅ Item ${index + 1} - ${item.item_name} conversion result:`, {
              original_discount: item.discount,
              original_type: typeof item.discount,
              converted_discount: convertedDiscount,
              converted_type: typeof convertedDiscount,
              quantity: parseFloat(item.quantity) || 0,
              price_for_one: parseFloat(item.price_for_one) || 0,
              total_price: parseFloat(item.total_price) || 0
            });

            return {
              id: item.id,
              category: item.category || '',
              item_name: item.item_name || '',
              unit: item.unit || '',
              quantity: parseFloat(item.quantity) || 0,
              price_for_one: parseFloat(item.price_for_one) || 0,
              discount: convertedDiscount,
              total_price: parseFloat(item.total_price) || 0,
            };
          });
          
          console.log('✅ [EditPOSupplierForm] Loaded items with converted discount values:', loadedItems);
          setAddedItems(loadedItems);
        }

        if (receipt.other_charges && Array.isArray(receipt.other_charges)) {
          setOtherCharges(receipt.other_charges.map(charge => ({
            id: charge.id || `charge-${Date.now()}-${Math.random()}`,
            description: charge.description || '',
            price: parseFloat(charge.price) || 0
          })));
        }

        setSgstChecked(receipt.sgst_checked || false);
        setCgstChecked(receipt.cgst_checked || false);
        setIgstChecked(receipt.igst_checked || false);
        setNotes(receipt.notes || '');

        dataLoadedRef.current = true;

        toast({ title: 'Receipt Loaded', description: 'Receipt data loaded successfully with discount values.' });

      } catch (err) {
        console.error('❌ [EditPOSupplierForm] Error loading receipt:', err);
        toast({ title: 'Error', description: `Failed to load receipt: ${err.message}`, variant: 'destructive' });
      }
    };

    loadReceiptData();
  }, [receipt?.id, toast]);

  useEffect(() => {
    if (receiptData.supplier_id && uniqueSuppliers.length > 0 && !selectedSupplier) {
      const supplier = uniqueSuppliers.find(s => s.id === receiptData.supplier_id);
      if (supplier) {
        console.log('✅ Supplier found and set:', supplier.supplier_name);
        setSelectedSupplier(supplier);
      } else {
        console.warn('⚠️ Supplier not found in uniqueSuppliers for ID:', receiptData.supplier_id);
      }
    }
  }, [receiptData.supplier_id, uniqueSuppliers, selectedSupplier]);

  useEffect(() => {
    if (selectedSupplier) {
      const supplier = uniqueSuppliers.find(s => s.id === selectedSupplier.id);
      if (supplier) {
        const { uniqueDepts, deptUserMapping } = getDepartmentsAndUsers(supplier);
        setAvailableDepartments(uniqueDepts);
        setDeptUserMap(deptUserMapping);
      } else {
        setAvailableDepartments([]);
        setDeptUserMap({});
      }
    } else {
      setAvailableDepartments([]);
      setDeptUserMap({});
    }
  }, [selectedSupplier, uniqueSuppliers]);

  useEffect(() => {
    if (selectedSupplier && selectedDepartment) {
      const usersForDept = deptUserMap[selectedDepartment] || [];
      const uniqueUsers = [...new Set(usersForDept.filter(Boolean))];
      setAvailableUsers(uniqueUsers);
    } else if (selectedSupplier) {
      const allUsers = Object.values(deptUserMap).flat();
      const uniqueUsers = [...new Set(allUsers.filter(Boolean))];
      setAvailableUsers(uniqueUsers);
    } else {
      setAvailableUsers([]);
    }
  }, [selectedSupplier, selectedDepartment, deptUserMap]);

  useEffect(() => {
    const quantity = parseFloat(currentProduct.quantity) || 0;
    const price_for_one = parseFloat(currentProduct.price_for_one) || 0;
    const discount = parseFloat(currentProduct.discount) || 0;

    const total_price = (price_for_one * quantity) - discount;
    setCalculatedPrices({ total_price });
  }, [currentProduct.quantity, currentProduct.price_for_one, currentProduct.discount]);

  const totalOfItems = useMemo(() => {
    return addedItems.reduce((sum, item) => sum + item.total_price, 0);
  }, [addedItems]);

  const totalOfOtherCharges = useMemo(() => {
    return otherCharges.reduce((sum, charge) => sum + (parseFloat(charge.price) || 0), 0);
  }, [otherCharges]);

  const taxableAmount = useMemo(() => {
    return totalOfItems + totalOfOtherCharges;
  }, [totalOfItems, totalOfOtherCharges]);

  const sgstAmount = useMemo(() => {
    return sgstChecked ? (taxableAmount * 0.09) : 0;
  }, [sgstChecked, taxableAmount]);

  const cgstAmount = useMemo(() => {
    return cgstChecked ? (taxableAmount * 0.09) : 0;
  }, [cgstChecked, taxableAmount]);

  const igstAmount = useMemo(() => {
    return igstChecked ? (taxableAmount * 0.18) : 0;
  }, [igstChecked, taxableAmount]);

  const grandTotal = useMemo(() => {
    return taxableAmount + sgstAmount + cgstAmount + igstAmount;
  }, [taxableAmount, sgstAmount, cgstAmount, igstAmount]);

  const grandTotalInWords = useMemo(() => {
    return numberToWords(grandTotal);
  }, [grandTotal]);

  const handleAddItem = () => {
    const { category, item_name, unit, quantity, price_for_one } = currentProduct;
    if (!category || !item_name || !unit || !quantity || !price_for_one) {
      toast({ title: 'Item Incomplete', description: 'Please fill all item fields before adding.', variant: 'destructive' });
      return;
    }

    const newItem = {
      ...currentProduct,
      ...calculatedPrices,
      id: `item-${Date.now()}-${addedItems.length}`,
    };
    
    console.log('➕ Adding new item with discount:', {
      discount: newItem.discount,
      total_price: newItem.total_price
    });
    
    setAddedItems(prev => [...prev, newItem]);
    setCurrentProduct(initialProductState);
    setSelectedCategoryId(null);
    
    toast({ title: 'Item Added', description: 'Item has been added to the list successfully.' });
  };

  const handleRemoveItem = (id) => {
    setAddedItems(prev => prev.filter(item => item.id !== id));
    toast({ title: 'Item Removed', description: 'Item has been removed from the list.' });
  };

  const handleAddCharge = () => {
    const { description, price } = currentCharge;
    if (!description || !description.trim() || !price || price === '') {
      toast({ title: 'Charge Incomplete', description: 'Please fill both description and price before adding.', variant: 'destructive' });
      return;
    }

    const newCharge = {
      id: `charge-${Date.now()}-${otherCharges.length}`,
      description: description.trim(),
      price: parseFloat(price)
    };

    setOtherCharges(prev => [...prev, newCharge]);
    setCurrentCharge({ description: '', price: '' });
  };

  const handleRemoveCharge = (id) => {
    setOtherCharges(prev => prev.filter(charge => charge.id !== id));
  };

  const handleFormSubmit = async () => {
    try {
      setIsSubmitting(true);

      if (!receiptData.po_from_supplier_no || receiptData.po_from_supplier_no.trim() === '') {
        toast({ title: 'Validation Error', description: 'PO to Supplier Number is required.', variant: 'destructive' });
        return;
      }

      if (addedItems.length === 0) {
        toast({ title: 'Validation Error', description: 'At least one item must be added.', variant: 'destructive' });
        return;
      }

      const receiptPayload = {
        po_from_supplier_no: receiptData.po_from_supplier_no,
        supplier_id: selectedSupplier?.id || receiptData.supplier_id,
        purchase_order_date: receiptData.purchase_order_date ? format(receiptData.purchase_order_date, 'yyyy-MM-dd') : null,
        grand_total: grandTotal,
        department: selectedDepartment || null,
        user_name: selectedUserName || null,
        other_charges: otherCharges.length > 0 ? otherCharges : null,
        sgst_checked: sgstChecked,
        cgst_checked: cgstChecked,
        igst_checked: igstChecked,
        taxable_amount: taxableAmount,
        sgst_amount: sgstAmount,
        cgst_amount: cgstAmount,
        igst_amount: igstAmount,
        grand_total_in_words: grandTotalInWords,
        notes: notes.trim() || null,
      };

      console.log('💾 Updating receipt with payload:', receiptPayload);

      const { error: updateError } = await supabase
        .from('supplier_purchase_order_receipts')
        .update(receiptPayload)
        .eq('id', receipt.id);

      if (updateError) throw updateError;

      await supabase
        .from('supplier_purchase_order_receipt_items')
        .delete()
        .eq('receipt_id', receipt.id);

      const itemsPayload = addedItems.map(item => {
        const itemData = {
          receipt_id: receipt.id,
          category: item.category,
          item_name: item.item_name,
          unit: item.unit,
          quantity: parseFloat(item.quantity),
          price_for_one: parseFloat(item.price_for_one),
          discount: parseFloat(item.discount) || 0,
          total_price: item.total_price,
          cgst: 0,
          sgst: 0,
          igst: 0,
          total_price_with_gst: item.total_price,
        };
        
        console.log(`💾 Saving item "${item.item_name}" with discount:`, itemData.discount);
        return itemData;
      });

      console.log('💾 Items payload with discount values:', itemsPayload);

      const { error: itemsError } = await supabase
        .from('supplier_purchase_order_receipt_items')
        .insert(itemsPayload);

      if (itemsError) {
        console.error('❌ Error inserting items:', itemsError);
        throw itemsError;
      }

      toast({ title: 'Success', description: 'PO Receipt updated successfully with discount values.' });
      if (onSuccess) onSuccess();
      onClose();

    } catch (err) {
      console.error('❌ Update error:', err);
      toast({ title: 'Update Error', description: 'An unexpected error occurred while updating.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
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

  const handleChargeInputChange = (e) => {
    const { id, value } = e.target;
    setCurrentCharge(prev => ({ ...prev, [id]: value }));
  };

  const handleDateChange = (id, date) => {
    setReceiptData((prev) => ({ ...prev, [id]: date }));
  };

  const handleSupplierSelect = (supplierId) => {
    const supplier = uniqueSuppliers.find(s => s.id === supplierId);
    if (supplier) {
      setSelectedSupplier(supplier);
      setReceiptData(prev => ({ ...prev, supplier_id: supplier.id }));
      setOpenSupplierCombobox(false);
    }
  };

  const handleDepartmentSelect = (deptName) => {
    setSelectedDepartment(deptName);
    setOpenDepartmentCombobox(false);
  };

  const handleUserSelect = (userName) => {
    setSelectedUserName(userName);
    setOpenUserCombobox(false);
  };

  const handleSupplierAdded = async (newSupplier) => {
    if (newSupplier) {
      await fetchSuppliers(true);
      setSelectedSupplier(newSupplier);
      setReceiptData(prev => ({...prev, supplier_id: newSupplier.id}));
      setIsAddSupplierOpen(false);
    }
  };

  const handleSavePdf = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPos = 20;

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Purchase Order Receipt to Supplier', pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`PO Number: ${receiptData.po_from_supplier_no || 'N/A'}`, 14, yPos);
      yPos += 6;
      doc.text(`PO Date: ${receiptData.purchase_order_date ? format(receiptData.purchase_order_date, 'dd-MM-yyyy') : 'N/A'}`, 14, yPos);
      yPos += 6;
      
      const supplierName = selectedSupplier?.supplier_name || 'N/A';
      doc.text(`Supplier: ${supplierName}`, 14, yPos);
      yPos += 6;
      
      if (selectedDepartment) {
        doc.text(`Department: ${selectedDepartment}`, 14, yPos);
        yPos += 6;
      }
      
      if (selectedUserName) {
        doc.text(`User: ${selectedUserName}`, 14, yPos);
        yPos += 6;
      }
      
      yPos += 5;

      if (addedItems.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Item Details', 14, yPos);
        yPos += 7;

        const itemsTableData = addedItems.map(item => [
          item.category,
          item.item_name,
          item.unit,
          item.quantity.toString(),
          `₹${parseFloat(item.price_for_one).toFixed(2)}`,
          `₹${(parseFloat(item.discount) || 0).toFixed(2)}`,
          `₹${item.total_price.toFixed(2)}`
        ]);

        itemsTableData.push([
          '', '', '', '', '', 
          'Total Price of Items:',
          `₹${totalOfItems.toFixed(2)}`
        ]);

        doc.autoTable({
          startY: yPos,
          head: [['Category', 'Item', 'Unit', 'Qty', 'Price/One', 'Discount', 'Total']],
          body: itemsTableData,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold', fontSize: 9, cellPadding: 2 },
          styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', cellWidth: 'wrap' },
          columnStyles: {
            0: { cellWidth: 22 },
            1: { cellWidth: 50 },
            2: { cellWidth: 18 },
            3: { halign: 'center', cellWidth: 15 },
            4: { halign: 'right', cellWidth: 25 },
            5: { halign: 'right', cellWidth: 25 },
            6: { halign: 'right', cellWidth: 28 }
          },
          didParseCell: function(data) {
            if (data.row.index === itemsTableData.length - 1) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [219, 234, 254];
              if (data.column.index === 5) {
                data.cell.styles.halign = 'right';
              }
            }
          }
        });
        yPos = doc.lastAutoTable.finalY + 10;
      }

      if (otherCharges.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Other Charges', 14, yPos);
        yPos += 7;

        const chargesTableData = otherCharges.map(charge => [
          charge.description,
          `₹${parseFloat(charge.price).toFixed(2)}`
        ]);

        chargesTableData.push([
          'Total Price of Other Charges:',
          `₹${totalOfOtherCharges.toFixed(2)}`
        ]);

        doc.autoTable({
          startY: yPos,
          head: [['Description', 'Price']],
          body: chargesTableData,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold', fontSize: 9, cellPadding: 2 },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 130 },
            1: { halign: 'right', cellWidth: 50 }
          },
          didParseCell: function(data) {
            if (data.row.index === chargesTableData.length - 1) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [219, 234, 254];
              if (data.column.index === 0) {
                data.cell.styles.halign = 'right';
              }
            }
          }
        });
        yPos = doc.lastAutoTable.finalY + 10;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const summaryX = pageWidth - 70;
      doc.text('Total Price of Items:', summaryX - 50, yPos);
      doc.text(`₹${totalOfItems.toFixed(2)}`, summaryX + 20, yPos, { align: 'right' });
      yPos += 6;

      doc.text('Total Price of Other Charges:', summaryX - 50, yPos);
      doc.text(`₹${totalOfOtherCharges.toFixed(2)}`, summaryX + 20, yPos, { align: 'right' });
      yPos += 6;

      doc.setFont('helvetica', 'bold');
      doc.text('Taxable Amount:', summaryX - 50, yPos);
      doc.text(`₹${taxableAmount.toFixed(2)}`, summaryX + 20, yPos, { align: 'right' });
      yPos += 8;

      if (sgstChecked || cgstChecked || igstChecked) {
        doc.setFontSize(11);
        doc.text('Tax Details', 14, yPos);
        yPos += 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        if (sgstChecked) {
          doc.text('SGST (9%):', summaryX - 50, yPos);
          doc.text(`₹${sgstAmount.toFixed(2)}`, summaryX + 20, yPos, { align: 'right' });
          yPos += 6;
        }

        if (cgstChecked) {
          doc.text('CGST (9%):', summaryX - 50, yPos);
          doc.text(`₹${cgstAmount.toFixed(2)}`, summaryX + 20, yPos, { align: 'right' });
          yPos += 6;
        }

        if (igstChecked) {
          doc.text('IGST (18%):', summaryX - 50, yPos);
          doc.text(`₹${igstAmount.toFixed(2)}`, summaryX + 20, yPos, { align: 'right' });
          yPos += 6;
        }
        yPos += 2;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text('Grand Total:', summaryX - 50, yPos);
      doc.text(`₹${grandTotal.toFixed(2)}`, summaryX + 20, yPos, { align: 'right' });
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(0, 0, 0);
      const wordsText = `Price in Words: ${grandTotalInWords}`;
      const splitWords = doc.splitTextToSize(wordsText, pageWidth - 28);
      doc.text(splitWords, 14, yPos);
      yPos += (splitWords.length * 5) + 8;

      if (notes && notes.trim()) {
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Details / Notes:', 14, yPos);
        yPos += 6;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const splitNotes = doc.splitTextToSize(notes, pageWidth - 28);
        doc.text(splitNotes, 14, yPos);
      }

      const fileName = `PO_Receipt_${receiptData.po_from_supplier_no || 'Edit'}_${format(new Date(), 'yyyyMMdd')}.pdf`;
      doc.save(fileName);

      toast({ title: "PDF Generated", description: `${fileName} has been downloaded successfully.` });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({ title: "PDF Generation Failed", description: "An error occurred while generating the PDF.", variant: "destructive" });
    }
  };

  const handleCategorySelect = (categoryName) => {
    setCurrentProduct(prev => ({ ...prev, category: categoryName, item_name: '' }));
    
    const selectedCategory = categories.find(c => c.name === categoryName);
    if (selectedCategory) {
      setSelectedCategoryId(selectedCategory.id);
    }
    
    setOpenCategoryCombobox(false);
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
        setCurrentProduct(prev => ({ ...prev, category: trimmed }));
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

      setCurrentProduct(prev => ({ ...prev, category: trimmed }));
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

  const handleDeleteCategoryInit = () => {
    const category = currentProduct.category;
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

      setCurrentProduct(prev => ({ ...prev, category: '', item_name: '' }));
      setSelectedCategoryId(null);
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

  const handleItemSelect = (itemName) => {
    setCurrentProduct(prev => ({ ...prev, item_name: itemName }));
    setOpenItemCombobox(false);
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

      setCurrentProduct(prev => ({ ...prev, item_name: trimmed }));
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

  const handleDeleteItemInit = () => {
    const itemName = currentProduct.item_name;
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
    const itemName = currentProduct.item_name;
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

      setCurrentProduct(prev => ({ ...prev, item_name: '' }));
      setIsDeleteItemOpen(false);
      
      await refreshItems();
      
      toast({ title: "Item Deleted", description: `Item '${itemName}' has been deleted from ${currentProduct.category}.` });
    } catch (err) {
      console.error('❌ Error deleting item:', err);
      toast({ title: "Error", description: `Failed to delete item: ${err.message}`, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUnitSelect = (unit) => {
    setCurrentProduct(prev => ({ ...prev, unit: unit }));
    setOpenUnitCombobox(false);
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
        setCurrentProduct(prev => ({ ...prev, unit: trimmed }));
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

      setCurrentProduct(prev => ({ ...prev, unit: trimmed }));
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

  const handleDeleteUnitInit = () => {
    const unit = currentProduct.unit;
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
    const unitName = currentProduct.unit;
    if (!unitName) return;

    const unitToDelete = units.find(u => u.name === unitName);
    if (!unitToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await deleteUnit(unitToDelete.id);

      if (error) throw error;

      setCurrentProduct(prev => ({ ...prev, unit: '' }));
      setIsDeleteUnitOpen(false);
      toast({ title: "Unit Deleted", description: `Unit '${unitName}' has been deleted.` });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: `Failed to delete unit: ${err.message}`, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const isLoadingData = categoriesLoading || itemsLoading || unitsLoading || suppliersLoading;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
      <Card className="max-w-5xl mx-auto border-none shadow-none md:border-solid md:shadow-sm">
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Edit Purchase Order Receipt to Supplier</CardTitle>
          <Button onClick={onClose} className="bg-blue-600 text-white hover:bg-blue-700 gap-2">
            <ArrowLeft className="h-4 w-4" /> Go Back
          </Button>
        </CardHeader>
        <CardContent className="space-y-6 max-h-[75vh] overflow-y-auto p-4 md:p-6">
          
          {isLoadingData && (
            <div className="px-6 py-4 bg-blue-50 border-l-4 border-blue-500">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="text-sm text-blue-800 font-medium">Loading data from database...</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-b pb-6">
            <div className="space-y-2">
              <Label htmlFor="po_from_supplier_no" className="flex items-center">
                PO to Supplier Number <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input 
                id="po_from_supplier_no" 
                value={receiptData.po_from_supplier_no} 
                onChange={handleReceiptInputChange}
                placeholder="Enter PO to Supplier Number"
                className="bg-white text-gray-900"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>PO to Supplier Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !receiptData.purchase_order_date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {receiptData.purchase_order_date ? format(receiptData.purchase_order_date, "dd-MM-yyyy") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50" style={{ pointerEvents: 'auto' }}>
                  <Calendar mode="single" selected={receiptData.purchase_order_date} onSelect={(date) => handleDateChange('purchase_order_date', date)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="supplier_id">Supplier Name</Label>
              <div className="flex gap-2">
                <Popover open={openSupplierCombobox} onOpenChange={setOpenSupplierCombobox}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      role="combobox" 
                      aria-expanded={openSupplierCombobox} 
                      className="w-full justify-between"
                      disabled={suppliersLoading}
                    >
                      {selectedSupplier ? selectedSupplier.supplier_name : (suppliersLoading ? "Loading suppliers..." : "Select a supplier")}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 z-50" style={{ pointerEvents: 'auto' }}>
                    <Command>
                      <CommandInput placeholder="Search supplier..." className="text-gray-900" />
                      <CommandList>
                        <CommandEmpty>No supplier found.</CommandEmpty>
                        <CommandGroup>
                          {uniqueSuppliers.map((supplier) => (
                            <CommandItem
                              key={supplier.id}
                              value={supplier.supplier_name}
                              onSelect={() => handleSupplierSelect(supplier.id)}
                              className="cursor-pointer"
                              style={{ pointerEvents: 'auto' }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", selectedSupplier?.id === supplier.id ? "opacity-100" : "opacity-0")} />
                              {supplier.supplier_name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Dialog open={isAddSupplierOpen} onOpenChange={setIsAddSupplierOpen}>
                  <Button variant="outline" onClick={() => setIsAddSupplierOpen(true)}>
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                  <DialogContent>
                    <AddSupplierForm onSupplierAdded={handleSupplierAdded} onClose={() => setIsAddSupplierOpen(false)} />
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Popover open={openDepartmentCombobox} onOpenChange={setOpenDepartmentCombobox}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={openDepartmentCombobox} className="w-full justify-between" disabled={!selectedSupplier || availableDepartments.length === 0}>
                    {selectedDepartment || "Select a department"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 z-50" style={{ pointerEvents: 'auto' }}>
                  <Command>
                    <CommandInput placeholder="Search department..." className="text-gray-900" />
                    <CommandList>
                      <CommandEmpty>No department found.</CommandEmpty>
                      <CommandGroup>
                        {availableDepartments.map((dept, index) => (
                          <CommandItem
                            key={`dept-${index}-${dept}`}
                            value={dept}
                            onSelect={() => handleDepartmentSelect(dept)}
                            className="cursor-pointer"
                            style={{ pointerEvents: 'auto' }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", selectedDepartment === dept ? "opacity-100" : "opacity-0")} />
                            {dept}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user_name">User Name</Label>
              <Popover open={openUserCombobox} onOpenChange={setOpenUserCombobox}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={openUserCombobox} className="w-full justify-between" disabled={!selectedSupplier || availableUsers.length === 0}>
                    {selectedUserName || "Select a user"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 z-50" style={{ pointerEvents: 'auto' }}>
                  <Command>
                    <CommandInput placeholder="Search user..." className="text-gray-900" />
                    <CommandList>
                      <CommandEmpty>No user found.</CommandEmpty>
                      <CommandGroup>
                        {availableUsers.map((userName, index) => (
                          <CommandItem
                            key={`user-${index}-${userName}`}
                            value={userName}
                            onSelect={() => handleUserSelect(userName)}
                            className="cursor-pointer"
                            style={{ pointerEvents: 'auto' }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", selectedUserName === userName ? "opacity-100" : "opacity-0")} />
                            {userName}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-4 border-b pb-6">
            <h3 className="text-lg font-bold">Add Item</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
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
                    disabled={!currentProduct.category} 
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    title="Delete Selected Category"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Popover open={openCategoryCombobox} onOpenChange={setOpenCategoryCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openCategoryCombobox}
                        className="w-full justify-between"
                        disabled={categoriesLoading}
                      >
                        {currentProduct.category || (categoriesLoading ? "Loading..." : "Select category")}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 z-50" style={{ pointerEvents: 'auto' }}>
                      <Command>
                        <CommandInput 
                          placeholder="Search category..." 
                          className="text-gray-900"
                        />
                        <CommandList>
                          <CommandEmpty>No category found.</CommandEmpty>
                          <CommandGroup>
                            {categoryList.map((cat) => (
                              <CommandItem
                                key={cat}
                                value={cat}
                                onSelect={() => handleCategorySelect(cat)}
                                className="cursor-pointer"
                                style={{ pointerEvents: 'auto' }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    currentProduct.category === cat ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {cat}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Item Name</Label>
                <div className="flex items-center gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    disabled={!currentProduct.category || itemsLoading} 
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
                    disabled={!currentProduct.item_name} 
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    title="Delete Selected Item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Popover open={openItemCombobox} onOpenChange={setOpenItemCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openItemCombobox}
                        className="w-full justify-between"
                        disabled={!currentProduct.category || itemsLoading}
                      >
                        {currentProduct.item_name || (!currentProduct.category ? "Select Category First" : (itemsLoading ? "Loading..." : "Select item"))}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 z-50" style={{ pointerEvents: 'auto' }}>
                      <Command>
                        <CommandInput 
                          placeholder="Search item..." 
                          className="text-gray-900"
                        />
                        <CommandList>
                          <CommandEmpty>No item found.</CommandEmpty>
                          <CommandGroup>
                            {availableItems.map((item, index) => (
                              <CommandItem
                                key={`${item}-${index}`}
                                value={item}
                                onSelect={() => handleItemSelect(item)}
                                className="cursor-pointer"
                                style={{ pointerEvents: 'auto' }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    currentProduct.item_name === item ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {item}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Unit</Label>
                <div className="flex items-center gap-2">
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
                    disabled={!currentProduct.unit} 
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    title="Delete Selected Unit"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Popover open={openUnitCombobox} onOpenChange={setOpenUnitCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openUnitCombobox}
                        className="w-full justify-between"
                        disabled={unitsLoading}
                      >
                        {currentProduct.unit || (unitsLoading ? "Loading..." : "Select unit")}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 z-50" style={{ pointerEvents: 'auto' }}>
                      <Command>
                        <CommandInput 
                          placeholder="Search unit..." 
                          className="text-gray-900"
                        />
                        <CommandList>
                          <CommandEmpty>No unit found.</CommandEmpty>
                          <CommandGroup>
                            {unitList.map((unit) => (
                              <CommandItem
                                key={unit}
                                value={unit}
                                onSelect={() => handleUnitSelect(unit)}
                                className="cursor-pointer"
                                style={{ pointerEvents: 'auto' }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    currentProduct.unit === unit ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {unit}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div><Label htmlFor="quantity">Quantity</Label><Input id="quantity" type="number" value={currentProduct.quantity} onChange={handleProductInputChange} className="bg-white text-gray-900" /></div>
              <div><Label htmlFor="price_for_one">Price for one</Label><Input id="price_for_one" type="number" value={currentProduct.price_for_one} onChange={handleProductInputChange} className="bg-white text-gray-900" /></div>
              <div><Label htmlFor="discount">Discount</Label><Input id="discount" type="number" step="0.01" value={currentProduct.discount} onChange={handleProductInputChange} placeholder="0.00" className="bg-white text-gray-900" /></div>
            </div>
            <div><Label htmlFor="total_price">Total Price</Label><Input id="total_price" type="number" value={calculatedPrices.total_price.toFixed(2)} readOnly className="bg-gray-100 text-gray-900" /></div>
            <div className="flex justify-end"><Button type="button" onClick={handleAddItem} className="gap-2 bg-blue-600 text-white hover:bg-blue-700"><PlusCircle size={16} /> Add Item</Button></div>
          </div>

          {addedItems.length > 0 && (
            <div className="space-y-4 border-b pb-6">
              <h3 className="text-lg font-bold text-gray-900">Added Items</h3>
              <div className="overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-gray-900">Category</TableHead>
                      <TableHead className="font-semibold text-gray-900">Item</TableHead>
                      <TableHead className="font-semibold text-gray-900">Unit</TableHead>
                      <TableHead className="font-semibold text-gray-900 text-center">Qty</TableHead>
                      <TableHead className="font-semibold text-gray-900 text-right">Price/One</TableHead>
                      <TableHead className="font-semibold text-gray-900 text-right">Discount</TableHead>
                      <TableHead className="font-semibold text-gray-900 text-right">Total</TableHead>
                      <TableHead className="font-semibold text-gray-900 text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {addedItems.map((item) => (
                      <TableRow key={item.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium text-gray-900">{item.category}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-gray-900" title={item.item_name}>{item.item_name}</TableCell>
                        <TableCell className="text-gray-900">{item.unit}</TableCell>
                        <TableCell className="text-center text-gray-900">{item.quantity}</TableCell>
                        <TableCell className="text-right text-gray-900">₹{parseFloat(item.price_for_one).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-gray-900">₹{(parseFloat(item.discount) || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-semibold text-gray-900">₹{item.total_price.toFixed(2)}</TableCell>
                        <TableCell className="text-center">
                          <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} className="hover:bg-red-50">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-blue-50 hover:bg-blue-50">
                      <TableCell colSpan={6} className="text-right font-bold text-gray-900">Total Price of Items:</TableCell>
                      <TableCell className="font-bold text-blue-600 text-right">₹{totalOfItems.toFixed(2)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </div>
          )}

          <div className="space-y-4 border-b pb-6">
            <h3 className="text-lg font-bold">Other Charges</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" type="text" value={currentCharge.description} onChange={handleChargeInputChange} placeholder="Enter charge description" className="bg-white text-gray-900" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input id="price" type="number" step="0.01" value={currentCharge.price} onChange={handleChargeInputChange} placeholder="0.00" className="bg-white text-gray-900" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={handleAddCharge} className="gap-2 bg-blue-600 text-white hover:bg-blue-700">
                <PlusCircle size={16} /> Add Charge
              </Button>
            </div>

            {otherCharges.length === 0 ? (
              <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                No other charges added.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {otherCharges.map(charge => (
                      <TableRow key={charge.id}>
                        <TableCell>{charge.description}</TableCell>
                        <TableCell className="text-right">₹{parseFloat(charge.price).toFixed(2)}</TableCell>
                        <TableCell className="text-center">
                          <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveCharge(charge.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-blue-50 hover:bg-blue-50">
                      <TableCell className="text-right font-bold">Total Price of Other Charges:</TableCell>
                      <TableCell className="text-right font-bold text-blue-600">₹{totalOfOtherCharges.toFixed(2)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}
          </div>

          <div className="space-y-4 bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h3 className="text-lg font-bold text-blue-900">Tax Details</h3>
            
            <div className="bg-white p-4 rounded-md border">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-700 font-medium">Taxable Amount:</span>
                <span className="text-blue-600 font-bold text-lg">₹{taxableAmount.toFixed(2)}</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center space-x-3">
                    <Checkbox id="sgst" checked={sgstChecked} onCheckedChange={setSgstChecked} />
                    <Label htmlFor="sgst" className="cursor-pointer font-medium">SGST (9%)</Label>
                  </div>
                  {sgstChecked && (
                    <span className="text-blue-600 font-semibold">₹{sgstAmount.toFixed(2)}</span>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center space-x-3">
                    <Checkbox id="cgst" checked={cgstChecked} onCheckedChange={setCgstChecked} />
                    <Label htmlFor="cgst" className="cursor-pointer font-medium">CGST (9%)</Label>
                  </div>
                  {cgstChecked && (
                    <span className="text-blue-600 font-semibold">₹{cgstAmount.toFixed(2)}</span>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center space-x-3">
                    <Checkbox id="igst" checked={igstChecked} onCheckedChange={setIgstChecked} />
                    <Label htmlFor="igst" className="cursor-pointer font-medium">IGST (18%)</Label>
                  </div>
                  {igstChecked && (
                    <span className="text-blue-600 font-semibold">₹{igstAmount.toFixed(2)}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 bg-gray-50 p-6 rounded-lg border">
            <h3 className="text-lg font-bold mb-4">Summary</h3>
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-medium">Total Price of Items:</span>
              <span className="text-blue-600 font-bold text-lg">₹{totalOfItems.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-medium">Total Price of Other Charges:</span>
              <span className="text-blue-600 font-bold text-lg">₹{totalOfOtherCharges.toFixed(2)}</span>
            </div>
            {(sgstChecked || cgstChecked || igstChecked) && (
              <>
                {sgstChecked && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">SGST (9%):</span>
                    <span className="text-blue-600 font-bold text-lg">₹{sgstAmount.toFixed(2)}</span>
                  </div>
                )}
                {cgstChecked && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">CGST (9%):</span>
                    <span className="text-blue-600 font-bold text-lg">₹{cgstAmount.toFixed(2)}</span>
                  </div>
                )}
                {igstChecked && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">IGST (18%):</span>
                    <span className="text-blue-600 font-bold text-lg">₹{igstAmount.toFixed(2)}</span>
                  </div>
                )}
              </>
            )}
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-900 font-bold text-lg">Grand Total:</span>
                <span className="text-blue-600 font-bold text-2xl">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700 font-medium mb-1">Price in Words:</p>
            <p className="text-center text-blue-900 font-medium italic">
              {grandTotalInWords}
            </p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="notes" className="text-lg font-bold">Details / Notes</Label>
            <Textarea 
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any additional details or notes..."
              className="bg-white text-gray-900 min-h-[120px]"
              rows={5}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap justify-between gap-2 border-t pt-4">
          <Button type="button" onClick={onClose} disabled={isSubmitting} className="bg-blue-600 text-white hover:bg-blue-700">
            Close
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleSavePdf} className="bg-blue-600 text-white hover:bg-blue-700 gap-2" disabled={addedItems.length === 0}>
              <FileDown className="h-4 w-4" /> Save as PDF
            </Button>
            <Button type="button" onClick={handleFormSubmit} disabled={isSubmitting} className="bg-blue-600 text-white hover:bg-blue-700">
              {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</>) : 'Update'}
            </Button>
          </div>
        </CardFooter>
      </Card>

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
          <DialogHeader><DialogTitle>Add New Item to {currentProduct.category}</DialogTitle></DialogHeader>
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

      <AlertDialog open={isDeleteCategoryOpen} onOpenChange={setIsDeleteCategoryOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the category <strong>{currentProduct.category}</strong>?
              This action will delete the category and <strong>ALL associated items</strong> inside it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
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
              Are you sure you want to delete the item <strong>{currentProduct.item_name}</strong> from category <strong>{currentProduct.category}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
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
              Are you sure you want to delete the unit <strong>{currentProduct.unit}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteUnitOpen(false)} disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUnitConfirm} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Delete Unit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default EditPOSupplierForm;
