import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import useSupplierManagement from '@/hooks/useSupplierManagement';
import useSupplierPOReceiptManagement from '@/hooks/useSupplierPOReceiptManagement';

const AddRemainingPaymentPOSupplier = ({ onClose }) => {
  const { suppliers } = useSupplierManagement();
  const { fetchReceiptsBySupplier, fetchReceiptDetails, updateRemainingPayment, loading } = useSupplierPOReceiptManagement();
  const { toast } = useToast();

  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierPOs, setSupplierPOs] = useState([]);
  const [selectedReceiptId, setSelectedReceiptId] = useState('');
  const [receiptDetails, setReceiptDetails] = useState(null);
  const [paymentData, setPaymentData] = useState({
    remaining_payment_amount: '',
    remaining_payment_date: null,
    remaining_payment_transaction_type: '',
    remaining_payment_transaction_cheque_number: '',
  });

  const transactionTypes = ["Cash", "Net Banking", "UPI", "Cheque"];

  const handleSupplierChange = async (supplierId) => {
    setSelectedSupplierId(supplierId);
    setReceiptDetails(null);
    setSelectedReceiptId('');
    const pos = await fetchReceiptsBySupplier(supplierId);
    setSupplierPOs(pos);
  };

  const handleShow = async () => {
    if (!selectedReceiptId) {
      toast({ title: 'Please select a PO Number.', variant: 'destructive' });
      return;
    }
    const details = await fetchReceiptDetails(selectedReceiptId);
    setReceiptDetails(details);
    if (details) {
      const remaining = (details.grand_total || 0) - (details.advance_amount_paid || 0) - (details.remaining_payment_amount || 0);
      setPaymentData(prev => ({ ...prev, remaining_payment_amount: remaining > 0 ? remaining.toFixed(2) : '0.00' }));
    }
  };

  const handleSave = async () => {
    if (!receiptDetails) return;

    const payload = {
      remaining_payment_amount: (receiptDetails.remaining_payment_amount || 0) + (parseFloat(paymentData.remaining_payment_amount) || 0),
      remaining_payment_date: paymentData.remaining_payment_date ? format(paymentData.remaining_payment_date, 'yyyy-MM-dd') : null,
      remaining_payment_transaction_type: paymentData.remaining_payment_transaction_type,
      remaining_payment_transaction_cheque_number: paymentData.remaining_payment_transaction_cheque_number,
    };

    const success = await updateRemainingPayment(receiptDetails.id, payload);
    if (success) {
      onClose();
    }
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setPaymentData(prev => ({ ...prev, [id]: value }));
  };

  const handleDateChange = (date) => {
    setPaymentData(prev => ({ ...prev, remaining_payment_date: date }));
  };

  const handleSelectChange = (value) => {
    setPaymentData(prev => ({ ...prev, remaining_payment_transaction_type: value }));
  };

  const advanceAmountPaid = receiptDetails ? (receiptDetails.advance_amount_paid || 0) : 0;
  const grandTotal = receiptDetails ? (receiptDetails.grand_total || 0) : 0;
  const alreadyPaidRemaining = receiptDetails ? (receiptDetails.remaining_payment_amount || 0) : 0;
  const calculatedRemaining = grandTotal - advanceAmountPaid - alreadyPaidRemaining;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <Card className="max-w-5xl mx-auto">
        <CardHeader>
          <CardTitle>Add Remaining Payment for Supplier PO</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!receiptDetails ? (
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <Label htmlFor="supplier-select">Supplier Name</Label>
                <Select onValueChange={handleSupplierChange} value={selectedSupplierId}>
                  <SelectTrigger id="supplier-select"><SelectValue placeholder="Select a supplier" /></SelectTrigger>
                  <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.supplier_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex-1 w-full">
                <Label htmlFor="receipt-select">PO from Supplier No</Label>
                <Select onValueChange={setSelectedReceiptId} value={selectedReceiptId} disabled={!selectedSupplierId}>
                  <SelectTrigger id="receipt-select"><SelectValue placeholder="Select a PO Number" /></SelectTrigger>
                  <SelectContent>{supplierPOs.map(r => <SelectItem key={r.id} value={r.id}>{r.po_from_supplier_no}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={handleShow} disabled={!selectedReceiptId || loading}>
                {loading ? 'Loading...' : 'Show'}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm p-4 border rounded-lg bg-gray-50">
                <div><strong>Supplier:</strong> {receiptDetails.suppliers.supplier_name}</div>
                <div><strong>PO Number:</strong> {receiptDetails.po_from_supplier_no}</div>
                <div className="md:col-span-3"></div>
                <div><strong>Grand Total:</strong> ₹{grandTotal.toFixed(2)}</div>
                <div><strong>Advance Paid:</strong> ₹{advanceAmountPaid.toFixed(2)}</div>
                <div><strong>Balance Due:</strong> ₹{calculatedRemaining.toFixed(2)}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="remaining_payment_amount">Add Remaining Payment</Label>
                  <Input id="remaining_payment_amount" type="number" value={paymentData.remaining_payment_amount} onChange={handleInputChange} placeholder="Enter amount" />
                </div>
                <div className="space-y-2">
                  <Label>Remaining Payment Date</Label>
                  <Popover>
                    <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !paymentData.remaining_payment_date && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{paymentData.remaining_payment_date ? format(paymentData.remaining_payment_date, "dd-MM-yyyy") : <span>Pick a date</span>}</Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={paymentData.remaining_payment_date} onSelect={handleDateChange} initialFocus /></PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remaining_payment_transaction_type">Transaction Type</Label>
                  <Select onValueChange={handleSelectChange} value={paymentData.remaining_payment_transaction_type}>
                    <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                    <SelectContent>{transactionTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remaining_payment_transaction_cheque_number">Transaction / Cheque Number</Label>
                  <Input id="remaining_payment_transaction_cheque_number" value={paymentData.remaining_payment_transaction_cheque_number} onChange={handleInputChange} placeholder="Enter Number" />
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          {receiptDetails && (
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default AddRemainingPaymentPOSupplier;