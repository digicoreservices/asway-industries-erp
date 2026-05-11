import React, { useState } from 'react';
import { PlusCircle, RefreshCw, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AddInvoiceStatusForm from '@/components/invoices/AddInvoiceStatusForm';
import UpdateInvoiceStatusForm from '@/components/invoices/UpdateInvoiceStatusForm';
import SearchInvoiceByStatus from '@/components/invoices/SearchInvoiceByStatus';

const InvoiceStatusManagement = ({ onClose }) => {
  const [activeView, setActiveView] = useState('menu'); // menu, add, update, search

  const renderContent = () => {
    switch (activeView) {
      case 'add':
        return <AddInvoiceStatusForm onBack={() => setActiveView('menu')} />;
      case 'update':
        return <UpdateInvoiceStatusForm onBack={() => setActiveView('menu')} />;
      case 'search':
        return <SearchInvoiceByStatus onBack={() => setActiveView('menu')} />;
      default:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h2 className="text-xl font-bold text-gray-800">Invoice Status Management</h2>
              {onClose && (
                <Button 
                  variant="default" 
                  onClick={onClose} 
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                >
                  Close
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              <Card 
                className="hover:shadow-md transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-blue-500 bg-white"
                onClick={() => setActiveView('add')}
              >
                <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                    <PlusCircle className="h-8 w-8" />
                  </div>
                  <h3 className="font-semibold text-gray-800">Add New Invoice Status</h3>
                </CardContent>
              </Card>

              <Card 
                className="hover:shadow-md transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-blue-500 bg-white"
                onClick={() => setActiveView('update')}
              >
                <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                    <RefreshCw className="h-8 w-8" />
                  </div>
                  <h3 className="font-semibold text-gray-800">Update Invoice Status</h3>
                </CardContent>
              </Card>

              <Card 
                className="hover:shadow-md transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-blue-500 bg-white"
                onClick={() => setActiveView('search')}
              >
                <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                    <Search className="h-8 w-8" />
                  </div>
                  <h3 className="font-semibold text-gray-800">Search Invoice as per Status</h3>
                </CardContent>
              </Card>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 max-h-[90vh] overflow-y-auto">
      {renderContent()}
    </div>
  );
};

export default InvoiceStatusManagement;