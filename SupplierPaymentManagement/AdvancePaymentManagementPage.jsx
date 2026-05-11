import React from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Plus, Search } from 'lucide-react';
import { motion } from 'framer-motion';

const AdvancePaymentManagementPage = () => {
  const navigate = useNavigate();

  const handleCreateNew = () => {
    navigate('/advance-payment-management/create');
  };

  const handleSearchEditDelete = () => {
    navigate('/advance-payment-management/search');
  };

  return (
    <div className="py-8 px-6 max-w-5xl mx-auto space-y-6">
      <Helmet>
        <title>Advance Payment Management | Asway ERP</title>
        <meta name="description" content="Manage advance payment receipts for suppliers" />
      </Helmet>

      <div className="flex flex-col space-y-4">
        <div>
          <Button 
            onClick={() => navigate(-1)} 
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Advance Payment Management
        </h1>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border border-gray-200 shadow-sm mt-6">
          <CardContent className="p-8 flex flex-col sm:flex-row gap-6 justify-center items-center h-full min-h-[250px]">
            <Button 
              onClick={handleCreateNew}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto px-8 py-6 text-lg rounded-xl shadow-md transition-all hover:scale-105"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New Advance Payment Receipt
            </Button>
            
            <Button 
              onClick={handleSearchEditDelete}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto px-8 py-6 text-lg rounded-xl shadow-md transition-all hover:scale-105"
            >
              <Search className="w-5 h-5 mr-2" />
              Search, Edit and Delete Advance Payment Receipt
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AdvancePaymentManagementPage;