import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { 
  ArrowLeft, Search, Eye, Trash2, Save, Download, X, Loader2, Check, AlertCircle 
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const SearchSupplierAdvancePaymentReceipt = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State
  const [suppliers, setSuppliers] = useState([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  
  const [receipts, setReceipts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const pdfRef = useRef(null);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [receiptToDelete, setReceiptToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Suppliers on Mount
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const { data, error } = await supabase.from('suppliers').select('*');
        if (error) throw error;
        setSuppliers(data || []);
      } catch (err) {
        console.error('Error fetching suppliers:', err);
        toast({ title: 'Error', description: 'Failed to load suppliers.', variant: 'destructive' });
      }
    };
    fetchSuppliers();
  }, [toast]);

  // Filter suppliers
  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch) return suppliers;
    const lowerSearch = supplierSearch.toLowerCase();
    return suppliers.filter(s => 
      s.supplier_name?.toLowerCase().includes(lowerSearch) ||
      s.supplier_id?.toLowerCase().includes(lowerSearch)
    );
  }, [suppliers, supplierSearch]);

  const handleSupplierSelect = (supplier) => {
    setSelectedSupplier(supplier);
    setSupplierSearch(supplier.supplier_name);
    setShowSupplierDropdown(false);
    setReceipts([]); // Clear previous results
  };

  const handleShowReceipts = async () => {
    if (!selectedSupplier) {
      toast({ title: 'Validation Error', description: 'Please select a supplier first.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('supplier_purchase_order_receipts')
        .select('*')
        .eq('supplier_id', selectedSupplier.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReceipts(data || []);
      
      if (data?.length === 0) {
        toast({ title: 'No Results', description: 'No receipts found for this supplier.' });
      }
    } catch (err) {
      console.error('Error fetching receipts:', err);
      toast({ title: 'Error', description: 'Failed to fetch receipts.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Delete Logic
  const confirmDelete = async () => {
    if (!receiptToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('supplier_purchase_order_receipts')
        .delete()
        .eq('id', receiptToDelete.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Receipt deleted successfully.' });
      setReceipts(prev => prev.filter(r => r.id !== receiptToDelete.id));
      setIsDeleteModalOpen(false);
      setReceiptToDelete(null);
    } catch (err) {
      console.error('Delete error:', err);
      toast({ title: 'Error', description: 'Failed to delete receipt.', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Edit Logic
  const openEditModal = (receipt) => {
    setSelectedReceipt({ ...receipt });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedReceipt) return;
    setIsUpdating(true);
    try {
      const { id, ...updateData } = selectedReceipt;
      const { error } = await supabase
        .from('supplier_purchase_order_receipts')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Receipt updated successfully.' });
      setReceipts(prev => prev.map(r => r.id === id ? selectedReceipt : r));
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Update error:', err);
      toast({ title: 'Error', description: 'Failed to update receipt.', variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  // PDF Generation
  const handleSavePdf = async () => {
    if (!pdfRef.current || !selectedReceipt) return;
    setIsGeneratingPdf(true);
    try {
      const canvas = await html2canvas(pdfRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Supplier_Receipt_${selectedReceipt.po_from_supplier_no || 'Document'}.pdf`);
      
      toast({ title: 'Success', description: 'PDF generated successfully.' });
    } catch (err) {
      console.error('PDF error:', err);
      toast({ title: 'Error', description: 'Failed to generate PDF.', variant: 'destructive' });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="py-8 px-6 max-w-7xl mx-auto space-y-6">
      <Helmet>
        <title>Search Supplier Advance Payment Receipt | Asway ERP</title>
      </Helmet>

      {/* Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Search, Edit and Delete Supplier Advance Payment Receipt</h1>
        <Button 
          onClick={() => {
            if (window.history.state && window.history.state.idx > 0) {
              navigate(-1);
            } else {
              navigate('/supplier-payment-management');
            }
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>

      <Card className="shadow-md border-gray-200">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-2 relative flex-1">
              <Label className="text-gray-700 font-semibold">Supplier Name</Label>
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
            
            <Button 
              onClick={handleShowReceipts}
              disabled={isLoading || !selectedSupplier}
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
            >
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              Show
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card className="shadow-md border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="font-semibold text-gray-700">Receipt Number</TableHead>
                <TableHead className="font-semibold text-gray-700">Payment Date</TableHead>
                <TableHead className="font-semibold text-gray-700">Amount (₹)</TableHead>
                <TableHead className="font-semibold text-gray-700">Payment Mode</TableHead>
                <TableHead className="font-semibold text-gray-700">Reference Number</TableHead>
                <TableHead className="font-semibold text-gray-700 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
                    <p className="text-gray-500 mt-2">Loading receipts...</p>
                  </TableCell>
                </TableRow>
              ) : receipts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-gray-500">
                    {selectedSupplier ? 'No advance payment receipts found for this supplier.' : 'Search and select a supplier to view receipts.'}
                  </TableCell>
                </TableRow>
              ) : (
                receipts.map((receipt) => (
                  <TableRow key={receipt.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-gray-900">{receipt.po_from_supplier_no || '-'}</TableCell>
                    <TableCell>{receipt.advance_paid_date ? format(new Date(receipt.advance_paid_date), 'dd MMM yyyy') : '-'}</TableCell>
                    <TableCell>{receipt.advance_amount_paid ? Number(receipt.advance_amount_paid).toFixed(2) : '0.00'}</TableCell>
                    <TableCell>{receipt.transaction_type || '-'}</TableCell>
                    <TableCell>{receipt.transaction_cheque_number || '-'}</TableCell>
                    <TableCell>
                      <div className="flex justify-center space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openEditModal(receipt)}
                          className="h-8 w-8 text-blue-600 border-blue-200 hover:bg-blue-50"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setReceiptToDelete(receipt);
                            setIsDeleteModalOpen(true);
                          }}
                          className="h-8 w-8 text-red-600 border-red-200 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Edit/View Details Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-xl font-bold text-gray-900">Receipt Details</DialogTitle>
          </DialogHeader>
          
          {selectedReceipt && (
            <div className="p-6 space-y-6" ref={pdfRef}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Basic Details */}
                <div className="space-y-2">
                  <Label className="text-gray-700 font-semibold">Receipt Number (PO No)</Label>
                  <Input 
                    value={selectedReceipt.po_from_supplier_no || ''} 
                    onChange={e => setSelectedReceipt({...selectedReceipt, po_from_supplier_no: e.target.value})}
                    className="bg-gray-50 border-gray-300 text-gray-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 font-semibold">Payment Date</Label>
                  <Input 
                    type="date"
                    value={selectedReceipt.advance_paid_date || ''} 
                    onChange={e => setSelectedReceipt({...selectedReceipt, advance_paid_date: e.target.value})}
                    className="bg-gray-50 border-gray-300 text-gray-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 font-semibold">Advance Amount (₹)</Label>
                  <Input 
                    type="number"
                    value={selectedReceipt.advance_amount_paid || ''} 
                    onChange={e => setSelectedReceipt({...selectedReceipt, advance_amount_paid: e.target.value})}
                    className="bg-gray-50 border-gray-300 text-gray-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 font-semibold">Payment Mode</Label>
                  <Select 
                    value={selectedReceipt.transaction_type || ''} 
                    onValueChange={v => setSelectedReceipt({...selectedReceipt, transaction_type: v})}
                  >
                    <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900">
                      <SelectValue placeholder="Select Mode" />
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
                  <Label className="text-gray-700 font-semibold">Reference Number</Label>
                  <Input 
                    value={selectedReceipt.transaction_cheque_number || ''} 
                    onChange={e => setSelectedReceipt({...selectedReceipt, transaction_cheque_number: e.target.value})}
                    className="bg-gray-50 border-gray-300 text-gray-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 font-semibold">Purchase Order Date</Label>
                  <Input 
                    type="date"
                    value={selectedReceipt.purchase_order_date || ''} 
                    onChange={e => setSelectedReceipt({...selectedReceipt, purchase_order_date: e.target.value})}
                    className="bg-gray-50 border-gray-300 text-gray-900"
                  />
                </div>

                {/* Remaining Payment Details */}
                <div className="space-y-2">
                  <Label className="text-gray-700 font-semibold">Remaining Amount (₹)</Label>
                  <Input 
                    type="number"
                    value={selectedReceipt.remaining_payment_amount || ''} 
                    onChange={e => setSelectedReceipt({...selectedReceipt, remaining_payment_amount: e.target.value})}
                    className="bg-gray-50 border-gray-300 text-gray-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 font-semibold">Remaining Payment Date</Label>
                  <Input 
                    type="date"
                    value={selectedReceipt.remaining_payment_date || ''} 
                    onChange={e => setSelectedReceipt({...selectedReceipt, remaining_payment_date: e.target.value})}
                    className="bg-gray-50 border-gray-300 text-gray-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 font-semibold">Remaining Payment Mode</Label>
                  <Select 
                    value={selectedReceipt.remaining_payment_transaction_type || ''} 
                    onValueChange={v => setSelectedReceipt({...selectedReceipt, remaining_payment_transaction_type: v})}
                  >
                    <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900">
                      <SelectValue placeholder="Select Mode" />
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
                  <Label className="text-gray-700 font-semibold">Remaining Reference Number</Label>
                  <Input 
                    value={selectedReceipt.remaining_payment_transaction_cheque_number || ''} 
                    onChange={e => setSelectedReceipt({...selectedReceipt, remaining_payment_transaction_cheque_number: e.target.value})}
                    className="bg-gray-50 border-gray-300 text-gray-900"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-gray-700 font-semibold">Grand Total (₹)</Label>
                  <Input 
                    type="number"
                    value={selectedReceipt.grand_total || ''} 
                    onChange={e => setSelectedReceipt({...selectedReceipt, grand_total: e.target.value})}
                    className="bg-gray-50 border-gray-300 text-gray-900"
                  />
                </div>

              </div>
            </div>
          )}

          <div className="p-6 bg-gray-50 border-t border-gray-200 flex flex-wrap gap-4 justify-end rounded-b-lg mt-auto">
            <Button 
              onClick={() => setIsEditModalOpen(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
            <Button 
              onClick={handleSavePdf}
              disabled={isGeneratingPdf}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isGeneratingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Save as PDF
            </Button>
            <Button 
              onClick={handleUpdate}
              disabled={isUpdating}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Update
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <div className="flex items-center space-x-2 text-red-600 mb-2">
              <AlertCircle className="w-6 h-6" />
              <DialogTitle className="text-xl">Confirm Deletion</DialogTitle>
            </div>
            <DialogDescription className="text-gray-600 text-base">
              Are you sure you want to delete receipt <strong>{receiptToDelete?.po_from_supplier_no}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex space-x-3 sm:justify-end">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteModalOpen(false)}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default SearchSupplierAdvancePaymentReceipt;