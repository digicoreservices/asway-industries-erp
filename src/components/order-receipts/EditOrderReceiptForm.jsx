import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, PlusCircle, Trash2, Upload, X, Edit, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import usePurchaseOrderReceiptManagement from '@/hooks/usePurchaseOrderReceiptManagement';
import useClientManagement from '@/hooks/useClientManagement';
import useQuotationManagement from '@/hooks/useQuotationManagement';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import AddClientForm from '@/components/clients/AddClientForm';
import EditClientForm from '@/components/clients/EditClientForm';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/customSupabaseClient';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { numberToWords } from '@/lib/numberToWords';

const EditOrderReceiptForm = ({ receiptDetails, onReceiptUpdated, onClose }) => {
  const { toast } = useToast();
  const { updateReceiptWithItems, loading } = usePurchaseOrderReceiptManagement();
  const { clients, fetchClients } = useClientManagement();
  const { quotations, fetchQuotations } = useQuotationManagement();

  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [items, setItems] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [editingSchedulesFor, setEditingSchedulesFor] = useState(null); 
  
  const printableRef = useRef(null);
  const autocompleteRef = useRef(null);

  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState([]);

  // Tax & Other Charges State
  const [taxDetails, setTaxDetails] = useState({
    cgst: false, cgst_rate: 9,
    sgst: false, sgst_rate: 9,
    igst: false, igst_rate: 18,
  });
  const [otherCharges, setOtherCharges] = useState({ description: '', amount: '' });

  const initialScheduleState = {
    quantity: '',
    delivery_date: null,
  };
  const [currentSchedule, setCurrentSchedule] = useState(initialScheduleState);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setShowCustomerSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  useEffect(() => {
    if (receiptDetails) {
      setReceiptData({
        id: receiptDetails.id,
        order_receipt_id: receiptDetails.order_receipt_id,
        purchase_order_date: receiptDetails.purchase_order_date ? parseISO(receiptDetails.purchase_order_date) : null,
        customer_id: receiptDetails.customer_id,
        department: receiptDetails.department || '',
        user: receiptDetails.user || '',
        quotation_number: receiptDetails.quotation_number || '',
        quotation_date: receiptDetails.quotation_date ? parseISO(receiptDetails.quotation_date) : null,
      });

      if (receiptDetails.customer) {
        setCustomerSearch(receiptDetails.customer.customer_name);
      }

      setTaxDetails({
        cgst: (receiptDetails.cgst_amount || 0) > 0,
        cgst_rate: receiptDetails.cgst_rate || 9,
        sgst: (receiptDetails.sgst_amount || 0) > 0,
        sgst_rate: receiptDetails.sgst_rate || 9,
        igst: (receiptDetails.igst_amount || 0) > 0,
        igst_rate: receiptDetails.igst_rate || 18,
      });

      setOtherCharges({
        description: receiptDetails.other_charges_description || '',
        amount: receiptDetails.other_charges_amount || ''
      });

      const initialItems = receiptDetails.items.map(item => {
        let uploadedFiles = [];
        try {
            if(item.image_url) {
                 if (item.image_url.startsWith('[')) {
                     uploadedFiles = JSON.parse(item.image_url);
                 } else {
                     uploadedFiles = [{ url: item.image_url, type: 'image/jpeg', name: 'Existing Image' }];
                 }
            }
        } catch (e) {
             if(item.image_url) uploadedFiles = [{ url: item.image_url, type: 'image/jpeg', name: 'Existing Image' }];
        }

        return {
            ...item,
            temp_id: item.id || `new_${Date.now()}_${Math.random()}`,
            uploaded_files: uploadedFiles,
            files_to_upload: [],
            total_price: (parseFloat(item.quantity) * parseFloat(item.price_for_one)) || 0,
            delivery_schedules: (item.delivery_schedules || []).map(s => ({
              ...s,
              id: s.id || `sched_${Date.now()}_${Math.random()}`
            })),
        };
      });
      setItems(initialItems);
    }
  }, [receiptDetails]);


  useEffect(() => {
    fetchQuotations();
    fetchClients();
  }, [fetchQuotations, fetchClients]);

  const customerQuotations = useMemo(() => {
    if (!receiptData?.customer_id) return [];
    return quotations.filter(q => q.customer_id === receiptData.customer_id);
  }, [receiptData?.customer_id, quotations]);

  const customerDepartments = useMemo(() => {
    if (!receiptData?.customer_id) return [];
    const customer = clients.find(c => c.id === receiptData.customer_id);
    if (!customer) return [];
    const depts = new Set();
    for (let i = 1; i <= 5; i++) {
        if (customer[`department_name_${i}`]) {
            depts.add(customer[`department_name_${i}`]);
        }
    }
    return [...depts];
  }, [receiptData?.customer_id, clients]);

  const customerUsers = useMemo(() => {
    if (!receiptData?.customer_id || !receiptData?.department) return [];
    const customer = clients.find(c => c.id === receiptData.customer_id);
    if (!customer) return [];
    const users = [];
    for (let i = 1; i <= 5; i++) {
        if (customer[`department_name_${i}`] === receiptData.department && customer[`user${i}`]) {
            users.push(customer[`user${i}`]);
        }
    }
    return users;
  }, [receiptData?.customer_id, receiptData?.department, clients]);
  
  const unitOptions = ['Nos', 'Kg', 'Mtr', 'Ltr', 'Set', 'Pcs', 'Job'];

  // Calculations
  const taxableAmount = items.reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0);
  const cgstAmount = taxDetails.cgst ? (taxableAmount * (taxDetails.cgst_rate / 100)) : 0;
  const sgstAmount = taxDetails.sgst ? (taxableAmount * (taxDetails.sgst_rate / 100)) : 0;
  const igstAmount = taxDetails.igst ? (taxableAmount * (taxDetails.igst_rate / 100)) : 0;
  const totalTaxAmount = cgstAmount + sgstAmount + igstAmount;
  const otherChargesAmount = parseFloat(otherCharges.amount) || 0;
  const grandTotal = taxableAmount + totalTaxAmount + otherChargesAmount;

  const handleSelectCustomer = (customer) => {
    setCustomerSearch(customer.customer_name);
    setShowCustomerSuggestions(false);
    setReceiptData(prev => ({ 
      ...prev, 
      customer_id: customer.id,
      quotation_number: '', 
      quotation_date: null, 
      user: '', 
      department: '' 
    }));
  };

  const handleReceiptInputChange = (e) => {
    const { id, value } = e.target;
    setReceiptData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id, value) => {
    setReceiptData(prev => ({ ...prev, [id]: value }));
    if (id === 'department') {
        setReceiptData(prev => ({ ...prev, user: '' }));
    }
  };

  const handleDateChange = (id, date) => {
    setReceiptData(prev => ({ ...prev, [id]: date }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    let item = { ...newItems[index], [field]: value };
    item.total_price = (parseFloat(item.quantity) || 0) * (parseFloat(item.price_for_one) || 0);
    newItems[index] = item;
    setItems(newItems);
  };
  
  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        temp_id: `new_${Date.now()}_${Math.random()}`,
        type: 'Sale',
        product_name: '',
        description: '',
        unit: '',
        quantity: 1,
        price_for_one: 0,
        total_price: 0,
        uploaded_files: [],
        files_to_upload: [],
        delivery_schedules: [],
      }
    ]);
  };

  const handleRemoveItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleFileChange = (e, index) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const newItems = [...items];
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    const maxSize = 5 * 1024 * 1024; 

    const validFiles = [];
    files.forEach(file => {
        if (!allowedTypes.includes(file.type)) return;
        if (file.size > maxSize) return;
        
        validFiles.push({
            file: file,
            preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
            type: file.type,
            name: file.name
        });
    });

    newItems[index] = {
      ...newItems[index],
      files_to_upload: [...(newItems[index].files_to_upload || []), ...validFiles]
    };
    setItems(newItems);
  };

  const removeFileToUpload = (itemIndex, fileIndex) => {
    const newItems = [...items];
    newItems[itemIndex].files_to_upload.splice(fileIndex, 1);
    setItems(newItems);
  };
  
  const removeUploadedFile = (itemIndex, fileIndex) => {
    const newItems = [...items];
    newItems[itemIndex].uploaded_files.splice(fileIndex, 1);
    setItems(newItems);
  };
  
  const handleAddSchedule = () => {
    if (editingSchedulesFor === null) return;
  
    const { quantity, delivery_date } = currentSchedule;
    if (!quantity || !delivery_date) {
      toast({ title: 'Schedule Incomplete', description: 'Please provide quantity and delivery date.', variant: 'destructive' });
      return;
    }
  
    const newItems = [...items];
    const item = newItems[editingSchedulesFor];
  
    const totalScheduledQty = (item.delivery_schedules || []).reduce((sum, s) => sum + parseFloat(s.quantity), 0);
    const newScheduleQty = parseFloat(quantity);
    const totalOrderQty = parseFloat(item.quantity) || 0;
  
    if (totalScheduledQty + newScheduleQty > totalOrderQty) {
      toast({ title: 'Quantity Exceeded', description: `Scheduled quantity cannot exceed total order quantity of ${totalOrderQty}.`, variant: 'destructive' });
      return;
    }
  
    const scheduleTotalPrice = newScheduleQty * (parseFloat(item.price_for_one) || 0);

    const newSchedule = {
      id: `sched_${Date.now()}_${Math.random()}`,
      quantity: newScheduleQty,
      delivery_date: format(delivery_date, 'yyyy-MM-dd'),
      total_price: scheduleTotalPrice,
      total_price_with_gst: scheduleTotalPrice, // Kept for schema compatibility
    };
  
    item.delivery_schedules = [...(item.delivery_schedules || []), newSchedule];
    setItems(newItems);
    setCurrentSchedule(initialScheduleState);
  };

  const handleRemoveSchedule = (scheduleId) => {
    if (editingSchedulesFor === null) return;
    const newItems = [...items];
    const item = newItems[editingSchedulesFor];
    item.delivery_schedules = item.delivery_schedules.filter(s => s.id !== scheduleId);
    setItems(newItems);
  };


  const handleFormSubmit = async () => {
    setIsUploading(true);
    
    const newItems = await Promise.all(items.map(async (item) => {
      let finalUploadedFiles = [...item.uploaded_files];
      
      if (item.files_to_upload && item.files_to_upload.length > 0) {
          for(const fileObj of item.files_to_upload) {
               const fileName = `${Date.now()}_${fileObj.name}`;
               const { data, error } = await supabase.storage.from('product_images').upload(fileName, fileObj.file, {
                   cacheControl: '3600',
                   upsert: false
               });
               if (!error) {
                   const { data: { publicUrl } } = supabase.storage.from('product_images').getPublicUrl(data.path);
                   finalUploadedFiles.push({ name: fileObj.name, type: fileObj.type, url: publicUrl });
               }
          }
      }
      
      return { 
          ...item, 
          image_url: JSON.stringify(finalUploadedFiles)
      };
    }));
    
    const selectedQuotation = quotations.find(q => q.quotation_id === receiptData.quotation_number);

    const receiptPayload = {
      order_receipt_id: receiptData.order_receipt_id,
      purchase_order_date: receiptData.purchase_order_date ? format(receiptData.purchase_order_date, 'yyyy-MM-dd') : null,
      customer_id: receiptData.customer_id,
      department: receiptData.department,
      user: receiptData.user === 'all_users' ? null : receiptData.user,
      quotation_number: receiptData.quotation_number,
      quotation_date: selectedQuotation ? format(parseISO(selectedQuotation.quotation_date), 'yyyy-MM-dd') : null,
      grand_total: grandTotal,
      taxable_amount: taxableAmount,
      cgst_rate: taxDetails.cgst_rate,
      cgst_amount: cgstAmount,
      sgst_rate: taxDetails.sgst_rate,
      sgst_amount: sgstAmount,
      igst_rate: taxDetails.igst_rate,
      igst_amount: igstAmount,
      total_tax_amount: totalTaxAmount,
      other_charges_description: otherCharges.description,
      other_charges_amount: otherChargesAmount,
    };
    
    const itemsPayload = newItems.map(item => ({
      id: item.id,
      type: item.type,
      product_name: item.product_name,
      description: item.description,
      image_url: item.image_url,
      unit: item.unit,
      quantity: parseFloat(item.quantity),
      price_for_one: parseFloat(item.price_for_one),
      total_price: item.total_price,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total_price_with_gst: item.total_price,
      delivery_schedules: item.delivery_schedules.map(({id, ...rest}) => rest),
    }));

    const success = await updateReceiptWithItems(receiptData.id, receiptPayload, itemsPayload);
    setIsUploading(false);
    if (success) {
      onReceiptUpdated();
    }
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
      pdf.save(`Edit_Order_Receipt_${receiptData.order_receipt_id || 'Draft'}.pdf`);
      toast({ title: 'Success', description: 'Saved as PDF successfully.' });
    }).catch(err => {
      toast({ title: 'Error', description: 'Failed to generate PDF.', variant: 'destructive' });
    });
  };

  if (!receiptData) {
    return <div className="p-6">Loading...</div>;
  }
  
  const editingItem = editingSchedulesFor !== null ? items[editingSchedulesFor] : null;

  return (
    <>
      <DialogContent className="max-w-7xl">
        <DialogHeader><DialogTitle>Edit Purchase Order Receipt</DialogTitle></DialogHeader>
        <div className="space-y-6 max-h-[80vh] overflow-y-auto p-6" ref={printableRef}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 border-b pb-6">
            <div className="space-y-2"><Label htmlFor="order_receipt_id">PO Receipt Number</Label><Input id="order_receipt_id" value={receiptData.order_receipt_id} onChange={handleReceiptInputChange} required /></div>
            <div className="space-y-2"><Label>Purchase Order Date</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !receiptData.purchase_order_date && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{receiptData.purchase_order_date ? format(receiptData.purchase_order_date, "dd-MM-yyyy") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={receiptData.purchase_order_date} onSelect={(date) => handleDateChange('purchase_order_date', date)} initialFocus /></PopoverContent></Popover></div>
            <div className="space-y-2 relative" ref={autocompleteRef}>
              <Label htmlFor="customer_search_edit">Customer Name</Label>
              <div className="flex gap-2">
                  <div className="relative flex-grow">
                    <Input 
                      id="customer_search_edit"
                      placeholder="Search customer..." 
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setShowCustomerSuggestions(true);
                        setReceiptData(prev => ({ ...prev, customer_id: '' }));
                      }}
                      onFocus={() => setShowCustomerSuggestions(true)}
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
                      <DialogTrigger asChild><Button variant="outline"><PlusCircle className="h-4 w-4" /></Button></DialogTrigger><AddClientForm onClientAdded={handleClientAdded} isOpen={isAddClientOpen} />
                    </Dialog>
                    <Dialog open={isEditClientOpen} onOpenChange={setIsEditClientOpen}>
                      <DialogTrigger asChild><Button variant="outline" disabled={!receiptData.customer_id}><Edit className="h-4 w-4" /></Button></DialogTrigger>{receiptData.customer_id && <EditClientForm clientId={receiptData.customer_id} clients={clients} onClientUpdated={handleClientUpdated} />}
                    </Dialog>
                  </div>
              </div>
            </div>
            {receiptData.customer_id && (
                <div className="space-y-2">
                  <Label htmlFor="department">Department Name</Label>
                  <Select onValueChange={(value) => handleSelectChange('department', value)} value={receiptData.department}>
                    <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                    <SelectContent>{customerDepartments.map(dept => <SelectItem key={dept} value={dept}>{dept}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
            )}
            {receiptData.department && (
                <div className="space-y-2">
                  <Label htmlFor="user">User</Label>
                  <Select onValueChange={(value) => handleSelectChange('user', value)} value={receiptData.user}>
                      <SelectTrigger><SelectValue placeholder="Select User" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_users">All Users</SelectItem>
                        {customerUsers.map(user => <SelectItem key={user} value={user}>{user}</SelectItem>)}
                      </SelectContent>
                  </Select>
                </div>
            )}
            <div className="space-y-2"><Label htmlFor="quotation_number">Quotation Number</Label><Select onValueChange={(value) => handleSelectChange('quotation_number', value)} value={receiptData.quotation_number} disabled={!receiptData.customer_id}><SelectTrigger><SelectValue placeholder="Select Quotation" /></SelectTrigger><SelectContent>{customerQuotations.map(q => <SelectItem key={q.id} value={q.quotation_id}>{q.quotation_id}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Quotation Date</Label><Input value={receiptData.quotation_date ? format(receiptData.quotation_date, 'dd-MM-yyyy') : ''} readOnly placeholder="Select a quotation first" className="bg-gray-100" /></div>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Products</h3>
            <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="w-[150px]">Images/PDFs</TableHead><TableHead className="w-[150px]">Product</TableHead><TableHead>Description</TableHead><TableHead className="w-[100px]">Qty</TableHead><TableHead className="w-[120px]">Unit</TableHead><TableHead className="w-[120px]">Schedules</TableHead><TableHead className="w-[120px]">Price/One</TableHead><TableHead className="w-[120px]">Total</TableHead><TableHead className="w-[50px]">Action</TableHead></TableRow></TableHeader><TableBody>{items.map((item, index) => (<TableRow key={item.temp_id}><TableCell>
                <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                        {item.uploaded_files.map((file, fIndex) => (
                            <div key={`exist-${fIndex}`} className="relative group w-10 h-10 border rounded bg-gray-50 flex items-center justify-center">
                                {file.type?.includes('pdf') || file.url?.endsWith('.pdf') ? 
                                <a href={file.url} target="_blank" rel="noreferrer" className="text-red-500"><FileText size={16} /></a> : 
                                <a href={file.url} target="_blank" rel="noreferrer"><img src={file.url} alt="img" className="w-full h-full object-cover" /></a>}
                                <button onClick={() => removeUploadedFile(index, fIndex)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">x</button>
                            </div>
                        ))}
                        {item.files_to_upload.map((file, fIndex) => (
                             <div key={`new-${fIndex}`} className="relative group w-10 h-10 border rounded bg-blue-50 flex items-center justify-center">
                                {file.type.includes('pdf') ? <FileText size={16} className="text-blue-500" /> : <img src={file.preview} alt="new" className="w-full h-full object-cover" />}
                                <button onClick={() => removeFileToUpload(index, fIndex)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">x</button>
                            </div>
                        ))}
                    </div>
                    <div className="relative">
                        <Input id={`file-upload-${index}`} type="file" className="hidden" onChange={(e) => handleFileChange(e, index)} accept="image/png, image/jpeg, application/pdf" multiple />
                        <Label htmlFor={`file-upload-${index}`} className="cursor-pointer text-xs bg-secondary px-2 py-1 rounded hover:bg-secondary/80 inline-flex items-center gap-1"><PlusCircle size={12} /> Add Files</Label>
                    </div>
                </div>
            </TableCell><TableCell><Input value={item.product_name} onChange={(e) => handleItemChange(index, 'product_name', e.target.value)} /></TableCell><TableCell><Textarea value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} rows={3} /></TableCell><TableCell><Input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} /></TableCell><TableCell><Select value={item.unit} onValueChange={(value) => handleItemChange(index, 'unit', value)}><SelectTrigger><SelectValue placeholder="Unit" /></SelectTrigger><SelectContent>{unitOptions.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></TableCell>
            <TableCell><Button variant="outline" size="sm" onClick={() => setEditingSchedulesFor(index)}>Edit ({item.delivery_schedules?.length || 0})</Button></TableCell>
            <TableCell><Input type="number" value={item.price_for_one} onChange={(e) => handleItemChange(index, 'price_for_one', e.target.value)} /></TableCell><TableCell>₹{item.total_price?.toFixed(2)}</TableCell><TableCell><Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell></TableRow>))}</TableBody></Table></div>
            <div className="flex justify-end"><Button type="button" onClick={handleAddItem} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"><PlusCircle size={16} /> Add Product</Button></div>
          </div>
          
          <div className="border-t pt-6 pb-6 space-y-6">
             <h3 className="text-lg font-medium">Tax Details</h3>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
                  <Label>Taxable Amount (Total Products)</Label>
                  <Input readOnly value={taxableAmount.toFixed(2)} className="bg-gray-100" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <Checkbox id="edit_cgst" checked={taxDetails.cgst} onCheckedChange={(c) => setTaxDetails(p => ({...p, cgst: c, igst: c ? false : p.igst}))} />
                    <Label htmlFor="edit_cgst">CGST (%)</Label>
                  </div>
                  <div className="flex gap-2">
                    <Input type="number" value={taxDetails.cgst_rate} onChange={(e) => setTaxDetails(p => ({...p, cgst_rate: e.target.value}))} disabled={!taxDetails.cgst} className="w-20" />
                    <Input readOnly value={cgstAmount.toFixed(2)} className="bg-gray-100 flex-1" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <Checkbox id="edit_sgst" checked={taxDetails.sgst} onCheckedChange={(c) => setTaxDetails(p => ({...p, sgst: c, igst: c ? false : p.igst}))} />
                    <Label htmlFor="edit_sgst">SGST (%)</Label>
                  </div>
                  <div className="flex gap-2">
                    <Input type="number" value={taxDetails.sgst_rate} onChange={(e) => setTaxDetails(p => ({...p, sgst_rate: e.target.value}))} disabled={!taxDetails.sgst} className="w-20" />
                    <Input readOnly value={sgstAmount.toFixed(2)} className="bg-gray-100 flex-1" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <Checkbox id="edit_igst" checked={taxDetails.igst} onCheckedChange={(c) => setTaxDetails(p => ({...p, igst: c, cgst: c ? false : p.cgst, sgst: c ? false : p.sgst}))} />
                    <Label htmlFor="edit_igst">IGST (%)</Label>
                  </div>
                  <div className="flex gap-2">
                    <Input type="number" value={taxDetails.igst_rate} onChange={(e) => setTaxDetails(p => ({...p, igst_rate: e.target.value}))} disabled={!taxDetails.igst} className="w-20" />
                    <Input readOnly value={igstAmount.toFixed(2)} className="bg-gray-100 flex-1" />
                  </div>
                </div>
             </div>
          </div>

          <div className="border-t pt-6 pb-6 space-y-4">
             <h3 className="text-lg font-medium">Other Charges</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Description</Label>
                 <Input value={otherCharges.description} onChange={(e) => setOtherCharges(p => ({...p, description: e.target.value}))} placeholder="e.g. Shipping, Packaging" />
               </div>
               <div className="space-y-2">
                 <Label>Charges Amount</Label>
                 <Input type="number" value={otherCharges.amount} onChange={(e) => setOtherCharges(p => ({...p, amount: e.target.value}))} placeholder="0.00" />
               </div>
             </div>
          </div>

          <div className="pt-4 border-t bg-slate-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-4">Summary</h3>
            <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Total Required Products Amount:</span> <span>₹{taxableAmount.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Tax Amount:</span> <span>₹{totalTaxAmount.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Other Charges:</span> <span>₹{otherChargesAmount.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
                    <span>Total Purchase Order Cost:</span> 
                    <span>₹{grandTotal.toFixed(2)}</span>
                </div>
                <div className="text-right text-muted-foreground italic">
                    {numberToWords(grandTotal)}
                </div>
            </div>
          </div>

        </div>
        <DialogFooter className="p-6 pt-0 flex justify-between sm:justify-between items-center w-full">
            <Button type="button" variant="ghost" onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white">Close</Button>
            <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleSaveAsPDF} className="bg-blue-600 hover:bg-blue-700 text-white border-0"><FileText className="mr-2 h-4 w-4" /> Save as PDF</Button>
                <Button type="button" onClick={handleFormSubmit} disabled={loading || isUploading} className="bg-blue-600 hover:bg-blue-700 text-white">{loading || isUploading ? 'Saving...' : 'Save'}</Button>
            </div>
        </DialogFooter>
      </DialogContent>
      
      <Dialog open={editingSchedulesFor !== null} onOpenChange={(isOpen) => !isOpen && setEditingSchedulesFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit Delivery Schedules for {editingItem?.product_name}</DialogTitle></DialogHeader>
          {editingItem && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"> 
                <div className="space-y-2">
                    <Label htmlFor="display_total_qty_edit">Total Quantity</Label>
                    <Input 
                        id="display_total_qty_edit" 
                        type="number" 
                        value={editingItem?.quantity || ''} 
                        readOnly 
                        className="bg-gray-100" 
                    />
                </div>
                <div className="space-y-2"><Label htmlFor="schedule_quantity">Quantity</Label><Input id="schedule_quantity" type="number" value={currentSchedule.quantity} onChange={(e) => setCurrentSchedule({...currentSchedule, quantity: e.target.value})} placeholder="Schedule Qty"/></div>
                <div className="space-y-2"><Label>Delivery Date</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !currentSchedule.delivery_date && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{currentSchedule.delivery_date ? format(currentSchedule.delivery_date, "dd-MM-yyyy") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={currentSchedule.delivery_date} onSelect={(date) => setCurrentSchedule({...currentSchedule, delivery_date: date})} initialFocus /></PopoverContent></Popover></div>
                <Button type="button" onClick={handleAddSchedule} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"><PlusCircle size={16} /> Add</Button>
              </div>
              
              {(editingItem.delivery_schedules || []).length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-md font-medium">Scheduled Deliveries</h4>
                  <Table><TableHeader><TableRow><TableHead>Qty</TableHead><TableHead>Delivery Date</TableHead><TableHead>Total Price</TableHead><TableHead>Action</TableHead></TableRow></TableHeader><TableBody>
                    {editingItem.delivery_schedules.map(s => (
                      <TableRow key={s.id}>
                        <TableCell>{s.quantity}</TableCell>
                        <TableCell>{format(parseISO(s.delivery_date), 'dd-MM-yyyy')}</TableCell>
                        <TableCell>₹{s.total_price.toFixed(2)}</TableCell>
                        <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveSchedule(s.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody></Table>
                </div>
              ) : <p className="text-sm text-muted-foreground text-center py-4">No delivery schedules added yet.</p>}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setEditingSchedulesFor(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EditOrderReceiptForm;