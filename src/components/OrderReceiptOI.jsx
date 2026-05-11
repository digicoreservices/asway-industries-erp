import React, { useState, Suspense } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle, FileText, Search, DollarSign, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ErrorBoundary from '@/components/ErrorBoundary';
import OrderReceiptForm from '@/components/order-receipts/OrderReceiptForm';
import SearchOrderReceipt from '@/components/order-receipts/SearchOrderReceipt';
import AddRemainingPayment from '@/components/order-receipts/AddRemainingPayment';
import DeleteOrderReceiptForm from '@/components/order-receipts/DeleteOrderReceiptForm';

const OrderReceiptOI = () => {
  const [view, setView] = useState('list');

  const renderContent = () => {
    switch (view) {
      case 'add':
        return <OrderReceiptForm onClose={() => setView('list')} />;
      case 'search':
        return <SearchOrderReceipt onClose={() => setView('list')} />;
      case 'add_remaining':
        return <AddRemainingPayment onClose={() => setView('list')} />;
      case 'delete':
        return <DeleteOrderReceiptForm onClose={() => setView('list')} />;
      case 'list':
      default:
        return (
          <div className="text-center py-16 text-gray-500 bg-white rounded-lg shadow-md">
            <FileText className="mx-auto h-16 w-16 text-gray-400" />
            <h3 className="mt-6 text-2xl font-semibold text-gray-800">Manage Purchase Order Receipts From Customers</h3>
            <p className="mt-2 text-md">
              Use the buttons above to manage your purchase order receipts.
            </p>
          </div>
        );
    }
  };

  return (
    <ErrorBoundary>
      <Helmet>
        <title>Purchase Order Receipt - Asway Industries ERP</title>
        <meta name="description" content="Manage Purchase Order Receipts from Customers" />
      </Helmet>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-4 md:p-6 bg-gray-50/50 min-h-full"
      >
        {view === 'list' && (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Purchase Order Receipts</h1>
              <p className="text-gray-500">Manage purchase order receipts from your customers.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => setView('add')} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                Add New
              </Button>
              <Button 
                onClick={() => setView('search')} 
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 border-0"
              >
                <Search className="h-4 w-4" />
                Search and Edit PO Receipt from Customer
              </Button>
               <Button 
                onClick={() => setView('delete')} 
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete a Receipt
              </Button>
              {false && ( // Temporarily hide the button
                <Button onClick={() => setView('add_remaining')} variant="outline" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Add Remaining Payment
                </Button>
              )}
            </div>
          </div>
        )}
        
        <div className="relative min-h-[400px]">
          <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ErrorBoundary>
                  <Suspense fallback={
                    <div className="flex items-center justify-center p-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  }>
                    {renderContent()}
                  </Suspense>
                </ErrorBoundary>
              </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </ErrorBoundary>
  );
};

export default OrderReceiptOI;