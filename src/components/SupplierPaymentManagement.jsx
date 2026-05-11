import React from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Receipt, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

const SupplierPaymentManagement = () => {
  const navigate = useNavigate();

  const menuItems = [
    {
      title: 'Payment Receipt Management',
      icon: <Receipt className="w-8 h-8 mb-4 text-blue-600" />,
      description: 'Manage standard payment receipts',
      route: '/supplier-payment-receipt-type'
    },
    {
      title: 'Payment Details',
      icon: <FileText className="w-8 h-8 mb-4 text-purple-600" />,
      description: 'View specific supplier payment details',
      route: '/supplier-payment/payment-details'
    }
  ];

  return (
    <div className="py-8 px-6 max-w-7xl mx-auto space-y-6">
      <Helmet>
        <title>Supplier Payment Hub | Asway ERP</title>
        <meta name="description" content="Supplier Payment Management Hub" />
      </Helmet>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Supplier Payment Management
        </h1>
        <p className="text-gray-500 mt-2">Select a module to manage supplier payments and receipts.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 max-w-4xl">
        {menuItems.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card 
              className="h-full cursor-pointer hover:shadow-lg transition-all border-gray-200 hover:border-blue-300 group"
              onClick={() => navigate(item.route)}
            >
              <CardContent className="p-8 flex flex-col items-center text-center justify-center min-h-[250px]">
                <div className="transform group-hover:scale-110 transition-transform duration-300">
                  {item.icon}
                </div>
                <CardTitle className="text-xl mb-3 text-gray-800 group-hover:text-blue-600 transition-colors">
                  {item.title}
                </CardTitle>
                <p className="text-gray-500 text-sm">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default SupplierPaymentManagement;