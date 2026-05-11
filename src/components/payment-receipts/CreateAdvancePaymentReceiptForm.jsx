import React, { useState, useEffect, useMemo } from 'react';
import { Save, FileDown, Search, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import useClientManagement from '@/hooks/useClientManagement';
import { numberToWords } from '@/lib/numberToWords';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

const CreateAdvancePaymentReceiptForm = ({ onSuccess, onClose }) => {
  const { toast } = useToast();
  const { clients, loading: clientsLoading } = useClientManagement();
  const [loading, setLoading] = useState(false);
  
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [isPoDateAutoFilled, setIsPoDateAutoFilled] = useState(false);

  const [formData, setFormData] = useState({
    receiptNumber: '', 
    paymentDate: new Date().toISOString().split('T')[0],
    customerId: '',
    departmentName: '',
    userName: '',
    poNumber: '',
    poDate: '',
    advanceAmount: '',
    paymentMode: 'NEFT',
    transactionRef: '', 
    remarks: '',
    companyName: 'Asway Industries Pvt Ltd',
    companyAddress: '',
    companyState: '',
    companyStateCode: '',
    companyGSTIN: ''
  });

  const [taxes, setTaxes] = useState({
    sgst: false,
    cgst: false,
    igst: false
  });

  const [calculated, setCalculated] = useState({
    sgstAmount: 0,
    cgstAmount: 0,
    igstAmount: 0,
    totalAmount: 0,
    totalAmountInWords: ''
  });

  const isLoadingCustomers = clientsLoading && clients.length === 0;

  const filteredClients = useMemo(() => {
    if (!customerSearchTerm) return clients;
    return clients.filter(c => c.customer_name?.toLowerCase().includes(customerSearchTerm.toLowerCase()));
  }, [clients, customerSearchTerm]);

  useEffect(() => {
    const advAmt = parseFloat(formData.advanceAmount) || 0;
    const sgstAmt = taxes.sgst ? (advAmt * 0.09) : 0;
    const cgstAmt = taxes.cgst ? (advAmt * 0.09) : 0;
    const igstAmt = taxes.igst ? (advAmt * 0.18) : 0;
    
    const total = advAmt + sgstAmt + cgstAmt + igstAmt;
    const totalRounded = total.toFixed(2);
    
    setCalculated({
      sgstAmount: sgstAmt,
      cgstAmount: cgstAmt,
      igstAmount: igstAmt,
      totalAmount: totalRounded,
      totalAmountInWords: numberToWords(totalRounded)
    });
  }, [formData.advanceAmount, taxes]);

  // Auto-fetch PO Date when PO Number is entered
  useEffect(() => {
    const fetchPoDate = async () => {
      if (!formData.poNumber) {
        setIsPoDateAutoFilled(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('purchase_order_receipts')
          .select('purchase_order_date')
          .eq('order_receipt_id', formData.poNumber)
          .single();

        if (data && data.purchase_order_date) {
          setFormData(prev => ({ ...prev, poDate: data.purchase_order_date }));
          setIsPoDateAutoFilled(true);
        } else {
          setIsPoDateAutoFilled(false);
        }
      } catch (err) {
        // Silently fail if not found, allowing manual entry
        setIsPoDateAutoFilled(false);
      }
    };

    const timeoutId = setTimeout(fetchPoDate, 500); // 500ms debounce
    return () => clearTimeout(timeoutId);
  }, [formData.poNumber]);

  const handleCustomerChange = (val) => {
    const customer = clients.find(c => c.id === val);
    setFormData(prev => ({
        ...prev,
        customerId: val,
        departmentName: customer ? (customer.department_name_1 || customer.department1 || '') : '',
        userName: customer ? (customer.user1 || '') : ''
    }));
  };

  const handleCustomerSelect = (client) => {
    setCustomerSearchTerm(client.customer_name);
    setShowCustomerSuggestions(false);
    handleCustomerChange(client.id);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTaxChange = (taxType, checked) => {
    setTaxes(prev => ({ ...prev, [taxType]: checked }));
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    let currentY = 15;

    // Header
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(formData.companyName || 'Company Name Not Available', 105, currentY, { align: 'center' });
    currentY += 8;

    doc.setFontSize(14);
    doc.text('Advance Payment Receipt', 105, currentY, { align: 'center' });
    currentY += 6;

    // Company Details
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    if (formData.companyAddress) {
        doc.text(formData.companyAddress, 105, currentY, { align: 'center' });
        currentY += 5;
    }
    const stateText = `${formData.companyState || ''} ${formData.companyStateCode ? `(${formData.companyStateCode})` : ''}`.trim();
    if (stateText) {
        doc.text(stateText, 105, currentY, { align: 'center' });
        currentY += 5;
    }
    if (formData.companyGSTIN) {
        doc.text(`GSTIN: ${formData.companyGSTIN}`, 105, currentY, { align: 'center' });
        currentY += 5;
    }
    
    currentY += 2;
    doc.setLineWidth(0.5);
    doc.line(10, currentY, 200, currentY);
    currentY += 10;
    
    // Receipt Details
    doc.setFontSize(10);
    doc.text(`Receipt No: ${formData.receiptNumber}`, 14, currentY);
    
    let displayDate = '-';
    if (formData.paymentDate) {
        try { displayDate = format(new Date(formData.paymentDate), 'dd-MM-yyyy'); } catch (e) { displayDate = formData.paymentDate; }
    }
    doc.text(`Date: ${displayDate}`, 150, currentY);
    currentY += 5;
    
    const customer = clients.find(c => c.id === formData.customerId);
    doc.text(`Customer: ${customer?.customer_name || '-'}`, 14, currentY);
    currentY += 5;
    doc.text(`Department: ${formData.departmentName || '-'}`, 14, currentY);
    currentY += 5;
    doc.text(`PO Number: ${formData.poNumber || '-'}`, 14, currentY);
    currentY += 5;
    doc.text(`PO Date: ${formData.poDate ? format(new Date(formData.poDate), 'dd-MM-yyyy') : '-'}`, 14, currentY);
    
    currentY += 5;
    doc.line(10, currentY, 200, currentY);
    currentY += 5;

    // Table
    const tableData = [
      ['Payment Type', 'Advance Payment'],
      ['Advance Amount', `Rs. ${formData.advanceAmount || '0.00'}`]
    ];

    if (taxes.sgst) tableData.push(['SGST (9%)', `Rs. ${calculated.sgstAmount.toFixed(2)}`]);
    if (taxes.cgst) tableData.push(['CGST (9%)', `Rs. ${calculated.cgstAmount.toFixed(2)}`]);
    if (taxes.igst) tableData.push(['IGST (18%)', `Rs. ${calculated.igstAmount.toFixed(2)}`]);

    tableData.push(
      ['Total Amount Received', `Rs. ${calculated.totalAmount}`],
      ['Amount in Words', calculated.totalAmountInWords || '-'],
      ['Payment Mode', formData.paymentMode],
      ['Transaction Ref', formData.transactionRef || '-']
    );

    doc.autoTable({
      startY: currentY,
      head: [['Description', 'Details']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [66, 66, 66] }
    });

    let finalY = doc.lastAutoTable.finalY + 10;
    
    if (formData.remarks) {
      doc.setFont(undefined, 'bold');
      doc.text('Remarks:', 14, finalY);
      doc.setFont(undefined, 'normal');
      doc.text(formData.remarks, 14, finalY + 5);
    }

    doc.save(`Advance_Receipt_${formData.receiptNumber}.pdf`);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (!formData.customerId) throw new Error("Please select a customer.");
      if (!formData.receiptNumber) throw new Error("Please enter a Receipt Number.");
      if (!calculated.totalAmount || parseFloat(calculated.totalAmount) <= 0) throw new Error("Amount received cannot be zero.");

      const payload = {
        receipt_number: formData.receiptNumber,
        payment_date: formData.paymentDate,
        customer_id: formData.customerId,
        amount: parseFloat(calculated.totalAmount), 
        payment_mode: formData.paymentMode,
        reference_number: formData.transactionRef,
        remarks: `[ADVANCE] ${formData.remarks}`,
        deduction_type: 'None',
        deduction_amount: 0,
        actual_amount: parseFloat(calculated.totalAmount),
        department_name: formData.departmentName,
        user_name: formData.userName,
        po_number: formData.poNumber || null,
        po_date: formData.poDate || null,
        advance_amount: parseFloat(formData.advanceAmount) || 0,
        sgst_amount: calculated.sgstAmount,
        cgst_amount: calculated.cgstAmount,
        igst_amount: calculated.igstAmount,
        company_name: formData.companyName,
        company_address: formData.companyAddress,
        company_state: formData.companyState,
        company_state_code: formData.companyStateCode,
        company_gstin: formData.companyGSTIN
      };

      const { error } = await supabase.from('advance_payment_receipts').insert([payload]);

      if (error) throw error;

      toast({ title: "Success", description: "Advance Payment Receipt created successfully!" });
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 bg-white rounded-lg max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-xl font-bold text-green-700">Create Advance Payment Receipt</h2>
        <Button 
          onClick={onClose} 
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-95 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Advance Payment Receipt Number</Label>
          <Input 
            value={formData.receiptNumber} 
            onChange={(e) => handleChange('receiptNumber', e.target.value)}
            placeholder="Enter Receipt Number"
          />
        </div>

        <div className="space-y-2">
          <Label>Advance Payment Receipt Date</Label>
          <Input type="date" value={formData.paymentDate} onChange={(e) => handleChange('paymentDate', e.target.value)} />
        </div>

        <div className="space-y-2 relative">
          <Label>Customer Name</Label>
          <div className="relative">
            {isLoadingCustomers ? (
               <Loader2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />
            ) : (
               <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            )}
            <Input 
              className="pl-9"
              placeholder={isLoadingCustomers ? "Loading customers..." : "Search Customer..."}
              value={customerSearchTerm} 
              onChange={(e) => {
                  setCustomerSearchTerm(e.target.value);
                  setShowCustomerSuggestions(true);
                  if (formData.customerId) {
                      setFormData(prev => ({...prev, customerId: ''}));
                  }
              }}
              onFocus={() => setShowCustomerSuggestions(true)}
              onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 200)}
              disabled={isLoadingCustomers}
            />
            {showCustomerSuggestions && !isLoadingCustomers && (
              <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg max-h-[200px] overflow-auto mt-1">
                  {filteredClients.length > 0 ? (
                      filteredClients.map((c) => (
                          <div 
                              key={c.id || `client-${c.customer_name}-${Math.random()}`} 
                              className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                          onMouseDown={(e) => { e.preventDefault(); handleCustomerSelect(c); }}
                          >
                              {c.customer_name}
                          </div>
                      ))
                  ) : (
                      <div className="p-2 text-sm text-gray-500">No customers found</div>
                  )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Department Name</Label>
          <Input value={formData.departmentName} readOnly className="bg-gray-50" placeholder="Auto-filled" />
        </div>

        <div className="space-y-2">
          <Label>User Name</Label>
          <Input value={formData.userName} readOnly className="bg-gray-50" placeholder="Auto-filled" />
        </div>

        <div className="space-y-2">
          <Label>Purchase Order Number</Label>
          <Input 
            value={formData.poNumber} 
            onChange={(e) => handleChange('poNumber', e.target.value)}
            placeholder="Enter PO Number"
          />
        </div>

        <div className="space-y-2">
          <Label>Purchase Order Date</Label>
          <Input 
            type="date" 
            value={formData.poDate} 
            onChange={(e) => handleChange('poDate', e.target.value)} 
            readOnly={isPoDateAutoFilled}
            className={isPoDateAutoFilled ? "bg-gray-50" : ""}
          />
        </div>

        <div className="space-y-2">
          <Label>Advance Amount (₹)</Label>
          <Input 
            type="number" 
            value={formData.advanceAmount} 
            onChange={(e) => handleChange('advanceAmount', e.target.value)} 
            placeholder="0.00"
          />
        </div>

        <div className="col-span-1 md:col-span-2 p-4 border rounded-md bg-gray-50 space-y-4">
            <Label className="text-gray-700 font-semibold">Taxes</Label>
            <div className="flex flex-wrap gap-6">
                <div className="flex items-center space-x-2">
                    <Checkbox id="sgst" checked={taxes.sgst} onCheckedChange={(c) => handleTaxChange('sgst', c)} />
                    <Label htmlFor="sgst" className="cursor-pointer">SGST (9%)</Label>
                    {taxes.sgst && <span className="text-sm text-gray-500">₹{calculated.sgstAmount.toFixed(2)}</span>}
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="cgst" checked={taxes.cgst} onCheckedChange={(c) => handleTaxChange('cgst', c)} />
                    <Label htmlFor="cgst" className="cursor-pointer">CGST (9%)</Label>
                    {taxes.cgst && <span className="text-sm text-gray-500">₹{calculated.cgstAmount.toFixed(2)}</span>}
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="igst" checked={taxes.igst} onCheckedChange={(c) => handleTaxChange('igst', c)} />
                    <Label htmlFor="igst" className="cursor-pointer">IGST (18%)</Label>
                    {taxes.igst && <span className="text-sm text-gray-500">₹{calculated.igstAmount.toFixed(2)}</span>}
                </div>
            </div>
        </div>

        <div className="space-y-2">
          <Label className="text-green-700 font-semibold">Total Advance Amount Received (₹)</Label>
          <Input 
            value={calculated.totalAmount} 
            readOnly 
            className="border-green-200 bg-green-50 font-semibold text-lg"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-gray-600">Total Amount in Words</Label>
          <Input 
            value={calculated.totalAmountInWords} 
            readOnly 
            className="bg-gray-50 text-gray-600"
          />
        </div>

        <div className="space-y-2">
          <Label>Payment Mode</Label>
          <Select value={formData.paymentMode} onValueChange={(val) => handleChange('paymentMode', val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NEFT">NEFT</SelectItem>
              <SelectItem value="RTGS">RTGS</SelectItem>
              <SelectItem value="Cheque">Cheque</SelectItem>
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="UPI">UPI</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Transaction / Ref / Cheque No.</Label>
          <Input value={formData.transactionRef} onChange={(e) => handleChange('transactionRef', e.target.value)} placeholder="UTR / Cheque No" />
        </div>

        <div className="col-span-1 md:col-span-2 space-y-2">
          <Label>Remarks</Label>
          <Textarea value={formData.remarks} onChange={(e) => handleChange('remarks', e.target.value)} placeholder="Notes regarding advance payment..." />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white">
          Close
        </Button>
        <Button onClick={generatePDF} className="bg-blue-600 hover:bg-blue-700 text-white">
          <FileDown className="w-4 h-4 mr-2" />
          Save as PDF
        </Button>
        <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {loading ? 'Saving...' : 'Save Advance Payment Receipt'}
        </Button>
      </div>
    </div>
  );
};

export default CreateAdvancePaymentReceiptForm;