import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const useSupplierInvoiceItems = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [itemNamesMap, setItemNamesMap] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        // Fetch from items table as requested
        const { data, error } = await supabase.from('items').select('category, item_name');
        if (error) throw error;

        const uniqueCategories = new Set();
        const map = {};

        // Process data from items
        (data || []).forEach(row => {
          if (row.category) {
            uniqueCategories.add(row.category);
            if (!map[row.category]) map[row.category] = new Set();
            if (row.item_name) map[row.category].add(row.item_name);
          }
        });

        // Also fetch from product_list for a complete standardized list
        const { data: prodData } = await supabase.from('product_list').select('product_name, type');
        if (prodData) {
          prodData.forEach(row => {
            if (row.type && row.type !== 'UNIT') {
              uniqueCategories.add(row.type);
              if (!map[row.type]) map[row.type] = new Set();
              if (row.product_name && row.product_name !== '_init_') {
                map[row.type].add(row.product_name);
              }
            }
          });
        }

        setCategories(Array.from(uniqueCategories).sort());
        const finalMap = {};
        Object.keys(map).forEach(cat => {
          finalMap[cat] = Array.from(map[cat]).sort();
        });
        setItemNamesMap(finalMap);
      } catch (err) {
        console.error("Error fetching items/categories:", err);
      }
    };
    fetchDropdownData();
  }, []);

  const addItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: generateUUID(),
        category: '',
        item_name: '',
        unit: '',
        quantity: '',
        price: '',
        total_price: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        total_price_with_gst: 0
      }
    ]);
  };

  const updateItem = (index, field, value) => {
    setItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };

      if (field === 'category') {
        newItems[index].item_name = ''; // Reset item name when category changes
      }

      if (field === 'quantity' || field === 'price') {
        const qty = parseFloat(newItems[index].quantity) || 0;
        const price = parseFloat(newItems[index].price) || 0;
        newItems[index].total_price = qty * price;
      }
      return newItems;
    });
  };

  const removeItem = (index) => {
    setItems(prev => {
      const newItems = [...prev];
      newItems.splice(index, 1);
      return newItems;
    });
  };

  const saveInvoiceTransaction = async ({
    editingInvoice,
    editFormData,
    selectedSupplier,
    gstSelection
  }) => {
    // Validation
    const invalidItems = items.filter(i => 
      !i.item_name || 
      !i.category || 
      isNaN(parseFloat(i.quantity)) || parseFloat(i.quantity) <= 0 ||
      isNaN(parseFloat(i.price)) || parseFloat(i.price) < 0
    );

    if (invalidItems.length > 0) {
      toast({ 
        title: 'Validation Error', 
        description: 'Please ensure all items have a Category, Item Name, valid numeric Quantity (> 0), and valid numeric Price.', 
        variant: 'destructive' 
      });
      return false;
    }

    setIsSaving(true);
    try {
      // 1. Delete old items
      const { error: deleteError } = await supabase
        .from('items')
        .delete()
        .eq('supplier_invoice_number', editingInvoice.supplier_invoice_number)
        .eq('supplier_name', editingInvoice.supplier_name);

      if (deleteError) throw deleteError;

      // 2. Insert new/updated items
      if (items.length > 0) {
        const itemsToInsert = items.map(item => {
          const itemTotal = parseFloat(item.total_price) || 0;
          const itemCgst = gstSelection.cgst ? parseFloat((itemTotal * 0.09).toFixed(2)) : 0;
          const itemSgst = gstSelection.sgst ? parseFloat((itemTotal * 0.09).toFixed(2)) : 0;
          const itemIgst = gstSelection.igst ? parseFloat((itemTotal * 0.18).toFixed(2)) : 0;
          const itemTotalWithGst = Math.round(itemTotal + itemCgst + itemSgst + itemIgst);

          return {
            id: item.id || generateUUID(),
            supplier_id: selectedSupplier.id,
            supplier_name: selectedSupplier.supplier_name,
            supplier_invoice_number: editFormData.supplier_invoice_number,
            invoice_date: editFormData.invoice_date,
            department: editFormData.department,
            user_name: editFormData.user_name,
            category: item.category,
            item_name: item.item_name,
            unit: item.unit || '',
            quantity: parseFloat(item.quantity) || 0,
            price: parseFloat(item.price) || 0,
            total_price: itemTotal,
            cgst: itemCgst,
            sgst: itemSgst,
            igst: itemIgst,
            total_price_with_gst: itemTotalWithGst,
            used_quantity: item.used_quantity || 0
          };
        });

        const { error: insertError } = await supabase
          .from('items')
          .insert(itemsToInsert);

        if (insertError) throw insertError;
      }

      toast({ title: 'Success', description: 'Invoice items updated successfully.' });
      return true;
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: `Failed to update: ${err.message}`, variant: 'destructive' });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    items,
    setItems,
    categories,
    itemNamesMap,
    isSaving,
    addItem,
    updateItem,
    removeItem,
    saveInvoiceTransaction
  };
};

export default useSupplierInvoiceItems;