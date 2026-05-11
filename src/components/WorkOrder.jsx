
import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Search } from 'lucide-react';
import AddWorkOrderForm from '@/components/work-orders/AddWorkOrderForm';
import SearchWorkOrder from '@/components/work-orders/SearchWorkOrder';
import DeleteWorkOrderForm from '@/components/work-orders/DeleteWorkOrderForm';

const WorkOrder = () => {
  const [view, setView] = useState('list');

  const renderContent = () => {
    switch (view) {
      case 'add':
        return <AddWorkOrderForm onClose={() => setView('list')} />;
      case 'search':
        return <SearchWorkOrder onClose={() => setView('list')} />;
      case 'delete':
        return <DeleteWorkOrderForm onClose={() => setView('list')} />;
      case 'list':
      default:
        return (
          <div className="text-center py-16 text-gray-500 bg-white rounded-lg shadow-md">
            <FileText className="mx-auto h-16 w-16 text-gray-400" />
            <h3 className="mt-6 text-2xl font-semibold text-gray-800">Work Order Management</h3>
            <p className="mt-2 text-md">
              Click "Add New Work Order" to create a new work order or "Search, Edit and Delete Work Order" to find existing ones.
            </p>
          </div>
        );
    }
  };

  return (
    <>
      <Helmet>
        <title>Work Order Management - Asway Industries ERP</title>
        <meta name="description" content="Manage work orders for Asway Industries." />
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
              <h1 className="text-3xl font-bold text-gray-800">Work Order Management</h1>
              <p className="text-gray-500">Create and manage work orders.</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2" onClick={() => setView('add')}>
                <Plus size={16} /> Add New Work Order
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2" onClick={() => setView('search')}>
                <Search size={16} /> Search, Edit and Delete Work Order
              </Button>
            </div>
          </div>
        )}
        
        <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderContent()}
            </motion.div>
        </AnimatePresence>
      </motion.div>
    </>
  );
};

export default WorkOrder;
