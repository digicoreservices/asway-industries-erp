import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AddQuotationForm from '@/components/quotations/AddQuotationForm';
import SearchQuotation from '@/components/quotations/SearchQuotation';
import DeleteQuotationForm from '@/components/quotations/DeleteQuotationForm';
import useQuotationManagement from '@/hooks/useQuotationManagement';

const QuotationManagement = () => {
  const [view, setView] = useState('list');
  const { quotations } = useQuotationManagement();

  const renderContent = () => {
    switch (view) {
      case 'add':
        return <AddQuotationForm onClose={() => setView('list')} />;
      case 'search':
        return <SearchQuotation onClose={() => setView('list')} />;
      case 'delete':
        return <DeleteQuotationForm onClose={() => setView('list')} />;
      case 'list':
      default:
        return (
          <div className="text-center py-16 text-gray-500 bg-white rounded-lg shadow-md">
            <FileText className="mx-auto h-16 w-16 text-gray-400" />
            <h3 className="mt-6 text-2xl font-semibold text-gray-800">Manage Your Quotations</h3>
            <p className="mt-2 text-md">
              Use the buttons above to add a new quotation or search for an existing one.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="p-4 md:p-6 bg-gray-50/50 min-h-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {view === 'list' && (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Quotation Management</h1>
              <p className="text-gray-500">Create, view, and manage quotations.</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button className="btn-primary flex items-center gap-2" onClick={() => setView('add')}>
                <Plus size={16} /> Add New
              </Button>
              <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2" onClick={() => setView('search')}>
                <Search size={16} /> Search and Edit Quotation
              </Button>
              <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2" onClick={() => setView('delete')}>
                <Trash2 size={16} /> Delete Quotation
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
    </div>
  );
};

export default QuotationManagement;