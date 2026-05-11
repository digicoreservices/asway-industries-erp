import React from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const PaymentDetailsModal = ({ payment, isOpen, onClose }) => {
  if (!payment) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch (e) {
      return dateString;
    }
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount);
    return isNaN(num) ? '₹0.00' : `₹${num.toFixed(2)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl text-gray-800">Payment Record Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4 text-sm text-gray-700">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-500">Payment Type:</span>
            <Badge variant={payment.payment_type === 'Advance Payment' ? 'secondary' : 'default'} className={payment.payment_type === 'Advance Payment' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>
              {payment.payment_type}
            </Badge>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-2 gap-y-3">
            <div>
              <p className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Receipt Number</p>
              <p className="font-medium mt-1">{payment.receipt_number || 'N/A'}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Payment Date</p>
              <p className="font-medium mt-1">{formatDate(payment.payment_date)}</p>
            </div>
            
            <div>
              <p className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Payment Mode</p>
              <p className="font-medium mt-1">{payment.payment_mode || 'N/A'}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Reference Number</p>
              <p className="font-medium mt-1">{payment.reference_number || 'N/A'}</p>
            </div>
            
            <div>
              <p className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Amount</p>
              <p className="font-bold text-green-600 text-base mt-1">{formatCurrency(payment.amount)}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Actual Amount</p>
              <p className="font-medium mt-1">{formatCurrency(payment.actual_amount)}</p>
            </div>

            {payment.deduction_type && payment.deduction_type !== 'None' && (
              <>
                <div>
                  <p className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Deduction Type</p>
                  <p className="font-medium mt-1">{payment.deduction_type}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Deduction Amount</p>
                  <p className="font-medium mt-1 text-red-500">{formatCurrency(payment.deduction_amount)}</p>
                </div>
              </>
            )}

            {payment.invoice_reference_number && (
              <div className="col-span-2">
                <p className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Invoice Reference</p>
                <p className="font-medium mt-1">
                  {payment.invoice_reference_number} 
                  {payment.invoice_reference_date && ` (${formatDate(payment.invoice_reference_date)})`}
                </p>
              </div>
            )}

            {payment.po_number && (
               <div className="col-span-2">
                  <p className="font-semibold text-gray-500 text-xs uppercase tracking-wider">PO Reference</p>
                  <p className="font-medium mt-1">
                    {payment.po_number}
                    {payment.po_date && ` (${formatDate(payment.po_date)})`}
                  </p>
               </div>
            )}
            
            {payment.remarks && (
              <div className="col-span-2">
                <p className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Remarks</p>
                <p className="font-medium mt-1 p-2 bg-gray-50 rounded-md border border-gray-100">{payment.remarks}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDetailsModal;