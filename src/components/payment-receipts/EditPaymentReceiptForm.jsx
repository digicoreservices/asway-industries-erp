import React, { useState, useEffect, useMemo } from 'react';
import { Save, X, FileDown, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import useClientManagement from '@/hooks/useClientManagement';
import { numberToWords } from '@/lib/numberToWords';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

const EditPaymentReceiptForm = ({ receipt, onSuccess, onClose }) => {
  const { toast } = useToast();
  const { clients, loading: clientsLoading } = useClientManagement();
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [fetchingInvoices, setFetchingInvoices] = useState(false);
  
  // Safely initialize state. Avoid doing this in useEffect to prevent extra renders.
  const [formData, setFormData] = useState({
    receiptNumber: receipt?.receipt_number || '',
    paymentDate: receipt?.payment_date || new Date().toISOString().split('T')[0],
    customerId: receipt?.customer_id || '',
    departmentName: receipt?.department_name || '',
    userName: receipt?.user_name || '',
    invoiceId: receipt?.invoice_id || '',
    invoiceDate: '', 
    poNumber: receipt?.po_number || '',      
    poDate: receipt?.po_date || '',        
    referenceNumber: receipt?.invoice_reference_number || '', 
    referenceDate: receipt?.invoice_reference_date || '',   
    invoiceAmount: '', 
    deductionType: receipt?.deduction_type || '',
    discountAmount: receipt?.deduction_amount || '0',
    actualAmount: receipt?.actual_amount || '',
    actualAmountInWords: receipt?.actual_amount ? numberToWords(receipt.actual_amount) : '',
    paymentMode: receipt?.payment_mode || 'NEFT',
    transactionRef: receipt?.reference_number || '', 
    remarks: receipt?.remarks || '',
    companyName: receipt?.company_name || '',
    companyAddress: receipt?.company_address || '',
    companyState: receipt?.company_state || '',
    companyStateCode: receipt?.company_state_code || '',
    companyGSTIN: receipt?.company_gstin || ''
  });

  // Ensure unique clients and invoices to prevent duplicate key errors in rendering
  const uniqueClients = useMemo(() => {
    if (!clients) return [];
    return Array.from(new Map(clients.filter(c => c && c.id).map(c => [c.id, c])).values());
  }, [clients]);

  const uniqueInvoices = useMemo(() => {
    if (!invoices) return [];
    return Array.from(new Map(invoices.filter(i => i && i.id).map(i => [i.id, i])).values());
  }, [invoices]);

  // 1. Fetch Invoices safely without infinite loops (Dependency: primitive customer_id only)
  useEffect(() => {
    const customerId = receipt?.customer_id;
    if (!customerId) return;

    const fetchInvoices = async () => {
      setFetchingInvoices(true);
      try {
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setInvoices(data || []);
      } catch (error) {
        console.error('Error fetching invoices:', error);
        toast({ title: "Error", description: "Failed to fetch invoices", variant: "destructive" });
      } finally {
        setFetchingInvoices(false);
      }
    };

    fetchInvoices();
  }, [receipt?.customer_id, toast]);

  // 2. Safely sync invoice details when invoices are fetched (Dependency: invoice_id and invoices array)
  useEffect(() => {
    const invoiceId = receipt?.invoice_id;
    if (invoiceId && invoices.length > 0) {
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (invoice) {
        setFormData(prev => {
          // Performance optimization: prevent unnecessary state updates
          const newInvoiceDate = invoice.invoice_date || '';
          const newInvoiceAmount = invoice.total_amount || 0;
          
          if (prev.invoiceDate === newInvoiceDate && prev.invoiceAmount === newInvoiceAmount) {
            return prev;
          }

          return {
            ...prev,
            invoiceDate: newInvoiceDate,
            invoiceAmount: newInvoiceAmount,
            companyName: prev.companyName || invoice.company_name || '',
            companyAddress: prev.companyAddress || invoice.company_address || '',
            companyState: prev.companyState || invoice.company_state || '',
            companyGSTIN: prev.companyGSTIN || invoice.company_gstin || '',
            companyStateCode: prev.companyStateCode || (invoice.company_gstin ? invoice.company_gstin.substring(0, 2) : '')
          };
        });
      }
    }
  }, [receipt?.invoice_id, invoices]);

  const handleChange = (field, value) => {
    setFormData(prev => {
      const newState = { ...prev, [field]: value };
      
      if (field === 'discountAmount' || field === 'invoiceAmount') {
        const invAmount = parseFloat(newState.invoiceAmount) || 0;
        const discount = parseFloat(newState.discountAmount) || 0;
        if (field === 'discountAmount') {
             newState.actualAmount = (invAmount - discount).toFixed(2);
        }
      }

      // Update words if actual amount related fields change
      if (['actualAmount', 'discountAmount'].includes(field)) {
        const amtToConvert = field === 'actualAmount' ? value : newState.actualAmount;
        newState.actualAmountInWords = numberToWords(amtToConvert);
      }
      
      return newState;
    });
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    let currentY = 15;

    // --- Header Section ---
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(formData.companyName || 'Company Name Not Available', 105, currentY, { align: 'center' });
    currentY += 8;

    doc.setFontSize(14);
    doc.text('Payment Receipt', 105, currentY, { align: 'center' });
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
    
    // --- Receipt Details Section ---
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
    
    // Customer Details
    const customer = clients.find(c => c.id === formData.customerId);
    doc.text(`Customer: ${customer?.customer_name || formData.customerId}`, 14, currentY);
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

    // Invoice Details Table
    const tableData = [
      ['Invoice No', formData.invoiceId ? invoices.find(i => i.id === formData.invoiceId)?.invoice_number || '-' : '-'],
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
    
    // Remarks
    if (formData.remarks) {
      doc.setFont(undefined, 'bold');
      doc.text('Remarks:', 14, finalY);
      doc.setFont(undefined, 'normal');
      doc.text(formData.remarks, 14, finalY + 5);
    }

    doc.save(`Payment_Receipt_${formData.receiptNumber}.pdf`);
  };

  const handleUpdate = async () => {
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

      const { error } = await supabase
        .from('payment_receipts')
        .update(payload)
        .eq('id', receipt.id);

      if (error) throw error;

      toast({ title: "Success", description: "Payment Receipt updated successfully!" });
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!receipt) return null;

  return (
    <div className="space-y-6 p-1 relative">
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-xl font-bold">Edit Payment Receipt</h2>
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
          <Label>Payment Receipt Number</Label>
          <Input 
            value={formData.receiptNumber} 
            onChange={(e) => handleChange('receiptNumber', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Payment Receipt Date</Label>
          <Input type="date" value={formData.paymentDate} onChange={(e) => handleChange('paymentDate', e.target.value)} />
        </div>

        {/* Row 2 */}
        <div className="space-y-2">
          <Label>Customer Name</Label>
          <Select value={formData.customerId} disabled>
            <SelectTrigger>
              <SelectValue placeholder={clientsLoading ? "Loading..." : "Select Customer"} />
            </SelectTrigger>
            <SelectContent>
              {uniqueClients.map(client => (
                <SelectItem key={`client-${client.id}`} value={client.id}>{client.customer_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Department Name</Label>
          <Input value={formData.departmentName} onChange={(e) => handleChange('departmentName', e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>User Name</Label>
          <Input value={formData.userName} onChange={(e) => handleChange('userName', e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Invoice Number</Label>
          <Select value={formData.invoiceId} disabled>
            <SelectTrigger>
              <SelectValue placeholder={fetchingInvoices ? "Loading..." : "No Invoice Linked"} />
            </SelectTrigger>
            <SelectContent>
              {uniqueInvoices.map(inv => (
                <SelectItem key={`inv-${inv.id}`} value={inv.id}>{inv.invoice_number}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Row 3 */}
        <div className="space-y-2">
          <Label>Invoice Date</Label>
          <Input type="date" value={formData.invoiceDate} readOnly className="bg-gray-50" />
        </div>

        <div className="space-y-2">
          <Label>Purchase Order Number</Label>
          <Input value={formData.poNumber} readOnly className="bg-gray-50" />
        </div>

        <div className="space-y-2">
          <Label>Purchase Order Date</Label>
          <Input type="date" value={formData.poDate} readOnly className="bg-gray-50" />
        </div>

        <div className="space-y-2">
          <Label>Reference Number (Invoice)</Label>
          <Input value={formData.referenceNumber} readOnly className="bg-gray-50" />
        </div>

        <div className="space-y-2">
          <Label>Reference Date (Invoice)</Label>
          <Input type="date" value={formData.referenceDate} readOnly className="bg-gray-50" />
        </div>

        <div className="space-y-2">
          <Label>Invoice Amount (₹)</Label>
          <Input value={formData.invoiceAmount} readOnly className="bg-gray-50" />
        </div>

        {/* Row 4 */}
        <div className="space-y-2">
          <Label>Deductions</Label>
          <Select value={formData.deductionType} onValueChange={(val) => handleChange('deductionType', val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select Deduction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Discount">Discount</SelectItem>
              <SelectItem value="TDS">TDS</SelectItem>
              <SelectItem value="Round Off">Round Off</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Enter Discount Amount (₹)</Label>
          <Input type="number" value={formData.discountAmount} onChange={(e) => handleChange('discountAmount', e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label className="text-green-700 font-semibold">Actual Amount Received (₹)</Label>
          <Input 
            type="number" 
            value={formData.actualAmount} 
            onChange={(e) => handleChange('actualAmount', e.target.value)} 
            className="border-green-200 bg-green-50 font-semibold"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-gray-600">Actual Amount Received in Words</Label>
          <Input 
            value={formData.actualAmountInWords} 
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
          <Label>Transaction Ref / Cheque No.</Label>
          <Input value={formData.transactionRef} onChange={(e) => handleChange('transactionRef', e.target.value)} />
        </div>

        <div className="col-span-1 md:col-span-2 space-y-2">
          <Label>Remarks</Label>
          <Textarea value={formData.remarks} onChange={(e) => handleChange('remarks', e.target.value)} />
        </div>

        {/* New Company Fields */}
        <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t mt-2">
            <h3 className="col-span-1 md:col-span-2 text-sm font-semibold text-gray-500 mb-1">Company Details</h3>
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input value={formData.companyName} onChange={(e) => handleChange('companyName', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Company Address</Label>
              <Input value={formData.companyAddress} onChange={(e) => handleChange('companyAddress', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input value={formData.companyState} onChange={(e) => handleChange('companyState', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>State Code</Label>
              <Input value={formData.companyStateCode} onChange={(e) => handleChange('companyStateCode', e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>GSTIN</Label>
              <Input value={formData.companyGSTIN} onChange={(e) => handleChange('companyGSTIN', e.target.value)} />
            </div>
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
        <Button onClick={handleUpdate} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {loading ? 'Updating...' : 'Update Payment Receipt'}
        </Button>
      </div>
    </div>
  );
};

export default EditPaymentReceiptForm;