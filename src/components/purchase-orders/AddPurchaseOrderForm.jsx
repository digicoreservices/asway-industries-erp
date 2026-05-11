import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Printer, FileDown, Save, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/components/ui/use-toast';

const initialFormState = {
  purchaseOrderNumber: '',
  purchaseOrderDate: null,
  workOrderNumber: '',
  supplierId: '',
  supplierName: '',
  supplierAddress: '',
  contactPerson: '',
  quotationNo: '',
  otherDetails: '',
  category: '',
  itemCategory: '',
  itemName: '',
  unit: '',
  quantity: '',
  rate: '',
  amount: '',
  cgst: 'No',
  sgst: 'No',
  totalAmount: '',
  deliveryPeriod: '',
};

const AddPurchaseOrderForm = ({ onClose }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState(initialFormState);

  const categories = ["BRM", "HCU", "CU", "MEQ", "PNT", "PPE", "EPI", "LBR", "OT"];
  const itemCategories = ["Raw Materials", "Consumables", "Hardware"];
  const itemNames = ["MS TUBE 80X40X2.5MM", "ms pipe 50 Nb A class", "Ms pipe 150 NB A class", "Cutting Wheel 4\"", "Gasket 1\""];
  const units = ["Nos", "Kg", "Mtr", "Ltr", "Set", "Box"];

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleDateChange = (id, date) => {
    setFormData((prev) => ({ ...prev, [id]: date }));
  };

  const handleSelectChange = (id, value) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleRadioChange = (id, value) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  useEffect(() => {
    const { quantity, rate } = formData;
    const newAmount = (parseFloat(quantity) || 0) * (parseFloat(rate) || 0);
    setFormData(prev => ({ ...prev, amount: newAmount.toFixed(2) }));
  }, [formData.quantity, formData.rate]);

  useEffect(() => {
    const { amount, cgst, sgst } = formData;
    let total = parseFloat(amount) || 0;
    if (cgst === 'Yes') total *= 1.09;
    if (sgst === 'Yes') total *= 1.09;
    setFormData(prev => ({ ...prev, totalAmount: total.toFixed(2) }));
  }, [formData.amount, formData.cgst, formData.sgst]);

  const handleSave = () => {
    if (!formData.purchaseOrderNumber || !formData.supplierName) {
      toast({
        title: 'Validation Error',
        description: 'Purchase Order Number and Supplier Name are required.',
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Success', description: 'Purchase Order saved successfully.' });
    onClose();
  };

  const handleClear = () => {
    setFormData(initialFormState);
    toast({ title: 'Form Cleared', description: 'All fields have been reset.' });
  };

  const handleFeatureNotImplemented = () => {
    toast({
      title: '🚧 Feature Not Implemented',
      description: "This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
      variant: 'destructive',
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <Card className="border-0 shadow-none">
        <CardHeader>
          <CardTitle>Add New Purchase Order</CardTitle>
        </CardHeader>
        <CardContent className="max-h-[75vh] overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2"><Label htmlFor="purchaseOrderNumber">Purchase Order Number</Label><Input id="purchaseOrderNumber" value={formData.purchaseOrderNumber} onChange={handleInputChange} /></div>
            <div className="space-y-2"><Label>Purchase Order Date</Label><Popover><PopoverTrigger asChild><Button variant="outline" className={cn('w-full justify-start', !formData.purchaseOrderDate && 'text-muted-foreground')}><CalendarIcon className="mr-2 h-4 w-4" />{formData.purchaseOrderDate ? format(formData.purchaseOrderDate, 'PPP') : 'Pick a date'}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.purchaseOrderDate} onSelect={(d) => handleDateChange('purchaseOrderDate', d)} /></PopoverContent></Popover></div>
            <div className="space-y-2"><Label htmlFor="workOrderNumber">Work Order Number</Label><Input id="workOrderNumber" value={formData.workOrderNumber} onChange={handleInputChange} /></div>
            <div className="space-y-2"><Label htmlFor="supplierId">Supplier ID</Label><Input id="supplierId" value={formData.supplierId} onChange={handleInputChange} /></div>
            <div className="space-y-2"><Label htmlFor="supplierName">Supplier Name</Label><Input id="supplierName" value={formData.supplierName} onChange={handleInputChange} /></div>
            <div className="space-y-2"><Label htmlFor="contactPerson">Contact Person</Label><Input id="contactPerson" value={formData.contactPerson} onChange={handleInputChange} /></div>
            <div className="space-y-2"><Label htmlFor="quotationNo">Quotation No</Label><Input id="quotationNo" value={formData.quotationNo} onChange={handleInputChange} /></div>
            <div className="space-y-2 md:col-span-2"><Label htmlFor="supplierAddress">Supplier Address</Label><Textarea id="supplierAddress" value={formData.supplierAddress} onChange={handleInputChange} /></div>
            <div className="space-y-2 md:col-span-2"><Label htmlFor="otherDetails">Other Details</Label><Textarea id="otherDetails" value={formData.otherDetails} onChange={handleInputChange} /></div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-4">Item Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
              <div className="space-y-2"><Label>Category</Label><Select onValueChange={(v) => handleSelectChange('category', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Item Category</Label><Select onValueChange={(v) => handleSelectChange('itemCategory', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{itemCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Item Name</Label><Select onValueChange={(v) => handleSelectChange('itemName', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{itemNames.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Unit</Label><Select onValueChange={(v) => handleSelectChange('unit', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{units.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="quantity">Quantity</Label><Input id="quantity" type="number" value={formData.quantity} onChange={handleInputChange} /></div>
              <div className="space-y-2"><Label htmlFor="rate">Rate</Label><Input id="rate" type="number" value={formData.rate} onChange={handleInputChange} /></div>
              <div className="space-y-2"><Label htmlFor="amount">Amount</Label><Input id="amount" type="number" value={formData.amount} readOnly className="bg-gray-100" /></div>
              <div className="space-y-2"><Label>CGST</Label><RadioGroup value={formData.cgst} onValueChange={(v) => handleRadioChange('cgst', v)} className="flex items-center gap-4 pt-2"><div className="flex items-center space-x-2"><RadioGroupItem value="Yes" id="cgstYes" /><Label htmlFor="cgstYes">Yes</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="No" id="cgstNo" /><Label htmlFor="cgstNo">No</Label></div></RadioGroup></div>
              <div className="space-y-2"><Label>SGST</Label><RadioGroup value={formData.sgst} onValueChange={(v) => handleRadioChange('sgst', v)} className="flex items-center gap-4 pt-2"><div className="flex items-center space-x-2"><RadioGroupItem value="Yes" id="sgstYes" /><Label htmlFor="sgstYes">Yes</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="No" id="sgstNo" /><Label htmlFor="sgstNo">No</Label></div></RadioGroup></div>
              <div className="space-y-2"><Label htmlFor="totalAmount">Total Amount</Label><Input id="totalAmount" type="number" value={formData.totalAmount} readOnly className="bg-gray-100" /></div>
            </div>
          </div>

          <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2"><Label htmlFor="deliveryPeriod">Estimate Delivery Period (Days)</Label><Input id="deliveryPeriod" type="number" value={formData.deliveryPeriod} onChange={handleInputChange} /></div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose}><X className="mr-2 h-4 w-4" />Cancel</Button>
          <Button variant="outline" onClick={handleClear}><Trash2 className="mr-2 h-4 w-4" />Clear</Button>
          <Button variant="outline" onClick={handleFeatureNotImplemented}><Printer className="mr-2 h-4 w-4" />Print</Button>
          <Button variant="outline" onClick={handleFeatureNotImplemented}><FileDown className="mr-2 h-4 w-4" />Save as PDF</Button>
          <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" />Save</Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default AddPurchaseOrderForm;