import React, { useState, useEffect, useMemo } from 'react';
import { Save, X, FileDown, Search, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import useClientManagement from '@/hooks/useClientManagement';
import { numberToWords } from '@/lib/numberToWords';
import { fetchWithRetry } from '@/lib/utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

const CreatePaymentReceiptForm = ({ onSuccess, onClose }) => {
  const { toast } = useToast();
  const { clients, loading: clientsLoading } = useClientManagement();
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);
  
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);

  const [formData, setFormData] = useState({
    receiptNumber: '',
    paymentDate: new Date().toISOString().split('T')[0],
    customerId: '',
    departmentName: '',
    userName: '',
    invoiceId: '',
    invoiceDate: '',
    poNumber: '',      
    poDate: '',        
    referenceNumber: '', 
    referenceDate: '',   
    invoiceAmount: '',
    deductionType: '',
    discountAmount: '0',
    actualAmount: '',
    actualAmountInWords: '',
    paymentMode: 'NEFT',
    transactionRef: '', 
    remarks: '',
    companyName: '',
    companyAddress: '',
    companyState: '',
    companyStateCode: '',
    companyGSTIN: ''
  });

  const isLoadingCustomers = clientsLoading && clients.length === 0;

  const filteredClients = useMemo(() => {
    if (!customerSearchTerm) return clients;
    return clients.filter(c => c.customer_name?.toLowerCase().includes(customerSearchTerm.toLowerCase()));
  }, [clients, customerSearchTerm]);

  const fetchInvoices = async (customerId) => {
    if (!customerId) return;
    try {
      const { data, error } = await fetchWithRetry(
        (signal) => supabase
          .from('invoices')
          .select('*')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })
          .abortSignal(signal),
        { operationName: 'Fetch Invoices for Receipt', timeoutMs: 15000 }
      );

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({ title: "Error", description: "Failed to fetch invoices", variant: "destructive" });
    }
  };

  const fetchInvoiceDetails = async (invoiceId) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    let updates = {
      invoiceDate: invoice.invoice_date || '',
      poNumber: invoice.po_number || '',
      poDate: invoice.po_date || '',
      referenceNumber: invoice.reference_no || '',
      referenceDate: invoice.reference_date || '',
      invoiceAmount: invoice.total_amount || 0,
      companyName: invoice.company_name || '',
      companyAddress: invoice.company_address || '',
      companyState: invoice.company_state || '',
      companyGSTIN: invoice.company_gstin || '',
      companyStateCode: invoice.company_gstin ? invoice.company_gstin.substring(0, 2) : ''
    };

    if (invoice.po_number) {
      const { data: poData } = await fetchWithRetry(
          (signal) => supabase
            .from('purchase_order_receipts')
            .select('department, user')
            .or(`quotation_number.eq.${invoice.po_number},order_receipt_id.eq.${invoice.po_number}`)
            .maybeSingle()
            .abortSignal(signal),
          { operationName: 'Fetch PO Details for Invoice', timeoutMs: 10000 }
      );

      if (poData) {
        updates.departmentName = poData.department || '';
        updates.userName = poData.user || '';
      } else {
         const customer = clients.find(c => c.id === formData.customerId);
         if (customer) {
           updates.departmentName = customer.department_name_1 || customer.department1 || '';
           updates.userName = customer.user1 || '';
         }
      }
    } else {
        const customer = clients.find(c => c.id === formData.customerId);
        if (customer) {
          updates.departmentName = customer.department_name_1 || customer.department1 || '';
          updates.userName = customer.user1 || '';
        }
    }

    setFormData(prev => {
      const newData = { ...prev, ...updates };
      const discount = parseFloat(newData.discountAmount) || 0;
      const invAmount = parseFloat(newData.invoiceAmount) || 0;
      newData.actualAmount = (invAmount - discount).toFixed(2);
      newData.actualAmountInWords = numberToWords(newData.actualAmount);
      return newData;
    });
  };

  const handleCustomerChange = (val) => {
    setFormData(prev => ({ 
      ...prev, 
      customerId: val, 
      invoiceId: '', 
      invoiceDate: '', 
      poNumber: '',
      poDate: '',
      referenceNumber: '', 
      referenceDate: '', 
      invoiceAmount: '', 
      actualAmount: '', 
      actualAmountInWords: '',
      departmentName: '', 
      userName: '',
      companyName: '',
      companyAddress: '',
      companyState: '',
      companyStateCode: '',
      companyGSTIN: ''
    }));
    fetchInvoices(val);
    
    const customer = clients.find(c => c.id === val);
    if (customer) {
        setFormData(prev => ({
            ...prev,
            departmentName: customer.department_name_1 || customer.department1 || '',
            userName: customer.user1 || ''
        }));
    }
  };

  const handleCustomerSelect = (client) => {
    setCustomerSearchTerm(client.customer_name);
    setShowCustomerSuggestions(false);
    handleCustomerChange(client.id);
  };

  const handleInvoiceChange = (val) => {
    setFormData(prev => ({ ...prev, invoiceId: val }));
    fetchInvoiceDetails(val);
  };

  const handleChange = (field, value) => {
    setFormData(prev => {
      const newState = { ...prev, [field]: value };
      
      if (field === 'discountAmount' || field === 'invoiceAmount') {
        const invAmount = parseFloat(newState.invoiceAmount) || 0;
        const discount = parseFloat(newState.discountAmount) || 0;
        newState.actualAmount = (invAmount - discount).toFixed(2);
      }

      if (['actualAmount', 'discountAmount', 'invoiceAmount'].includes(field)) {
        newState.actualAmountInWords = numberToWords(newState.actualAmount);
      }
      
      return newState;
    });
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    let currentY = 15;

    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(formData.companyName || 'Company Name Not Available', 105, currentY, { align: 'center' });
    currentY += 8;

    doc.setFontSize(14);
    doc.text('Payment Receipt', 105, currentY, { align: 'center' });
    currentY += 6;

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
    
    doc.setFontSize(10);
    doc.text(`Receipt No: ${formData.receiptNumber}`, 14, currentY);
    
    let displayDate = '-';
    if (formData.paymentDate) {
        try {
            displayDate = format(new Date(formData.paymentDate), 'dd-MM-yyyy');
        } catch (e) {
            displayDate = formData.paymentDate;
        }
    }
    doc.text(`Date: ${displayDate}`, 150, currentY); 
    currentY += 5;
    
    const customer = clients.find(c => c.id === formData.customerId);
    doc.text(`Customer: ${customer?.customer_name || '-'}`, 14, currentY);
    currentY += 5;
    doc.text(`Department: ${formData.departmentName || '-'}`, 14, currentY);
    currentY += 5;
    doc.text(`User: ${formData.userName || '-'}`, 14, currentY);
    
    currentY += 5; 

    doc.line(10, currentY, 200, currentY);
    currentY += 5; 

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        try {
            return format(new Date(dateStr), 'dd-MM-yyyy');
        } catch (e) {
            return dateStr;
        }
    };

    const tableData = [
      ['Invoice No', formData.invoiceId ? invoices.find(i => i.id === formData.invoiceId)?.invoice_number : '-'],
      ['Invoice Date', formatDate(formData.invoiceDate)],
      ['PO Number', formData.poNumber || '-'],
      ['PO Date', formatDate(formData.poDate)],
      ['Ref No', formData.referenceNumber || '-'],
      ['Ref Date', formatDate(formData.referenceDate)],
      ['Invoice Amount', `Rs. ${formData.invoiceAmount || '0.00'}`],
      ['Deductions', `${formData.deductionType || 'None'} (Rs. ${formData.discountAmount})`],
      ['Actual Received', `Rs. ${formData.actualAmount || '0.00'}`],
      ['Amount in Words', formData.actualAmountInWords || '-'],
      ['Payment Mode', formData.paymentMode],
      ['Transaction Ref', formData.transactionRef || '-']
    ];

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

    doc.save(`Payment_Receipt_${formData.receiptNumber}.pdf`);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (!formData.customerId) throw new Error("Please select a customer.");
      if (!formData.receiptNumber) throw new Error("Please enter a Receipt Number.");
      if (!formData.actualAmount || parseFloat(formData.actualAmount) <= 0) throw new Error("Actual amount received cannot be zero.");

      const payload = {
        receipt_number: formData.receiptNumber,
        payment_date: formData.paymentDate,
        customer_id: formData.customerId,
        amount: parseFloat(formData.actualAmount),
        payment_mode: formData.paymentMode,
        reference_number: formData.transactionRef,
        remarks: formData.remarks,
        invoice_id: formData.invoiceId || null,
        deduction_type: formData.deductionType,
        deduction_amount: parseFloat(formData.discountAmount) || 0,
        actual_amount: parseFloat(formData.actualAmount),
        department_name: formData.departmentName,
        user_name: formData.userName,
        invoice_reference_number: formData.referenceNumber,
        invoice_reference_date: formData.referenceDate || null,
        po_number: formData.poNumber,
        po_date: formData.poDate || null,
        company_name: formData.companyName,
        company_address: formData.companyAddress,
        company_state: formData.companyState,
        company_state_code: formData.companyStateCode,
        company_gstin: formData.companyGSTIN
      };

      const { error } = await supabase.from('payment_receipts').insert([payload]);

      if (error) throw error;

      toast({ title: "Success", description: "Payment Receipt created successfully!" });
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg space-y-6 w-full relative z-10 shadow-sm border border-gray-100">
      <div className="flex justify-between items-center border-b border-gray-100 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Create New Payment Receipt</h2>
        <Button 
          onClick={onClose} 
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-95 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Row 1 */}
        <div className="space-y-2">
          <Label className="text-gray-700 font-medium">Payment Receipt Number</Label>
          <Input 
            className="bg-white text-gray-900 border-gray-300 focus:ring-blue-500 focus:border-blue-500"
            value={formData.receiptNumber} 
            onChange={(e) => handleChange('receiptNumber', e.target.value)}
            placeholder="Enter Receipt Number"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-gray-700 font-medium">Payment Receipt Date</Label>
          <Input 
            type="date" 
            className="bg-white text-gray-900 border-gray-300"
            value={formData.paymentDate} 
            onChange={(e) => handleChange('paymentDate', e.target.value)} 
          />
        </div>

        {/* Row 2 */}
        <div className="space-y-2">
          <Label className="text-gray-700 font-medium">Customer Name</Label>
          <div className="relative">
            {isLoadingCustomers ? (
               <Loader2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />
            ) : (
               <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            )}
            <Input 
              className="pl-9 bg-white text-gray-900 border-gray-300"
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
              <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-md shadow-xl max-h-[200px] overflow-auto mt-1">
                  {filteredClients.length > 0 ? (
                      filteredClients.map((c, index) => (
                          <div 
                              key={c.id ? `${c.id}-${index}` : `client-${index}`} 
                              className="p-3 hover:bg-blue-50 cursor-pointer text-sm text-gray-900 border-b last:border-0 border-gray-100"
                          onMouseDown={(e) => { e.preventDefault(); handleCustomerSelect(c); }}
                          >
                              {c.customer_name}
                          </div>
                      ))
                  ) : (
                      <div className="p-3 text-sm text-gray-500 bg-gray-50">No customers found</div>
                  )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-gray-700 font-medium">Department Name</Label>
          <Input 
            className="bg-white text-gray-900 border-gray-300"
            value={formData.departmentName} 
            onChange={(e) => handleChange('departmentName', e.target.value)} 
            placeholder="Auto-filled" 
          />
        </div>

        <div className="space-y-2">
          <Label className="text-gray-700 font-medium">User Name</Label>
          <Input 
            className="bg-white text-gray-900 border-gray-300"
            value={formData.userName} 
            onChange={(e) => handleChange('userName', e.target.value)} 
            placeholder="Auto-filled" 
          />
        </div>

        <div className="space-y-2">
          <Label className="text-gray-700 font-medium">Invoice Number</Label>
          <Select value={formData.invoiceId} onValueChange={handleInvoiceChange} disabled={!formData.customerId}>
            <SelectTrigger className="bg-white text-gray-900 border-gray-300">
              <SelectValue placeholder={formData.customerId ? "Select Invoice" : "Select Customer First"} />
            </SelectTrigger>
            <SelectContent className="max-h-[200px] overflow-y-auto bg-white border-gray-200 z-[60]">
              {invoices.map((inv, index) => (
                <SelectItem key={inv.id ? `${inv.id}-${index}` : `invoice-${index}`} value={inv.id}>{inv.invoice_number}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Row 3 */}
        <div className="space-y-2">
          <Label className="text-gray-700 font-medium">Invoice Date</Label>
          <Input type="date" value={formData.invoiceDate} readOnly className="bg-gray-100 text-gray-600 cursor-not-allowed border-gray-200" />
        </div>

        <div className="space-y-2">
          <Label className="text-gray-700 font-medium">Purchase Order Number</Label>
          <Input value={formData.poNumber} readOnly className="bg-gray-100 text-gray-600 cursor-not-allowed border-gray-200" />
        </div>

        <div className="space-y-2">
          <Label className="text-gray-700 font-medium">Purchase Order Date</Label>
          <Input type="date" value={formData.poDate} readOnly className="bg-gray-100 text-gray-600 cursor-not-allowed border-gray-200" />
        </div>

        <div className="space-y-2">
          <Label className="text-gray-700 font-medium">Reference Number (Invoice)</Label>
          <Input value={formData.referenceNumber} readOnly className="bg-gray-100 text-gray-600 cursor-not-allowed border-gray-200" />
        </div>

        <div className="space-y-2">
          <Label className="text-gray-700 font-medium">Reference Date (Invoice)</Label>
          <Input type="date" value={formData.referenceDate} readOnly className="bg-gray-100 text-gray-600 cursor-not-allowed border-gray-200" />
        </div>

        <div className="space-y-2">
          <Label className="text-gray-700 font-medium">Invoice Amount (₹)</Label>
          <Input value={formData.invoiceAmount} readOnly className="bg-gray-100 text-gray-600 cursor-not-allowed border-gray-200" />
        </div>

        {/* Row 4 */}
        <div className="space-y-2">
          <Label className="text-gray-700 font-medium">Deductions</Label>
          <Select value={formData.deductionType} onValueChange={(val) => handleChange('deductionType', val)}>
            <SelectTrigger className="bg-white text-gray-900 border-gray-300">
              <SelectValue placeholder="Select Deduction" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 z-[60]">
              <SelectItem value="Discount">Discount</SelectItem>
              <SelectItem value="TDS">TDS</SelectItem>
              <SelectItem value="Round Off">Round Off</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-gray-700 font-medium">Enter Discount Amount (₹)</Label>
          <Input 
            type="number" 
            className="bg-white text-gray-900 border-gray-300"
            value={formData.discountAmount} 
            onChange={(e) => handleChange('discountAmount', e.target.value)} 
          />
        </div>

        <div className="space-y-2">
          <Label className="text-blue-700 font-semibold">Actual Amount Received (₹)</Label>
          <Input 
            type="number" 
            value={formData.actualAmount} 
            onChange={(e) => handleChange('actualAmount', e.target.value)} 
            className="border-blue-300 bg-blue-50 font-bold text-blue-900"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-gray-700 font-medium">Actual Amount Received in Words</Label>
          <Input 
            value={formData.actualAmountInWords} 
            readOnly 
            className="bg-gray-100 text-gray-600 border-gray-200 italic"
            placeholder="Amount in words will appear here"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-gray-700 font-medium">Payment Mode</Label>
          <Select value={formData.paymentMode} onValueChange={(val) => handleChange('paymentMode', val)}>
            <SelectTrigger className="bg-white text-gray-900 border-gray-300">
              <SelectValue placeholder="Select Mode" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200 z-[60]">
              <SelectItem value="NEFT">NEFT</SelectItem>
              <SelectItem value="RTGS">RTGS</SelectItem>
              <SelectItem value="Cheque">Cheque</SelectItem>
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="UPI">UPI</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-gray-700 font-medium">Transaction Ref / Cheque No.</Label>
          <Input 
            className="bg-white text-gray-900 border-gray-300"
            value={formData.transactionRef} 
            onChange={(e) => handleChange('transactionRef', e.target.value)} 
            placeholder="UTR / Cheque No" 
          />
        </div>

        <div className="col-span-1 md:col-span-2 space-y-2">
          <Label className="text-gray-700 font-medium">Remarks</Label>
          <Textarea 
            className="bg-white text-gray-900 border-gray-300"
            value={formData.remarks} 
            onChange={(e) => handleChange('remarks', e.target.value)} 
            placeholder="Any additional notes..." 
          />
        </div>

        {/* New Company Fields */}
        <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:col-span-2 gap-4 pt-6 border-t border-gray-100 mt-2">
            <h3 className="col-span-1 md:col-span-2 text-md font-semibold text-blue-600 mb-1">Company Details (Autofilled from Invoice)</h3>
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Company Name</Label>
              <Input className="bg-white text-gray-900 border-gray-300" value={formData.companyName} onChange={(e) => handleChange('companyName', e.target.value)} placeholder="Company Name" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Company Address</Label>
              <Input className="bg-white text-gray-900 border-gray-300" value={formData.companyAddress} onChange={(e) => handleChange('companyAddress', e.target.value)} placeholder="Company Address" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">State</Label>
              <Input className="bg-white text-gray-900 border-gray-300" value={formData.companyState} onChange={(e) => handleChange('companyState', e.target.value)} placeholder="State" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">State Code</Label>
              <Input className="bg-white text-gray-900 border-gray-300" value={formData.companyStateCode} onChange={(e) => handleChange('companyStateCode', e.target.value)} placeholder="State Code" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-gray-700 font-medium">GSTIN</Label>
              <Input className="bg-white text-gray-900 border-gray-300" value={formData.companyGSTIN} onChange={(e) => handleChange('companyGSTIN', e.target.value)} placeholder="GSTIN" />
            </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
        <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-95">
          Close
        </Button>
        <Button onClick={generatePDF} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-95">
          <FileDown className="w-4 h-4 mr-2" />
          Save as PDF
        </Button>
        <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md px-8">
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Saving...' : 'Save Payment Receipt'}
        </Button>
      </div>
    </div>
  );
};

export default CreatePaymentReceiptForm;