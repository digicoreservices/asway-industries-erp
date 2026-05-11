import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { motion } from 'framer-motion';
import { Search, ArrowLeft, Eye, Trash2, Loader2, Check, Download, Save, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

const SearchSupplierPaymentReceipt = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [suppliers, setSuppliers] = useState([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const pdfRef = useRef(null);

  // Fetch Suppliers on Mount
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const { data, error } = await supabase.from('suppliers').select('*');
        if (error) throw error;
        setSuppliers(data || []);
      } catch (err) {
        console.error('Error fetching suppliers:', err);
        toast({ title: 'Error', description: 'Failed to fetch suppliers.', variant: 'destructive' });
      } finally {
        setLoadingSuppliers(false);
      }
    };
    fetchSuppliers();
  }, [toast]);

  const filteredSuppliers = suppliers.filter(s => 
    s.supplier_name?.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    s.supplier_id?.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  const handleSupplierSelect = (supplier) => {
    setSelectedSupplierId(supplier.id);
    setSupplierSearch(supplier.supplier_name);
    setShowSupplierDropdown(false);
    // Optional: Auto-fetch receipts here, or wait for "Show" button
  };

  const handleShowReceipts = async () => {
    if (!selectedSupplierId) {
      toast({ title: 'Validation', description: 'Please select a supplier first.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('supplier_purchase_order_receipts')
        .select('*')
        .eq('supplier_id', selectedSupplierId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReceipts(data || []);
      
      if (data && data.length === 0) {
        toast({ title: 'Info', description: 'No records found for this supplier.' });
      }
    } catch (err) {
      console.error('Error fetching receipts:', err);
      toast({ title: 'Error', description: 'Failed to fetch receipts.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this receipt? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('supplier_purchase_order_receipts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setReceipts(prev => prev.filter(r => r.id !== id));
      toast({ title: 'Success', description: 'Receipt deleted successfully.' });
    } catch (err) {
      console.error('Error deleting receipt:', err);
      toast({ title: 'Error', description: 'Failed to delete receipt.', variant: 'destructive' });
    }
  };

  const handleViewDetails = (receipt) => {
    // Clone receipt for editing to avoid mutating original list state directly
    setCurrentReceipt({ ...receipt });
    setIsModalOpen(true);
  };

  const handleModalChange = (e) => {
    const { name, value } = e.target;
    setCurrentReceipt(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setCurrentReceipt(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      // Prepare payload (excluding id and created_at)
      const payload = {
        po_from_supplier_no: currentReceipt.po_from_supplier_no,
        advance_amount_paid: currentReceipt.advance_amount_paid || 0,
        advance_paid_date: currentReceipt.advance_paid_date || null,
        transaction_type: currentReceipt.transaction_type || '',
        transaction_cheque_number: currentReceipt.transaction_cheque_number || '',
        remaining_payment_amount: currentReceipt.remaining_payment_amount || 0,
        remaining_payment_date: currentReceipt.remaining_payment_date || null,
        remaining_payment_transaction_type: currentReceipt.remaining_payment_transaction_type || '',
        remaining_payment_transaction_cheque_number: currentReceipt.remaining_payment_transaction_cheque_number || '',
        purchase_order_date: currentReceipt.purchase_order_date || null,
        // Note: Remarks is not in the standard schema based on provided context, 
        // so we omit it from the payload to avoid breaking the update, 
        // but it's maintained in UI state for display purposes.
      };

      const { error } = await supabase
        .from('supplier_purchase_order_receipts')
        .update(payload)
        .eq('id', currentReceipt.id);

      if (error) throw error;

      // Update local state
      setReceipts(prev => prev.map(r => r.id === currentReceipt.id ? { ...r, ...payload } : r));
      setIsModalOpen(false);
      toast({ title: 'Success', description: 'Receipt updated successfully.' });
    } catch (err) {
      console.error('Error updating receipt:', err);
      toast({ title: 'Error', description: 'Failed to update receipt.', variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

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
      pdf.save(`Supplier_Payment_Receipt_${currentReceipt?.po_from_supplier_no || 'Document'}.pdf`);
      
      toast({ title: 'Success', description: 'PDF generated successfully.' });
    } catch (err) {
      console.error('PDF generation error:', err);
      toast({ title: 'Error', description: 'Failed to generate PDF.', variant: 'destructive' });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="py-8 px-6 max-w-6xl mx-auto space-y-6">
      <Helmet>
        <title>Search Supplier Payment Receipts | Asway ERP</title>
      </Helmet>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Search, Edit and Delete Supplier Payment Receipt
        </h1>
        <Button 
          onClick={() => navigate(-1)} 
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>

      <Card className="shadow-sm border-gray-200">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6 items-end">
            <div className="w-full md:w-1/2 space-y-2 relative">
              <Label>Supplier Name</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search supplier..."
                  value={supplierSearch}
                  onChange={(e) => {
                    setSupplierSearch(e.target.value);
                    setShowSupplierDropdown(true);
                    if (e.target.value === '') setSelectedSupplierId(null);
                  }}
                  onFocus={() => setShowSupplierDropdown(true)}
                  className="bg-white text-gray-900 pl-10"
                />
                {loadingSuppliers && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-400" />}
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
                        {selectedSupplierId === supplier.id && <Check className="h-4 w-4 text-blue-600" />}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            
            <Button 
              onClick={handleShowReceipts}
              disabled={loading || !selectedSupplierId}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full md:w-auto"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              Show
            </Button>
          </div>

          {/* Results Table */}
          <div className="mt-8 border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>Receipt Number</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Mode</TableHead>
                  <TableHead>Reference Number</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      {selectedSupplierId && !loading ? 'No records found.' : 'Select a supplier to view receipts.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  receipts.map((receipt) => (
                    <TableRow key={receipt.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="font-medium">{receipt.po_from_supplier_no}</TableCell>
                      <TableCell>{receipt.advance_paid_date ? format(new Date(receipt.advance_paid_date), 'dd MMM yyyy') : 'N/A'}</TableCell>
                      <TableCell>₹{receipt.advance_amount_paid || 0}</TableCell>
                      <TableCell>{receipt.transaction_type || 'N/A'}</TableCell>
                      <TableCell>{receipt.transaction_cheque_number || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleViewDetails(receipt)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDelete(receipt.id)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden bg-white">
          <DialogHeader className="p-6 pb-2 border-b">
            <DialogTitle className="text-2xl font-bold">Receipt Details</DialogTitle>
            <DialogDescription>
              View and edit supplier payment receipt details.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[calc(90vh-140px)] p-6">
            {currentReceipt && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6" ref={pdfRef}>
                <div className="space-y-2">
                  <Label>Receipt Number</Label>
                  <Input value={currentReceipt.po_from_supplier_no || ''} readOnly className="bg-gray-50 text-gray-900" />
                </div>
                
                <div className="space-y-2">
                  <Label>Payment Date</Label>
                  <Input 
                    type="date" 
                    name="advance_paid_date" 
                    value={currentReceipt.advance_paid_date || ''} 
                    onChange={handleModalChange}
                    className="bg-white text-gray-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input 
                    type="number" 
                    name="advance_amount_paid" 
                    value={currentReceipt.advance_amount_paid || ''} 
                    onChange={handleModalChange}
                    className="bg-white text-gray-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Payment Mode (Transaction Type)</Label>
                  <Select 
                    value={currentReceipt.transaction_type || ''} 
                    onValueChange={(val) => handleSelectChange('transaction_type', val)}
                  >
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

                <div className="space-y-2">
                  <Label>Reference Number (Cheque No.)</Label>
                  <Input 
                    name="transaction_cheque_number" 
                    value={currentReceipt.transaction_cheque_number || ''} 
                    onChange={handleModalChange}
                    className="bg-white text-gray-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Purchase Order Date</Label>
                  <Input 
                    type="date" 
                    name="purchase_order_date" 
                    value={currentReceipt.purchase_order_date || ''} 
                    onChange={handleModalChange}
                    className="bg-white text-gray-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Remaining Payment Amount</Label>
                  <Input 
                    type="number" 
                    name="remaining_payment_amount" 
                    value={currentReceipt.remaining_payment_amount || ''} 
                    onChange={handleModalChange}
                    className="bg-white text-gray-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Remaining Payment Date</Label>
                  <Input 
                    type="date" 
                    name="remaining_payment_date" 
                    value={currentReceipt.remaining_payment_date || ''} 
                    onChange={handleModalChange}
                    className="bg-white text-gray-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Remaining Payment Transaction Type</Label>
                  <Select 
                    value={currentReceipt.remaining_payment_transaction_type || ''} 
                    onValueChange={(val) => handleSelectChange('remaining_payment_transaction_type', val)}
                  >
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

                <div className="space-y-2">
                  <Label>Remaining Payment Transaction Cheque No.</Label>
                  <Input 
                    name="remaining_payment_transaction_cheque_number" 
                    value={currentReceipt.remaining_payment_transaction_cheque_number || ''} 
                    onChange={handleModalChange}
                    className="bg-white text-gray-900"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Remarks / Notes</Label>
                  <Textarea 
                    name="remarks" 
                    value={currentReceipt.remarks || ''} 
                    onChange={handleModalChange}
                    placeholder="Enter any additional notes..."
                    className="bg-white text-gray-900"
                  />
                </div>
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="p-6 border-t bg-gray-50 flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Button 
              variant="outline" 
              onClick={() => setIsModalOpen(false)}
              className="w-full sm:w-auto"
            >
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
            <Button 
              onClick={handleSavePdf}
              disabled={isGeneratingPdf}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
            >
              {isGeneratingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Save as PDF
            </Button>
            <Button 
              onClick={handleUpdate}
              disabled={isUpdating}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
            >
              {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SearchSupplierPaymentReceipt;