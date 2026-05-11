import React from 'react';
import { FileText, CreditCard } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const PaymentReceiptOptions = ({ onInvoicePayment, onAdvancePayment }) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
      <h2 className="text-2xl font-bold text-gray-800">Select Payment Receipt Type</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-4">
        
        {/* Option 1: Against Invoice */}
        <Card 
          className="hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-blue-500 bg-white group"
          onClick={onInvoicePayment}
        >
          <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4 min-h-[250px]">
            <div className="p-4 bg-blue-100 rounded-full text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
              <FileText className="h-12 w-12" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-800">Payment Receipt Against Invoice</h3>
              <p className="text-gray-500 text-sm">Create a receipt linked to an existing customer invoice</p>
            </div>
          </CardContent>
        </Card>

        {/* Option 2: Advance Payment */}
        <Card 
          className="hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-blue-500 bg-white group"
          onClick={onAdvancePayment}
        >
          <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4 min-h-[250px]">
            <div className="p-4 bg-blue-100 rounded-full text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
              <CreditCard className="h-12 w-12" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-800">Payment Receipt for Advance Payment</h3>
              <p className="text-gray-500 text-sm">Create a receipt for advance payments received from customers</p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default PaymentReceiptOptions;