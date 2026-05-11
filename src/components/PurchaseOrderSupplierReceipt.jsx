
import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle, FileText, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AddPOSupplierForm from '@/components/supplier-po-receipts/AddPOSupplierForm';
import SearchPOSupplier from '@/components/supplier-po-receipts/SearchPOSupplier';

const PurchaseOrderSupplierReceipt = () => {
  const [view, setView] = useState('list');

  const renderContent = () => {
    switch (view) {
      case 'add':
        return <AddPOSupplierForm onClose={() => setView('list')} />;
      case 'search':
        return <SearchPOSupplier onClose={() => setView('list')} />;
      case 'list':
      default:
        return (
          <div className="text-center py-16 text-gray-500 bg-white rounded-lg shadow-md border border-gray-100">
            <FileText className="mx-auto h-16 w-16 text-gray-400" />
            <h3 className="mt-6 text-2xl font-semibold text-gray-800">Manage Purchase Order Issued to Suppliers</h3>
            <p className="mt-2 text-md">
              Use the buttons above to manage purchase orders for your suppliers.
            </p>
          </div>
        );
    }
  };

  return (
    <>
      <Helmet>
        <title>PO Issued to Supplier - Asway Industries ERP</title>
        <meta name="description" content="Manage Purchase Order Issued to Suppliers" />
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
              <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Purchase Order Issued to Suppliers</h1>
              <p className="text-gray-500">Manage and track purchase orders directed to your suppliers.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button 
                onClick={() => setView('add')} 
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 transition-all duration-200"
              >
                <PlusCircle className="h-4 w-4" />
                Add New
              </Button>
              <Button 
                onClick={() => setView('search')} 
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 transition-all duration-200"
              >
                <Search className="h-4 w-4" />
                Search, Edit and Delete
              </Button>
            </div>
          </div>
        )}
        
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </>
  );
};

export default PurchaseOrderSupplierReceipt;
