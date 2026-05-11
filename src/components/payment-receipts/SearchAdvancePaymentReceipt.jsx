import React, { useState, useMemo, useEffect } from 'react';
import { Search, Loader2, Edit, Trash2, Save, FileDown, ArrowLeft, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import useClientManagement from '@/hooks/useClientManagement';
import { numberToWords } from '@/lib/numberToWords';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const SearchAdvancePaymentReceipt = ({ onClose }) => {
  const { toast } = useToast();
  const { clients, loading: clientsLoading } = useClientManagement();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  const [editingReceipt, setEditingReceipt] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [deleteReceiptId, setDeleteReceiptId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- Search View State & Logic ---
  const filteredClients = useMemo(() => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase();
    return clients.filter(c => 
      c.customer_name?.toLowerCase().includes(term) ||
      c.customer_id?.toLowerCase().includes(term)
    ).slice(0, 10);
  }, [clients, searchTerm]);

  const handleSuggestionClick = (client) => {
    setSelectedCustomer(client);
    setSearchTerm(client.customer_name);
    setShowSuggestions(false);
    setHasSearched(false);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setSelectedCustomer(null);
    setShowSuggestions(true);
    setHasSearched(false);
  };

  const fetchReceipts = async () => {
    if (!selectedCustomer) {
      toast({ title: "Select Customer", description: "Please select a customer first.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const { data, error } = await supabase
        .from('advance_payment_receipts')
        .select('*')
        .eq('customer_id', selectedCustomer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReceipts(data || []);
    } catch (err) {
      console.error("Error fetching receipts:", err);
      toast({ title: "Error", description: "Failed to fetch advance payment receipts.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteReceiptId) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('advance_payment_receipts')
        .delete()
        .eq('id', deleteReceiptId);

      if (error) throw error;
      
      toast({ title: "Success", description: "Receipt deleted successfully!" });
      setReceipts(prev => prev.filter(r => r.id !== deleteReceiptId));
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to delete receipt.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setDeleteReceiptId(null);
    }
  };

  // --- Edit Form State & Logic ---
  const [formData, setFormData] = useState({});
  const [taxes, setTaxes] = useState({ sgst: false, cgst: false, igst: false });
  const [calculated, setCalculated] = useState({ sgstAmount: 0, cgstAmount: 0, igstAmount: 0, totalAmount: 0, totalAmountInWords: '' });

  const handleEditClick = (receipt) => {
    setFormData({
      receiptNumber: receipt.receipt_number || '',
      paymentDate: receipt.payment_date || new Date().toISOString().split('T')[0],
      departmentName: receipt.department_name || '',
      userName: receipt.user_name || '',
      poNumber: receipt.po_number || '',
      poDate: receipt.po_date || '',
      advanceAmount: receipt.advance_amount || '',
      paymentMode: receipt.payment_mode || 'NEFT',
      transactionRef: receipt.reference_number || '',
      remarks: receipt.remarks ? receipt.remarks.replace('[ADVANCE] ', '') : '',
      companyName: receipt.company_name || 'Asway Industries Pvt Ltd',
      companyAddress: receipt.company_address || '',
      companyState: receipt.company_state || '',
      companyStateCode: receipt.company_state_code || '',
      companyGSTIN: receipt.company_gstin || ''
    });

    setTaxes({
      sgst: parseFloat(receipt.sgst_amount) > 0,
      cgst: parseFloat(receipt.cgst_amount) > 0,
      igst: parseFloat(receipt.igst_amount) > 0
    });

    setEditingReceipt(receipt);
  };

  useEffect(() => {
    if (editingReceipt) {
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
    }
  }, [formData.advanceAmount, taxes, editingReceipt]);

  const handleEditChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdate = async () => {
    try {
      setIsUpdating(true);
      if (!formData.receiptNumber) throw new Error("Please enter a Receipt Number.");
      if (!calculated.totalAmount || parseFloat(calculated.totalAmount) <= 0) throw new Error("Amount received cannot be zero.");

      const payload = {
        receipt_number: formData.receiptNumber,
        payment_date: formData.paymentDate,
        amount: parseFloat(calculated.totalAmount),
        payment_mode: formData.paymentMode,
        reference_number: formData.transactionRef,
        remarks: `[ADVANCE] ${formData.remarks}`,
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

      const { error } = await supabase
        .from('advance_payment_receipts')
        .update(payload)
        .eq('id', editingReceipt.id);

      if (error) throw error;

      toast({ title: "Success", description: "Advance Payment Receipt updated successfully!" });
      
      // Refresh the specific row
      setReceipts(prev => prev.map(r => r.id === editingReceipt.id ? { ...r, ...payload } : r));
      setEditingReceipt(null);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
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
    
    doc.text(`Customer: ${selectedCustomer?.customer_name || '-'}`, 14, currentY);
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

  const formatDateStr = (dateStr) => {
    if (!dateStr) return 'N/A';
    try { return format(new Date(dateStr), 'dd MMM yyyy'); } catch { return dateStr; }
  };

  if (editingReceipt) {
    return (
      <div className="flex flex-col h-[85vh] bg-white">
        <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
           <div className="flex items-center gap-2">
             <Button variant="ghost" size="icon" onClick={() => setEditingReceipt(null)}>
               <ArrowLeft className="h-5 w-5" />
             </Button>
             <h2 className="text-xl font-bold text-gray-800">Edit Advance Payment Receipt</h2>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Advance Payment Receipt Number</Label>
              <Input value={formData.receiptNumber} onChange={(e) => handleEditChange('receiptNumber', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Advance Payment Receipt Date</Label>
              <Input type="date" value={formData.paymentDate} onChange={(e) => handleEditChange('paymentDate', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input value={selectedCustomer?.customer_name || ''} readOnly className="bg-gray-50" />
            </div>

            <div className="space-y-2">
              <Label>Department Name</Label>
              <Input value={formData.departmentName} onChange={(e) => handleEditChange('departmentName', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>User Name</Label>
              <Input value={formData.userName} onChange={(e) => handleEditChange('userName', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Purchase Order Number</Label>
              <Input value={formData.poNumber} onChange={(e) => handleEditChange('poNumber', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Purchase Order Date</Label>
              <Input type="date" value={formData.poDate} onChange={(e) => handleEditChange('poDate', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Advance Amount (₹)</Label>
              <Input type="number" value={formData.advanceAmount} onChange={(e) => handleEditChange('advanceAmount', e.target.value)} />
            </div>

            <div className="col-span-1 md:col-span-2 p-4 border rounded-md bg-gray-50 space-y-4">
                <Label className="text-gray-700 font-semibold">Taxes</Label>
                <div className="flex flex-wrap gap-6">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="esgst" checked={taxes.sgst} onCheckedChange={(c) => setTaxes(p => ({...p, sgst: c}))} />
                        <Label htmlFor="esgst" className="cursor-pointer">SGST (9%)</Label>
                        {taxes.sgst && <span className="text-sm text-gray-500">₹{calculated.sgstAmount.toFixed(2)}</span>}
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="ecgst" checked={taxes.cgst} onCheckedChange={(c) => setTaxes(p => ({...p, cgst: c}))} />
                        <Label htmlFor="ecgst" className="cursor-pointer">CGST (9%)</Label>
                        {taxes.cgst && <span className="text-sm text-gray-500">₹{calculated.cgstAmount.toFixed(2)}</span>}
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="eigst" checked={taxes.igst} onCheckedChange={(c) => setTaxes(p => ({...p, igst: c}))} />
                        <Label htmlFor="eigst" className="cursor-pointer">IGST (18%)</Label>
                        {taxes.igst && <span className="text-sm text-gray-500">₹{calculated.igstAmount.toFixed(2)}</span>}
                    </div>
                </div>
            </div>

            <div className="space-y-2">
              <Label className="text-green-700 font-semibold">Total Advance Amount Received (₹)</Label>
              <Input value={calculated.totalAmount} readOnly className="border-green-200 bg-green-50 font-semibold text-lg" />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-600">Total Amount in Words</Label>
              <Input value={calculated.totalAmountInWords} readOnly className="bg-gray-50 text-gray-600" />
            </div>

            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <Select value={formData.paymentMode} onValueChange={(val) => handleEditChange('paymentMode', val)}>
                <SelectTrigger><SelectValue placeholder="Select Mode" /></SelectTrigger>
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
              <Input value={formData.transactionRef} onChange={(e) => handleEditChange('transactionRef', e.target.value)} />
            </div>

            <div className="col-span-1 md:col-span-2 space-y-2">
              <Label>Remarks</Label>
              <Textarea value={formData.remarks} onChange={(e) => handleEditChange('remarks', e.target.value)} />
            </div>
            
            <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t mt-2">
                <h3 className="col-span-1 md:col-span-2 text-sm font-semibold text-gray-500 mb-1">Company Details</h3>
                <div className="space-y-2"><Label>Company Name</Label><Input value={formData.companyName} onChange={(e) => handleEditChange('companyName', e.target.value)} /></div>
                <div className="space-y-2"><Label>Company Address</Label><Input value={formData.companyAddress} onChange={(e) => handleEditChange('companyAddress', e.target.value)} /></div>
                <div className="space-y-2"><Label>State</Label><Input value={formData.companyState} onChange={(e) => handleEditChange('companyState', e.target.value)} /></div>
                <div className="space-y-2"><Label>State Code</Label><Input value={formData.companyStateCode} onChange={(e) => handleEditChange('companyStateCode', e.target.value)} /></div>
                <div className="space-y-2 md:col-span-2"><Label>GSTIN</Label><Input value={formData.companyGSTIN} onChange={(e) => handleEditChange('companyGSTIN', e.target.value)} /></div>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t bg-gray-50 flex flex-wrap justify-end gap-3 mt-auto sticky bottom-0">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={onClose}>Go Back</Button>
          <Button variant="secondary" onClick={generatePDF}>
            <FileDown className="w-4 h-4 mr-2" />
            Save as PDF
          </Button>
          <Button onClick={handleUpdate} disabled={isUpdating} className="bg-blue-600 hover:bg-blue-700 text-white">
             {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
             Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[85vh] bg-white">
      <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
         <h2 className="text-xl font-bold text-gray-800">Search Advance Payment Receipts</h2>
         {onClose && <Button className="bg-blue-600 hover:bg-blue-700 text-white" size="sm" onClick={onClose}>Go Back</Button>}
      </div>

      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        <div className="flex flex-col md:flex-row gap-4 items-end max-w-2xl">
          <div className="w-full relative space-y-2">
            <Label htmlFor="customer-search">Customer Name</Label>
            <div className="relative">
              {clientsLoading ? (
                 <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
              ) : (
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              )}
              <Input
                id="customer-search"
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder={clientsLoading ? "Loading..." : "Search and select customer..."}
                className="pl-9 bg-white"
                autoComplete="off"
                disabled={clientsLoading}
              />
            </div>
            
            {showSuggestions && filteredClients.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {filteredClients.map(client => (
                  <div
                    key={client.id}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                    onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(client); }}
                  >
                    <p className="font-semibold text-gray-800">{client.customer_name}</p>
                    <p className="text-xs text-gray-500">{client.customer_id}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <Button 
            onClick={fetchReceipts} 
            disabled={loading || !selectedCustomer}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
            Show
          </Button>
        </div>

        {hasSearched && !loading && (
          <div className="mt-6 border rounded-md bg-white overflow-hidden">
            {receipts.length === 0 ? (
              <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center">
                <AlertCircle className="h-12 w-12 text-gray-300 mb-3" />
                <p className="text-lg font-medium text-gray-700">No Receipts Found</p>
                <p className="text-sm">There are no advance payment records for this customer.</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[50vh]">
                <Table>
                  <TableHeader className="bg-gray-50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead>Receipt Number</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Ref Number</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receipts.map((receipt) => (
                      <TableRow key={receipt.id}>
                        <TableCell className="font-medium">{receipt.receipt_number}</TableCell>
                        <TableCell>{formatDateStr(receipt.payment_date)}</TableCell>
                        <TableCell>₹{parseFloat(receipt.amount || 0).toFixed(2)}</TableCell>
                        <TableCell>{receipt.payment_mode || '-'}</TableCell>
                        <TableCell>{receipt.reference_number || '-'}</TableCell>
                        <TableCell className="max-w-[150px] truncate" title={receipt.remarks}>{receipt.remarks || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                             <Button variant="ghost" size="icon" onClick={() => handleEditClick(receipt)} title="Edit">
                               <Edit className="h-4 w-4 text-blue-600" />
                             </Button>
                             <Button variant="ghost" size="icon" onClick={() => setDeleteReceiptId(receipt.id)} title="Delete">
                               <Trash2 className="h-4 w-4 text-red-600" />
                             </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={!!deleteReceiptId} onOpenChange={(open) => !open && setDeleteReceiptId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Advance Payment Receipt</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this advance payment receipt? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteReceiptId(null)} disabled={isDeleting}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SearchAdvancePaymentReceipt;