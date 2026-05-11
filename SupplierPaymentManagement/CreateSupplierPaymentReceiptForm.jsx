import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, ArrowLeft, Save, FileDown, Check, ChevronsUpDown, Loader2, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

import { supabase } from '@/lib/customSupabaseClient';
import useSupplierManagement from '@/hooks/useSupplierManagement';
import { numberToWords } from '@/lib/numberToWords';
import { cn } from '@/lib/utils';

const CreateSupplierPaymentReceiptForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const pdfRef = useRef(null);

  const { suppliers, loading: suppliersLoading } = useSupplierManagement();

  // Form State
  const [formData, setFormData] = useState({
    receiptNumber: '',
    receiptDate: new Date(),
    supplierId: '',
    supplierName: '',
    department: '',
    user: '',
    invoiceId: '',
    invoiceNumber: '',
    invoiceDate: '',
    invoiceAmount: 0,
    deductionType: '',
    deductionAmount: 0,
    actualAmount: 0,
    amountInWords: '',
    paymentMode: '',
    transactionRef: '',
    remarks: ''
  });

  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Filter suppliers based on search
  const filteredSuppliers = suppliers.filter(s => 
    s.supplier_name?.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    s.supplier_id?.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  // Fetch invoices when supplier is selected
  useEffect(() => {
    const fetchInvoices = async () => {
      if (!formData.supplierId) {
        setInvoices([]);
        return;
      }
      setLoadingInvoices(true);
      try {
        const { data, error } = await supabase
          .from('supplier_purchase_order_receipts')
          .select('id, po_from_supplier_no, purchase_order_date, grand_total')
          .eq('supplier_id', formData.supplierId);

        if (error) throw error;
        setInvoices(data || []);
      } catch (err) {
        console.error('Error fetching invoices:', err);
        toast({
          title: 'Error',
          description: 'Failed to fetch supplier invoices',
          variant: 'destructive',
        });
      } finally {
        setLoadingInvoices(false);
      }
    };

    fetchInvoices();
  }, [formData.supplierId, toast]);

  // Handle Supplier Selection
  const handleSupplierSelect = (supplier) => {
    // Extract first department/user if available from JSON or string
    let dept = '';
    let usr = '';
    if (supplier.departments && Array.isArray(supplier.departments) && supplier.departments.length > 0) {
      dept = supplier.departments[0].department_name || '';
      usr = supplier.departments[0].users?.[0]?.user_name || '';
    }

    setFormData(prev => ({
      ...prev,
      supplierId: supplier.id,
      supplierName: supplier.supplier_name,
      department: dept,
      user: usr,
      invoiceId: '',
      invoiceNumber: '',
      invoiceDate: '',
      invoiceAmount: 0
    }));
    setSupplierSearch(supplier.supplier_name);
    setShowSupplierDropdown(false);
  };

  // Handle Invoice Selection
  const handleInvoiceSelect = (invoiceId) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      setFormData(prev => ({
        ...prev,
        invoiceId: invoice.id,
        invoiceNumber: invoice.po_from_supplier_no || '',
        invoiceDate: invoice.purchase_order_date ? format(new Date(invoice.purchase_order_date), 'yyyy-MM-dd') : '',
        invoiceAmount: Number(invoice.grand_total) || 0
      }));
    }
  };

  // Auto-calculate Actual Amount
  useEffect(() => {
    const actual = Math.max(0, Number(formData.invoiceAmount) - Number(formData.deductionAmount || 0));
    setFormData(prev => ({
      ...prev,
      actualAmount: actual,
      amountInWords: numberToWords(actual) || ''
    }));
  }, [formData.invoiceAmount, formData.deductionAmount]);

  // Handle generic input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Save PDF
  const handleSavePdf = async () => {
    if (!pdfRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const canvas = await html2canvas(pdfRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Supplier_Payment_Receipt_${formData.receiptNumber || 'Draft'}.pdf`);
      
      toast({ title: 'Success', description: 'PDF generated successfully.' });
    } catch (err) {
      console.error('PDF generation error:', err);
      toast({ title: 'Error', description: 'Failed to generate PDF.', variant: 'destructive' });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Save to Database
  const handleSave = async () => {
    if (!formData.receiptNumber || !formData.supplierId || !formData.actualAmount) {
      toast({ title: 'Validation Error', description: 'Please fill in required fields (Receipt Number, Supplier, Invoice).', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        receipt_number: formData.receiptNumber,
        payment_date: formData.receiptDate ? format(formData.receiptDate, 'yyyy-MM-dd') : null,
        amount: formData.actualAmount,
        payment_mode: formData.paymentMode,
        reference_number: formData.transactionRef,
        remarks: formData.remarks,
        deduction_type: formData.deductionType,
        deduction_amount: formData.deductionAmount,
        actual_amount: formData.actualAmount,
        department_name: formData.department,
        user_name: formData.user,
        company_name: formData.supplierName, 
        po_number: formData.invoiceNumber,
        po_date: formData.invoiceDate || null,
      };

      const { error } = await supabase.from('advance_payment_receipts').insert([payload]);

      if (error) throw error;

      toast({ title: 'Success', description: 'Payment receipt saved successfully!' });
      navigate('/supplier-payment-receipt-management');
    } catch (err) {
      console.error('Save error:', err);
      toast({ title: 'Error', description: err.message || 'Failed to save payment receipt.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="py-8 px-6 max-w-5xl mx-auto space-y-6">
      <Helmet>
        <title>Create Supplier Payment Receipt | Asway ERP</title>
      </Helmet>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Create New Supplier Payment Receipt
        </h1>
        <Button 
          onClick={() => navigate(-1)} 
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="shadow-lg border-gray-200">
          <CardContent className="p-8" ref={pdfRef}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Receipt Number */}
              <div className="space-y-2">
                <Label htmlFor="receiptNumber">Supplier Payment Receipt Number <span className="text-red-500">*</span></Label>
                <Input 
                  id="receiptNumber" 
                  name="receiptNumber" 
                  value={formData.receiptNumber} 
                  onChange={handleChange} 
                  placeholder="Enter receipt number" 
                  className="bg-white text-gray-900"
                />
              </div>

              {/* Receipt Date */}
              <div className="space-y-2 flex flex-col">
                <Label>Supplier Payment Receipt Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-white text-gray-900", !formData.receiptDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.receiptDate ? format(formData.receiptDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.receiptDate}
                      onSelect={(date) => setFormData(prev => ({ ...prev, receiptDate: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Supplier Search */}
              <div className="space-y-2 relative">
                <Label>Supplier Name <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    placeholder="Search supplier..."
                    value={supplierSearch}
                    onChange={(e) => {
                      setSupplierSearch(e.target.value);
                      setShowSupplierDropdown(true);
                      if (e.target.value === '') {
                        setFormData(prev => ({ ...prev, supplierId: '', department: '', user: '', invoiceId: '', invoiceNumber: '', invoiceAmount: 0 }));
                      }
                    }}
                    onFocus={() => setShowSupplierDropdown(true)}
                    className="bg-white text-gray-900"
                  />
                  {suppliersLoading && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-400" />}
                </div>
                {showSupplierDropdown && supplierSearch && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredSuppliers.length === 0 ? (
                      <div className="p-2 text-sm text-gray-500">No suppliers found</div>
                    ) : (
                      filteredSuppliers.map(supplier => (
                        <div
                          key={supplier.id}
                          className="px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm flex items-center justify-between"
                          onClick={() => handleSupplierSelect(supplier)}
                        >
                          <span>{supplier.supplier_name}</span>
                          {formData.supplierId === supplier.id && <Check className="h-4 w-4 text-blue-600" />}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Department */}
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input 
                  id="department" 
                  value={formData.department} 
                  readOnly 
                  className="bg-gray-50 text-gray-900 cursor-not-allowed" 
                  placeholder="Auto-populated"
                />
              </div>

              {/* User */}
              <div className="space-y-2">
                <Label htmlFor="user">User</Label>
                <Input 
                  id="user" 
                  value={formData.user} 
                  readOnly 
                  className="bg-gray-50 text-gray-900 cursor-not-allowed" 
                  placeholder="Auto-populated"
                />
              </div>

              {/* Invoice Number */}
              <div className="space-y-2">
                <Label>Invoice Number <span className="text-red-500">*</span></Label>
                <Select disabled={!formData.supplierId || loadingInvoices} value={formData.invoiceId} onValueChange={handleInvoiceSelect}>
                  <SelectTrigger className="bg-white text-gray-900">
                    <SelectValue placeholder={loadingInvoices ? "Loading invoices..." : "Select Invoice"} />
                  </SelectTrigger>
                  <SelectContent>
                    {invoices.length === 0 ? (
                      <SelectItem value="none" disabled>No invoices available</SelectItem>
                    ) : (
                      invoices.map(inv => (
                        <SelectItem key={inv.id} value={inv.id}>
                          {inv.po_from_supplier_no || 'Unknown'} (₹{inv.grand_total})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Invoice Date */}
              <div className="space-y-2">
                <Label>Invoice Date</Label>
                <Select disabled value={formData.invoiceDate}>
                  <SelectTrigger className="bg-gray-50 text-gray-900">
                    <SelectValue placeholder="Auto-populated" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.invoiceDate && <SelectItem value={formData.invoiceDate}>{formData.invoiceDate}</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              {/* Invoice Amount */}
              <div className="space-y-2">
                <Label>Invoice Amount</Label>
                <Select disabled value={formData.invoiceAmount.toString()}>
                  <SelectTrigger className="bg-gray-50 text-gray-900">
                    <SelectValue placeholder="Auto-populated" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.invoiceAmount > 0 && <SelectItem value={formData.invoiceAmount.toString()}>₹ {formData.invoiceAmount}</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              {/* Deduction Type */}
              <div className="space-y-2">
                <Label htmlFor="deductionType">Deduction / Discount Type</Label>
                <Input 
                  id="deductionType" 
                  name="deductionType" 
                  value={formData.deductionType} 
                  onChange={handleChange} 
                  placeholder="e.g. Early Payment Discount" 
                  className="bg-white text-gray-900"
                />
              </div>

              {/* Deduction Amount */}
              <div className="space-y-2">
                <Label htmlFor="deductionAmount">Deduction / Discount Amount</Label>
                <Input 
                  id="deductionAmount" 
                  name="deductionAmount" 
                  type="number"
                  min="0"
                  value={formData.deductionAmount} 
                  onChange={handleChange} 
                  placeholder="0.00" 
                  className="bg-white text-gray-900"
                />
              </div>

              {/* Actual Amount Sent */}
              <div className="space-y-2">
                <Label>Actual Amount Sent</Label>
                <Input 
                  value={`₹ ${formData.actualAmount.toFixed(2)}`} 
                  readOnly 
                  className="bg-green-50 text-green-900 font-semibold cursor-not-allowed" 
                />
              </div>

              {/* Amount in Words */}
              <div className="space-y-2 md:col-span-2">
                <Label>Actual Amount Sent in Words</Label>
                <Input 
                  value={formData.amountInWords} 
                  readOnly 
                  className="bg-gray-50 text-gray-900 italic cursor-not-allowed" 
                />
              </div>

              {/* Payment Mode */}
              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <Select value={formData.paymentMode} onValueChange={(val) => setFormData(prev => ({ ...prev, paymentMode: val }))}>
                  <SelectTrigger className="bg-white text-gray-900">
                    <SelectValue placeholder="Select Payment Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEFT">NEFT</SelectItem>
                    <SelectItem value="RTGS">RTGS</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Transaction Ref */}
              <div className="space-y-2">
                <Label htmlFor="transactionRef">Transaction Ref / Cheque No.</Label>
                <Input 
                  id="transactionRef" 
                  name="transactionRef" 
                  value={formData.transactionRef} 
                  onChange={handleChange} 
                  placeholder="Enter reference number" 
                  className="bg-white text-gray-900"
                />
              </div>

              {/* Remarks */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea 
                  id="remarks" 
                  name="remarks" 
                  value={formData.remarks} 
                  onChange={handleChange} 
                  placeholder="Add any additional notes here..." 
                  className="bg-white text-gray-900 min-h-[100px]"
                />
              </div>

            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-4 mt-10 pt-6 border-t border-gray-100">
              <Button 
                onClick={() => navigate(-1)}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                <X className="w-4 h-4 mr-2" />
                Close
              </Button>
              <Button 
                onClick={handleSavePdf}
                disabled={isGeneratingPdf}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                {isGeneratingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
                Save as PDF
              </Button>
              <Button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Payment Receipt
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default CreateSupplierPaymentReceiptForm;