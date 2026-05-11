import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import CreatePaymentReceiptForm from '@/components/payment-receipts/CreatePaymentReceiptForm';
import SearchPaymentReceipt from '@/components/payment-receipts/SearchPaymentReceipt';

const PaymentReceipt = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleCreateSuccess = () => {
    setIsCreateOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <h1 className="text-2xl font-bold text-gray-800">Payment Receipt Management</h1>
        <p className="text-sm text-gray-500 mb-4">Manage payment receipts from customers</p>
        
        <div className="flex flex-wrap gap-4">
          <Button 
            onClick={() => setIsCreateOpen(true)} 
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Payment Receipt
          </Button>

          <Button 
            onClick={() => setIsSearchOpen(true)} 
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-95"
          >
            <Search className="w-4 h-4 mr-2" />
            Search, Edit and Delete Payment Receipt
          </Button>
        </div>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 bg-white border shadow-2xl">
          <CreatePaymentReceiptForm onSuccess={handleCreateSuccess} onClose={() => setIsCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-6 bg-white border shadow-2xl">
          <div className="mb-4">
             <h2 className="text-xl font-bold text-gray-900">Search, Edit & Delete Payment Receipts</h2>
          </div>
          <SearchPaymentReceipt />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentReceipt;