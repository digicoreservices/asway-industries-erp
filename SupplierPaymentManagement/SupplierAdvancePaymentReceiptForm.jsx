import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { CalendarPlus as CalendarIcon, ArrowLeft, Save, Download, X, Loader2, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import useSupplierManagement from '@/hooks/useSupplierManagement';
import { numberToWords } from '@/lib/numberToWords';
import { cn } from '@/lib/utils';

const SupplierAdvancePaymentReceiptForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { suppliers, loading: loadingSuppliers } = useSupplierManagement();
  const formRef = useRef(null);

  // Form State
  const [receiptNumber, setReceiptNumber] = useState('');
  const [receiptDate, setReceiptDate] = useState(new Date());
  
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  
  const [department, setDepartment] = useState('');
  const [user, setUser] = useState('');
  
  const [poReceipts, setPoReceipts] = useState([]);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advancePaidDate, setAdvancePaidDate] = useState('');
  
  const [selectedTaxes, setSelectedTaxes] = useState({ SGST: false, CGST: false, IGST: false });
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalAmountInWords, setTotalAmountInWords] = useState('');
  
  const [paymentMode, setPaymentMode] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [remarks, setRemarks] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleGoBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/supplier-payment-management');
    }
  };

  // Filter suppliers based on search
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch) return suppliers;
    const lowerSearch = supplierSearch.toLowerCase();
    return suppliers.filter(s => 
      s.supplier_name?.toLowerCase().includes(lowerSearch) ||
      s.supplier_id?.toLowerCase().includes(lowerSearch)
    );
  }, [suppliers, supplierSearch]);

  // Handle Supplier Selection
  const handleSupplierSelect = async (supplier) => {
    setSelectedSupplier(supplier);
    setSupplierSearch(supplier.supplier_name);
    setShowSupplierDropdown(false);
    
    // Parse department from JSON or text
    let deptName = '';
    try {
      if (supplier.departments) {
        if (typeof supplier.departments === 'string') {
          const parsed = JSON.parse(supplier.departments);
          deptName = Array.isArray(parsed) ? parsed[0] : parsed;
        } else if (Array.isArray(supplier.departments)) {
          deptName = supplier.departments[0];
        }
      }
    } catch (e) {
      deptName = supplier.departments || '';
    }
    setDepartment(typeof deptName === 'string' ? deptName : 'Purchasing');
    setUser(supplier.contact_person || 'Admin');

    // Fetch PO Receipts for this supplier
    try {
      const { data, error } = await supabase
        .from('supplier_purchase_order_receipts')
        .select('id, po_from_supplier_no, remaining_payment_amount, advance_paid_date')
        .eq('supplier_id', supplier.id)
        .gt('remaining_payment_amount', 0);
        
      if (error) throw error;
      setPoReceipts(data || []);
      setAdvanceAmount('');
      setAdvancePaidDate('');
    } catch (err) {
      console.error('Error fetching PO receipts:', err);
      toast({ title: 'Error', description: 'Failed to fetch pending advance amounts.', variant: 'destructive' });
    }
  };

  // Recalculate Total Amount when Advance Amount or Taxes change
  const calculateTotal = useCallback(() => {
    const baseAmt = parseFloat(advanceAmount) || 0;
    let taxMultiplier = 0;
    
    if (selectedTaxes.SGST) taxMultiplier += 0.09; // 9%
    if (selectedTaxes.CGST) taxMultiplier += 0.09; // 9%
    if (selectedTaxes.IGST) taxMultiplier += 0.18; // 18%
    
    const taxAmount = baseAmt * taxMultiplier;
    const finalTotal = baseAmt + taxAmount;
    
    setTotalAmount(finalTotal);
    if (finalTotal > 0) {
      setTotalAmountInWords(numberToWords(finalTotal));
    } else {
      setTotalAmountInWords('');
    }
  }, [advanceAmount, selectedTaxes]);

  useEffect(() => {
    calculateTotal();
  }, [calculateTotal]);

  const handleTaxChange = (taxName, checked) => {
    setSelectedTaxes(prev => ({ ...prev, [taxName]: checked }));
  };

  // Validation
  const isFormValid = receiptNumber && receiptDate && selectedSupplier && advanceAmount && paymentMode;

  const handleSave = async () => {
    if (!isFormValid) {
      toast({ title: 'Validation Error', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      // Calculate individual tax amounts
      const baseAmt = parseFloat(advanceAmount) || 0;
      const cgstAmt = selectedTaxes.CGST ? baseAmt * 0.09 : 0;
      const sgstAmt = selectedTaxes.SGST ? baseAmt * 0.09 : 0;
      const igstAmt = selectedTaxes.IGST ? baseAmt * 0.18 : 0;

      const payload = {
        receipt_number: receiptNumber,
        payment_date: receiptDate.toISOString().split('T')[0],
        amount: totalAmount,
        advance_amount: baseAmt,
        payment_mode: paymentMode,
        reference_number: transactionRef,
        remarks: remarks,
        department_name: department,
        user_name: user,
        company_name: selectedSupplier.supplier_name,
        cgst_amount: cgstAmt,
        sgst_amount: sgstAmt,
        igst_amount: igstAmt,
      };

      const { error } = await supabase
        .from('advance_payment_receipts')
        .insert([payload]);

      if (error) throw error;

      toast({ title: 'Success', description: 'Advance Payment Receipt saved successfully.' });
      handleGoBack();
    } catch (err) {
      console.error('Save error:', err);
      toast({ title: 'Error', description: err.message || 'Failed to save receipt.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePdf = async () => {
    if (!formRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const canvas = await html2canvas(formRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const formattedDate = receiptDate ? format(receiptDate, 'yyyy-MM-dd') : 'UnknownDate';
      pdf.save(`Supplier_Advance_Payment_Receipt_${receiptNumber || 'Draft'}_${formattedDate}.pdf`);
      
      toast({ title: 'Success', description: 'PDF generated successfully.' });
    } catch (err) {
      console.error('PDF generation error:', err);
      toast({ title: 'Error', description: 'Failed to generate PDF.', variant: 'destructive' });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="py-8 px-6 max-w-5xl mx-auto space-y-6">
      <Helmet>
        <title>Create Supplier Advance Payment Receipt | Asway ERP</title>
      </Helmet>

      {/* Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Create Supplier Advance Payment Receipt</h1>
        <Button 
          onClick={handleGoBack} 
          className="bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>

      <Card className="shadow-md border-gray-200">
        <CardContent className="p-8" ref={formRef}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* 1. Receipt Number */}
            <div className="space-y-2">
              <Label className="text-gray-700 font-semibold">Advance Payment Receipt Number <span className="text-red-500">*</span></Label>
              <Input 
                value={receiptNumber} 
                onChange={(e) => setReceiptNumber(e.target.value)} 
                placeholder="Enter Receipt No."
                className="bg-gray-50 text-gray-900 border-gray-300 focus:ring-blue-500"
              />
            </div>

            {/* 2. Receipt Date */}
            <div className="space-y-2">
              <Label className="text-gray-700 font-semibold">Advance Payment Receipt Date <span className="text-red-500">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal bg-gray-50 border-gray-300",
                      !receiptDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-blue-600" />
                    {receiptDate ? format(receiptDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={receiptDate}
                    onSelect={setReceiptDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* 3. Supplier Name */}
            <div className="space-y-2 relative">
              <Label className="text-gray-700 font-semibold">Supplier Name <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Search supplier..."
                value={supplierSearch}
                onChange={(e) => {
                  setSupplierSearch(e.target.value);
                  setShowSupplierDropdown(true);
                  if (e.target.value === '') setSelectedSupplier(null);
                }}
                onFocus={() => setShowSupplierDropdown(true)}
                className="bg-gray-50 text-gray-900 border-gray-300 focus:ring-blue-500"
              />
              {loadingSuppliers && <Loader2 className="absolute right-3 top-9 h-4 w-4 animate-spin text-gray-400" />}
              
              {showSupplierDropdown && supplierSearch && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredSuppliers.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500 text-center">No suppliers found</div>
                  ) : (
                    filteredSuppliers.map(supplier => (
                      <div
                        key={supplier.id}
                        className="px-4 py-3 cursor-pointer hover:bg-blue-50 text-sm flex items-center justify-between border-b last:border-0"
                        onClick={() => handleSupplierSelect(supplier)}
                      >
                        <span className="font-medium text-gray-800">{supplier.supplier_name}</span>
                        {selectedSupplier?.id === supplier.id && <Check className="h-4 w-4 text-blue-600" />}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* 4. Department */}
            <div className="space-y-2">
              <Label className="text-gray-700 font-semibold">Department</Label>
              <Input 
                value={department} 
                readOnly 
                className="bg-gray-100 text-gray-600 border-gray-200 cursor-not-allowed" 
              />
            </div>

            {/* 5. User */}
            <div className="space-y-2">
              <Label className="text-gray-700 font-semibold">User</Label>
              <Input 
                value={user} 
                readOnly 
                className="bg-gray-100 text-gray-600 border-gray-200 cursor-not-allowed" 
              />
            </div>

            {/* 6. Advance Amount Paid */}
            <div className="space-y-2">
              <Label className="text-gray-700 font-semibold">Advance Amount Paid <span className="text-red-500">*</span></Label>
              <Select 
                value={advanceAmount} 
                onValueChange={setAdvanceAmount}
                disabled={!selectedSupplier || poReceipts.length === 0}
              >
                <SelectTrigger className="bg-gray-50 text-gray-900 border-gray-300 focus:ring-blue-500">
                  <SelectValue placeholder="Select Amount" />
                </SelectTrigger>
                <SelectContent>
                  {poReceipts.map(po => (
                    <SelectItem key={po.id} value={po.remaining_payment_amount.toString()}>
                      ₹{po.remaining_payment_amount} (PO: {po.po_from_supplier_no})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 7. Advance Amount Paid Date */}
            <div className="space-y-2">
              <Label className="text-gray-700 font-semibold">Advance Amount Paid Date</Label>
              <Select 
                value={advancePaidDate} 
                onValueChange={setAdvancePaidDate}
                disabled={!selectedSupplier || poReceipts.length === 0}
              >
                <SelectTrigger className="bg-gray-50 text-gray-900 border-gray-300 focus:ring-blue-500">
                  <SelectValue placeholder="Select Date" />
                </SelectTrigger>
                <SelectContent>
                  {poReceipts.filter(po => po.advance_paid_date).map(po => (
                    <SelectItem key={po.id} value={po.advance_paid_date}>
                      {format(new Date(po.advance_paid_date), 'dd MMM yyyy')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 8. Taxes */}
            <div className="space-y-3">
              <Label className="text-gray-700 font-semibold">Taxes</Label>
              <div className="flex flex-wrap gap-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="tax-sgst" 
                    checked={selectedTaxes.SGST} 
                    onCheckedChange={(c) => handleTaxChange('SGST', c)}
                    className="data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
                  />
                  <Label htmlFor="tax-sgst" className="cursor-pointer font-medium text-gray-700">SGST (9%)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="tax-cgst" 
                    checked={selectedTaxes.CGST} 
                    onCheckedChange={(c) => handleTaxChange('CGST', c)}
                    className="data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
                  />
                  <Label htmlFor="tax-cgst" className="cursor-pointer font-medium text-gray-700">CGST (9%)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="tax-igst" 
                    checked={selectedTaxes.IGST} 
                    onCheckedChange={(c) => handleTaxChange('IGST', c)}
                    className="data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
                  />
                  <Label htmlFor="tax-igst" className="cursor-pointer font-medium text-gray-700">IGST (18%)</Label>
                </div>
              </div>
            </div>

            {/* 9. Total Advance Amount */}
            <div className="space-y-2">
              <Label className="text-gray-700 font-semibold">Total Advance Amount</Label>
              <Input 
                value={`₹ ${totalAmount.toFixed(2)}`} 
                readOnly 
                className="bg-blue-50 text-blue-900 font-bold border-blue-200 cursor-not-allowed" 
              />
            </div>

            {/* 10. Total Advance Amount in Words */}
            <div className="space-y-2 md:col-span-2">
              <Label className="text-gray-700 font-semibold">Total Advance Amount in Words</Label>
              <Input 
                value={totalAmountInWords} 
                readOnly 
                className="bg-gray-100 text-gray-700 italic border-gray-200 cursor-not-allowed" 
              />
            </div>

            {/* 11. Payment Mode */}
            <div className="space-y-2">
              <Label className="text-gray-700 font-semibold">Payment Mode <span className="text-red-500">*</span></Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger className="bg-gray-50 text-gray-900 border-gray-300 focus:ring-blue-500">
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

            {/* 12. Transaction Ref / Cheque No. */}
            <div className="space-y-2">
              <Label className="text-gray-700 font-semibold">Transaction Ref / Cheque No.</Label>
              <Input 
                value={transactionRef} 
                onChange={(e) => setTransactionRef(e.target.value)} 
                placeholder="Enter Ref No."
                className="bg-gray-50 text-gray-900 border-gray-300 focus:ring-blue-500"
              />
            </div>

            {/* 13. Remarks */}
            <div className="space-y-2 md:col-span-2">
              <Label className="text-gray-700 font-semibold">Remarks</Label>
              <Textarea 
                value={remarks} 
                onChange={(e) => setRemarks(e.target.value)} 
                placeholder="Enter any additional remarks..."
                className="bg-gray-50 text-gray-900 border-gray-300 focus:ring-blue-500 min-h-[100px]"
              />
            </div>

          </div>
        </CardContent>

        {/* Form Actions */}
        <div className="p-6 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row gap-4 justify-end rounded-b-lg">
          <Button 
            variant="default" 
            onClick={handleGoBack}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
          >
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
          <Button 
            onClick={handleSavePdf}
            disabled={isGeneratingPdf}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            {isGeneratingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Save as PDF
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSaving || !isFormValid}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-colors disabled:bg-blue-400"
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Payment Receipt
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default SupplierAdvancePaymentReceiptForm;