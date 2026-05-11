import React from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, FileText, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PaymentReceiptTypePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCardClick = (type) => {
    if (type === 'invoice') {
      navigate('/supplier-payment-receipt-management');
    } else if (type === 'advance') {
      navigate('/advance-payment-management');
    } else {
      toast({
        title: "Not Implemented",
        description: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
        variant: "default",
      });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 }
    }
  };

  return (
    <div className="py-16 px-6 max-w-7xl mx-auto space-y-8">
      <Helmet>
        <title>Select Payment Receipt Type | Asway ERP</title>
        <meta name="description" content="Select payment receipt type for supplier" />
      </Helmet>

      <div className="flex flex-col space-y-4 md:space-y-6">
        <div>
          <Button 
            onClick={() => navigate(-1)} 
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Select Payment Receipt Type
        </h1>
      </div>

      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 gap-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <Card 
            className="group cursor-pointer rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-gray-100 h-full"
            onClick={() => handleCardClick('invoice')}
          >
            <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-6 h-full">
              <div className="p-5 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors duration-300">
                <FileText className="w-14 h-14 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Payment Receipt Against Invoice</h2>
                <p className="text-gray-500">Record payments made against specific supplier invoices</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card 
            className="group cursor-pointer rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-gray-100 h-full"
            onClick={() => handleCardClick('advance')}
          >
            <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-6 h-full">
              <div className="p-5 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors duration-300">
                <CreditCard className="w-14 h-14 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Payment Receipt for Advance Payment</h2>
                <p className="text-gray-500">Record advance payments made to suppliers</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PaymentReceiptTypePage;